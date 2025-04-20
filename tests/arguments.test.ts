import { jest } from '@jest/globals';
import { Command } from 'commander';
import { ArgumentError } from '../src/error/ArgumentError';
import { Feature } from '../src/options';
import { DEFAULT_EXTENSIONS, DEFAULT_INPUT_DIRECTORY } from '../src/constants';
// import * as Dates from '../src/util/dates'; // Remove static import
// import * as Storage from '../src/util/storage'; // Remove static import
// import * as Options from '../src/options'; // Remove static import
// import * as Arguments from '../src/arguments'; // Remove static import

jest.unstable_mockModule('../src/util/dates', () => ({
    validTimezones: jest.fn(),
}));

jest.unstable_mockModule('../src/util/storage', () => ({
    create: jest.fn(),
}));

jest.unstable_mockModule('../src/options', () => ({
    create: jest.fn(),
    DEFAULT_OPTIONS: {
        timezone: 'Etc/UTC',
        recursive: false,
        inputDirectory: './default-input',
        outputDirectory: './default-output',
        outputStructure: 'month',
        filenameOptions: ['date', 'subject'],
        extensions: ['md']
    },
    DEFAULT_ALLOWED_OPTIONS: {
        outputStructures: ['none', 'year', 'month', 'day'],
        filenameOptions: ['date', 'time', 'subject'],
        extensions: ['mp3', 'mp4', 'wav', 'webm']
    }
}));

// Add these back
let Dates: any;
let Storage: any;
let Options: any;
let Arguments: any;

describe('arguments', () => {
    jest.setTimeout(60000); // Increase timeout for hooks and tests in this suite

    let mockDates: any;
    let mockStorage: any;
    let mockOptions: any;
    let mockStorageInstance: any;
    let mockOptionsInstance: any;

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

        // Add dynamic imports back
        Dates = await import('../src/util/dates');
        Storage = await import('../src/util/storage');
        Options = await import('../src/options');
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

        // Setup options mock
        mockOptionsInstance = {
            defaults: options.defaults,
            allowed: options.allowed,
            isFeatureEnabled: jest.fn().mockReturnValue(true) // Enable all features by default
        };
        mockOptions = {
            create: jest.fn().mockReturnValue(mockOptionsInstance)
        };
        (Options.create as jest.Mock).mockImplementation(mockOptions.create);
    });

    describe('configure', () => {
        it('should configure a command with default options', async () => {
            // Use options from the mock
            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);
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

            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);

        it('should configure a command with fallback to constants when no defaults provided', async () => {
            // Mock with different default options
            const noDefaultsOptionsInstance = {
                defaults: {},
                allowed: options.allowed,
                isFeatureEnabled: jest.fn().mockReturnValue(true)
            };

            (Options.create as jest.Mock).mockReturnValueOnce(noDefaultsOptionsInstance);

            const args = Arguments.create(noDefaultsOptionsInstance);
            const command = new Command();

            const spy = jest.spyOn(command, 'option');

            await args.configure(command);

            // Should use defaults from constants
            expect(spy).toHaveBeenCalledWith('--timezone <timezone>', expect.any(String), 'Etc/UTC');
            expect(spy).toHaveBeenCalledWith('-r, --recursive', expect.any(String), false);

            expect(noDefaultsOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);
    });

    describe('validate', () => {
        it('should validate input with all valid options', async () => {
            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);

        it('should use default values when not provided in input', async () => {
            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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

            // Should use defaults from options
            expect(result).toEqual({
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month', // From options
                filenameOptions: ['date', 'subject'], // From options
                extensions: DEFAULT_EXTENSIONS // From options
            });

            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);

        it('should throw error for invalid input directory when input feature is enabled', async () => {
            // Mock to enable only input feature
            const featureCheck = (feature: Feature) => feature === 'input';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('input');
        }, 60000);

        it('should not validate input directory when input feature is disabled', async () => {
            // Mock to disable only input feature
            const featureCheck = (feature: Feature) => feature !== 'input';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(false);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                outputDirectory: './valid-output',
                outputStructure: 'month',
                filenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            // Should not throw because input feature is disabled
            const result = await args.validate(input);

            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('input');
            expect(mockStorageInstance.isDirectoryReadable).not.toHaveBeenCalled();
        }, 60000);

        it('should throw error for invalid output directory when output feature is enabled', async () => {
            // Mock to enable only output feature
            const featureCheck = (feature: Feature) => feature === 'output';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('output');
        }, 60000);

        it('should throw error for invalid output structure when structured-output feature is enabled', async () => {
            // Mock to enable only structured-output feature
            const featureCheck = (feature: Feature) => feature === 'structured-output';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('structured-output');
        }, 60000);

        it('should throw error for invalid extensions when extensions feature is enabled', async () => {
            // Mock to enable only extensions feature
            const featureCheck = (feature: Feature) => feature === 'extensions';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (Options.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = Arguments.create(mockOptionsInstance);

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
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('extensions');
        }, 60000);
    });
});
