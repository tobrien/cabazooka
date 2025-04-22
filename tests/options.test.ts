import { jest } from '@jest/globals';
import { Feature } from '../src/options';
import { DEFAULT_EXTENSIONS, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE } from '../src/constants';

describe('options', () => {
    let Options: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        Options = await import('../src/options');
    });

    describe('create', () => {
        it('should create options with default values when no parameters provided', () => {
            const options = Options.createOptions();

            expect(options.allowed).toEqual(Options.DEFAULT_ALLOWED_OPTIONS);
            expect(options.isFeatureEnabled('output')).toBe(true);
            expect(options.isFeatureEnabled('structured-output')).toBe(true);
            expect(options.isFeatureEnabled('input')).toBe(true);
            expect(options.isFeatureEnabled('extensions')).toBe(true);
        });

        it('should create options with custom default values', () => {
            const customDefaults = {
                timezone: 'America/New_York',
                recursive: true,
                inputDirectory: './custom-input',
                outputDirectory: './custom-output',
                outputStructure: 'day' as const,
                outputFilenameOptions: ['time', 'subject'] as const,
                extensions: ['wav', 'mp3']
            };

            const options = Options.createOptions({ defaults: customDefaults });

            expect(options.defaults).toEqual(customDefaults);
            expect(options.allowed).toEqual(Options.DEFAULT_ALLOWED_OPTIONS);
            expect(options.isFeatureEnabled('output')).toBe(true);
        });

        it('should create options with custom allowed options', () => {
            const customAllowed = {
                outputStructures: ['year', 'month'] as const,
                outputFilenameOptions: ['date'] as const,
                extensions: ['pdf', 'docx']
            };

            const options = Options.createOptions({ allowed: customAllowed });

            expect(options.allowed).toEqual(customAllowed);
        });

        it('should create options with custom features', () => {
            const customFeatures: Feature[] = ['input', 'extensions'];

            const options = Options.createOptions({ features: customFeatures });

            expect(options.allowed).toEqual(Options.DEFAULT_ALLOWED_OPTIONS);
            expect(options.isFeatureEnabled('input')).toBe(true);
            expect(options.isFeatureEnabled('extensions')).toBe(true);
            expect(options.isFeatureEnabled('output')).toBe(false);
            expect(options.isFeatureEnabled('structured-output')).toBe(false);
        });

        it('should create options with all custom parameters', () => {
            const customDefaults = {
                timezone: 'Europe/London',
                recursive: false
            };

            const customAllowed = {
                outputStructures: ['none'] as const,
                extensions: ['wav']
            };

            const customFeatures: Feature[] = ['output'];

            const options = Options.createOptions({
                defaults: customDefaults,
                allowed: customAllowed,
                features: customFeatures
            });

            expect(options.defaults).toEqual(customDefaults);
            expect(options.allowed).toEqual(customAllowed);
            expect(options.isFeatureEnabled('output')).toBe(true);
            expect(options.isFeatureEnabled('input')).toBe(false);
            expect(options.isFeatureEnabled('extensions')).toBe(false);
            expect(options.isFeatureEnabled('structured-output')).toBe(false);
        });
    });

    describe('isFeatureEnabled', () => {
        it('should correctly determine if a feature is enabled', () => {
            const features: Feature[] = ['input', 'output'];
            const options = Options.createOptions({ features });

            expect(options.isFeatureEnabled('input')).toBe(true);
            expect(options.isFeatureEnabled('output')).toBe(true);
            expect(options.isFeatureEnabled('extensions')).toBe(false);
            expect(options.isFeatureEnabled('structured-output')).toBe(false);
        });

        it('should return false for unknown features', () => {
            const options = Options.createOptions();

            // @ts-ignore - Testing invalid feature
            expect(options.isFeatureEnabled('unknown-feature')).toBe(false);
        });
    });
});
