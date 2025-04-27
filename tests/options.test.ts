import { jest } from '@jest/globals';
import { z } from 'zod';
import {
    FilenameOptionSchema,
    FilesystemStructureSchema,
    DEFAULT_APP_OPTIONS,
    DEFAULT_ALLOWED_OPTIONS,
    DEFAULT_FEATURES,
    DEFAULT_LOGGER,
    DEFAULT_OPTIONS,
    type FilenameOption,
    type FilesystemStructure,
    type Feature,
    type DefaultOptions,
    type AllowedOptions,
    type Logger,
} from '../src/options';
import {
    ALLOWED_EXTENSIONS,
    ALLOWED_OUTPUT_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
    DEFAULT_EXTENSIONS,
    DEFAULT_OUTPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_RECURSIVE,
    DEFAULT_TIMEZONE,
    DEFAULT_INPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_STRUCTURE,
    ALLOWED_INPUT_FILENAME_OPTIONS,
    ALLOWED_INPUT_STRUCTURES,
} from '../src/constants';

// --- Mock Console for Logger Tests ---
const mockConsole = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(), // Used by verbose and silly
};

// Assign mock console globally for tests
const originalConsole = global.console;
beforeAll(() => {
    global.console = mockConsole as any;
});
afterAll(() => {
    global.console = originalConsole;
});
beforeEach(() => {
    jest.clearAllMocks();
});


// --- Test Suite ---

describe('Options Definitions', () => {

    describe('FilenameOptionSchema', () => {
        it('should parse valid filename options', () => {
            expect(FilenameOptionSchema.safeParse('date').success).toBe(true);
            expect(FilenameOptionSchema.safeParse('time').success).toBe(true);
            expect(FilenameOptionSchema.safeParse('subject').success).toBe(true);
            expect(FilenameOptionSchema.parse('date')).toBe('date');
        });

        it('should reject invalid filename options', () => {
            expect(FilenameOptionSchema.safeParse('invalid').success).toBe(false);
            expect(FilenameOptionSchema.safeParse('').success).toBe(false);
            expect(FilenameOptionSchema.safeParse(null).success).toBe(false);
            expect(FilenameOptionSchema.safeParse(undefined).success).toBe(false);
        });
    });

    describe('FilesystemStructureSchema', () => {
        it('should parse valid filesystem structures', () => {
            expect(FilesystemStructureSchema.safeParse('none').success).toBe(true);
            expect(FilesystemStructureSchema.safeParse('year').success).toBe(true);
            expect(FilesystemStructureSchema.safeParse('month').success).toBe(true);
            expect(FilesystemStructureSchema.safeParse('day').success).toBe(true);
            expect(FilesystemStructureSchema.parse('year')).toBe('year');
        });

        it('should reject invalid filesystem structures', () => {
            expect(FilesystemStructureSchema.safeParse('invalid').success).toBe(false);
            expect(FilesystemStructureSchema.safeParse('year/month').success).toBe(false);
            expect(FilesystemStructureSchema.safeParse('').success).toBe(false);
            expect(FilesystemStructureSchema.safeParse(null).success).toBe(false);
            expect(FilesystemStructureSchema.safeParse(undefined).success).toBe(false);
        });
    });

    describe('Default Constants', () => {
        it('DEFAULT_APP_OPTIONS should match imported defaults', () => {
            const expected: DefaultOptions = {
                timezone: DEFAULT_TIMEZONE,
                recursive: DEFAULT_RECURSIVE,
                inputDirectory: DEFAULT_INPUT_DIRECTORY,
                inputStructure: DEFAULT_INPUT_STRUCTURE,
                inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
                outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
                outputStructure: DEFAULT_OUTPUT_STRUCTURE,
                outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
                extensions: DEFAULT_EXTENSIONS,
                startDate: undefined, // Ensure non-set defaults are undefined
                endDate: undefined,
            };
            expect(DEFAULT_APP_OPTIONS).toEqual(expected);
        });

        it('DEFAULT_ALLOWED_OPTIONS should match imported allowed values', () => {
            const expected: AllowedOptions = {
                inputStructures: ALLOWED_INPUT_STRUCTURES,
                inputFilenameOptions: ALLOWED_INPUT_FILENAME_OPTIONS,
                outputStructures: ALLOWED_OUTPUT_STRUCTURES,
                outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
                extensions: ALLOWED_EXTENSIONS,
            };
            expect(DEFAULT_ALLOWED_OPTIONS).toEqual(expected);
        });

        it('DEFAULT_FEATURES should contain the correct default features', () => {
            const expected: Feature[] = ['output', 'structured-output', 'input', 'extensions'];
            // Use Set for order-independent comparison
            expect(new Set(DEFAULT_FEATURES)).toEqual(new Set(expected));
        });

        it('DEFAULT_LOGGER should use console methods', () => {
            DEFAULT_LOGGER.debug('debug message', 1);
            expect(mockConsole.debug).toHaveBeenCalledWith('debug message', 1);

            DEFAULT_LOGGER.info('info message', { a: 1 });
            expect(mockConsole.info).toHaveBeenCalledWith('info message', { a: 1 });

            DEFAULT_LOGGER.warn('warn message');
            expect(mockConsole.warn).toHaveBeenCalledWith('warn message');

            DEFAULT_LOGGER.error('error message', new Error('test'));
            expect(mockConsole.error).toHaveBeenCalledWith('error message', new Error('test'));

            DEFAULT_LOGGER.verbose('verbose message', 'extra');
            expect(mockConsole.log).toHaveBeenCalledWith('verbose message', 'extra');

            DEFAULT_LOGGER.silly('silly message');
            expect(mockConsole.log).toHaveBeenCalledWith('silly message');
        });

        it('DEFAULT_OPTIONS should combine all defaults correctly', () => {
            expect(DEFAULT_OPTIONS).toEqual({
                defaults: DEFAULT_APP_OPTIONS,
                allowed: DEFAULT_ALLOWED_OPTIONS,
                features: DEFAULT_FEATURES,
                addDefaults: true,
                logger: DEFAULT_LOGGER,
            });
        });
    });
});
