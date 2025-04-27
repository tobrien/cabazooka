import { jest } from '@jest/globals';
import type { Command } from 'commander';
import type { Config, Args, Feature, FilesystemStructure, Logger, Operator } from '../src/cabazooka';
import type * as ConfigureModule from '../src/configure';
import type * as DefaultsModule from '../src/defaults';
import type * as ReadModule from '../src/read';
import type * as ValidateModule from '../src/validate';
import type * as OperateModule from 'operate'; // Assuming 'operate' is the package name

// --- Mock Dependencies ---

const mockConfigure = jest.fn<typeof ConfigureModule.configure>();
const mockApplyDefaults = jest.fn<typeof DefaultsModule.applyDefaults>();
const mockRead = jest.fn<typeof ReadModule.read>();
const mockValidate = jest.fn<typeof ValidateModule.validate>();
const mockCreateOperator = jest.fn<typeof OperateModule.create>();
const mockOperatorInstance = { /* Mock operator instance methods if needed */ } as Operator;

// Mock the modules
jest.unstable_mockModule('../src/configure', () => ({
    configure: mockConfigure,
}));

jest.unstable_mockModule('../src/defaults', () => ({
    applyDefaults: mockApplyDefaults,
}));

jest.unstable_mockModule('../src/read', () => ({
    read: mockRead,
}));

jest.unstable_mockModule('../src/validate', () => ({
    validate: mockValidate,
    // Add ArgumentError mock if needed by tests
}));

// Assuming 'operate' is the correct module name for the operator
jest.unstable_mockModule('operate', () => ({
    create: mockCreateOperator,
}));

// --- Dynamically Import Module Under Test ---

const { create, DEFAULT_APP_OPTIONS, DEFAULT_ALLOWED_OPTIONS, DEFAULT_FEATURES, DEFAULT_OPTIONS } = await import('../src/cabazooka');

// --- Test Suite ---

describe('Cabazooka Factory (`create`)', () => {
    let mockCommand: Command;
    let mockLogger: Logger;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCommand = {
            // Mock commander methods used by configure if necessary
        } as Command;

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
            silly: jest.fn(),
        };

        // Setup default return values for mocks
        mockApplyDefaults.mockImplementation((config) => config as Config); // Pass through config by default
        mockRead.mockResolvedValue({});
        mockValidate.mockResolvedValue(undefined);
        mockCreateOperator.mockResolvedValue(mockOperatorInstance);
    });

    test('should create instance with default options when no overrides provided', () => {
        const cabazooka = create();
        expect(cabazooka).toBeDefined();
        // We can't directly inspect internal options easily,
        // so we test the behavior of the methods that use them.
    });

    test('should create instance with overridden options', () => {
        const customDefaults = { inputDirectory: '/custom/input' };
        const customAllowed = { extensions: ['txt'] };
        const customFeatures: Feature[] = ['input'];
        const customAddDefaults = false;

        const cabazooka = create({
            defaults: customDefaults,
            allowed: customAllowed,
            features: customFeatures,
            addDefaults: customAddDefaults,
            logger: mockLogger,
        });

        expect(cabazooka).toBeDefined();
        // Further tests will verify these options are used
    });

    describe('Cabazooka Instance Methods', () => {
        let cabazooka: ReturnType<typeof create>;
        const testArgs: Args = {
            recursive: false,
            timezone: 'UTC',
            inputDirectory: '/in',
            outputDirectory: '/out',
            extensions: ['.eml'],
        };
        const testConfig: Partial<Config> = { inputDirectory: '/in', outputDirectory: '/out' };
        const fullConfig: Config = { ...DEFAULT_APP_OPTIONS, ...testConfig } as Config;

        beforeEach(() => {
            cabazooka = create({ logger: mockLogger });
            mockApplyDefaults.mockReturnValue(fullConfig);
            mockRead.mockResolvedValue(testConfig);
        });

        test('`configure` should call the configure module', async () => {
            await cabazooka.configure(mockCommand);
            expect(mockConfigure).toHaveBeenCalledTimes(1);
            expect(mockConfigure).toHaveBeenCalledWith(
                mockCommand,
                DEFAULT_APP_OPTIONS,
                DEFAULT_OPTIONS.addDefaults,
                DEFAULT_FEATURES
            );
        });

        test('`configure` should use overridden options', async () => {
            const customDefaults = { timezone: 'EST' };
            const customFeatures: Feature[] = ['output'];
            const customAddDefaults = false;
            const cabazookaCustom = create({
                defaults: customDefaults,
                features: customFeatures,
                addDefaults: customAddDefaults,
            });

            await cabazookaCustom.configure(mockCommand);
            expect(mockConfigure).toHaveBeenCalledWith(
                mockCommand,
                expect.objectContaining(customDefaults),
                customAddDefaults,
                customFeatures
            );
        });

        test('`setLogger` should update the logger used internally', async () => {
            const newLogger: Logger = {
                debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
                verbose: jest.fn(), silly: jest.fn()
            };
            cabazooka.setLogger(newLogger);

            await cabazooka.validate(fullConfig);
            expect(mockValidate).toHaveBeenCalledWith(fullConfig, expect.objectContaining({ logger: newLogger }));
        });

        test('`read` should call the read module and store args', async () => {
            const result = await cabazooka.read(testArgs);
            expect(mockRead).toHaveBeenCalledTimes(1);
            expect(mockRead).toHaveBeenCalledWith(testArgs, DEFAULT_FEATURES);
            expect(result).toEqual(testConfig);

            await cabazooka.operate(fullConfig);
            expect(mockCreateOperator).toHaveBeenCalledWith(
                fullConfig,
                testArgs,
                expect.any(Object)
            );
        });

        test('`read` should use overridden features', async () => {
            const customFeatures: Feature[] = ['input', 'output'];
            const cabazookaCustom = create({ features: customFeatures });
            await cabazookaCustom.read(testArgs);
            expect(mockRead).toHaveBeenCalledWith(testArgs, customFeatures);
        });

        test('`applyDefaults` should call the defaults module', () => {
            const result = cabazooka.applyDefaults(testConfig);
            expect(mockApplyDefaults).toHaveBeenCalledTimes(1);
            expect(mockApplyDefaults).toHaveBeenCalledWith(
                testConfig,
                DEFAULT_FEATURES,
                DEFAULT_APP_OPTIONS
            );
            expect(result).toEqual(fullConfig);
        });

        test('`applyDefaults` should use overridden features and defaults', () => {
            const customDefaults = { recursive: true };
            const customFeatures: Feature[] = ['input'];
            const cabazookaCustom = create({ defaults: customDefaults, features: customFeatures });

            cabazookaCustom.applyDefaults(testConfig);
            expect(mockApplyDefaults).toHaveBeenCalledWith(
                testConfig,
                customFeatures,
                expect.objectContaining(customDefaults)
            );
        });

        test('`validate` should call the validate module', async () => {
            await cabazooka.validate(fullConfig);
            expect(mockValidate).toHaveBeenCalledTimes(1);
            expect(mockValidate).toHaveBeenCalledWith(fullConfig, expect.objectContaining({
                features: DEFAULT_FEATURES,
                allowed: DEFAULT_ALLOWED_OPTIONS,
                logger: mockLogger
            }));
        });

        test('`validate` should use overridden options', async () => {
            const customAllowed = { extensions: ['md'] };
            const customFeatures: Feature[] = ['input'];
            const cabazookaCustom = create({ allowed: customAllowed, features: customFeatures, logger: mockLogger });

            await cabazookaCustom.validate(fullConfig);
            expect(mockValidate).toHaveBeenCalledWith(fullConfig, expect.objectContaining({
                features: customFeatures,
                allowed: expect.objectContaining(customAllowed),
                logger: mockLogger
            }));
        });

        test('`operate` should call the operate module with config and stored args', async () => {
            await cabazooka.read(testArgs);
            const operator = await cabazooka.operate(fullConfig);

            expect(mockCreateOperator).toHaveBeenCalledTimes(1);
            expect(mockCreateOperator).toHaveBeenCalledWith(
                fullConfig,
                testArgs,
                expect.objectContaining({
                    features: DEFAULT_FEATURES,
                    allowed: DEFAULT_ALLOWED_OPTIONS,
                    logger: mockLogger
                })
            );
            expect(operator).toBe(mockOperatorInstance);
        });

        test('`operate` should use overridden options', async () => {
            const customDefaults = { outputDirectory: '/custom/out' };
            const customAllowed = { inputStructures: ['none'] as FilesystemStructure[] };
            const customFeatures: Feature[] = ['output'];
            const cabazookaCustom = create({
                defaults: customDefaults,
                allowed: customAllowed,
                features: customFeatures,
                logger: mockLogger
            });

            await cabazookaCustom.read(testArgs);
            await cabazookaCustom.operate(fullConfig);

            expect(mockCreateOperator).toHaveBeenCalledWith(
                fullConfig,
                testArgs,
                expect.objectContaining({
                    defaults: expect.objectContaining(customDefaults),
                    allowed: expect.objectContaining(customAllowed),
                    features: customFeatures,
                    logger: mockLogger
                })
            );
        });
    });
});
