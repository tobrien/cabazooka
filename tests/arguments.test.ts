import { jest } from '@jest/globals';
import { Command } from 'commander';
import { ArgumentError } from '../src/error/ArgumentError';
import { Feature } from '../src/options';
import { DEFAULT_EXTENSIONS, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE, DEFAULT_INPUT_DIRECTORY, DEFAULT_OUTPUT_DIRECTORY, ALLOWED_OUTPUT_FILENAME_OPTIONS, ALLOWED_OUTPUT_STRUCTURES } from '../src/constants';
// import * as Dates from '../src/util/dates'; // Remove static import
// import * as Storage from '../src/util/storage'; // Remove static import
// import * as Options from '../src/options'; // Remove static import
import { Config, Input } from "../src/cabazooka";
import { createOptions, Options, FilenameOption, OutputStructure } from "../src/options";

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
        outputFilenameOptions: ['date', 'subject'],
        extensions: ['md']
    },
    DEFAULT_ALLOWED_OPTIONS: {
        outputStructures: ['none', 'year', 'month', 'day'],
        outputFilenameOptions: ['date', 'time', 'subject'],
        extensions: ['mp3', 'mp4', 'wav', 'webm']
    }
}));

// Add these back
let Dates: any;
let Storage: any;
let Options: any;
let Arguments: any;

// Move dynamic imports here, outside beforeEach
let DatesModule: any;
let StorageModule: any;
let OptionsModule: any; // Renamed to avoid conflict with the 'Options' type/interface
let ArgumentsModule: any; // Renamed to avoid conflict

describe('arguments', () => {
    jest.setTimeout(60000); // Increase timeout for hooks and tests in this suite

    // Initialize modules once before all tests
    beforeAll(async () => {
        DatesModule = await import('../src/util/dates');
        StorageModule = await import('../src/util/storage');
        OptionsModule = await import('../src/options');
        ArgumentsModule = await import('../src/arguments');
    });

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
            outputFilenameOptions: ['date', 'subject'],
            extensions: ['mp3', 'mp4']
        },
        allowed: {
            outputStructures: ['none', 'year', 'month', 'day'],
            outputFilenameOptions: ['date', 'time', 'subject'],
            extensions: ['mp3', 'mp4', 'wav', 'webm']
        }
    };

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup dates mock
        mockDates = {
            validTimezones: jest.fn().mockReturnValue(['Etc/UTC', 'America/New_York', 'Europe/London'])
        };

        // Setup storage mock
        mockStorageInstance = {
            isDirectoryReadable: jest.fn(),
            isDirectoryWritable: jest.fn()
        };
        mockStorage = {
            create: jest.fn().mockReturnValue(mockStorageInstance)
        };
        (StorageModule.create as jest.Mock).mockImplementation(mockStorage.create);

        // Setup options mock
        mockOptionsInstance = {
            defaults: options.defaults,
            allowed: options.allowed,
            isFeatureEnabled: jest.fn().mockReturnValue(true) // Enable all features by default
        };
        mockOptions = {
            create: jest.fn().mockReturnValue(mockOptionsInstance)
        };
        (OptionsModule.create as jest.Mock).mockImplementation(mockOptions.create);
    });

    describe('configure', () => {
        it('should configure a command with default options', async () => {
            // Use options from the mock
            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);
            const command = new Command();

            const spy = jest.spyOn(command, 'option');

            await args.configure(command);

            expect(spy).toHaveBeenCalledTimes(11);
            expect(spy).toHaveBeenCalledWith('--timezone <timezone>', expect.any(String), 'America/New_York');
            expect(spy).toHaveBeenCalledWith('-r, --recursive', expect.any(String), true);
            expect(spy).toHaveBeenCalledWith('-o, --output-directory <outputDirectory>', expect.any(String), './test-output');
            expect(spy).toHaveBeenCalledWith('-i, --input-directory <inputDirectory>', expect.any(String), './test-input');
            expect(spy).toHaveBeenCalledWith('--output-structure <type>', expect.any(String), 'month');
            expect(spy).toHaveBeenCalledWith('--output-filename-options [outputFilenameOptions...]', expect.any(String), ['date', 'subject']);
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

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(noDefaultsOptionsInstance);

            const args = ArgumentsModule.create(noDefaultsOptionsInstance);
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
            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: ['webm']
            };

            const result = await args.validate(input);

            expect(result).toEqual({
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: ['webm'],
                inputStructure: 'month',
                inputFilenameOptions: ['date', 'subject'],
                startDate: undefined,
                endDate: expect.any(Date)
            });

            expect(mockStorageInstance.isDirectoryReadable).toHaveBeenCalledWith('./valid-input');
            expect(mockStorageInstance.isDirectoryWritable).toHaveBeenCalledWith('./valid-output');
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);

        it('should use default values when not provided in input', async () => {
            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            // Partial input with missing values
            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                // outputStructure, outputFilenameOptions, extensions missing
            };

            const result = await args.validate(input);

            // Should use defaults from options
            expect(result).toEqual({
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: DEFAULT_EXTENSIONS,
                inputStructure: 'month',
                inputFilenameOptions: ['date', 'subject'],
                startDate: undefined,
                endDate: expect.any(Date)
            });

            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalled();
        }, 60000);

        it('should throw error for invalid input directory when input feature is enabled', async () => {
            // Mock to enable only input feature
            const featureCheck = (feature: Feature) => feature === 'input';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(false);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './invalid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow('Input directory does not exist: ./invalid-input');
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('input');
        }, 60000);

        it('should not validate input directory when input feature is disabled', async () => {
            // Mock to disable only input feature
            const featureCheck = (feature: Feature) => feature !== 'input';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(false);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
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

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(false);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './invalid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: ['mp3', 'mp4']
            };

            await expect(args.validate(input)).rejects.toThrow('Output directory does not exist: ./invalid-output');
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('output');
        }, 60000);

        it('should throw error for invalid output structure when structured-output feature is enabled', async () => {
            // Mock to enable only structured-output feature
            const featureCheck = (feature: Feature) => feature === 'structured-output';
            mockOptionsInstance.isFeatureEnabled.mockImplementation((f: any) => featureCheck(f as Feature));

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'invalid-structure',
                outputFilenameOptions: ['date', 'subject'],
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

            (OptionsModule.create as jest.Mock).mockReturnValueOnce(mockOptionsInstance);

            const args = ArgumentsModule.create(mockOptionsInstance);

            mockStorageInstance.isDirectoryReadable.mockReturnValue(true);
            mockStorageInstance.isDirectoryWritable.mockReturnValue(true);

            const input = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './valid-input',
                outputDirectory: './valid-output',
                outputStructure: 'month',
                outputFilenameOptions: ['date', 'subject'],
                extensions: ['invalid-ext']
            };

            await expect(args.validate(input)).rejects.toThrow(ArgumentError);
            await expect(args.validate(input)).rejects.toThrow('Invalid extensions: invalid-ext');
            expect(mockOptionsInstance.isFeatureEnabled).toHaveBeenCalledWith('extensions');
        }, 60000);
    });
});
