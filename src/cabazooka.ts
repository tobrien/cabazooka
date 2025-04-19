
import { Command } from 'commander';
import { Logger } from "winston";
import * as Arguments from './arguments';
import * as Output from './output';
import * as Storage from './util/storage';


export interface Instance {
    configure: (command: Command) => Promise<Command>;
    setLogger: (logger: Logger) => void;
    validate: (input: Input) => Promise<Config>;
    operate: (config: Config) => Promise<Operator>;
}

export interface Operator {
    process: (callback: (file: string) => Promise<void>) => Promise<void>;
    constructFilename: (createDate: Date, type: string, hash: string, options?: { subject?: string }) => Promise<string>;
    constructOutputDirectory: (createDate: Date) => Promise<string>;
}

export type FilenameOption = 'date' | 'time' | 'subject';
export type OutputStructure = 'none' | 'year' | 'month' | 'day';

export interface Options {
    defaults?: {
        timezone?: string;
        recursive?: boolean;
        inputDirectory?: string;
        outputDirectory?: string;
        outputStructure?: OutputStructure;
        filenameOptions?: FilenameOption[];
        extensions?: string[];
    },
    allowed?: {
        outputStructures?: OutputStructure[];
        filenameOptions?: FilenameOption[];
        extensions?: string[];
    },
}

export interface Input {
    recursive: boolean;
    timezone: string;
    inputDirectory: string;
    outputDirectory: string;
    extensions: string[];
    outputStructure?: string;
    filenameOptions?: string[];
}

export interface Config {
    timezone: string;
    recursive: boolean;
    inputDirectory: string;
    outputDirectory: string;
    outputStructure: OutputStructure;
    filenameOptions: FilenameOption[];
    extensions: string[];
}

export const create = (options: Options): Instance => {

    let logger: Logger | typeof console = console;

    const argumentsInstance = Arguments.create(options);

    const setLogger = (pLogger: Logger) => {
        logger = pLogger;
    }

    const configure = (command: Command): Promise<Command> => {
        logger.debug('Configuring Command: %j\n\n', command);
        return argumentsInstance.configure(command);
    }

    const validate = (input: Input): Promise<Config> => {
        logger.debug('Validating Input: %j\n\n', input);
        return argumentsInstance.validate(input);
    }

    const operate = async (config: Config): Promise<Operator> => {
        const output = Output.create(config.timezone, config, options, logger);

        const process = async (callback: (file: string) => Promise<void>) => {

            // Look through all files in the input directory
            const inputDirectory = config.inputDirectory;

            const storage: Storage.Utility = Storage.create({ log: logger.debug });

            const filePattern = `${config.recursive ? '**/' : ''}*.{${config.extensions.join(',')}}`;

            logger.info('Processing files in %s with pattern %s', inputDirectory, filePattern);
            let fileCount = 0;
            await storage.forEachFileIn(inputDirectory, async (file: string) => {
                try {
                    logger.debug('Processing file %s', file);
                    await callback(file);
                    fileCount++;
                } catch (error) {
                    logger.error('Error processing file %s: %s\n\n%s\n\n', file, error, (error as Error).stack);
                }
            }, { pattern: filePattern });

            logger.info('Processed %d files', fileCount);

        }

        const constructFilename = async (createDate: Date, type: string, hash: string, options?: { subject?: string }): Promise<string> => {
            return output.constructFilename(createDate, type, hash, options);
        }

        const constructOutputDirectory = async (createDate: Date): Promise<string> => {
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






