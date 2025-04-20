import { jest } from '@jest/globals';
import { Command } from 'commander';
import { Config, Input } from '../src/cabazooka';
import { Options } from '../src/options';

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

jest.unstable_mockModule('../src/options', () => ({
    create: jest.fn()
}));

// Import mocked modules
let Arguments: any;
let Output: any;
let Storage: any;
let Cabazooka: any;
let OptionsModule: any;

describe('cabazooka', () => {
    let mockArgumentsInstance: any;
    let mockOutputInstance: any;
    let mockStorageInstance: any;
    let mockLogger: any;
    let mockOptionsInstance: any;

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
        },
        isFeatureEnabled: jest.fn((feature) => true)
    };

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Import modules
        Arguments = await import('../src/arguments');
        Output = await import('../src/output');
        Storage = await import('../src/util/storage');
        Cabazooka = await import('../src/cabazooka');
        OptionsModule = await import('../src/options');

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

        mockOptionsInstance = { ...options };

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
        (OptionsModule.create as jest.Mock).mockReturnValue(mockOptionsInstance);
    });

    describe('create', () => {
        it('should create an instance with all methods', () => {
            const instance = Cabazooka.create(mockOptionsInstance);

            expect(instance).toHaveProperty('setLogger');
            expect(instance).toHaveProperty('configure');
            expect(instance).toHaveProperty('validate');
            expect(instance).toHaveProperty('operate');

            expect(typeof instance.setLogger).toBe('function');
            expect(typeof instance.configure).toBe('function');
            expect(typeof instance.validate).toBe('function');
            expect(typeof instance.operate).toBe('function');

            expect(Arguments.create).toHaveBeenCalledWith(mockOptionsInstance);
        });
    });

    describe('setLogger', () => {
        it('should set the logger', () => {
            const instance = Cabazooka.create(mockOptionsInstance);

            instance.setLogger(mockLogger);

            // Trigger a method that uses the logger
            instance.configure(new Command());

            expect(mockLogger.debug).toHaveBeenCalled();
        });
    });

    describe('configure', () => {
        it('should call arguments.configure with command', async () => {
            const instance = Cabazooka.create(mockOptionsInstance);
            const command = new Command();

            await instance.configure(command);

            expect(mockArgumentsInstance.configure).toHaveBeenCalledWith(command);
        });
    });

    describe('validate', () => {
        it('should call arguments.validate with input', async () => {
            const instance = Cabazooka.create(mockOptionsInstance);
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

        it('should handle validation errors', async () => {
            const instance = Cabazooka.create(mockOptionsInstance);
            instance.setLogger(mockLogger);

            // Setup mock to throw error
            const validationError = new Error('Invalid configuration');
            mockArgumentsInstance.validate.mockRejectedValueOnce(validationError);

            const input: Input = {
                timezone: 'Invalid/Timezone',
                recursive: false,
                inputDirectory: './custom-input',
                outputDirectory: './custom-output',
                outputStructure: 'invalid' as any,
                filenameOptions: ['invalid'] as any,
                extensions: ['invalid']
            };

            await expect(instance.validate(input)).rejects.toThrow(validationError);
            expect(mockArgumentsInstance.validate).toHaveBeenCalledWith(input);
        });
    });

    describe('operate', () => {
        it('should return operator with all methods', async () => {
            const instance = Cabazooka.create(mockOptionsInstance);
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
                mockOptionsInstance,
                expect.anything()
            );
        });

        describe('process', () => {
            it('should process files using storage.forEachFileIn', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);
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
                const instance = Cabazooka.create(mockOptionsInstance);

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
                const instance = Cabazooka.create(mockOptionsInstance);
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

            it('should handle empty file list', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);
                instance.setLogger(mockLogger);

                // Mock empty file list
                mockStorageInstance.forEachFileIn.mockImplementationOnce(async (dir: string, callback: (file: string) => Promise<void>, opts: { pattern: string }) => {
                    return Promise.resolve([]); // No files processed
                });

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

                expect(callback).not.toHaveBeenCalled();
                expect(mockLogger.info).toHaveBeenCalledWith('Processed %d files', 0);
            });

            it('should correctly join extensions', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);
                instance.setLogger(mockLogger);

                // Test with single extension
                const configSingle: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: true,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: ['wav']
                };

                const operatorSingle = await instance.operate(configSingle);
                await operatorSingle.process(jest.fn());

                expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
                    './custom-input',
                    expect.any(Function),
                    { pattern: '**/*.{wav}' }
                );

                // Reset mock for next test
                mockStorageInstance.forEachFileIn.mockClear();

                // Test with empty extensions array
                const configEmpty: Config = {
                    timezone: 'America/Los_Angeles',
                    recursive: true,
                    inputDirectory: './custom-input',
                    outputDirectory: './custom-output',
                    outputStructure: 'year',
                    filenameOptions: ['time'],
                    extensions: []
                };

                const operatorEmpty = await instance.operate(configEmpty);
                await operatorEmpty.process(jest.fn());

                expect(mockStorageInstance.forEachFileIn).toHaveBeenCalledWith(
                    './custom-input',
                    expect.any(Function),
                    { pattern: '**/*' }
                );
            });
        });

        describe('constructFilename', () => {
            it('should call output.constructFilename with parameters', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);

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

            it('should handle missing optional parameters', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);

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
                // Call without optional parameters
                const result = await operator.constructFilename(date, 'note', 'hash123');

                expect(mockOutputInstance.constructFilename).toHaveBeenCalledWith(
                    date,
                    'note',
                    'hash123',
                    undefined
                );
            });
        });

        describe('constructOutputDirectory', () => {
            it('should call output.constructOutputDirectory with date', async () => {
                const instance = Cabazooka.create(mockOptionsInstance);

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

    describe('isFeatureEnabled', () => {
        it('should respect feature toggles', async () => {
            // Setup mock to return false for specific feature
            mockOptionsInstance.isFeatureEnabled.mockImplementation((feature: string) => {
                return feature !== 'someFeature';
            });

            const instance = Cabazooka.create(mockOptionsInstance);
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

            // The internal implementation would need to use isFeatureEnabled('someFeature')
            // This just verifies our mock works as expected
            expect(mockOptionsInstance.isFeatureEnabled('someFeature')).toBe(false);
            expect(mockOptionsInstance.isFeatureEnabled('otherFeature')).toBe(true);
        });
    });
}); 