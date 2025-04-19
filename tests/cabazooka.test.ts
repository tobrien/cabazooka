import { jest } from '@jest/globals';
import { Command } from 'commander';
import { Config, Input, Options } from '../src/cabazooka';

// Mock all dependencies
jest.unstable_mockModule('../src/arguments', () => ({
    create: jest.fn()
}));

jest.unstable_mockModule('../src/output', () => ({
    create: jest.fn()
}));

jest.unstable_mockModule('../src/util/storage', () => ({
    create: jest.fn()
}));

// Import mocked modules
let Arguments: any;
let Output: any;
let Storage: any;
let Cabazooka: any;

describe('cabazooka', () => {
    let mockArgumentsInstance: any;
    let mockOutputInstance: any;
    let mockStorageInstance: any;
    let mockLogger: any;

    const options: Options = {
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
        Arguments = await import('../src/arguments');
        Output = await import('../src/output');
        Storage = await import('../src/util/storage');
        Cabazooka = await import('../src/cabazooka');

        // Create mock instances
        mockArgumentsInstance = {
            configure: jest.fn(async (cmd: any) => Promise.resolve(cmd)),
            validate: jest.fn(async (input: any): Promise<Config> => Promise.resolve({
                timezone: input.timezone || 'America/New_York',
                recursive: input.recursive !== undefined ? input.recursive : true,
                inputDirectory: input.inputDirectory || './test-input',
                outputDirectory: input.outputDirectory || './test-output',
                outputStructure: (input.outputStructure || 'month') as any,
                filenameOptions: (input.filenameOptions || ['date', 'subject']) as any,
                extensions: input.extensions || ['mp3', 'mp4']
            }))
        };

        mockOutputInstance = {
            constructFilename: jest.fn(async (date: any, type: any, hash: any, opts?: any) =>
                Promise.resolve(`filename-${type}-${hash}${opts?.subject ? `-${opts.subject}` : ''}`)),
            constructOutputDirectory: jest.fn(async (date: any) =>
                Promise.resolve('./test-output/2023/05'))
        };

        mockStorageInstance = {
            forEachFileIn: jest.fn(async (dir: any, callback: any, opts: any) => {
                // Mock processing 3 files
                return Promise.all([
                    callback('file1.mp3'),
                    callback('file2.mp3'),
                    callback('file3.mp4')
                ]);
            })
        };

        // Setup logger mock
        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Set up mocked implementations
        (Arguments.create as jest.Mock).mockReturnValue(mockArgumentsInstance);
        (Output.create as jest.Mock).mockReturnValue(mockOutputInstance);
        (Storage.create as jest.Mock).mockReturnValue(mockStorageInstance);
    });

    describe('create', () => {
        it('should create an instance with all methods', () => {
            const instance = Cabazooka.create(options);

            expect(instance).toHaveProperty('setLogger');
            expect(instance).toHaveProperty('configure');
            expect(instance).toHaveProperty('validate');
            expect(instance).toHaveProperty('operate');

            expect(typeof instance.setLogger).toBe('function');
            expect(typeof instance.configure).toBe('function');
            expect(typeof instance.validate).toBe('function');
            expect(typeof instance.operate).toBe('function');

            expect(Arguments.create).toHaveBeenCalledWith(options);
        });
    });

    describe('setLogger', () => {
        it('should set the logger', () => {
            const instance = Cabazooka.create(options);

            instance.setLogger(mockLogger);

            // Trigger a method that uses the logger
            instance.configure(new Command());

            expect(mockLogger.debug).toHaveBeenCalled();
        });
    });

    describe('configure', () => {
        it('should call arguments.configure with command', async () => {
            const instance = Cabazooka.create(options);
            const command = new Command();

            await instance.configure(command);

            expect(mockArgumentsInstance.configure).toHaveBeenCalledWith(command);
        });
    });

    describe('validate', () => {
        it('should call arguments.validate with input', async () => {
            const instance = Cabazooka.create(options);
            const input: Input = {
                timezone: 'America/Los_Angeles',
                recursive: false,
                inputDirectory: './custom-input',
                outputDirectory: './custom-output',
                outputStructure: 'year',
                filenameOptions: ['time'],
                extensions: ['wav']
            };

            await instance.validate(input);

            expect(mockArgumentsInstance.validate).toHaveBeenCalledWith(input);
        });
    });

    describe('operate', () => {
        it('should return operator with all methods', async () => {
            const instance = Cabazooka.create(options);
            const config: Config = {
                timezone: 'America/Los_Angeles',
                recursive: false,
                inputDirectory: './custom-input',
                outputDirectory: './custom-output',
                outputStructure: 'year',
                filenameOptions: ['time'],
                extensions: ['wav']
            };

            const operator = await instance.operate(config);

            expect(operator).toHaveProperty('process');
            expect(operator).toHaveProperty('constructFilename');
            expect(operator).toHaveProperty('constructOutputDirectory');

            expect(typeof operator.process).toBe('function');
            expect(typeof operator.constructFilename).toBe('function');
            expect(typeof operator.constructOutputDirectory).toBe('function');

            expect(Output.create).toHaveBeenCalledWith(
                config.timezone,
                config,
                options,
                expect.anything()
            );
        });

        describe('process', () => {
            it('should process files using storage.forEachFileIn', async () => {
                const instance = Cabazooka.create(options);
                instance.setLogger(mockLogger);

                const config: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: true,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav', 'mp3']
                };

                const operator = await instance.operate(config);

                const callback = jest.fn(() => Promise.resolve());
                await operator.process(callback);

                expect(Storage.create).toHaveBeenCalled();
                expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
                    './custom-input',
                    expect.any(Function),
                    { pattern: '**/*.{wav,mp3}' }
                );

                // Should call callback for each file
                expect(callback).toHaveBeenCalledTimes(3);
                expect(callback).toHaveBeenCalledWith('file1.mp3');
                expect(callback).toHaveBeenCalledWith('file2.mp3');
                expect(callback).toHaveBeenCalledWith('file3.mp4');

                expect(mockLogger.info).toHaveBeenCalledWith('Processed %d files', 3);
            });

            it('should handle non-recursive file pattern when recursive is false', async () => {
                const instance = Cabazooka.create(options);

                const config: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: false,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav', 'mp3']
                };

                const operator = await instance.operate(config);

                const callback = jest.fn(() => Promise.resolve());
                await operator.process(callback);

                expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
                    './custom-input',
                    expect.any(Function),
                    { pattern: '*.{wav,mp3}' }
                );
            });

            it('should log error when callback throws exception', async () => {
                const instance = Cabazooka.create(options);
                instance.setLogger(mockLogger);

                const config: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: true,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav', 'mp3']
                };

                const operator = await instance.operate(config);

                // Mock implementation that throws for the second file
                const error = new Error('Test error');
                let callCount = 0;
                const callback = jest.fn((file: string) => {
                    callCount++;
                    if (callCount === 2) {
                        return Promise.reject(error);
                    }
                    return Promise.resolve();
                });

                await operator.process(callback);

                expect(mockLogger.error).toHaveBeenCalledWith(
                    'Error processing file %s: %s\n\n%s\n\n',
                    'file2.mp3',
                    error,
                    error.stack
                );
            });
        });

        describe('constructFilename', () => {
            it('should call output.constructFilename with parameters', async () => {
                const instance = Cabazooka.create(options);

                const config: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: false,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav']
                };

                const operator = await instance.operate(config);

                const date = new Date();
                const result = await operator.constructFilename(date, 'note', 'hash123', { subject: 'Test Subject' });

                expect(mockOutputInstance.constructFilename).toHaveBeenCalledWith(
                    date,
                    'note',
                    'hash123',
                    { subject: 'Test Subject' }
                );

                expect(result).toBe('filename-note-hash123-Test Subject');
            });
        });

        describe('constructOutputDirectory', () => {
            it('should call output.constructOutputDirectory with date', async () => {
                const instance = Cabazooka.create(options);

                const config: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: false,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav']
                };

                const operator = await instance.operate(config);

                const date = new Date();
                const result = await operator.constructOutputDirectory(date);

                expect(mockOutputInstance.constructOutputDirectory).toHaveBeenCalledWith(date);
                expect(result).toBe('./test-output/2023/05');
            });
        });
    });
}); 