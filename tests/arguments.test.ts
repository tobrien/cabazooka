import { jest } from '@jest/globals';
import { Command } from 'commander';
import { ArgumentError } from '../src/error/ArgumentError';

jest.unstable_mockModule('../src/util/dates', () => ({
    validTimezones: jest.fn(),
}));

jest.unstable_mockModule('../src/util/storage', () => ({
    create: jest.fn(),
}));

let Dates: any;
let Storage: any;
let Arguments: any;

describe('arguments', () => {
    let mockDates: any;
    let mockStorage: any;
    let mockStorageInstance: any;

    const options = {
        defaults: {
            timezone: 'America/New_York',
            recursive: true,
            inputDirectory: './test-input',
            outputDirectory: './test-output',
            outputStructure: 'month',
            filenameOptions: ['date', 'subject'],
            extensions: ['mp3', 'mp4']
        },
        allowed: {
            outputStructures: ['none', 'year', 'month', 'day'],
            filenameOptions: ['date', 'time', 'subject'],
            extensions: ['mp3', 'mp4', 'wav', 'webm']
        }
    };

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Import modules
        Dates = await import('../src/util/dates');
        Storage = await import('../src/util/storage');
        Arguments = await import('../src/arguments');

        // Setup dates mock
        mockDates = {
            validTimezones: jest.fn().mockReturnValue(['Etc/UTC', 'America/New_York', 'Europe/London'])
        };
        (Dates.validTimezones as jest.Mock).mockImplementation(mockDates.validTimezones);

        // Setup storage mock
        mockStorageInstance = {
            isDirectoryReadable: jest.fn(),
            isDirectoryWritable: jest.fn()
        };
        mockStorage = {
            create: jest.fn().mockReturnValue(mockStorageInstance)
        };
        (Storage.create as jest.Mock).mockImplementation(mockStorage.create);
    });

    describe('configure', () => {
        it('should configure a command with default options', async () => {
            const args = Arguments.create(options);
            const command = new Command();

            const spy = jest.spyOn(command, 'option');

            await args.configure(command);

            expect(spy).toHaveBeenCalledTimes(7);
            expect(spy).toHaveBeenCalledWith('--timezone <timezone>', expect.any(String), 'America/New_York');
            expect(spy).toHaveBeenCalledWith('-r, --recursive', expect.any(String), true);
            expect(spy).toHaveBeenCalledWith('-o, --output-directory <outputDirectory>', expect.any(String), './test-output');
            expect(spy).toHaveBeenCalledWith('-i, --input-directory <inputDirectory>', expect.any(String), './test-input');
            expect(spy).toHaveBeenCalledWith('--output-structure <type>', expect.any(String), 'month');
            expect(spy).toHaveBeenCalledWith('--filename-options [filenameOptions...]', expect.any(String), ['date', 'subject']);
            expect(spy).toHaveBeenCalledWith('--extensions [extensions...]', expect.any(String), ['mp3', 'mp4']);
        });

        it('should configure a command with fallback to constants when no defaults provided', async () => {
            const noDefaultsOptions = {
                allowed: options.allowed
                // No defaults provided
            };

            const args = Arguments.create(noDefaultsOptions);
            const command = new Command();

            const spy = jest.spyOn(command, 'option');

            await args.configure(command);

            // Should use defaults from constants
            expect(spy).toHaveBeenCalledWith('--timezone <timezone>', expect.any(String), 'Etc/UTC');
            expect(spy).toHaveBeenCalledWith('-r, --recursive', expect.any(String), false);
        });
    });

    describe('validate', () => {
        it('should validate input with all valid options', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            const result = await args.validate(input);

            expect(result).toEqual({
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            });

            expect(mockStorageInstance.isDirectoryReadable).toHaveBeenCalledWith('./valid-input');
            expect(mockStorageInstance.isDirectoryWritable).toHaveBeenCalledWith('./valid-output');
        });

        it('should use default values when not provided in input', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            // Partial input with missing values
            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                // outputStructure, filenameOptions, extensions missing
            };

            const result = await args.validate(input);

            // Should use defaults from constants
            expect(result).toEqual({
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month', // From constants
                filenameOptions: ['date', 'subject'], // From constants
                extensions: ['md'] // From constants
            });
        });

        it('should throw error for invalid input directory', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(false);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './invalid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow('Input directory does not exist: ./invalid-input');
        });

        it('should throw error for invalid output directory', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(false);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './invalid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow('Output directory does not exist: ./invalid-output');
        });

        it('should throw error for invalid output structure', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'invalid-structure',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Invalid output structure: invalid-structure');
        });

        it('should throw error for invalid filename options', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['invalid-option'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Invalid filename options: invalid-option');
        });

        it('should throw error when using date filename option with day output structure', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'day',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Cannot use date in filename when output structure is "day"');
        });

        it('should throw error for comma-separated filename options', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date,time,subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Filename options should be space-separated, not comma-separated');
        });

        it('should throw error for quoted filename options', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date time subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Filename options should not be quoted');
        });

        it('should throw error for invalid timezone', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'Invalid/Timezone',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Invalid timezone: Invalid/Timezone');
        });

        it('should throw error for invalid extensions', async () => {
            const args = Arguments.create(options);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['invalid-ext']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Invalid extensions: invalid-ext');
        });

        it('should validate with custom allowed values from options', async () => {
            // Create custom options with different allowed values
            const customOptions = {
                allowed: {
                    outputStructures: ['custom', 'format'],
                    filenameOptions: ['custom', 'option'],
                    extensions: ['custom', 'ext']
                }
            };

            const args = Arguments.create(customOptions);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'custom',
                filenameOptions: ['custom'],
                extensions: ['custom']
            };

            const result = await args.validate(input);

            expect(result.outputStructure).toBe('custom');
            expect(result.filenameOptions).toEqual(['custom']);
            expect(result.extensions).toEqual(['custom']);
        });
    });
});
