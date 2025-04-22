import { jest } from '@jest/globals';
import { Config } from '../src/cabazooka'; // Import Config type
import { Options } from '../src/options'; // Import Options type

// Mock the storage utility
jest.unstable_mockModule('../src/util/storage', () => ({
    create: jest.fn()
}));

// Mock winston logger - creating a simple mock object
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Dynamically import modules after mocking
let Storage: any;
let Input: any;

describe('Input Module', () => {
    let mockStorageInstance: any;
    let inputInstance: any;
    let mockCallback: jest.Mock<() => Promise<void>>;

    const baseConfig: Config = {
        inputDirectory: '/test/input',
        timezone: 'America/New_York',
        recursive: false,
        extensions: [] as string[], // Explicitly type extensions as string[]
        outputDirectory: '/test/output', // Needed for Config type, but not used directly by input.ts
        outputStructure: 'none', // Needed for Config type
        outputFilenameOptions: [] // Needed for Config type
    };

    const baseOptions = {
        isFeatureEnabled: jest.fn<(feature: string) => boolean>()
    };

    beforeEach(async () => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        baseOptions.isFeatureEnabled.mockClear();

        // Dynamically import the mocked Storage and the Input module
        Storage = await import('../src/util/storage');
        Input = await import('../src/input');

        // Setup storage mock behavior
        mockStorageInstance = {
            forEachFileIn: jest.fn()
        };
        (Storage.create as jest.Mock).mockReturnValue(mockStorageInstance);

        // Setup mock callback for the process function
        mockCallback = jest.fn(async () => { }); // Provide a basic async implementation

        // Default feature flags
        baseOptions.isFeatureEnabled.mockImplementation((feature: string): boolean => {
            if (feature === 'input') return true;
            if (feature === 'extensions') return false; // Default to false unless overridden
            return false;
        });
    });

    const createInputInstance = (config: Config = baseConfig, options: Options = baseOptions as Options) => {
        return Input.create(config, options, mockLogger);
    }

    it('should throw an error if input feature is not enabled', async () => {
        baseOptions.isFeatureEnabled.mockImplementation((feature: string) => feature !== 'input');
        inputInstance = createInputInstance();

        await expect(inputInstance.process(mockCallback)).rejects.toThrow('Input feature is not enabled, skipping input processing');
        expect(mockStorageInstance.forEachFileIn).not.toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should process files non-recursively without specific extensions', async () => {
        inputInstance = createInputInstance();
        const files = ['/test/input/file1.txt', '/test/input/file2.md'];
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(dir).toBe(baseConfig.inputDirectory);
            expect(opts.pattern).toBe('*');
            for (const file of files) {
                await cb(file);
            }
            return files.length;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
            baseConfig.inputDirectory,
            expect.any(Function),
            { pattern: '*' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(files.length);
        expect(mockCallback).toHaveBeenCalledWith(files[0]);
        expect(mockCallback).toHaveBeenCalledWith(files[1]);
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', baseConfig.inputDirectory, '*');
        expect(mockLogger.info).toHaveBeenCalledWith('Processed %d files', files.length);
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', files[0]);
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', files[1]);
    });

    it('should process files recursively', async () => {
        const recursiveConfig = { ...baseConfig, recursive: true };
        inputInstance = createInputInstance(recursiveConfig);
        const files = ['/test/input/sub/file3.txt'];
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(opts.pattern).toBe('**/*');
            for (const file of files) {
                await cb(file);
            }
            return files.length;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
            recursiveConfig.inputDirectory,
            expect.any(Function),
            { pattern: '**/*' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(files.length);
        expect(mockCallback).toHaveBeenCalledWith(files[0]);
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', recursiveConfig.inputDirectory, '**/*');
    });

    it('should process files with specific extensions when feature is enabled', async () => {
        const extConfig = { ...baseConfig, extensions: ['txt', 'log'] };
        const extOptions = {
            isFeatureEnabled: jest.fn<(feature: string) => boolean>().mockImplementation((feature: string): boolean => {
                if (feature === 'input') return true;
                if (feature === 'extensions') return true;
                return false;
            })
        };
        inputInstance = createInputInstance(extConfig, extOptions as Options);
        const files = ['/test/input/file1.txt', '/test/input/another.log'];
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(opts.pattern).toBe('*.{txt,log}');
            for (const file of files) {
                await cb(file);
            }
            return files.length;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
            extConfig.inputDirectory,
            expect.any(Function),
            { pattern: '*.{txt,log}' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(files.length);
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', extConfig.inputDirectory, '*.{txt,log}');
    });

    it('should process files recursively with specific extensions when feature is enabled', async () => {
        const extConfig = { ...baseConfig, recursive: true, extensions: ['txt', 'log'] };
        const extOptions = {
            isFeatureEnabled: jest.fn<(feature: string) => boolean>().mockImplementation((feature: string): boolean => {
                if (feature === 'input') return true;
                if (feature === 'extensions') return true;
                return false;
            })
        };
        inputInstance = createInputInstance(extConfig, extOptions as Options);
        const files = ['/test/input/sub/file1.txt', '/test/input/deep/another.log'];
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(opts.pattern).toBe('**/*.{txt,log}');
            for (const file of files) {
                await cb(file);
            }
            return files.length;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
            extConfig.inputDirectory,
            expect.any(Function),
            { pattern: '**/*.{txt,log}' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(files.length);
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', extConfig.inputDirectory, '**/*.{txt,log}');
    });


    it('should not include extensions in pattern if feature is disabled', async () => {
        const extConfig = { ...baseConfig, extensions: ['txt', 'log'] };
        // extensions feature disabled by default setup in beforeEach
        inputInstance = createInputInstance(extConfig);

        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(opts.pattern).toBe('*'); // No extensions
            return 0;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
            extConfig.inputDirectory,
            expect.any(Function),
            { pattern: '*' }
        );
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', extConfig.inputDirectory, '*');
    });

    it('should handle errors during callback execution and continue processing', async () => {
        inputInstance = createInputInstance();
        const files = ['/test/input/good.txt', '/test/input/bad.txt', '/test/input/good_again.txt'];
        const error = new Error('Callback failed');
        error.stack = 'Error stack trace';

        // @ts-ignore
        mockCallback.mockImplementation(async (file: string) => {
            if (file.includes('bad')) {
                throw error;
            }
        });

        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            expect(opts.pattern).toBe('*');
            for (const file of files) {
                // The actual forEachFileIn would likely have its own try/catch,
                // but here we simulate the input module's handling of the callback error
                try {
                    await cb(file);
                } catch (e) {
                    // Simulate the error being caught and logged by the input module's loop
                    mockLogger.error('Error processing file %s: %s\n\n%s\n\n', file, e, (e as Error).stack);
                }
            }
            // Simulate the count being based on successful callbacks within the input module's loop
            // In reality, the loop inside input.process increments fileCount only on success.
            // Here we adjust the final log count based on successful calls.
            return files.length - 1; // Adjusted based on expected success count
        });


        // We need to adjust the expectation for the final log message.
        // The `forEachFileIn` mock above simulates catching the error *within* the loop passed to it.
        // However, the `input.process` function has its *own* try/catch around the `await callback(file)` call.
        // It increments `fileCount` *only* if the callback succeeds.
        // So, let's refine the test to reflect this more accurately.

        // Redefine the mock for forEachFileIn to just call the callback provided by input.process
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            for (const file of files) {
                await cb(file); // Let input.process handle the try/catch
            }
        });


        await inputInstance.process(mockCallback);

        expect(mockCallback).toHaveBeenCalledTimes(files.length);
        expect(mockCallback).toHaveBeenCalledWith(files[0]);
        expect(mockCallback).toHaveBeenCalledWith(files[1]);
        expect(mockCallback).toHaveBeenCalledWith(files[2]);

        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            `Error processing file %s: %s\n\n%s\n\n`,
            files[1],
            error,
            error.stack
        );

        // Check debug logs for all files attempted
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', files[0]);
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', files[1]);
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', files[2]);

        // Final count should reflect only successfully processed files
        expect(mockLogger.info).toHaveBeenCalledWith('Processed %d files', 2); // Only good.txt and good_again.txt succeeded
    });

    it('should log the correct number of processed files when no files are found', async () => {
        inputInstance = createInputInstance();
        mockStorageInstance.forEachFileIn.mockImplementation(async (dir: string, cb: Function, opts: any) => {
            // Simulate no files found
            return 0;
        });

        await inputInstance.process(mockCallback);

        expect(mockStorageInstance.forEachFileIn).toHaveBeenCalled();
        expect(mockCallback).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('Processing files in %s with pattern %s', baseConfig.inputDirectory, '*');
        expect(mockLogger.info).toHaveBeenCalledWith('Processed %d files', 0);
    });
});
