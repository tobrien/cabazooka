import { Command } from 'commander';
import { Logger } from "winston";
import { z } from 'zod';
import * as Arguments from './arguments';
import { DEFAULT_EXTENSIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_INPUT_FILENAME_OPTIONS, DEFAULT_INPUT_STRUCTURE, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE } from './constants';
import * as Input from './input';
import { Options as CabazookaOptions, FilenameOption, FilenameOptionSchema, FilesystemStructure, FilesystemStructureSchema } from "./options";
import * as Output from './output';

export * from './options';

export interface Cabazooka {
    configure: (command: Command) => Promise<Command>;
    setLogger: (logger: Logger) => void;
    validate: (args: Args) => Promise<Config>;
    applyDefaults: (config: Config) => Config;
    operate: (config: Config) => Promise<Operator>;
}

export interface Operator {
    process: (callback: (file: string) => Promise<void>) => Promise<void>;
    constructFilename: (createDate: Date, type: string, hash: string, options?: { subject?: string }) => Promise<string>;
    constructOutputDirectory: (createDate: Date) => Promise<string>;
}

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
}

export const DateRangeSchema = z.object({
    start: z.date(),
    end: z.date(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

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
    dateRange: DateRangeSchema.optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export type FileData = object;

export const create = (options: CabazookaOptions): Cabazooka => {

    let logger: Logger | typeof console = console;

    const argumentsInstance = Arguments.create(options);

    const setLogger = (pLogger: Logger) => {
        logger = pLogger;
    }

    const configure = (command: Command): Promise<Command> => {
        return argumentsInstance.configure(command);
    }

    const validate = async (args: Args): Promise<Config> => {
        const config = await argumentsInstance.validate(args);
        return config;
    }

    const operate = async (config: Config): Promise<Operator> => {
        const output = Output.create(config.timezone, config, options, logger);
        const input = Input.create(config, options, logger);

        const process = async (callback: (file: string) => Promise<void>) => {
            if (!options.features.includes('input')) {
                throw new Error('Input feature is not enabled, skipping input processing');
            }
            return input.process(callback);
        }

        const constructFilename = async (createDate: Date, type: string, hash: string, context?: { subject?: string }): Promise<string> => {
            if (!options.features.includes('output')) {
                throw new Error('Output feature is not enabled, skipping output construction');
            }
            return output.constructFilename(createDate, type, hash, context);
        }

        const constructOutputDirectory = async (createDate: Date): Promise<string> => {
            if (!options.features.includes('output')) {
                throw new Error('Output feature is not enabled, skipping output construction');
            }
            return output.constructOutputDirectory(createDate);
        }

        return {
            process,
            constructFilename,
            constructOutputDirectory,
        }

    }

    const applyDefaults = (config: Config): Config => {
        const configWithDefaults = {
            ...config,
        }

        if (options.features.includes('input')) {
            configWithDefaults.recursive = config.recursive === undefined ? DEFAULT_RECURSIVE : config.recursive;
            configWithDefaults.inputDirectory = config.inputDirectory || (options.defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY);
        }
        if (options.features.includes('output')) {
            configWithDefaults.outputDirectory = config.outputDirectory || (options.defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY);
        }
        if (options.features.includes('structured-output')) {
            configWithDefaults.outputStructure = config.outputStructure || (options.defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE);
            configWithDefaults.outputFilenameOptions = config.outputFilenameOptions || (options.defaults?.outputFilenameOptions || DEFAULT_OUTPUT_FILENAME_OPTIONS);
        }
        if (options.features.includes('extensions')) {
            configWithDefaults.extensions = config.extensions || (options.defaults?.extensions || DEFAULT_EXTENSIONS);
        }

        if (options.features.includes('structured-input')) {
            configWithDefaults.inputStructure = config.inputStructure || (options.defaults?.inputStructure || DEFAULT_INPUT_STRUCTURE);
            configWithDefaults.inputFilenameOptions = config.inputFilenameOptions || (options.defaults?.inputFilenameOptions || DEFAULT_INPUT_FILENAME_OPTIONS);
        }

        return configWithDefaults;
    }

    return {
        setLogger,
        configure,
        validate,
        operate,
        applyDefaults,
    }
}





