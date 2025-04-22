import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/util/dates', () => ({
    create: jest.fn()
}));

jest.unstable_mockModule('../src/util/storage', () => ({
    create: jest.fn()
}));

let Dates: any;
let Storage: any;
let Logging: any;
let Output: any;

describe('output', () => {
    let mockDates: any;
    let mockStorage: any;
    let mockLogger: any;
    let outputInstance: any;

    const mockConfig = {
        outputDirectory: '/test/output',
        outputStructure: 'year',
        outputFilenameOptions: ['date', 'time']
    };

    const mockOptions = {};

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        Dates = await import('../src/util/dates');
        Storage = await import('../src/util/storage');
        Output = await import('../src/output');

        // Setup dates mock
        mockDates = {
            format: jest.fn(),
            date: jest.fn()
        };
        (Dates.create as jest.Mock).mockReturnValue(mockDates);

        // Setup storage mock
        mockStorage = {
            createDirectory: jest.fn()
        };
        (Storage.create as jest.Mock).mockReturnValue(mockStorage);

        // Setup logger mock
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Create output instance
        outputInstance = Output.create(
            'America/New_York',
            mockConfig,
            mockOptions,
            mockLogger
        );
    });

    describe('constructFilename', () => {
        it('should construct filename with date and time when options are enabled', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test Subject';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-Test_Subject');
            expect(mockDates.format).toHaveBeenCalledTimes(2);
        });

        it('should construct filename without date and time when options are disabled', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test Subject';

            // Create output instance without date/time options
            const configWithoutOptions = {
                ...mockConfig,
                outputFilenameOptions: []
            };

            const outputWithoutOptions = Output.create(
                'America/New_York',
                configWithoutOptions,
                mockOptions,
                mockLogger
            );

            const filename = outputWithoutOptions.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('test-hash-note-Test_Subject');
            expect(mockDates.format).not.toHaveBeenCalled();
        });

        it('should sanitize subject in filename', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test Subject with spaces & special chars!@#$';

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toContain('Test_Subject_with_spaces___special_chars');
        });

        it('should handle a subject with only invalid characters', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = '!@#$%^&*()';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-untitled');
        });

        it('should handle an empty subject', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = '';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note');
        });

        it('should handle undefined subject', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash);

            expect(filename).toBe('2024-03-15-1430-test-hash-note');
        });

        it('should handle only date in filenameOptions', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test Subject';

            // Create output instance with only date option
            const configWithDateOnly = {
                ...mockConfig,
                outputFilenameOptions: ['date']
            };

            const outputWithDateOnly = Output.create(
                'America/New_York',
                configWithDateOnly,
                mockOptions,
                mockLogger
            );

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date

            const filename = outputWithDateOnly.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-test-hash-note-Test_Subject');
            expect(mockDates.format).toHaveBeenCalledTimes(1);
        });

        it('should handle only time in filenameOptions', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test Subject';

            // Create output instance with only time option
            const configWithTimeOnly = {
                ...mockConfig,
                outputFilenameOptions: ['time']
            };

            const outputWithTimeOnly = Output.create(
                'America/New_York',
                configWithTimeOnly,
                mockOptions,
                mockLogger
            );

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputWithTimeOnly.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('1430-test-hash-note-Test_Subject');
            expect(mockDates.format).toHaveBeenCalledTimes(1);
        });
    });

    describe('constructOutputDirectory', () => {
        it('should construct year-based directory structure', () => {
            const creationTime = new Date();

            // Mock date formatting
            mockDates.date.mockReturnValueOnce(creationTime);
            mockDates.format.mockReturnValueOnce('2024'); // year
            mockDates.format.mockReturnValueOnce('03');   // month
            mockDates.format.mockReturnValueOnce('15');   // day

            const outputPath = outputInstance.constructOutputDirectory(creationTime);

            expect(outputPath).toBe('/test/output/2024');
            expect(mockStorage.createDirectory).toHaveBeenCalledWith('/test/output/2024');
        });

        it('should construct month-based directory structure', () => {
            const creationTime = new Date();

            // Create output instance with month structure
            const configWithMonth = {
                ...mockConfig,
                outputStructure: 'month'
            };

            const outputWithMonth = Output.create(
                'America/New_York',
                configWithMonth,
                mockOptions,
                mockLogger
            );

            // Mock date formatting
            mockDates.date.mockReturnValueOnce(creationTime);
            mockDates.format.mockReturnValueOnce('2024'); // year
            mockDates.format.mockReturnValueOnce('03');   // month
            mockDates.format.mockReturnValueOnce('15');   // day

            const outputPath = outputWithMonth.constructOutputDirectory(creationTime);

            expect(outputPath).toBe('/test/output/2024/03');
            expect(mockStorage.createDirectory).toHaveBeenCalledWith('/test/output/2024/03');
        });

        it('should construct day-based directory structure', () => {
            const creationTime = new Date();

            // Create output instance with day structure
            const configWithDay = {
                ...mockConfig,
                outputStructure: 'day'
            };

            const outputWithDay = Output.create(
                'America/New_York',
                configWithDay,
                mockOptions,
                mockLogger
            );

            // Mock date formatting
            mockDates.date.mockReturnValueOnce(creationTime);
            mockDates.format.mockReturnValueOnce('2024'); // year
            mockDates.format.mockReturnValueOnce('03');   // month
            mockDates.format.mockReturnValueOnce('15');   // day

            const outputPath = outputWithDay.constructOutputDirectory(creationTime);

            expect(outputPath).toBe('/test/output/2024/03/15');
            expect(mockStorage.createDirectory).toHaveBeenCalledWith('/test/output/2024/03/15');
        });

        it('should construct flat directory structure when outputStructure is invalid', () => {
            const creationTime = new Date();

            // Create output instance with invalid structure
            const configWithInvalidStructure = {
                ...mockConfig,
                outputStructure: 'invalid' as any
            };

            const outputWithInvalidStructure = Output.create(
                'America/New_York',
                configWithInvalidStructure,
                mockOptions,
                mockLogger
            );

            const outputPath = outputWithInvalidStructure.constructOutputDirectory(creationTime);

            expect(outputPath).toBe('/test/output');
            expect(mockStorage.createDirectory).toHaveBeenCalledWith('/test/output');
        });
    });

    describe('formatDate', () => {
        it('should throw an error when trying to use date in filename with day outputStructure', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';

            // Create output instance with day structure
            const configWithDay = {
                ...mockConfig,
                outputStructure: 'day',
                outputFilenameOptions: ['date']
            };

            const outputWithDay = Output.create(
                'America/New_York',
                configWithDay,
                mockOptions,
                mockLogger
            );

            expect(() => {
                outputWithDay.constructFilename(date, type, hash);
            }).toThrow('Cannot use date in filename when output structure is "day"');
        });

        it('should use YYYY-MM-DD format when outputStructure is none', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';

            // Create output instance with none structure
            const configWithNone = {
                ...mockConfig,
                outputStructure: 'none',
                outputFilenameOptions: ['date']
            };

            const outputWithNone = Output.create(
                'America/New_York',
                configWithNone,
                mockOptions,
                mockLogger
            );

            // Mock date formatting - full date
            mockDates.format.mockReturnValueOnce('2024-03-15');
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputWithNone.constructFilename(date, type, hash);

            expect(filename).toBe('2024-03-15-test-hash-note');
            expect(mockDates.format).toHaveBeenCalledTimes(1);
        });

        it('should use MM-DD format when outputStructure is year', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';

            // Create output instance with year structure
            const configWithYear = {
                ...mockConfig,
                outputStructure: 'year',
                outputFilenameOptions: ['date']
            };

            const outputWithYear = Output.create(
                'America/New_York',
                configWithYear,
                mockOptions,
                mockLogger
            );

            // Mock date formatting - month-day
            mockDates.format.mockReturnValueOnce('03-15');
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputWithYear.constructFilename(date, type, hash);

            expect(filename).toBe('03-15-test-hash-note');
            expect(mockDates.format).toHaveBeenCalledTimes(1);
        });

        it('should use DD format when outputStructure is month', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';

            // Create output instance with month structure
            const configWithMonth = {
                ...mockConfig,
                outputStructure: 'month',
                outputFilenameOptions: ['date']
            };

            const outputWithMonth = Output.create(
                'America/New_York',
                configWithMonth,
                mockOptions,
                mockLogger
            );

            // Mock date formatting - day only
            mockDates.format.mockReturnValueOnce('15');
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputWithMonth.constructFilename(date, type, hash);

            expect(filename).toBe('15-test-hash-note');
            expect(mockDates.format).toHaveBeenCalledTimes(1);
        });
    });

    describe('sanitizeFilenameString', () => {
        it('should replace special characters with underscores', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test/Subject:with*special?chars';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-Test_Subject_with_special_chars');
        });

        it('should replace multiple consecutive hyphens with a single underscore', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test---Subject';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-Test_Subject');
        });

        it('should remove leading and trailing underscores', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = '___Test Subject___';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-Test_Subject');
        });

        it('should preserve alphanumeric characters, hyphens, underscores, and dots', () => {
            const date = new Date();
            const type = 'note';
            const hash = 'test-hash';
            const subject = 'Test-Subject_with.dots123';

            // Mock date formatting
            mockDates.format.mockReturnValueOnce('2024-03-15'); // date
            mockDates.format.mockReturnValueOnce('1430'); // time

            const filename = outputInstance.constructFilename(date, type, hash, { subject });

            expect(filename).toBe('2024-03-15-1430-test-hash-note-Test_Subject_with.dots123');
        });
    });
});
