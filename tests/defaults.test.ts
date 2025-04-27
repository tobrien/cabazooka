import { Config, DefaultOptions, Feature } from '../src/cabazooka';
import { DEFAULT_EXTENSIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_INPUT_FILENAME_OPTIONS, DEFAULT_INPUT_STRUCTURE, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE } from '../src/constants';
import { applyDefaults } from '../src/defaults';

// No external modules with side effects to mock for defaults.ts logic itself,
// but we keep the structure consistent with validate.test.ts.

describe('applyDefaults', () => {
    let baseConfig: Partial<Config>;
    let allFeatures: Feature[];
    let baseDefaults: DefaultOptions;

    beforeEach(() => {
        baseConfig = {}; // Start with an empty config
        allFeatures = ['input', 'output', 'structured-output', 'extensions', 'structured-input'];
        baseDefaults = {}; // Start with no custom defaults
    });

    test('should apply all default values when config is empty and all features are enabled', () => {
        const result = applyDefaults(baseConfig, allFeatures, baseDefaults);
        expect(result).toEqual({
            timezone: DEFAULT_TIMEZONE,
            recursive: DEFAULT_RECURSIVE,
            inputDirectory: DEFAULT_INPUT_DIRECTORY,
            outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
            outputStructure: DEFAULT_OUTPUT_STRUCTURE,
            outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
            extensions: DEFAULT_EXTENSIONS,
            inputStructure: DEFAULT_INPUT_STRUCTURE,
            inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
        });
    });

    test('should prioritize provided config values over defaults', () => {
        const partialConfig: Partial<Config> = {
            timezone: 'America/New_York',
            inputDirectory: '/my/input',
            recursive: true,
            outputStructure: 'year',
            extensions: ['eml'],
            inputFilenameOptions: ['subject'],
        };
        const result = applyDefaults(partialConfig, allFeatures, baseDefaults);
        expect(result).toEqual({
            timezone: 'America/New_York', // Provided
            recursive: true, // Provided
            inputDirectory: '/my/input', // Provided
            outputDirectory: DEFAULT_OUTPUT_DIRECTORY, // Default
            outputStructure: 'year', // Provided
            outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS, // Default (as full array is provided, not partial)
            extensions: ['eml'], // Provided
            inputStructure: DEFAULT_INPUT_STRUCTURE, // Default
            inputFilenameOptions: ['subject'], // Provided
        });
    });

    test('should only apply defaults related to enabled features', () => {
        const features: Feature[] = ['input', 'extensions']; // Only input and extensions
        const result = applyDefaults(baseConfig, features, baseDefaults);
        expect(result).toEqual({
            timezone: DEFAULT_TIMEZONE, // Always applied
            recursive: DEFAULT_RECURSIVE, // Input feature
            inputDirectory: DEFAULT_INPUT_DIRECTORY, // Input feature
            extensions: DEFAULT_EXTENSIONS, // Extensions feature
            // Output related fields should be undefined
            outputDirectory: undefined,
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            // Input structure related fields should be undefined
            inputStructure: undefined,
            inputFilenameOptions: undefined,
        });
    });

    test('should handle mixed provided config and feature limitations', () => {
        const partialConfig: Partial<Config> = {
            inputDirectory: '/specific/input',
            outputDirectory: '/specific/output', // This should NOT be in the result
        };
        const features: Feature[] = ['input']; // Corrected: Removed invalid 'timezone' feature. 'output' feature is still missing.
        const result = applyDefaults(partialConfig, features, baseDefaults);
        expect(result).toEqual({
            timezone: DEFAULT_TIMEZONE, // Default (timezone always applied)
            recursive: DEFAULT_RECURSIVE, // Input feature default
            inputDirectory: '/specific/input', // Provided (input feature)
            // Output related fields should be undefined
            outputDirectory: '/specific/output',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            // Extensions related fields should be undefined
            extensions: undefined,
            // Input structure related fields should be undefined
            inputStructure: undefined,
            inputFilenameOptions: undefined,
        });
    });

    test('should prioritize custom defaults over constant defaults', () => {
        const customDefaults: DefaultOptions = {
            timezone: 'Europe/Paris',
            recursive: true,
            inputDirectory: '/default/in',
            outputDirectory: '/default/out',
            outputStructure: 'none',
            outputFilenameOptions: ['subject'],
            extensions: ['txt'],
            inputStructure: 'none',
            inputFilenameOptions: ['time'],
        };
        const result = applyDefaults(baseConfig, allFeatures, customDefaults);
        expect(result).toEqual({
            timezone: 'Europe/Paris',
            recursive: true,
            inputDirectory: '/default/in',
            outputDirectory: '/default/out',
            outputStructure: 'none',
            outputFilenameOptions: ['subject'],
            extensions: ['txt'],
            inputStructure: 'none',
            inputFilenameOptions: ['time'],
        });
    });

    test('should prioritize provided config over custom defaults', () => {
        const partialConfig: Partial<Config> = {
            timezone: 'Asia/Tokyo', // Provided config
            inputDirectory: '/my/input', // Provided config
        };
        const customDefaults: DefaultOptions = {
            timezone: 'Europe/Paris', // Custom default
            inputDirectory: '/default/in', // Custom default
            outputDirectory: '/default/out', // Custom default
            recursive: false, // Custom default
        };
        // Enable features relevant to the config/defaults
        const features: Feature[] = ['input', 'output'];
        const result = applyDefaults(partialConfig, features, customDefaults);
        expect(result).toEqual({
            timezone: 'Asia/Tokyo', // From partialConfig
            recursive: false, // From customDefaults (input feature)
            inputDirectory: '/my/input', // From partialConfig (input feature)
            outputDirectory: '/default/out', // From customDefaults (output feature)
            // Fields for disabled features or not in custom/partial should be undefined
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: undefined,
            inputStructure: undefined,
            inputFilenameOptions: undefined,
        });
    });

    test('should handle undefined recursive flag correctly', () => {
        const config1 = applyDefaults({ recursive: undefined }, ['input'], baseDefaults);
        expect(config1.recursive).toBe(DEFAULT_RECURSIVE); // Should use default

        const config2 = applyDefaults({ recursive: false }, ['input'], baseDefaults);
        expect(config2.recursive).toBe(false); // Should use provided false

        const config3 = applyDefaults({ recursive: true }, ['input'], baseDefaults);
        expect(config3.recursive).toBe(true); // Should use provided true

        const customDefaults = { recursive: true };
        const config4 = applyDefaults({ recursive: undefined }, ['input'], customDefaults);
        expect(config4.recursive).toBe(true); // Should use custom default

        const config5 = applyDefaults({ recursive: false }, ['input'], customDefaults);
        expect(config5.recursive).toBe(false); // Should use provided false over custom default
    });

});
