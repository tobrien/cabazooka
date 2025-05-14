import { Command } from 'commander';
import { configure } from './configure';
import { applyDefaults } from './defaults';
import { read } from './read';
import { validate } from './validate';

import { ALLOWED_EXTENSIONS, ALLOWED_INPUT_FILENAME_OPTIONS, ALLOWED_INPUT_STRUCTURES, ALLOWED_OUTPUT_FILENAME_OPTIONS, ALLOWED_OUTPUT_STRUCTURES, DEFAULT_EXTENSIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_INPUT_FILENAME_OPTIONS, DEFAULT_INPUT_STRUCTURE, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE } from './constants';
import { z } from 'zod';
import { create as createOperator } from './operate';
import { wrapLogger } from './logger';

export interface Args {
    recursive: boolean;
    timezone: string;
    inputDirectory: string;
    inputStructure?: FilesystemStructure;
    inputFilenameOptions?: FilenameOption[];
    outputDirectory: string;
    outputStructure?: FilesystemStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions: string[];
    start?: string; // Start date string
    end?: string;   // End date string
    limit?: number; // Limit the number of files to process
}

export type Feature = 'input' | 'output' | 'structured-output' | 'structured-input' | 'extensions';

export const FilenameOptionSchema = z.enum([
    'date',
    'time',
    'subject',
]);

export type FilenameOption = z.infer<typeof FilenameOptionSchema>;

export const FilesystemStructureSchema = z.enum([
    'none',
    'year',
    'month',
    'day',
]);

export type FilesystemStructure = z.infer<typeof FilesystemStructureSchema>;

export interface DefaultOptions {
    timezone?: string;
    recursive?: boolean;
    inputDirectory?: string;
    inputStructure?: FilesystemStructure;
    inputFilenameOptions?: FilenameOption[];
    outputDirectory?: string;
    outputStructure?: FilesystemStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export interface AllowedOptions {
    inputStructures?: FilesystemStructure[];
    inputFilenameOptions?: FilenameOption[];
    outputStructures?: FilesystemStructure[];
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
}

export interface Options {
    defaults?: DefaultOptions,
    allowed?: AllowedOptions,
    features: Feature[],
    addDefaults: boolean;
    logger: Logger;
}

export interface Logger {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    verbose: (message: string, ...args: any[]) => void;
    silly: (message: string, ...args: any[]) => void;
}

export const DEFAULT_APP_OPTIONS: DefaultOptions = {
    timezone: DEFAULT_TIMEZONE,
    recursive: DEFAULT_RECURSIVE,
    inputDirectory: DEFAULT_INPUT_DIRECTORY,
    inputStructure: DEFAULT_INPUT_STRUCTURE,
    inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    outputStructure: DEFAULT_OUTPUT_STRUCTURE,
    outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
    extensions: DEFAULT_EXTENSIONS,
}

export const DEFAULT_ALLOWED_OPTIONS: AllowedOptions = {
    inputStructures: ALLOWED_INPUT_STRUCTURES,
    inputFilenameOptions: ALLOWED_INPUT_FILENAME_OPTIONS,
    outputStructures: ALLOWED_OUTPUT_STRUCTURES,
    outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
    extensions: ALLOWED_EXTENSIONS,
}

export const DEFAULT_FEATURES: Feature[] = ['output', 'structured-output', 'input', 'extensions'];

export const DEFAULT_LOGGER: Logger = {
    // eslint-disable-next-line no-console
    debug: (message: string, ...args: any[]) => console.debug(message, ...args),
    // eslint-disable-next-line no-console
    info: (message: string, ...args: any[]) => console.info(message, ...args),
    // eslint-disable-next-line no-console
    warn: (message: string, ...args: any[]) => console.warn(message, ...args),
    // eslint-disable-next-line no-console
    error: (message: string, ...args: any[]) => console.error(message, ...args),
    // eslint-disable-next-line no-console
    verbose: (message: string, ...args: any[]) => console.log(message, ...args),
    // eslint-disable-next-line no-console
    silly: (message: string, ...args: any[]) => console.log(message, ...args),
}

export const DEFAULT_OPTIONS = {
    defaults: DEFAULT_APP_OPTIONS,
    allowed: DEFAULT_ALLOWED_OPTIONS,
    features: DEFAULT_FEATURES,
    addDefaults: true,
    logger: DEFAULT_LOGGER,
};

export const ConfigSchema = z.object({
    timezone: z.string(),
    inputDirectory: z.string().optional(),
    inputStructure: FilesystemStructureSchema.optional(),
    inputFilenameOptions: z.array(FilenameOptionSchema).optional(),
    recursive: z.boolean().optional(),
    outputDirectory: z.string().optional(),
    outputStructure: FilesystemStructureSchema.optional(),
    outputFilenameOptions: z.array(FilenameOptionSchema).optional(),
    extensions: z.array(z.string()).optional(),
    limit: z.number().optional(),
});

export interface DateRange {
    start: Date;
    end: Date;
}

export type Config = z.infer<typeof ConfigSchema>;

export interface Operator {
    process: (callback: (file: string) => Promise<void>, dateRange?: Partial<DateRange>) => Promise<void>;
    constructFilename: (createDate: Date, type: string, hash: string, options?: { subject?: string }) => Promise<string>;
    constructOutputDirectory: (createDate: Date) => Promise<string>;
}

export interface Cabazooka {
    configure: (command: Command) => Promise<void>;
    setLogger: (logger: Logger) => void;
    read: (args: Args) => Promise<Partial<Config>>;
    applyDefaults: (config: Partial<Config>) => Config;
    validate: (config: Config) => Promise<void>;
    operate: (config: Config) => Promise<Operator>;
}

export const create = (
    creationOptsParam: Partial<Options> = {}
): Cabazooka => {

    let args: Args;

    const options: Options = {
        defaults: { ...DEFAULT_APP_OPTIONS, ...creationOptsParam.defaults },
        allowed: { ...DEFAULT_ALLOWED_OPTIONS, ...creationOptsParam.allowed },
        features: creationOptsParam.features || DEFAULT_FEATURES,
        addDefaults: creationOptsParam.addDefaults === undefined ? DEFAULT_OPTIONS.addDefaults : creationOptsParam.addDefaults,
        logger: wrapLogger(creationOptsParam.logger || DEFAULT_OPTIONS.logger)
    };

    return {
        configure: async (command: Command) => configure(command, options.defaults || {}, options.addDefaults, options.features),
        setLogger: (logger: Logger) => {
            options.logger = wrapLogger(logger);
        },
        read: async (pArgs: Args) => {
            args = pArgs;
            return read(args, options.features);
        },
        applyDefaults: (config: Partial<Config>) => applyDefaults(config, options.features, options.defaults || {}),
        validate: async (config: Config) => validate(config, options),
        operate: async (config: Config) => createOperator(config, args, options),
    }
}





