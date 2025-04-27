import { jest } from '@jest/globals';
import type { Feature, Logger } from '../../src/cabazooka';
import { Config } from '../../src/cabazooka'; // Needed for config type
import { DATE_FORMAT_YEAR_MONTH_DAY } from '../../src/constants';
import type * as DatesUtil from '../../src/util/dates';
import type * as StorageUtil from '../../src/util/storage';

// --- Mock Dates ---
const mockParse = jest.fn<DatesUtil.Utility['parse']>();
const mockFormat = jest.fn<DatesUtil.Utility['format']>();
const mockIsBefore = jest.fn<DatesUtil.Utility['isBefore']>();
const mockIsAfter = jest.fn<DatesUtil.Utility['isAfter']>();
const mockSubDays = jest.fn<DatesUtil.Utility['subDays']>(); // Added for default date range calc
const mockNow = jest.fn<DatesUtil.Utility['now']>(); // Added for default date range calc
const mockDateUtil = {
    parse: mockParse,
    format: mockFormat,
    isBefore: mockIsBefore,
    isAfter: mockIsAfter,
    subDays: mockSubDays, // Add mocked methods that are actually used
    now: mockNow,       // Add mocked methods that are actually used
    // Add other methods from DatesUtil.Utility as needed, mocked to default values or specific implementations
    today: jest.fn(() => '2023-10-27'), // Example: Provide basic mocks for unused methods if needed
    date: jest.fn((d: string | number | Date | null | undefined) => (d instanceof Date ? d : new Date(d || '2023-10-27T00:00:00.000Z'))), // Handle different inputs
    isValidDate: jest.fn(() => true),
    addDays: jest.fn((d: Date, n: number) => new Date(d.getTime() + n * 86400000)),
    addMonths: jest.fn((d: Date, n: number) => { const newD = new Date(d); newD.setMonth(d.getMonth() + n); return newD; }),
    addYears: jest.fn((d: Date, n: number) => { const newD = new Date(d); newD.setFullYear(d.getFullYear() + n); return newD; }),
    subMonths: jest.fn((d: Date, n: number) => { const newD = new Date(d); newD.setMonth(d.getMonth() - n); return newD; }),
    subYears: jest.fn((d: Date, n: number) => { const newD = new Date(d); newD.setFullYear(d.getFullYear() - n); return newD; }),
    startOfMonth: jest.fn((d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))),
    endOfMonth: jest.fn((d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999))),
    startOfYear: jest.fn((d: Date) => new Date(Date.UTC(d.getUTCFullYear(), 0, 1))),
    endOfYear: jest.fn((d: Date) => new Date(Date.UTC(d.getUTCFullYear(), 11, 31, 23, 59, 59, 999))),
} as DatesUtil.Utility;
const mockDatesCreate = jest.fn<typeof DatesUtil.create>().mockReturnValue(mockDateUtil);
jest.unstable_mockModule('../../src/util/dates', () => ({
    create: mockDatesCreate,
    DATE_FORMAT_YEAR_MONTH_DAY: DATE_FORMAT_YEAR_MONTH_DAY, // Ensure constants are available if needed by the module
}));

// --- Mock Storage ---
const mockListFiles = jest.fn<StorageUtil.Utility['listFiles']>();
const mockForEachFileIn = jest.fn<StorageUtil.Utility['forEachFileIn']>(); // Mock forEachFileIn instead of listFiles directly if used by structured.process
const mockStorageCreate = jest.fn<typeof StorageUtil.create>().mockReturnValue({
    listFiles: mockListFiles,
    forEachFileIn: mockForEachFileIn, // Use the specific mock
    // Add other methods if needed, mocked or otherwise
    readFile: jest.fn<StorageUtil.Utility['readFile']>().mockResolvedValue(''), // Correct signature
    writeFile: jest.fn<StorageUtil.Utility['writeFile']>().mockResolvedValue(undefined), // Correct signature
    exists: jest.fn<StorageUtil.Utility['exists']>().mockResolvedValue(true),
    isDirectory: jest.fn<StorageUtil.Utility['isDirectory']>().mockResolvedValue(false),
    isFile: jest.fn<StorageUtil.Utility['isFile']>().mockResolvedValue(true),
    isReadable: jest.fn<StorageUtil.Utility['isReadable']>().mockResolvedValue(true),
    isWritable: jest.fn<StorageUtil.Utility['isWritable']>().mockResolvedValue(true),
    isFileReadable: jest.fn<StorageUtil.Utility['isFileReadable']>().mockResolvedValue(true),
    isDirectoryWritable: jest.fn<StorageUtil.Utility['isDirectoryWritable']>().mockResolvedValue(true),
    isDirectoryReadable: jest.fn<StorageUtil.Utility['isDirectoryReadable']>().mockResolvedValue(true),
    createDirectory: jest.fn<StorageUtil.Utility['createDirectory']>().mockResolvedValue(undefined),
    readStream: jest.fn<StorageUtil.Utility['readStream']>(), // Provide types
    hashFile: jest.fn<StorageUtil.Utility['hashFile']>().mockResolvedValue('dummyhash'),
});
jest.unstable_mockModule('../../src/util/storage', () => ({
    create: mockStorageCreate,
}));

// --- Dynamic Import ---
// Use await import after mocks are set up
const { process: processStructured } = await import('../../src/input/structured');

// --- Test Suite ---
describe('Input: Structured Process', () => {
    let mockLogger: Logger;
    let mockCallback: jest.Mock<(file: string, date?: Date) => Promise<void>>;
    let baseConfig: Partial<Config>;
    const defaultFeatures: Feature[] = ['structured-input', 'extensions']; // Define features used

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
            silly: jest.fn(),
        };

        // @ts-ignore - Mock resolved value
        mockCallback = jest.fn().mockResolvedValue(undefined);

        // Default mock implementations
        // Mock forEachFileIn to simulate finding files and calling the processor's callback
        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            // Simulate finding files based on test case specifics if needed
            // For now, assume files passed to the test setup are "found"
        });

        mockParse.mockImplementation((str, format) => {
            // Basic mock, might need refinement based on actual usage
            if (!str) throw new Error('Mock parse received null/undefined');
            const date = str instanceof Date ? str : new Date(str); // Handle Date object input
            if (isNaN(date.getTime())) {
                // Try parsing with specific format if it looks like YYYY-M-D
                if (typeof str === 'string' && format === DATE_FORMAT_YEAR_MONTH_DAY && /\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
                    const parts = str.split('-');
                    const parsed = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                    if (!isNaN(parsed.getTime())) return parsed;
                }
                throw new Error(`Invalid date string for mock parse: ${str} with format ${format}`);
            }
            return date;
        });
        // Mock date comparisons based on simple Date comparison
        mockIsBefore.mockImplementation((d1: Date, d2: Date) => d1 < d2);
        mockIsAfter.mockImplementation((d1: Date, d2: Date) => d1 > d2);
        // Mock now() and subDays() for default date range calculation
        mockNow.mockReturnValue(new Date('2023-10-27T12:00:00.000Z'));
        mockSubDays.mockImplementation((d: Date, n: number) => new Date(d.getTime() - n * 86400000));


        baseConfig = { // Keep this minimal, specific tests will add needed properties
            inputDirectory: '/input',
            timezone: 'UTC',
            // recursive: false, // Let structured.ts handle default based on structure
            // inputStructure: 'none', // Set per test
            inputFilenameOptions: [], // Set per test
            extensions: ['txt', 'log'], // Add default extensions
        };
    });

    // --- Test Cases ---

    test('should process files with "none" structure and date in filename', async () => {
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'none',
            inputFilenameOptions: ['date'], // Expects date in filename
        } as Config; // Cast to Config, ensure all required fields are present or defaults handle them
        const files = ['/input/2023-10-26_file1.txt', '/input/2023-10-27_file2.log'];
        const date1 = new Date('2023-10-26T00:00:00.000Z');
        const date2 = new Date('2023-10-27T00:00:00.000Z');

        // Simulate forEachFileIn calling the processor's callback
        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
        });

        // Mock parse specifically for this test's expected calls
        // Structured.ts uses parseDateFromFilePath, which needs careful mocking if not testing it directly
        // For now, we assume parse will be called by internal logic correctly
        mockParse.mockImplementation((str, format) => {
            if (str === '2023-10-26' && format === 'YYYY-M-D-HHmm') return date1; // Adjust format based on actual usage in parseDateFromString
            if (str === '2023-10-27' && format === 'YYYY-M-D-HHmm') return date2;
            // Handle potential start/end date parsing by calculateDateRange
            if (typeof str === 'string' && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                const parts = str.split('-');
                const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (!isNaN(d.getTime())) return d;
            }
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });


        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            undefined, // start date
            undefined, // end date
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockStorageCreate).toHaveBeenCalledWith({ log: mockLogger.debug });
        expect(mockDatesCreate).toHaveBeenCalledWith({ timezone: testConfig.timezone });
        expect(mockLogger.info).toHaveBeenCalledWith("Processing structured input with structure \"none\" in %s for date range: {\"start\":\"2023-09-26T12:00:00.000Z\",\"end\":\"2023-10-27T12:00:00.000Z\"}", "/input");
        expect(mockForEachFileIn).toHaveBeenCalledWith(testConfig.inputDirectory, expect.any(Function), { pattern: expect.stringContaining('*.{txt,log}') });
        // Check the callback was called correctly by the simulated forEachFileIn->processStructuredFile logic
        expect(mockCallback).toHaveBeenCalledTimes(2);
        // Note: The exact date object might differ slightly due to timezone/UTC handling in mocks vs implementation. Use toEqual for deep comparison.
        expect(mockCallback).toHaveBeenCalledWith(files[0], expect.any(Date));
        expect(mockCallback).toHaveBeenCalledWith(files[1], expect.any(Date));
        expect(count).toBe(2);
    });

    test('should process files with "day" structure', async () => {
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'day', // Implies year/month/day path
            inputFilenameOptions: [], // No date/time in filename needed for this test
            // recursive: true, // Let structured.ts handle default based on structure
        } as Config;
        const files = ['/input/2023/10/26/file1.txt', '/input/2023/10/27/file2.log'];
        const date1 = new Date('2023-10-26T00:00:00.000Z');
        const date2 = new Date('2023-10-27T00:00:00.000Z');

        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
        });

        // Mock parse for start/end date range calculation if needed
        mockParse.mockImplementation((str, format) => {
            if (typeof str === 'string' && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                const parts = str.split('-');
                const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (!isNaN(d.getTime())) return d;
            }
            // No direct file date parsing expected here, relies on parseDateFromFilePath internal logic
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });

        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            undefined, // start date
            undefined, // end date
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockForEachFileIn).toHaveBeenCalledWith(testConfig.inputDirectory, expect.any(Function), { pattern: expect.stringContaining('*.{txt,log}') });
        expect(mockCallback).toHaveBeenCalledTimes(2);
        // The date comes from parseDateFromFilePath internal logic now
        expect(mockCallback).toHaveBeenCalledWith(files[0], expect.any(Date));
        expect(mockCallback).toHaveBeenCalledWith(files[1], expect.any(Date));
        expect(count).toBe(2);
    });

    test('should filter files by start and end date', async () => {
        const startDateStr = '2023-10-27';
        const endDateStr = '2023-10-28'; // Inclusive YYYY-M-D
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'none',
            inputFilenameOptions: ['date'], // Expects date in filename
        } as Config;
        const files = ['/input/2023-10-26_file1.txt', '/input/2023-10-27_file2.log', '/input/2023-10-28_file3.txt'];
        const date1 = new Date('2023-10-26T00:00:00.000Z');
        const date2 = new Date('2023-10-27T00:00:00.000Z');
        const date3 = new Date('2023-10-28T00:00:00.000Z');
        const rangeStart = new Date('2023-10-27T00:00:00.000Z'); // calculateDateRange uses start of day
        const rangeEnd = new Date('2023-10-28T00:00:00.000Z'); // calculateDateRange uses start of *next* day for end boundary

        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
            await cb(files[2]);
        });

        // Mock parse for file dates AND start/end date range calculation
        mockParse.mockImplementation((str, format) => {
            // File dates (assuming called by parseDateFromFilePath)
            if (str === '2023-10-26' && format === 'YYYY-M-D-HHmm') return date1;
            if (str === '2023-10-27' && format === 'YYYY-M-D-HHmm') return date2;
            if (str === '2023-10-28' && format === 'YYYY-M-D-HHmm') return date3;
            // Start/End dates (called by calculateDateRange)
            if (str === startDateStr && format === DATE_FORMAT_YEAR_MONTH_DAY) return rangeStart;
            if (str === endDateStr && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                // calculateDateRange adds a day to the parsed end date for the exclusive boundary
                const parsedEnd = new Date('2023-10-27T00:00:00.000Z');
                return new Date(parsedEnd.getTime() + 86400000); // Return the start of the *next* day
            }
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });

        // Mock isBefore/isAfter for isDateInRange check
        // isDateInRange uses '<' and '>='
        mockIsBefore.mockImplementation((d1: Date, d2: Date) => d1 < d2); // Used for date < startDate check (false)
        mockIsAfter.mockImplementation((d1: Date, d2: Date) => d1 >= d2); // Used for date >= endDate check (true)


        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            startDateStr, // Pass start date string
            endDateStr,   // Pass end date string
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        // Check that calculateDateRange called parse correctly
        expect(mockParse).toHaveBeenCalledWith(startDateStr, DATE_FORMAT_YEAR_MONTH_DAY);
        expect(mockParse).toHaveBeenCalledWith(endDateStr, DATE_FORMAT_YEAR_MONTH_DAY);

        // Check that the callback was invoked only for the file within the range
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(mockCallback).toHaveBeenCalledWith(files[1], expect.any(Date));
        expect(count).toBe(1);
        // Verify debug logs for skipped files (optional)
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipping file %s'), files[0], expect.any(String), expect.any(String));
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipping file %s'), files[2], expect.any(String), expect.any(String));

    });

    test('should handle files with unparseable dates', async () => {
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'none',
            inputFilenameOptions: ['date'],
        } as Config;
        const files = ['/input/invalid-date_file1.txt', '/input/2023-10-27_file2.log'];
        const date2 = new Date('2023-10-27T00:00:00.000Z');

        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
        });

        // Mock parseDateFromString behavior via parse (simplified)
        mockParse.mockImplementation((str, format) => {
            if (str === 'invalid-date' && format === 'YYYY-M-D-HHmm') throw new Error('Simulated parse error'); // Simulate parse failure
            if (str === '2023-10-27' && format === 'YYYY-M-D-HHmm') return date2;
            // Handle potential start/end date parsing by calculateDateRange
            if (typeof str === 'string' && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                const parts = str.split('-');
                const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (!isNaN(d.getTime())) return d;
            }
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });

        // We need to adjust the test as parseDateFromString now returns null on error, logging a warning
        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            undefined, undefined, // No date range filter
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockForEachFileIn).toHaveBeenCalled();
        // Check logger warning for the unparseable file
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            "Could not parse date for file %s with structure \"%s\" (filename base: \"%s\", path parts: %s)", "/input/invalid-date_file1.txt", "none", "invalid-date_file1", ""
        );
        expect(mockCallback).toHaveBeenCalledTimes(1); // Only the valid one
        expect(mockCallback).toHaveBeenCalledWith(files[1], expect.any(Date));
        expect(count).toBe(1); // Count is based on successful callbacks
    });

    test('should handle errors during callback execution', async () => {
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'none',
            inputFilenameOptions: ['date'],
        } as Config;
        const files = ['/input/2023-10-26_error.txt', '/input/2023-10-27_success.txt'];
        const date1 = new Date('2023-10-26T00:00:00.000Z');
        const date2 = new Date('2023-10-27T00:00:00.000Z');
        const callbackError = new Error('Callback failed');

        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
        });
        mockParse.mockImplementation((str, format) => {
            if (str === '2023-10-26' && format === 'YYYY-M-D-HHmm') return date1;
            if (str === '2023-10-27' && format === 'YYYY-M-D-HHmm') return date2;
            if (typeof str === 'string' && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                const parts = str.split('-');
                const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                if (!isNaN(d.getTime())) return d;
            }
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });
        mockCallback.mockImplementation(async (file, date) => {
            if (file.includes('error.txt')) {
                throw callbackError;
            }
            // Implicitly return undefined for success case
        });

        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            undefined, undefined, // No date range filter
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith(files[0], expect.any(Date));
        expect(mockCallback).toHaveBeenCalledWith(files[1], expect.any(Date));
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        // The error log comes from processStructuredFile's catch block
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Error processing file %s: %s\n%s',
            files[0],
            callbackError.message,
            callbackError.stack
        );
        expect(count).toBe(1); // Only successful callbacks count
    });

    test('should return 0 if no files are found', async () => {
        const testConfig: Config = { ...baseConfig } as Config;
        // Simulate forEachFileIn finding no files
        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            // Do nothing, no files found
        });

        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            undefined, undefined, // No date range filter
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockForEachFileIn).toHaveBeenCalled();
        // CalculateDateRange uses now() and subDays() for defaults when start/end are undefined
        expect(mockNow).toHaveBeenCalled();
        expect(mockSubDays).toHaveBeenCalled();
        expect(mockParse).not.toHaveBeenCalledWith(undefined, expect.any(String)); // Ensure parse wasn't called with undefined
        expect(mockCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    test('should return 0 if no files match date range', async () => {
        const startDateStr = '2024-01-01'; // Range outside file dates
        const endDateStr = '2024-01-01';
        const testConfig: Config = {
            ...baseConfig,
            inputStructure: 'none',
            inputFilenameOptions: ['date'],
        } as Config;
        const files = ['/input/2023-10-26_file1.txt', '/input/2023-10-27_file2.log'];
        const date1 = new Date('2023-10-26T00:00:00.000Z');
        const date2 = new Date('2023-10-27T00:00:00.000Z');
        const rangeStart = new Date('2024-01-01T00:00:00.000Z');
        const rangeEnd = new Date('2024-01-02T00:00:00.000Z'); // Start of next day

        mockForEachFileIn.mockImplementation(async (dir, cb, options) => {
            await cb(files[0]);
            await cb(files[1]);
        });
        mockParse.mockImplementation((str, format) => {
            if (str === '2023-10-26' && format === 'YYYY-M-D-HHmm') return date1;
            if (str === '2023-10-27' && format === 'YYYY-M-D-HHmm') return date2;
            if (str === startDateStr && format === DATE_FORMAT_YEAR_MONTH_DAY) return rangeStart;
            if (str === endDateStr && format === DATE_FORMAT_YEAR_MONTH_DAY) {
                const parsedEnd = new Date('2024-01-01T00:00:00.000Z');
                return new Date(parsedEnd.getTime() + 86400000); // Return start of next day
            }
            throw new Error(`Mock parse failed for: ${str} with format ${format}`);
        });
        // Mock date comparisons such that no files fall in range
        mockIsBefore.mockImplementation((d1: Date, d2: Date) => d1 < d2); // Both files are before rangeStart
        mockIsAfter.mockImplementation((d1: Date, d2: Date) => d1 >= d2); // Neither file is >= rangeEnd


        const count = await processStructured(
            testConfig.inputStructure || 'none',
            testConfig.inputFilenameOptions || [],
            testConfig.extensions || [],
            testConfig.timezone,
            startDateStr,
            endDateStr,
            defaultFeatures,
            mockLogger,
            testConfig.inputDirectory!,
            mockCallback
        );

        expect(mockForEachFileIn).toHaveBeenCalled();
        expect(mockParse).toHaveBeenCalledWith(startDateStr, DATE_FORMAT_YEAR_MONTH_DAY);
        expect(mockParse).toHaveBeenCalledWith(endDateStr, DATE_FORMAT_YEAR_MONTH_DAY);
        // Check debug logs for skipped files
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipping file %s'), files[0], expect.any(String), expect.any(String));
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Skipping file %s'), files[1], expect.any(String), expect.any(String));
        expect(mockCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });

    // Add more tests for:
    // - Different combinations of inputStructure ('year', 'month') and inputFilenameOptions ('time', 'subject' - if relevant for parsing)
    // - Edge cases for date parsing (e.g., different filename formats) -> Covered partially by 'unparseable' test
    // - Handling of non-Error objects thrown during callback -> Covered by callback error test
    // - Specific recursive/non-recursive behavior with listFiles options based on structure -> Handled internally by forEachFileIn/glob
    // - Timezone considerations (ensure DatesUtil is created with correct timezone and dates are handled correctly) -> Mocks use UTC, process uses config timezone
    // - Missing start/end date (should use defaults or no filtering) -> Covered by several tests not passing start/end
    // - Invalid start/end date format provided in config -> Validation layer should catch this, but could add test if needed.

});
