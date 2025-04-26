import { Command } from 'commander';
import { Logger } from "winston";
import { z } from 'zod';
import * as Arguments from './arguments';
import * as Input from './input';
import { Options as CabazookaOptions, FilenameOption, FilenameOptionSchema, FilesystemStructure, FilesystemStructureSchema } from "./options";
import * as Output from './output';

export * from './options';

export interface Cabazooka {
    configure: (command: Command) => Promise<Command>;
    setLogger: (logger: Logger) => void;
    validate: (args: Args) => Promise<Config>;
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
        logger.debug('Validating Input: \n\n%s\n\n', JSON.stringify(args, null, 2));
        const config = await argumentsInstance.validate(args);
        logger.debug('Validated Config: \n\n%s\n\n', JSON.stringify(config, null, 2));
        return config;
    }

    const operate = async (config: Config): Promise<Operator> => {
        logger.debug('Operating with Config: \n\n%s\n\n', JSON.stringify(config, null, 2));

        const output = Output.create(config.timezone, config, options, logger);
        const input = Input.create(config, options, logger);

        const process = async (callback: (file: string) => Promise<void>) => {
            if (!options.isFeatureEnabled('input')) {
                throw new Error('Input feature is not enabled, skipping input processing');
            }
            return input.process(callback);
        }

        const constructFilename = async (createDate: Date, type: string, hash: string, context?: { subject?: string }): Promise<string> => {
            if (!options.isFeatureEnabled('output')) {
                throw new Error('Output feature is not enabled, skipping output construction');
            }
            return output.constructFilename(createDate, type, hash, context);
        }

        const constructOutputDirectory = async (createDate: Date): Promise<string> => {
            if (!options.isFeatureEnabled('output')) {
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

    return {
        setLogger,
        configure,
        validate,
        operate,
    }
}





