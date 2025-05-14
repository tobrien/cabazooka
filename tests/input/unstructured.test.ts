import { jest } from '@jest/globals';
import type { Logger } from '../../src/cabazooka'; // Adjust path if necessary
import type * as StorageUtil from '../../src/util/storage'; // Adjust path if necessary

// Mock the storage utility before importing the module under test
const mockForEachFileIn = jest.fn<StorageUtil.Utility['forEachFileIn']>();
const mockStorageCreate = jest.fn<typeof StorageUtil.create>().mockReturnValue({
    forEachFileIn: mockForEachFileIn,
    // Add other methods if needed, mocked or otherwise
    // @ts-ignore
    readFile: jest.fn(),
    // @ts-ignore
    writeFile: jest.fn(),
    // @ts-ignore
    ensureDir: jest.fn(),
    // @ts-ignore
    remove: jest.fn(),
    // @ts-ignore
    pathExists: jest.fn(),
    // @ts-ignore
    copyFile: jest.fn(),
    // @ts-ignore
    moveFile: jest.fn(),
    // @ts-ignore
    listFiles: jest.fn(),
    // @ts-ignore
    createReadStream: jest.fn(),
    // @ts-ignore
    createWriteStream: jest.fn(),
});

jest.unstable_mockModule('../../src/util/storage', () => ({
    create: mockStorageCreate,
}));

// Dynamically import the module under test after mocking
const { process: processUnstructured } = await import('../../src/input/unstructured');

describe('Input: Unstructured Process', () => {
    let mockLogger: Logger;
    let mockCallback: jest.Mock<(file: string) => Promise<void>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
            silly: jest.fn(),
        };

        // @ts-ignore
        mockCallback = jest.fn().mockResolvedValue(undefined);

        // Reset the implementation of forEachFileIn for each test
        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            // Simulate finding some files based on pattern - simplified simulation
            const files = ['file1.txt', 'subdir/file2.eml', 'file3.msg'];
            let pattern = options?.pattern || '*';
            // Basic glob matching simulation (very simplified)
            if (pattern === '*.*') files.splice(1, 1); // Remove subdir file for non-recursive *.*
            if (pattern === '*.{eml,msg}') files.splice(0, 1); // Remove .txt file
            if (pattern === '**/*.{txt}') files.splice(1, 2); // Remove non-txt files
            if (pattern === '**/*') { /* keep all */ }

            for (const file of files) {
                await callback(file);
            }
        });
    });

    test('should process files non-recursively without extensions', async () => {
        const inputDirectory = '/input';
        const recursive = false;
        const extensions: string[] = [];

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            expect(dir).toBe(inputDirectory);
            expect(options?.pattern).toBe('*.*'); // Default non-recursive pattern
            await callback('file1.txt');
            await callback('file2.log');
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockStorageCreate).toHaveBeenCalledWith({ log: mockLogger.debug });
        expect(mockLogger.info).toHaveBeenCalledWith(
            'Processing unstructured files %s in %s with pattern %s',
            'non-recursively',
            inputDirectory,
            '*.*'
        );
        expect(mockForEachFileIn).toHaveBeenCalledWith(
            inputDirectory,
            expect.any(Function),
            { pattern: '*.*' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith('file1.txt');
        expect(mockCallback).toHaveBeenCalledWith('file2.log');
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', 'file1.txt');
        expect(mockLogger.debug).toHaveBeenCalledWith('Processing file %s', 'file2.log');
        expect(count).toBe(2);
    });

    test('should process files non-recursively with specific extensions', async () => {
        const inputDirectory = '/data';
        const recursive = false;
        const extensions = ['eml', 'msg'];

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            expect(dir).toBe(inputDirectory);
            expect(options?.pattern).toBe('*.{eml,msg}');
            await callback('file1.eml');
            await callback('file2.msg');
            // file3.txt should be ignored by the pattern
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Processing unstructured files %s in %s with pattern %s',
            'non-recursively',
            inputDirectory,
            '*.{eml,msg}'
        );
        expect(mockLogger.debug).toHaveBeenCalledWith('Applying extension filter: eml,msg');
        expect(mockForEachFileIn).toHaveBeenCalledWith(
            inputDirectory,
            expect.any(Function),
            { pattern: '*.{eml,msg}' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith('file1.eml');
        expect(mockCallback).toHaveBeenCalledWith('file2.msg');
        expect(count).toBe(2);
    });

    test('should process files recursively without extensions', async () => {
        const inputDirectory = '/archive';
        const recursive = true;
        const extensions: string[] = [];

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            expect(dir).toBe(inputDirectory);
            expect(options?.pattern).toBe('**/*');
            await callback('file1.txt');
            await callback('subdir/file2.eml');
            await callback('another/subdir/file3');
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Processing unstructured files %s in %s with pattern %s',
            'recursively',
            inputDirectory,
            '**/*'
        );
        expect(mockForEachFileIn).toHaveBeenCalledWith(
            inputDirectory,
            expect.any(Function),
            { pattern: '**/*' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(3);
        expect(mockCallback).toHaveBeenCalledWith('file1.txt');
        expect(mockCallback).toHaveBeenCalledWith('subdir/file2.eml');
        expect(mockCallback).toHaveBeenCalledWith('another/subdir/file3');
        expect(count).toBe(3);
    });

    test('should process files recursively with specific extensions', async () => {
        const inputDirectory = '/in';
        const recursive = true;
        const extensions = ['txt'];

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            expect(dir).toBe(inputDirectory);
            expect(options?.pattern).toBe('**/*.{txt}');
            await callback('file1.txt');
            await callback('subdir/file2.txt');
            // subdir/file3.eml should be ignored
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockLogger.info).toHaveBeenCalledWith(
            'Processing unstructured files %s in %s with pattern %s',
            'recursively',
            inputDirectory,
            '**/*.{txt}'
        );
        expect(mockLogger.debug).toHaveBeenCalledWith('Applying extension filter: txt');
        expect(mockForEachFileIn).toHaveBeenCalledWith(
            inputDirectory,
            expect.any(Function),
            { pattern: '**/*.{txt}' }
        );
        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith('file1.txt');
        expect(mockCallback).toHaveBeenCalledWith('subdir/file2.txt');
        expect(count).toBe(2);
    });

    test('should handle errors during callback execution', async () => {
        const inputDirectory = '/input';
        const recursive = false;
        const extensions: string[] = [];
        const errorFile = 'error.txt';
        const successFile = 'success.txt';
        const testError = new Error('Callback failed');

        mockCallback.mockImplementation(async (file) => {
            if (file === errorFile) {
                throw testError;
            }
        });

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            await callback(errorFile);
            await callback(successFile);
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockCallback).toHaveBeenCalledWith(errorFile);
        expect(mockCallback).toHaveBeenCalledWith(successFile);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Error processing file %s: %s\n%s',
            errorFile,
            testError.message,
            testError.stack
        );
        // Only successfully processed files are counted
        expect(count).toBe(1);
    });

    test('should handle non-Error objects thrown during callback', async () => {
        const inputDirectory = '/input';
        const recursive = false;
        const extensions: string[] = [];
        const errorFile = 'error.txt';
        const successFile = 'success.txt';
        const testError = 'Callback failed as string'; // Non-Error object

        mockCallback.mockImplementation(async (file) => {
            if (file === errorFile) {
                throw testError;
            }
        });

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            await callback(errorFile);
            await callback(successFile);
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockCallback).toHaveBeenCalledTimes(2);
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        // Check for the specific logging format for non-Error objects
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Error processing file %s: %s',
            errorFile,
            testError
        );
        expect(count).toBe(1); // Only successfully processed files are counted
    });

    test('should return 0 if no files are found', async () => {
        const inputDirectory = '/empty';
        const recursive = false;
        const extensions: string[] = [];

        mockForEachFileIn.mockImplementation(async (dir, callback, options) => {
            // Simulate no files found
        });

        const count = await processUnstructured(inputDirectory, recursive, extensions, undefined, mockLogger, mockCallback);

        expect(mockForEachFileIn).toHaveBeenCalled();
        expect(mockCallback).not.toHaveBeenCalled();
        expect(count).toBe(0);
    });
});
