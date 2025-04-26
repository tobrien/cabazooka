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
        it('should create options with default values', () => {
            const options = Options.createOptions();
            expect(options.defaults).toEqual(Options.DEFAULT_APP_OPTIONS);
            expect(options.allowed).toEqual(Options.DEFAULT_ALLOWED_OPTIONS);
            expect(options.features).toEqual(Options.DEFAULT_FEATURES);
            expect(options.addDefaults).toBe(true);
            expect(options.features).toContain('output');
            expect(options.features).toContain('structured-output');
            expect(options.features).toContain('input');
            expect(options.features).toContain('extensions');
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
        });

        it('should override default options', () => {
            const options = Options.createOptions({
                defaults: {
                    timezone: 'UTC',
                    inputDirectory: '/custom/input',
                    extensions: ['.txt']
                },
                allowed: {
                    outputStructures: ['year'],
                    outputFilenameOptions: ['date'],
                    extensions: ['.txt']
                },
                features: ['output'],
                addDefaults: false
            });

            expect(options.defaults?.timezone).toBe('UTC');
            expect(options.defaults?.inputDirectory).toBe('/custom/input');
            expect(options.allowed?.extensions).toEqual(['.txt']);
            expect(options.features).toEqual(['output']);
            expect(options.addDefaults).toBe(false);

            expect(options.features).toContain('output');
            expect(options.features).not.toContain('structured-output');
            expect(options.features).not.toContain('input');
            expect(options.features).not.toContain('extensions');
        });

        it('should merge features correctly', () => {
            const customOptions = {
                features: ['input', 'extensions'] as Feature[],
            };
            const options = Options.createOptions(customOptions);
            expect(options.features).toEqual(['input', 'extensions']);
            expect(options.features).toContain('input');
            expect(options.features).toContain('extensions');
            expect(options.features).not.toContain('output');
            expect(options.features).not.toContain('structured-output');
        });

        it('should handle empty custom options', () => {
            const options = Options.createOptions({});
            expect(options.defaults).toEqual(Options.DEFAULT_APP_OPTIONS);
            expect(options.allowed).toEqual(Options.DEFAULT_ALLOWED_OPTIONS);
            expect(options.features).toEqual(Options.DEFAULT_FEATURES);
            expect(options.addDefaults).toBe(true);
            expect(options.features).toContain('output');
            expect(options.features).toContain('input');
            expect(options.features).toContain('extensions');
            expect(options.features).toContain('structured-output');
        });
    });

    describe('feature checks', () => {
        it('should correctly report enabled/disabled features based on defaults', () => {
            const options = Options.createOptions();
            expect(options.features).toContain('input');
            expect(options.features).toContain('output');
            expect(options.features).toContain('extensions');
            expect(options.features).toContain('structured-output');
            expect(options.features).not.toContain('structured-input');
        });

        it('should correctly report enabled/disabled features based on custom settings', () => {
            const options = Options.createOptions({ features: ['output', 'structured-input'] });
            expect(options.features).not.toContain('input');
            expect(options.features).toContain('output');
            expect(options.features).not.toContain('extensions');
            expect(options.features).not.toContain('structured-output');
            expect(options.features).toContain('structured-input');
        });

        it('should report false for unknown features', () => {
            const options = Options.createOptions();
            expect(options.features).not.toContain('unknown-feature' as Feature);
        });
    });
});
