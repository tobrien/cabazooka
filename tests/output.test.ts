import { jest } from '@jest/globals';
import type { Config, Options } from '../src/cabazooka';
import type * as StorageUtil from '../src/util/storage';
import type * as DatesUtil from '../src/util/dates';
import path from 'path'; // Import path for verification

// --- Mock Dependencies ---

// Dates Util Mock
const mockDateFormat = jest.fn<DatesUtil.Utility['format']>();
// @ts-ignore - Mocking only the passthrough behavior for Date objects
const mockDateDate = jest.fn<DatesUtil.Utility['date']>().mockImplementation((d: Date) => d); // Pass through Date object
// @ts-ignore - Only mocking used methods
const mockDatesCreate = jest.fn<typeof DatesUtil.create>().mockReturnValue({
    format: mockDateFormat,
    date: mockDateDate,
    // @ts-ignore - Add other methods if necessary
});

// Storage Util Mock
const mockCreateDirectory = jest.fn<StorageUtil.Utility['createDirectory']>();
const mockStorageCreate = jest.fn<typeof StorageUtil.create>().mockReturnValue({
    createDirectory: mockCreateDirectory,
    // Add other methods if needed, mocked or otherwise (can be dummy implementations if not used)
    // @ts-ignore
    isDirectoryReadable: jest.fn(),
    // @ts-ignore
    isDirectoryWritable: jest.fn(),
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


jest.unstable_mockModule('../src/util/dates', () => ({
    create: mockDatesCreate,
}));

jest.unstable_mockModule('../src/util/storage', () => ({
    create: mockStorageCreate,
}));

// --- Dynamically Import Module Under Test ---

const { create: createOutput } = await import('../src/output');

// --- Test Suite ---

describe('Output Module', () => {
    let baseConfig: Config;
    let baseOptions: Options;
    let testDate: Date;

    beforeEach(() => {
        jest.clearAllMocks();

        testDate = new Date(2024, 5, 15, 10, 30, 0); // June 15, 2024, 10:30:00

        // Mock date formatting results
        mockDateFormat.mockImplementation((date, format) => {
            if (date !== testDate) return `wrong-date-${format}`; // Basic check
            switch (format) {
                case 'YYYY': return '2024'; // DATE_FORMAT_YEAR
                case 'M': return '06'; // DATE_FORMAT_MONTH
                case 'D': return '15'; // DATE_FORMAT_DAY
                case 'YYYY-M-D': return '2024-06-15'; // DATE_FORMAT_YEAR_MONTH_DAY (for 'none' structure)
                case 'M-D': return '06-15';         // DATE_FORMAT_MONTH_DAY (for 'year' structure)
                // case 'D': return '15'; // DATE_FORMAT_DAY (for 'month' structure) - covered above
                case 'HHmm': return '1030';            // DATE_FORMAT_HOURS (for time option)
                default: return `unknown-format-${format}`;
            }
        });


        baseConfig = {
            inputDirectory: '/input', // Not directly used by output, but part of Config
            outputDirectory: '/output/base',
            outputStructure: 'none',
            outputFilenameOptions: [],
            timezone: 'UTC',
            recursive: false,
            extensions: ['eml']
        };

        baseOptions = {
            logger: {
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                verbose: jest.fn(),
                silly: jest.fn(),
            },
            // Features/allowed not directly used by output module itself, but needed for Options type
            features: [],
            allowed: {
                inputStructures: [],
                outputStructures: [],
                inputFilenameOptions: [],
                outputFilenameOptions: [],
                extensions: [],
            },
            addDefaults: false,
        };
    });

    // Helper to create instance
    const getInstance = (configOverrides: Partial<Config> = {}, optionOverrides: Partial<Options> = {}) => {
        const config = { ...baseConfig, ...configOverrides };
        const options = { ...baseOptions, ...optionOverrides };
        return createOutput(config, options);
    };

    describe('constructOutputDirectory', () => {
        it('should throw if outputDirectory is not set', () => {
            const { constructOutputDirectory } = getInstance({ outputDirectory: undefined });
            expect(() => constructOutputDirectory(testDate))
                .toThrow('Unable to Create Output: Output directory is not set');
        });

        it('should throw if outputStructure is not set', () => {
            const { constructOutputDirectory } = getInstance({ outputStructure: undefined });
            expect(() => constructOutputDirectory(testDate))
                .toThrow('Unable to Create Output: Output structure is not set');
        });


        it('should construct path for outputStructure "none"', () => {
            const { constructOutputDirectory } = getInstance({ outputStructure: 'none' });
            const result = constructOutputDirectory(testDate);
            expect(result).toBe('/output/base');
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'UTC' });
            expect(mockStorageCreate).toHaveBeenCalledWith({ log: baseOptions.logger.debug });
            expect(mockCreateDirectory).toHaveBeenCalledWith('/output/base');
        });

        it('should construct path for outputStructure "year"', () => {
            const { constructOutputDirectory } = getInstance({ outputStructure: 'year' });
            const result = constructOutputDirectory(testDate);
            const expectedPath = path.join('/output/base', '2024');
            expect(result).toBe(expectedPath);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'YYYY');
            expect(mockCreateDirectory).toHaveBeenCalledWith(expectedPath);
        });

        it('should construct path for outputStructure "month"', () => {
            const { constructOutputDirectory } = getInstance({ outputStructure: 'month' });
            const result = constructOutputDirectory(testDate);
            const expectedPath = path.join('/output/base', '2024', '06');
            expect(result).toBe(expectedPath);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'YYYY');
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'M');
            expect(mockCreateDirectory).toHaveBeenCalledWith(expectedPath);
        });

        it('should construct path for outputStructure "day"', () => {
            const { constructOutputDirectory } = getInstance({ outputStructure: 'day' });
            const result = constructOutputDirectory(testDate);
            const expectedPath = path.join('/output/base', '2024', '06', '15');
            expect(result).toBe(expectedPath);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'YYYY');
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'M');
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'D');
            expect(mockCreateDirectory).toHaveBeenCalledWith(expectedPath);
        });

        it('should use the configured timezone', () => {
            const { constructOutputDirectory } = getInstance({ timezone: 'America/New_York' });
            constructOutputDirectory(testDate);
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'America/New_York' });
        });
    });

    describe('constructFilename', () => {
        const type = 'test-type';
        const hash = 'abc123hash';

        it('should construct filename with only hash and type by default', () => {
            const { constructFilename } = getInstance();
            const filename = constructFilename(testDate, type, hash);
            expect(filename).toBe(`${hash}-${type}`);
        });

        // --- Date Option Tests ---
        it('should add date (yyyy-MM-dd) for structure "none"', () => {
            const { constructFilename } = getInstance({ outputStructure: 'none', outputFilenameOptions: ['date'] });
            const filename = constructFilename(testDate, type, hash);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'YYYY-M-D');
            expect(filename).toBe(`2024-06-15-${hash}-${type}`);
        });

        it('should add date (MM-dd) for structure "year"', () => {
            const { constructFilename } = getInstance({ outputStructure: 'year', outputFilenameOptions: ['date'] });
            const filename = constructFilename(testDate, type, hash);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'M-D');
            expect(filename).toBe(`06-15-${hash}-${type}`);
        });

        it('should add date (dd) for structure "month"', () => {
            const { constructFilename } = getInstance({ outputStructure: 'month', outputFilenameOptions: ['date'] });
            const filename = constructFilename(testDate, type, hash);
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'D');
            expect(filename).toBe(`15-${hash}-${type}`);
        });

        // formatDate itself throws if structure is 'day', this is validated upstream
        // but we can check that formatDate is not called with 'day' structure if 'date' option is present
        // (though the internal formatDate function handles this explicitly)


        // --- Time Option Tests ---
        it('should add time (HHmm) when requested', () => {
            const { constructFilename } = getInstance({ outputFilenameOptions: ['time'] });
            const filename = constructFilename(testDate, type, hash);
            // Check that a *new* Dates util is created for time formatting
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'UTC' }); // Initial create
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'UTC' }); // Second create inside constructFilename for time
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'HHmm');
            expect(filename).toBe(`1030-${hash}-${type}`);
        });


        // --- Subject Option Tests ---
        it('should add sanitized subject when requested', () => {
            const { constructFilename } = getInstance({ outputFilenameOptions: ['subject'] });
            const subject = 'Re: [Test] Subject! $pecial Characters?';
            const expectedSanitized = 'Re_Test_Subject_pecial_Characters';
            const filename = constructFilename(testDate, type, hash, { subject });
            expect(filename).toBe(`${hash}-${type}-${expectedSanitized}`);
        });

        it('should handle empty subject', () => {
            const { constructFilename } = getInstance({ outputFilenameOptions: ['subject'] });
            const filename = constructFilename(testDate, type, hash, { subject: '' });
            // Sanitizer replaces empty string with 'untitled'
            expect(filename).toBe(`${hash}-${type}-untitled`);
        });

        it('should handle subject with only special characters', () => {
            const { constructFilename } = getInstance({ outputFilenameOptions: ['subject'] });
            const filename = constructFilename(testDate, type, hash, { subject: '---///!@#' });
            // Sanitizer replaces with 'untitled' after removing leading/trailing underscores
            expect(filename).toBe(`${hash}-${type}----`);
        });


        // --- Combination Tests ---
        it('should combine date, time, and subject correctly (structure: none)', () => {
            const { constructFilename } = getInstance({
                outputStructure: 'none',
                outputFilenameOptions: ['date', 'time', 'subject']
            });
            const subject = 'Final Report';
            const filename = constructFilename(testDate, type, hash, { subject });
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'YYYY-M-D');
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'HHmm');
            expect(filename).toBe(`2024-06-15-1030-${hash}-${type}-Final_Report`);
        });

        it('should combine date, time, and subject correctly (structure: year)', () => {
            const { constructFilename } = getInstance({
                outputStructure: 'year',
                outputFilenameOptions: ['date', 'time', 'subject']
            });
            const subject = 'Yearly Summary';
            const filename = constructFilename(testDate, type, hash, { subject });
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'M-D');
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'HHmm');
            expect(filename).toBe(`06-15-1030-${hash}-${type}-Yearly_Summary`);
        });

        it('should combine time and subject correctly (structure: day, no date allowed)', () => {
            const { constructFilename } = getInstance({
                outputStructure: 'day', // Date option not allowed here, validated upstream
                outputFilenameOptions: ['time', 'subject']
            });
            const subject = 'Daily Log';
            const filename = constructFilename(testDate, type, hash, { subject });
            // formatDate should NOT be called for the date part
            expect(mockDateFormat).not.toHaveBeenCalledWith(testDate, expect.stringMatching(/^(YYYY|M|D)/));
            expect(mockDateFormat).toHaveBeenCalledWith(testDate, 'HHmm');
            expect(filename).toBe(`1030-${hash}-${type}-Daily_Log`);
        });

        it('should use the configured timezone for time formatting', () => {
            const { constructFilename } = getInstance({ timezone: 'America/New_York', outputFilenameOptions: ['time'] });
            constructFilename(testDate, type, hash);
            // Check that the *second* Dates create (for time) uses the correct timezone
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'America/New_York' }); // Initial create
            expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: 'America/New_York' }); // Second create for time
            // Ensure it was called exactly twice with this config
            expect(mockDatesCreate.mock.calls.filter(call => call[0].timezone === 'America/New_York')).toHaveLength(2);
        });
    });
});