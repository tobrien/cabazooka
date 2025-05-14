import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { DefaultOptions, Feature } from '../src/cabazooka';
import {
    DATE_FORMAT_YEAR_MONTH_DAY,
    DEFAULT_EXTENSIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_INPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_STRUCTURE,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_OUTPUT_FILENAME_OPTIONS,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_RECURSIVE,
    DEFAULT_TIMEZONE
} from '../src/constants';

// --- Mock Dependencies ---
// We don't need to mock 'commander' itself, but we need a mock Command instance
// to spy on the 'option' method calls.
const mockCommand = {
    option: jest.fn(),
} as unknown as Command; // Type assertion to satisfy configure's signature

// Reset the mock before each test
beforeEach(() => {
    jest.clearAllMocks();
    // Reset the calls on the mock command object
    (mockCommand.option as jest.Mock).mockClear();
});


// --- Dynamically Import Module Under Test ---
// We need ArgumentError for some tests if configure were to throw,
// but in this case, configure primarily adds options.
const { configure, ArgumentError } = await import('../src/configure');


// --- Test Suite ---

describe('configure', () => {
    const baseDefaults: DefaultOptions = {
        timezone: DEFAULT_TIMEZONE,
        recursive: DEFAULT_RECURSIVE,
        inputDirectory: DEFAULT_INPUT_DIRECTORY,
        outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
        outputStructure: DEFAULT_OUTPUT_STRUCTURE,
        outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
        extensions: DEFAULT_EXTENSIONS,
        inputStructure: DEFAULT_INPUT_STRUCTURE,
        inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
    };

    const allFeatures: Feature[] = ['input', 'output', 'structured-output', 'extensions', 'structured-input'];

    // Helper to check if an option was added
    const expectOptionAdded = (flag: string, description: string, defaultValue?: any) => {
        const calls = (mockCommand.option as jest.Mock).mock.calls;
        // Check for call with default value (used when addDefaults = true)
        expect(calls).toContainEqual([flag, description, defaultValue]);
    };

    // Helper to check if an option was added with default in description
    const expectOptionAddedWithDescDefault = (flag: string, description: string, defaultValue?: any) => {
        const calls = (mockCommand.option as jest.Mock).mock.calls;
        const defaultDesc = defaultValue === undefined ? 'undefined' : Array.isArray(defaultValue) ? defaultValue.join(',') : defaultValue;
        const expectedDescription = `${description} (default: ${defaultDesc})`;
        // Check for call with description containing the default (used when addDefaults = false)
        expect(calls).toContainEqual([flag, expectedDescription]);
    };

    // Helper to check if an option was NOT added
    const expectOptionNotAdded = (flag: string) => {
        const calls = (mockCommand.option as jest.Mock).mock.calls;
        expect(calls).not.toContainEqual(expect.arrayContaining([flag]));
    };

    test('should add all options when all features are enabled and addDefaults is true', async () => {
        await configure(mockCommand, baseDefaults, true, allFeatures);

        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('-r, --recursive', 'recursive mode, process all files in the input directory', DEFAULT_RECURSIVE);
        expectOptionAdded('-i, --input-directory <inputDirectory>', 'input directory', DEFAULT_INPUT_DIRECTORY);
        expectOptionAdded('-o, --output-directory <outputDirectory>', 'output directory', DEFAULT_OUTPUT_DIRECTORY);
        expectOptionAdded('--output-structure <type>', 'output directory structure (none/year/month/day)', DEFAULT_OUTPUT_STRUCTURE);
        expectOptionAdded('--output-filename-options [outputFilenameOptions...]', expect.stringContaining('filename format options'), DEFAULT_OUTPUT_FILENAME_OPTIONS);
        expectOptionAdded('--extensions [extensions...]', expect.stringContaining('file extensions to process'), DEFAULT_EXTENSIONS);
        expectOptionAdded('--input-structure <type>', 'input directory structure (none/year/month/day)', DEFAULT_INPUT_STRUCTURE);
        expectOptionAdded('--input-filename-options [options...]', expect.stringContaining('filename format options'), DEFAULT_INPUT_FILENAME_OPTIONS);
        // These have undefined defaults even when addDefaults is true
        expectOptionAdded('--start <date>', `start date filter (${DATE_FORMAT_YEAR_MONTH_DAY})`, undefined);
        expectOptionAdded('--end <date>', `end date filter (${DATE_FORMAT_YEAR_MONTH_DAY}), defaults to today`, undefined);

        expect(mockCommand.option).toHaveBeenCalledTimes(12); // Ensure no extra options were added
    });

    test('should add all options with default descriptions when addDefaults is false', async () => {
        await configure(mockCommand, baseDefaults, false, allFeatures);

        // Check that descriptions contain the default value text
        expectOptionAddedWithDescDefault('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAddedWithDescDefault('-r, --recursive', 'recursive mode, process all files in the input directory', DEFAULT_RECURSIVE);
        expectOptionAddedWithDescDefault('-i, --input-directory <inputDirectory>', 'input directory', DEFAULT_INPUT_DIRECTORY);
        expectOptionAddedWithDescDefault('-o, --output-directory <outputDirectory>', 'output directory', DEFAULT_OUTPUT_DIRECTORY);
        expectOptionAddedWithDescDefault('--output-structure <type>', 'output directory structure (none/year/month/day)', DEFAULT_OUTPUT_STRUCTURE);
        expectOptionAddedWithDescDefault('--output-filename-options [outputFilenameOptions...]', 'filename format options (space-separated list of: date,time,subject) example \'date subject\'', DEFAULT_OUTPUT_FILENAME_OPTIONS);
        expectOptionAddedWithDescDefault('--extensions [extensions...]', 'file extensions to process (space-separated list of: mp3,mp4,mpeg,mpga,m4a,wav,webm)', DEFAULT_EXTENSIONS);
        expectOptionAddedWithDescDefault('--input-structure <type>', 'input directory structure (none/year/month/day)', DEFAULT_INPUT_STRUCTURE);
        expectOptionAddedWithDescDefault('--input-filename-options [options...]', 'filename format options (space-separated list of: date,time,subject)', DEFAULT_INPUT_FILENAME_OPTIONS);
        expectOptionAddedWithDescDefault('--start <date>', `start date filter (${DATE_FORMAT_YEAR_MONTH_DAY})`, undefined);
        expectOptionAddedWithDescDefault('--end <date>', `end date filter (${DATE_FORMAT_YEAR_MONTH_DAY}), defaults to today`, undefined);
        // 12 options: 11 from baseDefaults + 1 for limit
        expect(mockCommand.option).toHaveBeenCalledTimes(12);
    });


    test('should use custom defaults when addDefaults is true', async () => {
        const customDefaults: DefaultOptions = {
            timezone: 'America/New_York',
            recursive: true,
            inputDirectory: '/custom/in',
            outputDirectory: '/custom/out',
            outputStructure: 'year',
            outputFilenameOptions: ['subject'],
            extensions: ['txt', 'log'],
            inputStructure: 'day',
            inputFilenameOptions: ['time'],
        };
        await configure(mockCommand, customDefaults, true, allFeatures);

        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', 'America/New_York');
        expectOptionAdded('-r, --recursive', 'recursive mode, process all files in the input directory', true);
        expectOptionAdded('-i, --input-directory <inputDirectory>', 'input directory', '/custom/in');
        expectOptionAdded('-o, --output-directory <outputDirectory>', 'output directory', '/custom/out');
        expectOptionAdded('--output-structure <type>', 'output directory structure (none/year/month/day)', 'year');
        expectOptionAdded('--output-filename-options [outputFilenameOptions...]', expect.stringContaining('filename format options'), ['subject']);
        expectOptionAdded('--extensions [extensions...]', expect.stringContaining('file extensions to process'), ['txt', 'log']);
        expectOptionAdded('--input-structure <type>', 'input directory structure (none/year/month/day)', 'day');
        expectOptionAdded('--input-filename-options [options...]', expect.stringContaining('filename format options'), ['time']);

        expect(mockCommand.option).toHaveBeenCalledTimes(12);
    });


    test('should only add timezone if no features are specified', async () => {
        await configure(mockCommand, baseDefaults, true, []);
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expect(mockCommand.option).toHaveBeenCalledTimes(1);
    });

    test('should skip input options if "input" feature is disabled', async () => {
        const features: Feature[] = ['output', 'structured-output', 'extensions', 'structured-input']; // Exclude 'input'
        await configure(mockCommand, baseDefaults, true, features);

        expectOptionNotAdded('-r, --recursive');
        expectOptionNotAdded('-i, --input-directory <inputDirectory>');

        // Check others are still added
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('-o, --output-directory <outputDirectory>', 'output directory', DEFAULT_OUTPUT_DIRECTORY);
        expectOptionAdded('--output-structure <type>', 'output directory structure (none/year/month/day)', DEFAULT_OUTPUT_STRUCTURE);
        expect(mockCommand.option).toHaveBeenCalledTimes(11 - 2); // Total options minus the 2 skipped
    });

    test('should skip output options if "output" feature is disabled', async () => {
        const features: Feature[] = ['input', 'structured-output', 'extensions', 'structured-input']; // Exclude 'output'
        await configure(mockCommand, baseDefaults, true, features);

        expectOptionNotAdded('-o, --output-directory <outputDirectory>');

        // Check others are still added
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('-r, --recursive', 'recursive mode, process all files in the input directory', DEFAULT_RECURSIVE);
        expectOptionAdded('--output-structure <type>', 'output directory structure (none/year/month/day)', DEFAULT_OUTPUT_STRUCTURE); // Still added by structured-output
        expect(mockCommand.option).toHaveBeenCalledTimes(12 - 1);
    });


    test('should skip structured output options if "structured-output" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'extensions', 'structured-input']; // Exclude 'structured-output'
        await configure(mockCommand, baseDefaults, true, features);

        expectOptionNotAdded('--output-structure <type>');
        expectOptionNotAdded('--output-filename-options [outputFilenameOptions...]');

        // Check others are still added
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('-o, --output-directory <outputDirectory>', 'output directory', DEFAULT_OUTPUT_DIRECTORY);
        expect(mockCommand.option).toHaveBeenCalledTimes(12 - 2);
    });

    test('should skip extensions option if "extensions" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-output', 'structured-input']; // Exclude 'extensions'
        await configure(mockCommand, baseDefaults, true, features);

        expectOptionNotAdded('--extensions [extensions...]');

        // Check others are still added
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('--output-filename-options [outputFilenameOptions...]', expect.stringContaining('filename format options'), DEFAULT_OUTPUT_FILENAME_OPTIONS);
        expect(mockCommand.option).toHaveBeenCalledTimes(12 - 1);
    });

    test('should skip structured input options if "structured-input" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-output', 'extensions']; // Exclude 'structured-input'
        await configure(mockCommand, baseDefaults, true, features);

        expectOptionNotAdded('--input-structure <type>');
        expectOptionNotAdded('--input-filename-options [options...]');
        expectOptionNotAdded('--start <date>');
        expectOptionNotAdded('--end <date>');

        // Check others are still added
        expectOptionAdded('--timezone <timezone>', 'timezone for date calculations', DEFAULT_TIMEZONE);
        expectOptionAdded('--extensions [extensions...]', expect.stringContaining('file extensions to process'), DEFAULT_EXTENSIONS);
        expect(mockCommand.option).toHaveBeenCalledTimes(12 - 4);
    });

});
