import { jest } from '@jest/globals';
import type { Config } from '../src/configure';
import type { Options, Feature } from '../src/options';
import type { Args } from '../src/read';
import type * as Input from '../src/input/input';
import type * as Output from '../src/output';
import type { Operator } from '../src/operate'; // Import Operator type

// --- Mock Dependencies ---

// Mock Input module
// Use the actual return type structure from Input.create
const mockInputProcess = jest.fn<(callback: (file: string, date?: Date) => Promise<void>) => Promise<void>>(); 
const mockInputCreate = jest.fn<typeof Input.create>().mockReturnValue({
    process: mockInputProcess,
});

// Mock Output module
// Use the actual return type structure from Output.create
const mockOutputConstructFilename = jest.fn<(date: Date, type: string, hash: string, options?: { subject?: string }) => string>();
const mockOutputConstructOutputDirectory = jest.fn<(creationTime: Date) => string>();

const mockOutputCreate = jest.fn<typeof Output.create>().mockReturnValue({
    constructFilename: mockOutputConstructFilename,
    constructOutputDirectory: mockOutputConstructOutputDirectory,
});

jest.unstable_mockModule('../src/input/input', () => ({
    create: mockInputCreate,
}));

jest.unstable_mockModule('../src/output', () => ({ // Mocking the entire output module index
    create: mockOutputCreate,
}));


// --- Dynamically Import Module Under Test ---

// Import the create function specifically after mocks
const { create } = await import('../src/operate');


// --- Test Suite ---

describe('Operator Factory (create)', () => {
    let baseConfig: Config;
    let baseArgs: Args;
    let baseOptions: Options;
    let testOperator: Operator;
    let testDate: Date;

    beforeEach(async () => { // Make beforeEach async if create is async
        jest.clearAllMocks();

        baseConfig = {
            inputDirectory: '/in',
            outputDirectory: '/out',
            timezone: 'UTC',
        };
        baseArgs = { 
            recursive: false,
            timezone: 'UTC', // Or derive from baseConfig if needed
            inputDirectory: '/in', // Or derive from baseConfig
            outputDirectory: '/out', // Or derive from baseConfig
            extensions: [], // Provide default empty array or relevant extensions
            // Add other required or optional fields from Args as needed with default values
            // inputStructure: undefined, 
            // inputFilenameOptions: [],
            // outputStructure: undefined,
            // outputFilenameOptions: [],
            // start: undefined,
            // end: undefined,
        };
        baseOptions = {
            features: ['input', 'output'], // Enable relevant features by default
            allowed: {}, // Add allowed if needed, or keep empty
            logger: { // Basic logger mock
                debug: jest.fn(),
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
                verbose: jest.fn(),
                silly: jest.fn(),
            },
            addDefaults: false, // Or true depending on default behavior tested
        };
        testDate = new Date(2023, 10, 21, 12, 30, 0); // Example date

        // Create the operator instance for tests that need it
        testOperator = await create(baseConfig, baseArgs, baseOptions);
    });

    test('should call Input.create and Output.create with correct arguments', async () => {
        // This test implicitly runs create via beforeEach
        expect(mockInputCreate).toHaveBeenCalledTimes(1);
        expect(mockInputCreate).toHaveBeenCalledWith(baseConfig, baseArgs, baseOptions);
        expect(mockOutputCreate).toHaveBeenCalledTimes(1);
        expect(mockOutputCreate).toHaveBeenCalledWith(baseConfig, baseOptions);
    });

    test('should return an operator with a process function that calls input.process', async () => {
        const callback = jest.fn<(file: string) => Promise<void>>();
        mockInputProcess.mockResolvedValue(undefined); // Mock the process implementation

        await testOperator.process(callback);

        expect(mockInputProcess).toHaveBeenCalledTimes(1);
        expect(mockInputProcess).toHaveBeenCalledWith(callback);
    });

    describe('constructFilename', () => {
        test('should call output.constructFilename when output feature is enabled', async () => {
            const type = 'email';
            const hash = 'abcdef123';
            const context = { subject: 'Test Subject' };
            const expectedFilename = 'expected-filename.eml';
            mockOutputConstructFilename.mockReturnValue(expectedFilename);

            const filename = await testOperator.constructFilename(testDate, type, hash, context);

            expect(mockOutputConstructFilename).toHaveBeenCalledTimes(1);
            expect(mockOutputConstructFilename).toHaveBeenCalledWith(testDate, type, hash, context);
            expect(filename).toBe(expectedFilename);
        });

        test('should throw error if output feature is disabled', async () => {
            const optionsNoOutput: Options = { ...baseOptions, features: ['input'] };
            const operatorNoOutput = await create(baseConfig, baseArgs, optionsNoOutput);
            const type = 'email';
            const hash = 'abcdef123';

            await expect(operatorNoOutput.constructFilename(testDate, type, hash))
                .rejects.toThrow('Output feature is not enabled, skipping output construction');

            expect(mockOutputConstructFilename).not.toHaveBeenCalled();
        });
    });

    describe('constructOutputDirectory', () => {
        test('should call output.constructOutputDirectory when output feature is enabled', async () => {
            const expectedDir = '/out/2023/11';
            mockOutputConstructOutputDirectory.mockReturnValue(expectedDir);

            const dir = await testOperator.constructOutputDirectory(testDate);

            expect(mockOutputConstructOutputDirectory).toHaveBeenCalledTimes(1);
            expect(mockOutputConstructOutputDirectory).toHaveBeenCalledWith(testDate);
            expect(dir).toBe(expectedDir);
        });

        test('should throw error if output feature is disabled', async () => {
            const optionsNoOutput: Options = { ...baseOptions, features: ['input'] };
            const operatorNoOutput = await create(baseConfig, baseArgs, optionsNoOutput);

            await expect(operatorNoOutput.constructOutputDirectory(testDate))
                .rejects.toThrow('Output feature is not enabled, skipping output construction');

            expect(mockOutputConstructOutputDirectory).not.toHaveBeenCalled();
        });
    });
});
