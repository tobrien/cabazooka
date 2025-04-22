import { Command } from 'commander';
import { Logger } from "winston";
import * as Arguments from './arguments';
import { ArgumentError } from './error/ArgumentError';
import * as Output from './output';
import * as Input from './input';
import * as Storage from './util/storage';
import * as Options from './options';
import * as Constants from "./constants";
import { FilenameOption, FilesystemStructure } from "./options";
import { Options as CabazookaOptions } from "./options";

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

export interface DateRange {
    start: Date;
    end: Date;
}

export interface Config {
    timezone: string;
    inputDirectory?: string;
    inputStructure?: FilesystemStructure;
    inputFilenameOptions?: FilenameOption[];
    recursive?: boolean;
    outputDirectory?: string;
    outputStructure?: FilesystemStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
    dateRange?: DateRange; // Replaced startDate and endDate
}

export type FileData = object;

export const create = (options: CabazookaOptions): Cabazooka => {

    let logger: Logger | typeof console = console;

    const argumentsInstance = Arguments.create(options);

    const setLogger = (pLogger: Logger) => {
        logger = pLogger;
    }

    const configure = (command: Command): Promise<Command> => {
        logger.debug('Configuring Command: %j\n\n', command);
        return argumentsInstance.configure(command);
    }

    const validate = (args: Args): Promise<Config> => {
        logger.debug('Validating Input: %j\n\n', args);
        return argumentsInstance.validate(args);
    }

    const operate = async (config: Config): Promise<Operator> => {
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

const run = async (args: string[]): Promise<void> => {

    const logger: typeof console = console;

    const features: Options.Feature[] = ['input', 'output', 'structured-output', 'extensions', 'structured-input'];
    const options = Options.createOptions({ features });

    const argumentHandler = Arguments.create(options);

    const command = new Command();
    command
        .version(Constants.VERSION, '-v, --version', 'output the current version')
        .description("Organizes files based on date and subject.")
        .usage('[options]');

    await argumentHandler.configure(command);

    command.parse(args);
    const argumentInput: Args = command.opts();

    try {
        const config = await argumentHandler.validate(argumentInput);
        logger.log('Configuration validated:', config);

        // Process files
        if (config.inputDirectory && options.isFeatureEnabled('input')) {
            const cabazookaInstance = create(options);
            // If a proper Logger (e.g., Winston) is available, set it here:
            // cabazookaInstance.setLogger(myWinstonLogger);
            const operator = await cabazookaInstance.operate(config);

            // Example callback - replace with actual file processing logic
            const processFileCallback = async (file: string) => {
                logger.debug(`Processing file via callback: ${file}`);
                // TODO: Implement actual file processing/moving/renaming logic here
                // Example: Get new filename/directory
                // const createDate = new Date(); // Replace with actual date extraction
                // const newFilename = await operator.constructFilename(createDate, 'txt', 'hash');
                // const newDir = await operator.constructOutputDirectory(createDate);
                // await storage.moveFile(file, storage.joinPath(newDir, newFilename));
            };

            await operator.process(processFileCallback);
            logger.log(`Processing complete.`); // Count is logged within operator.process
        } else {
            logger.log('Input directory not configured or input feature disabled, skipping file processing.');
        }

    } catch (error: unknown) {
        if (error instanceof ArgumentError) {
            logger.error(`Argument Error: ${error.message}`);
        } else if (error instanceof Error) {
            logger.error(`An unexpected error occurred: ${error.message}\nStack: ${error.stack}`);
        } else {
            logger.error('An unknown error occurred:', error);
        }
        // process.exit(1);
    }
}

// Export the run function for testing or external use
export { run };






