import { jest } from '@jest/globals';
import { Feature, Logger } from 'cabazooka';
import * as path from 'path';

// Define the callback type to match the expected signature
type FileCallback = (file: string, date?: Date) => Promise<void>;

// Mock dependencies with proper type annotations
jest.unstable_mockModule('../../src/util/dates', () => ({
    create: jest.fn(() => ({
        now: jest.fn((): Date => new Date('2023-01-01T00:00:00Z')),
        subDays: jest.fn((date: Date, days: number): Date => {
            const result = new Date(date);
            result.setUTCDate(result.getUTCDate() - days);
            return result;
        }),
        parse: jest.fn((date: Date | string): Date => new Date(date)),
        format: jest.fn((): string => '2023-01-01'),
        isBefore: jest.fn((date1: Date, date2: Date): boolean => date1 < date2),
    })),
}));

jest.unstable_mockModule('../../src/util/storage', () => ({
    create: jest.fn(() => ({
        forEachFileIn: jest.fn(async (dir: string, callback: (file: string) => Promise<void>, options: any): Promise<void> => {
            const mockFiles = [
                `${dir}/2022/01/01/1200-test.txt`,
                `${dir}/2022/02/15/0830-file.md`,
                `${dir}/2023/01/01/0000-sample.json`,
            ];
            for (const file of mockFiles) {
                await callback(file);
            }
        }),
    })),
}));

// Use dynamic import to get the module after mocking
const importStructured = async () => {
    return await import('../../src/input/structured');
};

// Create a mock logger
const mockLogger: Logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
};

describe('structured.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getFilePattern', () => {
        it('should create pattern with single extension', async () => {
            const structured = await importStructured();
            const pattern = structured.getFilePattern(['extensions'], ['txt'], mockLogger);
            expect(pattern).toBe('**/*.txt');
        });

        it('should create pattern with multiple extensions', async () => {
            const structured = await importStructured();
            const pattern = structured.getFilePattern(['extensions'], ['txt', 'md', 'json'], mockLogger);
            expect(pattern).toBe('**/*.{txt,md,json}');
        });

        it('should create pattern without extensions', async () => {
            const structured = await importStructured();
            const pattern = structured.getFilePattern([], [], mockLogger);
            expect(pattern).toBe('**/*.*');
        });

        it('should throw error for extensions starting with a dot', async () => {
            const structured = await importStructured();
            expect(() => {
                structured.getFilePattern(['extensions'], ['.txt'], mockLogger);
            }).toThrow('Invalid extension format');
        });
    });

    describe('parseDateFromString', () => {
        it('should parse YYYY-M-D-HHmm format with time', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('2022-1-15-0830', 'YYYY-M-D-HHmm', true);
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse YYYY-M-D-HHmm format without time', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('2022-1-15', 'YYYY-M-D-HHmm', false);
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 0, 0)));
        });

        it('should parse M-D-HHmm format with time', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('1-15-0830', 'M-D-HHmm', true, 2022);
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse D-HHmm format with time', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('15-0830', 'D-HHmm', true, 2022, 0);
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse HHmm format with time', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('0830', 'HHmm', true, 2022, 0, 15);
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should return null for invalid date', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('invalid', 'YYYY-M-D-HHmm', true);
            expect(date).toBeNull();
        });

        it('should return null for out of range values', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromString('2022-13-32-2460', 'YYYY-M-D-HHmm', true);
            expect(date).toBeNull();
        });
    });

    describe('isDateInRange', () => {
        it('should return true when date is in range', async () => {
            const structured = await importStructured();
            const date = new Date('2022-02-15');
            const range = {
                start: new Date('2022-01-01'),
                end: new Date('2022-03-01')
            };
            expect(structured.isDateInRange(date, range)).toBe(true);
        });

        it('should return false when date is before range', async () => {
            const structured = await importStructured();
            const date = new Date('2021-12-31');
            const range = {
                start: new Date('2022-01-01'),
                end: new Date('2022-03-01')
            };
            expect(structured.isDateInRange(date, range)).toBe(false);
        });

        it('should return false when date is on or after end date (exclusive)', async () => {
            const structured = await importStructured();
            const date = new Date('2022-03-01');
            const range = {
                start: new Date('2022-01-01'),
                end: new Date('2022-03-01')
            };
            expect(structured.isDateInRange(date, range)).toBe(false);
        });

        it('should return true when range is undefined', async () => {
            const structured = await importStructured();
            const date = new Date('2022-02-15');
            expect(structured.isDateInRange(date, undefined)).toBe(true);
        });
    });

    describe('calculateDateRange', () => {
        it('should use default range when no dates provided', async () => {
            const structured = await importStructured();
            const range = structured.calculateDateRange('UTC', undefined as any, undefined as any);

            // Now should be 2023-01-01 from our mock
            expect(range.end).toEqual(new Date('2023-01-01T00:00:00Z'));

            // Start should be 31 days before
            const expected = new Date('2023-01-01T00:00:00Z');
            expected.setUTCDate(expected.getUTCDate() - 31);
            expect(range.start).toEqual(expected);
        });

        it('should use provided start date', async () => {
            const structured = await importStructured();
            const startDate = new Date('2022-12-01');
            const range = structured.calculateDateRange('UTC', startDate, undefined as any);

            expect(range.start).toEqual(startDate);
            expect(range.end).toEqual(new Date('2023-01-01T00:00:00Z'));
        });

        it('should use provided end date', async () => {
            const structured = await importStructured();
            const endDate = new Date('2022-12-31');
            const range = structured.calculateDateRange('UTC', undefined as any, endDate);

            const expected = new Date('2023-01-01T00:00:00Z');
            expected.setUTCDate(expected.getUTCDate() - 31);
            expect(range.start).toEqual(expected);
            expect(range.end).toEqual(endDate);
        });
    });

    describe('parseDateFromFilePath', () => {
        it('should parse date from filename with "none" structure', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromFilePath(
                '2022-01-15-0830-test.txt',
                '2022-01-15-0830-test.txt',
                'none',
                true,
                mockLogger
            );
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse date from path with "year" structure', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromFilePath(
                '2022/01-15-0830-test.txt',
                '01-15-0830-test.txt',
                'year',
                true,
                mockLogger
            );
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse date from path with "month" structure', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromFilePath(
                '2022/01/15-0830-test.txt',
                '15-0830-test.txt',
                'month',
                true,
                mockLogger
            );
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should parse date from path with "day" structure', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromFilePath(
                '2022/01/15/0830-test.txt',
                '0830-test.txt',
                'day',
                true,
                mockLogger
            );
            expect(date).toEqual(new Date(Date.UTC(2022, 0, 15, 8, 30)));
        });

        it('should return null for invalid path format', async () => {
            const structured = await importStructured();
            const date = structured.parseDateFromFilePath(
                'invalid/path',
                'invalid.txt',
                'year',
                true,
                mockLogger
            );
            expect(date).toBeNull();
        });
    });

    describe('processStructuredFile', () => {
        it('should process file when date is in range', async () => {
            const structured = await importStructured();
            const callback = jest.fn() as unknown as FileCallback;
            const dateRange = {
                start: new Date('2022-01-01'),
                end: new Date('2023-01-01')
            };

            const result = await structured.processStructuredFile(
                '/input/2022/01/15/0830-test.txt',
                '/input',
                'day',
                true,
                callback,
                '**/*.*',
                dateRange,
                mockLogger
            );

            expect(result).toBe(true);
            expect(callback).toHaveBeenCalledWith(
                '/input/2022/01/15/0830-test.txt',
                expect.any(Date)
            );
        });

        it('should skip file when date is out of range', async () => {
            const structured = await importStructured();
            const callback = jest.fn() as unknown as FileCallback;
            const dateRange = {
                start: new Date('2023-01-01'),
                end: new Date('2023-02-01')
            };

            const result = await structured.processStructuredFile(
                '/input/2022/01/15/0830-test.txt',
                '/input',
                'day',
                true,
                callback,
                '**/*.*',
                dateRange,
                mockLogger
            );

            expect(result).toBe(false);
            expect(callback).not.toHaveBeenCalled();
        });

        it('should skip if file path cannot be parsed', async () => {
            const structured = await importStructured();
            const callback = jest.fn() as unknown as FileCallback;
            const dateRange = {
                start: new Date('2022-01-01'),
                end: new Date('2023-01-01')
            };

            const result = await structured.processStructuredFile(
                '/input',
                '/input',
                'day',
                true,
                callback,
                '**/*.*',
                dateRange,
                mockLogger
            );

            expect(result).toBe(false);
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('process', () => {
        it('should process files in directory', async () => {
            const structured = await importStructured();
            const callback = jest.fn() as unknown as FileCallback;
            const features: Feature[] = [];
            const extensions = ['txt', 'md', 'json'];

            const fileCount = await structured.process(
                'day',
                ['time'],
                extensions,
                'UTC',
                new Date('2022-01-01'),
                new Date('2023-01-01'),
                undefined,
                features,
                mockLogger,
                '/input',
                callback
            );

            // Our mock has 3 files
            expect(fileCount).toBe(2);
            expect(callback).toHaveBeenCalledTimes(2);
        });
    });
});
