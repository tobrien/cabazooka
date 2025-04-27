import { jest } from '@jest/globals';
import type { Config } from '../src/configure';
import type { Options, FilesystemStructure, FilenameOption, Feature } from '../src/options';
import type * as StorageUtil from '../src/util/storage';
import type * as DatesUtil from '../src/util/dates';
import { ALLOWED_EXTENSIONS, ALLOWED_INPUT_FILENAME_OPTIONS, ALLOWED_INPUT_STRUCTURES, ALLOWED_OUTPUT_FILENAME_OPTIONS, ALLOWED_OUTPUT_STRUCTURES } from '../src/constants';

// --- Mock Dependencies ---

const mockIsDirectoryReadable = jest.fn<StorageUtil.Utility['isDirectoryReadable']>();
const mockIsDirectoryWritable = jest.fn<StorageUtil.Utility['isDirectoryWritable']>();
const mockStorageCreate = jest.fn<typeof StorageUtil.create>().mockReturnValue({
    isDirectoryReadable: mockIsDirectoryReadable,
    isDirectoryWritable: mockIsDirectoryWritable,
    // Add other methods if needed, mocked or otherwise (can be dummy implementations if not used)
    // @ts-ignore
    forEachFileIn: jest.fn(),
    // @ts-ignore
    readFile: jest.fn(),
    // @ts-ignore
    writeFile: jest.fn(),
    // @ts-ignore
    ensureDir: jest.fn(),
    // @ts-ignore
    remove: jest.fn(),
    // @ts-ignore
    pathExists: jest.fn(),
    // @ts-ignore
    copyFile: jest.fn(),
    // @ts-ignore
    moveFile: jest.fn(),
    // @ts-ignore
    listFiles: jest.fn(),
    // @ts-ignore
    createReadStream: jest.fn(),
    // @ts-ignore
    createWriteStream: jest.fn(),
});

const mockValidTimezones = jest.fn<typeof DatesUtil.validTimezones>();

jest.unstable_mockModule('../src/util/storage', () => ({
    create: mockStorageCreate,
}));

jest.unstable_mockModule('../src/util/dates', () => ({
    validTimezones: mockValidTimezones,
}));

// --- Dynamically Import Module Under Test ---

const { validate, ArgumentError } = await import('../src/validate');

// --- Test Suite ---

describe('validate', () => {
    let baseConfig: Config;
    let baseOptions: Options;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mocks to default valid states
        mockIsDirectoryReadable.mockResolvedValue(true);
        mockIsDirectoryWritable.mockResolvedValue(true);
        mockValidTimezones.mockReturnValue(['UTC', 'America/New_York', 'Europe/London']);

        baseConfig = {
            inputDirectory: '/input',
            outputDirectory: '/output',
            timezone: 'UTC',
            // Default other potentially validated fields to undefined or empty
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            recursive: false,
        };

        baseOptions = {
            features: ['input', 'output', 'structured-output', 'extensions', 'structured-input'], // Assume all features enabled by default for base case
            allowed: { // Use default constants
                inputStructures: ALLOWED_INPUT_STRUCTURES,
                outputStructures: ALLOWED_OUTPUT_STRUCTURES,
                inputFilenameOptions: ALLOWED_INPUT_FILENAME_OPTIONS,
                outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
                extensions: ALLOWED_EXTENSIONS,
            },
            logger: {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                verbose: jest.fn(),
                silly: jest.fn(),
            },
            addDefaults: false,
        };
    });

    // Helper function to run validation
    const runValidation = (configOverrides: Partial<Config> = {}, optionOverrides: Partial<Options> = {}) => {
        const config = { ...baseConfig, ...configOverrides };
        const options = { ...baseOptions, ...optionOverrides };
        return validate(config, options);
    };

    test('should pass with valid default configuration and all features enabled', async () => {
        await expect(runValidation()).resolves.toBeUndefined();
        expect(mockIsDirectoryReadable).toHaveBeenCalledWith('/input');
        expect(mockIsDirectoryWritable).toHaveBeenCalledWith('/output');
        expect(mockValidTimezones).toHaveBeenCalled();
        // Check that structure/filename/extension validators were called but didn't throw
        // (Specific mocks for these internal checks aren't needed unless behavior changes)
    });

    // --- Feature Flag Tests ---
    test('should skip input directory validation if "input" feature is disabled', async () => {
        await expect(runValidation({}, { features: ['output'] })).resolves.toBeUndefined();
        expect(mockIsDirectoryReadable).not.toHaveBeenCalled();
        expect(mockIsDirectoryWritable).toHaveBeenCalled(); // Output still checked
    });

    test('should skip output directory validation if "output" feature is disabled', async () => {
        await expect(runValidation({}, { features: ['input'] })).resolves.toBeUndefined();
        expect(mockIsDirectoryReadable).toHaveBeenCalled();
        expect(mockIsDirectoryWritable).not.toHaveBeenCalled();
    });

    test('should skip output structure/filename validation if "structured-output" feature is disabled', async () => {
        // Use an invalid structure that would normally throw
        await expect(runValidation({ outputStructure: 'invalid-structure' as any }, { features: ['input', 'output'] }))
            .resolves.toBeUndefined();
    });

     test('should skip input structure/filename validation if "structured-input" feature is disabled', async () => {
        // Use an invalid structure that would normally throw
        await expect(runValidation({ inputStructure: 'invalid-structure' as any }, { features: ['input', 'output'] }))
            .resolves.toBeUndefined();
    });

    test('should skip extension validation if "extensions" feature is disabled', async () => {
        // Use an invalid extension that would normally throw
        await expect(runValidation({ extensions: ['invalid-ext'] }, { features: ['input', 'output'] }))
            .resolves.toBeUndefined();
    });

    // --- Output Directory Validation ---
    test('should throw if output directory is not writable', async () => {
        mockIsDirectoryWritable.mockResolvedValue(false);
        await expect(runValidation()).rejects.toThrow('Output directory does not exist: /output');
    });

    test('should throw if output directory check fails', async () => {
        const error = new Error('Filesystem full');
        mockIsDirectoryWritable.mockRejectedValue(error);
        await expect(runValidation()).rejects.toThrow(error); // Should bubble up storage errors
    });

    // --- Timezone Validation ---
    test('should throw if timezone is invalid', async () => {
        mockValidTimezones.mockReturnValue(['UTC']); // Only UTC is valid now
        await expect(runValidation({ timezone: 'America/Los_Angeles' }))
            .rejects.toThrow(new ArgumentError('--timezone', 'Invalid timezone: America/Los_Angeles. Valid options are: UTC'));
    });

    test('should throw with invalid output structure', async () => {
        // @ts-ignore - Allow invalid output structure
        await expect(runValidation({ outputStructure: 'invalid' as FilesystemStructure }))
            .rejects.toThrow(new ArgumentError('--output-structure', `Invalid output structure: invalid. Valid options are: ${ALLOWED_OUTPUT_STRUCTURES.join(', ')}`));
    });

    test('should use custom allowed output structures from options', async () => {
        // @ts-ignore - Allow invalid output structure
        const customAllowed: FilesystemStructure[] = ['flat', 'custom'];

        // @ts-ignore - Allow invalid output structure
         await expect(runValidation({ outputStructure: 'yearMonth' }, { allowed: { ...baseOptions.allowed, outputStructures: customAllowed }}))
            .rejects.toThrow(new ArgumentError('--output-structure', `Invalid output structure: yearMonth. Valid options are: ${customAllowed.join(', ')}`));

        // @ts-ignore - Allow invalid output structure
        await expect(runValidation({ outputStructure: 'custom' }, { allowed: { ...baseOptions.allowed, outputStructures: customAllowed }}))
            .resolves.toBeUndefined();
    });


    // --- Output Filename Options Validation ---
    test('should pass with valid output filename options', async () => {
        await expect(runValidation({ outputFilenameOptions: ['date', 'time', 'subject'] })).resolves.toBeUndefined();
    });

    test('should throw on comma-separated output filename options', async () => {
        await expect(runValidation({ outputFilenameOptions: ['date,time'] as any }))
            .rejects.toThrow(new ArgumentError('--output-filename-options', 'Filename options should be space-separated, not comma-separated. Example: --output-filename-options date time subject'));
    });

     test('should throw on quoted output filename options string', async () => {
        await expect(runValidation({ outputFilenameOptions: ['date time subject'] as any })) // Simulates commander parsing "date time subject" as one arg
            .rejects.toThrow(new ArgumentError('--output-filename-options', 'Filename options should not be quoted. Use: --output-filename-options date time subject instead of --output-filename-options "date time subject"'));
    });

    test('should throw with invalid output filename options', async () => {
        // @ts-ignore - Allow invalid filename options
        await expect(runValidation({ outputFilenameOptions: ['date', 'invalid', 'subject'] }))
            .rejects.toThrow(new ArgumentError('--output-filename-options', `Invalid filename options: invalid. Valid options are: ${ALLOWED_OUTPUT_FILENAME_OPTIONS.join(', ')}`));
    });

    test('should throw if output filename option "date" is used with output structure "day"', async () => {
        await expect(runValidation({ outputStructure: 'day', outputFilenameOptions: ['date', 'time'] }))
            .rejects.toThrow(new ArgumentError('--output-filename-options', 'Cannot use date in filename when output structure is "day"'));
    });

    test('should use custom allowed output filename options from options', async () => {
        // @ts-ignore - Allow invalid filename options
        const customAllowed: FilenameOption[] = ['subject', 'custom'];
        await expect(runValidation({ outputFilenameOptions: ['date'] }, { allowed: { ...baseOptions.allowed, outputFilenameOptions: customAllowed }}))
            .rejects.toThrow(new ArgumentError('--output-filename-options', `Invalid filename options: date. Valid options are: ${customAllowed.join(', ')}`));
        // @ts-ignore - Allow invalid filename options
        await expect(runValidation({ outputFilenameOptions: ['custom'] }, { allowed: { ...baseOptions.allowed, outputFilenameOptions: customAllowed }}))
            .resolves.toBeUndefined();
    });


    test('should throw with invalid input structure', async () => {
        await expect(runValidation({ inputStructure: 'invalid' as FilesystemStructure }))
            .rejects.toThrow(new ArgumentError('--input-structure', `Invalid input structure: invalid. Valid options are: ${ALLOWED_INPUT_STRUCTURES.join(', ')}`));
    });


    // --- Input Filename Options Validation (Mirror Output Filename Options) ---
     test('should pass with valid input filename options', async () => {
        await expect(runValidation({ inputFilenameOptions: ['date', 'time', 'subject'] })).resolves.toBeUndefined();
    });

    test('should throw on comma-separated input filename options', async () => {
        await expect(runValidation({ inputFilenameOptions: ['date,time'] as any }))
            .rejects.toThrow(new ArgumentError('--input-filename-options', 'Filename options should be space-separated, not comma-separated. Example: --input-filename-options date time subject'));
    });

    test('should throw on quoted input filename options string', async () => {
        await expect(runValidation({ inputFilenameOptions: ['date time subject'] as any }))
             .rejects.toThrow(new ArgumentError('--input-filename-options', 'Filename options should not be quoted. Use: --input-filename-options date time subject instead of --input-filename-options "date time subject"'));
    });


    test('should throw with invalid input filename options', async () => {
        // @ts-ignore - Allow invalid filename options
        await expect(runValidation({ inputFilenameOptions: ['date', 'invalid', 'subject'] }))
            .rejects.toThrow(new ArgumentError('--input-filename-options', `Invalid filename options: invalid. Valid options are: ${ALLOWED_INPUT_FILENAME_OPTIONS.join(', ')}`));
    });

    test('should throw if input filename option "date" is used with input structure "day"', async () => {
        await expect(runValidation({ inputStructure: 'day', inputFilenameOptions: ['date', 'time'] }))
            .rejects.toThrow(new ArgumentError('--input-filename-options', 'Cannot use date in filename when input structure is "day"'));
    });

    // --- Extensions Validation ---
    test('should pass with valid extensions', async () => {
        await expect(runValidation({ extensions: ['eml', 'msg'] }, { allowed: { ...baseOptions.allowed, extensions: ['eml', 'msg'] } })).resolves.toBeUndefined();
    });

    test('should throw with invalid extensions', async () => {
        await expect(runValidation({ extensions: ['eml', 'invalid', 'msg'] }))
            .rejects.toThrow(new ArgumentError('--extensions', `Invalid extensions: eml, invalid, msg. Valid options are: md`));
    });

     test('should use custom allowed extensions from options', async () => {
        const customAllowed = ['foo', 'bar'];
         await expect(runValidation({ extensions: ['eml'] }, { allowed: { ...baseOptions.allowed, extensions: customAllowed }}))
            .rejects.toThrow(new ArgumentError('--extensions', `Invalid extensions: eml. Valid options are: foo, bar`));
         await expect(runValidation({ extensions: ['foo'] }, { allowed: { ...baseOptions.allowed, extensions: customAllowed }}))
            .resolves.toBeUndefined();
    });

});
