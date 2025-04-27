import { jest } from '@jest/globals';
import type { Config } from '../src/configure';
import type { Args } from '../src/read';
import type { Feature } from '../src/options';

// --- Dynamically Import Module Under Test ---
// Although read.ts currently has no dependencies needing mocks,
// we use dynamic import to maintain consistency with validate.test.ts
const { read } = await import('../src/read');

// --- Test Suite ---

describe('read', () => {
    let baseArgs: Args;

    beforeEach(() => {
        // Reset args before each test
        baseArgs = {
            recursive: false,
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            outputDirectory: '/output/dir',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: ['md', 'txt'],
            start: undefined,
            end: undefined,
        };
    });

    test('should populate all config fields when all relevant features are enabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-input', 'structured-output', 'extensions'];
        const args: Args = {
            ...baseArgs,
            inputStructure: 'none',
            inputFilenameOptions: ['date', 'subject'],
            outputStructure: 'year',
            outputFilenameOptions: ['time', 'subject'],
        };
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: 'none',
            inputFilenameOptions: ['date', 'subject'],
            outputDirectory: '/output/dir',
            outputStructure: 'year',
            outputFilenameOptions: ['time', 'subject'],
            extensions: ['md', 'txt'],
        };

        await expect(read(args, features)).resolves.toEqual(expectedConfig);
    });

    test('should only populate timezone if no features are provided', async () => {
        const features: Feature[] = [];
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
        };
        await expect(read(baseArgs, features)).resolves.toEqual(expectedConfig);
    });

    test('should omit inputDirectory if "input" feature is disabled', async () => {
        const features: Feature[] = ['output', 'structured-input', 'structured-output', 'extensions']; // 'input' omitted
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            // inputDirectory omitted
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            outputDirectory: '/output/dir',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: ['md', 'txt'],
        };
        await expect(read(baseArgs, features)).resolves.toEqual(expectedConfig);
    });

    test('should omit input structure/filenameOptions if "structured-input" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-output', 'extensions']; // 'structured-input' omitted
        const args: Args = {
            ...baseArgs,
            inputStructure: 'none',
            inputFilenameOptions: ['date'],
        };
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            // inputStructure omitted
            // inputFilenameOptions omitted
            outputDirectory: '/output/dir',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: ['md', 'txt'],
        };
        await expect(read(args, features)).resolves.toEqual(expectedConfig);
    });

    test('should omit outputDirectory if "output" feature is disabled', async () => {
        const features: Feature[] = ['input', 'structured-input', 'structured-output', 'extensions']; // 'output' omitted
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            // outputDirectory omitted
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: ['md', 'txt'],
        };
        await expect(read(baseArgs, features)).resolves.toEqual(expectedConfig);
    });

     test('should omit output structure/filenameOptions if "structured-output" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-input', 'extensions']; // 'structured-output' omitted
         const args: Args = {
            ...baseArgs,
            outputStructure: 'year',
            outputFilenameOptions: ['time'],
        };
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            outputDirectory: '/output/dir',
            // outputStructure omitted
            // outputFilenameOptions omitted
            extensions: ['md', 'txt'],
        };
        await expect(read(args, features)).resolves.toEqual(expectedConfig);
    });

     test('should omit extensions if "extensions" feature is disabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-input', 'structured-output']; // 'extensions' omitted
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            outputDirectory: '/output/dir',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            // extensions omitted
        };
        await expect(read(baseArgs, features)).resolves.toEqual(expectedConfig);
    });

    test('should handle missing optional args when corresponding features are enabled', async () => {
        const features: Feature[] = ['input', 'output', 'structured-input', 'structured-output', 'extensions'];
        // baseArgs already has undefined for optional structure/filename options
        const expectedConfig: Partial<Config> = {
            timezone: 'UTC',
            inputDirectory: '/input/dir',
            inputStructure: undefined,
            inputFilenameOptions: undefined,
            outputDirectory: '/output/dir',
            outputStructure: undefined,
            outputFilenameOptions: undefined,
            extensions: ['md', 'txt'],
        };
        await expect(read(baseArgs, features)).resolves.toEqual(expectedConfig);
    });

});
