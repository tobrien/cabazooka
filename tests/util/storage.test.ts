import { jest } from '@jest/globals';

// Mock the fs module
var fs: {
    promises: {
        stat: jest.Mock<() => Promise<any>>,
        access: jest.Mock<() => Promise<void>>,
        mkdir: jest.Mock<() => Promise<void>>,
        readFile: jest.Mock<() => Promise<string>>,
        writeFile: jest.Mock<() => Promise<void>>,
        lstatSync: jest.Mock<() => Promise<any>>,
        readdir: jest.Mock<() => Promise<string[]>>,
    },
    constants: {
        R_OK: number,
        W_OK: number
    },
    createReadStream: jest.Mock<() => any>,
};

// Mock the fs module
const mockGlob = jest.fn<() => Promise<any>>();
const mockStat = jest.fn<() => Promise<any>>();
const mockAccess = jest.fn<() => Promise<void>>();
const mockMkdir = jest.fn<() => Promise<void>>();
const mockReadFile = jest.fn<() => Promise<string>>();
const mockWriteFile = jest.fn<() => Promise<void>>();
const mockLstatSync = jest.fn<() => Promise<any>>();
const mockReaddir = jest.fn<() => Promise<string[]>>();
const mockCreateReadStream = jest.fn<() => any>();

jest.unstable_mockModule('fs', () => ({
    __esModule: true,
    promises: {
        stat: mockStat,
        access: mockAccess,
        mkdir: mockMkdir,
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        lstatSync: mockLstatSync,
        readdir: mockReaddir
    },
    constants: {
        R_OK: 4,
        W_OK: 2
    },
    createReadStream: mockCreateReadStream
}));

// Mock crypto module
const mockCrypto = {
    createHash: jest.fn(),
};

jest.unstable_mockModule('crypto', () => ({
    __esModule: true,
    default: mockCrypto,
    createHash: mockCrypto.createHash
}));

jest.unstable_mockModule('glob', () => ({
    __esModule: true,
    glob: mockGlob
}));

// Import the storage module after mocking fs
let storageModule: any;

describe('Storage Utility', () => {
    // Mock for console.log
    const mockLog = jest.fn();
    let storage: any;

    beforeAll(async () => {
        var fs = await import('fs');
        var glob = await import('glob');
        storageModule = await import('../../src/util/storage');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        storage = storageModule.create({ log: mockLog });
    });

    describe('exists', () => {
        it('should return true if path exists', async () => {
            mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => false });

            const result = await storage.exists('/test/path');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/path');
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.exists('/test/path');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/path');
        });
    });

    describe('isDirectory', () => {
        it('should return true if path is a directory', async () => {
            mockStat.mockResolvedValueOnce({
                isDirectory: () => true,
                isFile: () => false
            });

            const result = await storage.isDirectory('/test/dir');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/dir');
            expect(mockLog).not.toHaveBeenCalled();
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectory('/test/file');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/file');
            expect(mockLog).toHaveBeenCalledWith('/test/file is not a directory');
        });
    });

    describe('isFile', () => {
        it('should return true if path is a file', async () => {
            mockStat.mockResolvedValueOnce({
                isFile: () => true,
                isDirectory: () => false
            });

            const result = await storage.isFile('/test/file.txt');

            expect(result).toBe(true);
            expect(mockStat).toHaveBeenCalledWith('/test/file.txt');
            expect(mockLog).not.toHaveBeenCalled();
        });

        it('should return false if path is not a file', async () => {
            mockStat.mockResolvedValueOnce({
                isFile: () => false,
                isDirectory: () => true
            });

            const result = await storage.isFile('/test/dir');

            expect(result).toBe(false);
            expect(mockStat).toHaveBeenCalledWith('/test/dir');
            expect(mockLog).toHaveBeenCalledWith('/test/dir is not a file');
        });
    });

    describe('isReadable', () => {
        it('should return true if path is readable', async () => {
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await storage.isReadable('/test/file.txt');

            expect(result).toBe(true);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 4);
        });

        it('should return false if path is not readable', async () => {
            mockAccess.mockRejectedValueOnce(new Error('Not readable'));

            const result = await storage.isReadable('/test/file.txt');

            expect(result).toBe(false);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 4);
            expect(mockLog).toHaveBeenCalledWith(
                '/test/file.txt is not readable: %s %s',
                'Not readable',
                expect.any(String)
            );
        });
    });

    describe('isWritable', () => {
        it('should return true if path is writable', async () => {
            mockAccess.mockResolvedValueOnce(undefined);

            const result = await storage.isWritable('/test/file.txt');

            expect(result).toBe(true);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 2);
        });

        it('should return false if path is not writable', async () => {
            mockAccess.mockRejectedValueOnce(new Error('Not writable'));

            const result = await storage.isWritable('/test/file.txt');

            expect(result).toBe(false);
            expect(mockAccess).toHaveBeenCalledWith('/test/file.txt', 2);
            expect(mockLog).toHaveBeenCalledWith(
                '/test/file.txt is not writable: %s %s',
                'Not writable',
                expect.any(String)
            );
        });
    });

    describe('isFileReadable', () => {
        it('should return true if path exists, is a file, and is readable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({  // isFile
                isFile: () => true,
                isDirectory: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isReadable

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not a file', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isFile
                isFile: () => false,
                isDirectory: () => true
            });

            const result = await storage.isFileReadable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not readable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isFile
                isFile: () => true,
                isDirectory: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not readable')); // isReadable

            const result = await storage.isFileReadable('/test/file.txt');

            expect(result).toBe(false);
        });
    });

    describe('isDirectoryWritable', () => {
        it('should return true if path exists, is a directory, and is writable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isWritable

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectoryWritable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not writable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not writable')); // isWritable

            const result = await storage.isDirectoryWritable('/test/dir');

            expect(result).toBe(false);
        });
    });

    describe('createDirectory', () => {
        it('should create directory successfully', async () => {
            mockMkdir.mockResolvedValueOnce(undefined);

            await storage.createDirectory('/test/dir');

            expect(mockMkdir).toHaveBeenCalledWith('/test/dir', { recursive: true });
        });

        it('should throw error if directory creation fails', async () => {
            mockMkdir.mockRejectedValueOnce(new Error('Failed to create directory'));

            await expect(storage.createDirectory('/test/dir')).rejects.toThrow(
                'Failed to create output directory /test/dir: Failed to create directory'
            );
        });
    });

    describe('readFile', () => {
        it('should read file successfully', async () => {
            mockReadFile.mockResolvedValueOnce('file content');

            const result = await storage.readFile('/test/file.txt', 'utf8');

            expect(result).toBe('file content');
            expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
        });
    });

    describe('writeFile', () => {
        it('should write file successfully', async () => {
            mockWriteFile.mockResolvedValueOnce(undefined);

            await storage.writeFile('/test/file.txt', 'file content', 'utf8');

            expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', 'file content', { encoding: 'utf8' });
        });

        it('should write file with Buffer data', async () => {
            mockWriteFile.mockResolvedValueOnce(undefined);
            const buffer = Buffer.from('file content');

            await storage.writeFile('/test/file.txt', buffer, 'utf8');

            expect(mockWriteFile).toHaveBeenCalledWith('/test/file.txt', buffer, { encoding: 'utf8' });
        });
    });

    describe('Default logger', () => {
        it('should use console.log as default logger', async () => {
            const originalConsoleLog = console.log;
            const mockConsoleLog = jest.fn();
            console.log = mockConsoleLog;

            try {
                const utilWithDefaultLogger = storageModule.create({});
                mockStat.mockResolvedValueOnce({
                    isDirectory: () => false,
                    isFile: () => true
                });

                await utilWithDefaultLogger.isDirectory('/test/file');

                expect(mockConsoleLog).toHaveBeenCalledWith('/test/file is not a directory');
            } finally {
                console.log = originalConsoleLog;
            }
        });
    });

    describe('isDirectoryReadable', () => {
        it('should return true if path exists, is a directory, and is readable', async () => {
            // Setup mocks for the chain of function calls
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockResolvedValueOnce(undefined); // isReadable

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(true);
        });

        it('should return false if path does not exist', async () => {
            mockStat.mockRejectedValueOnce(new Error('Path does not exist'));

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(false);
        });

        it('should return false if path is not a directory', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => false,
                isFile: () => true
            });

            const result = await storage.isDirectoryReadable('/test/file.txt');

            expect(result).toBe(false);
        });

        it('should return false if path is not readable', async () => {
            mockStat.mockResolvedValueOnce({ isFile: () => false, isDirectory: () => false }); // exists
            mockStat.mockResolvedValueOnce({ // isDirectory
                isDirectory: () => true,
                isFile: () => false
            });
            mockAccess.mockRejectedValueOnce(new Error('Not readable')); // isReadable

            const result = await storage.isDirectoryReadable('/test/dir');

            expect(result).toBe(false);
        });
    });

    describe('readStream', () => {
        it('should create and return a readable stream', async () => {
            const mockStream = { pipe: jest.fn() };
            mockCreateReadStream.mockReturnValueOnce(mockStream);

            const result = await storage.readStream('/test/file.txt');

            expect(result).toBe(mockStream);
            expect(mockCreateReadStream).toHaveBeenCalledWith('/test/file.txt');
        });
    });

    describe('hashFile', () => {
        it('should hash the file content correctly', async () => {
            const fileContent = 'test file content';
            const mockHash = {
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue('0123456789abcdef0123456789abcdef')
            };

            mockReadFile.mockResolvedValueOnce(fileContent);
            mockCrypto.createHash.mockReturnValueOnce(mockHash);

            const result = await storage.hashFile('/test/file.txt', 10);

            expect(mockReadFile).toHaveBeenCalledWith('/test/file.txt', { encoding: 'utf8' });
            expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
            expect(mockHash.update).toHaveBeenCalledWith(fileContent);
            expect(mockHash.digest).toHaveBeenCalledWith('hex');
            expect(result).toBe('0123456789');
        });
    });

    describe('listFiles', () => {
        it('should list files in a directory', async () => {
            mockReaddir.mockResolvedValueOnce(['file1.txt', 'file2.txt', 'subdirectory']);

            const result = await storage.listFiles('/test/dir');

            expect(result).toEqual(['file1.txt', 'file2.txt', 'subdirectory']);
            expect(mockReaddir).toHaveBeenCalledWith('/test/dir');
        });

        it('should throw error if reading directory fails', async () => {
            mockReaddir.mockRejectedValueOnce(new Error('Permission denied'));

            await expect(storage.listFiles('/test/dir')).rejects.toThrow();
            expect(mockReaddir).toHaveBeenCalledWith('/test/dir');
        });
    });

    describe('forEachFileIn', () => {
        it('should iterate over files in a directory', async () => {
            // Setup mocks for the chain of function calls
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['file1.txt', 'file2.txt']);

            const callbackFn = jest.fn();
            await storage.forEachFileIn('/test/dir', callbackFn);

            expect(callbackFn).toHaveBeenCalledTimes(2);
            expect(callbackFn).toHaveBeenCalledWith('/test/dir/file1.txt');
            expect(callbackFn).toHaveBeenCalledWith('/test/dir/file2.txt');
        });

        it('should handle custom glob patterns', async () => {
            // @ts-ignore
            mockGlob.mockResolvedValueOnce(['doc1.pdf', 'doc2.pdf']);

            const callbackFn = jest.fn();
            await storage.forEachFileIn('/test/dir', callbackFn, { pattern: '*.pdf' });

            expect(mockGlob).toHaveBeenCalledWith('*.pdf', expect.objectContaining({ cwd: '/test/dir' }));
            expect(callbackFn).toHaveBeenCalledTimes(2);
        });

        it('should throw error if glob fails', async () => {
            mockGlob.mockRejectedValueOnce(new Error('Glob error'));

            const callbackFn = jest.fn();
            await expect(storage.forEachFileIn('/test/dir', callbackFn)).rejects.toThrow(
                'Failed to glob pattern *'
            );

            expect(callbackFn).not.toHaveBeenCalled();
        });
    });
});
