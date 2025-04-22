import { Command } from 'commander';
import { Logger } from "winston";
import * as Arguments from './arguments';
import { ArgumentError } from './error/ArgumentError';
import * as Output from './output';
import * as Storage from './util/storage';
import * as Options from './options';
import * as Constants from "./constants";
import * as Dates from './util/dates';
import { FilenameOption, OutputStructure } from "./options";
import { Options as CabazookaOptions } from "./options";

export * from './options';

export interface Cabazooka {
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

export interface Input {
    recursive: boolean;
    timezone: string;
    inputDirectory: string;
    inputStructure?: string;
    inputFilenameOptions?: string[];
    outputDirectory: string;
    outputStructure?: string;
    outputFilenameOptions?: string[];
    extensions: string[];
    start?: string;
    end?: string;
}

export interface Config {
    timezone: string;
    inputDirectory?: string;
    inputStructure?: OutputStructure;
    inputFilenameOptions?: FilenameOption[];
    recursive?: boolean;
    outputDirectory?: string;
    outputStructure?: OutputStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
    startDate?: Date; // YYYY-M-D string parsed to Date
    endDate?: Date; // YYYY-M-D string parsed to Date
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

    const validate = (input: Input): Promise<Config> => {
        logger.debug('Validating Input: %j\n\n', input);
        return argumentsInstance.validate(input);
    }

    const operate = async (config: Config): Promise<Operator> => {
        const output = Output.create(config.timezone, config, options, logger);

        const process = async (callback: (file: string) => Promise<void>) => {

            if (!options.isFeatureEnabled('input')) {
                throw new Error('Input feature is not enabled, skipping input processing');
            }

            // Look through all files in the input directory
            const inputDirectory = config.inputDirectory;

            const storage: Storage.Utility = Storage.create({ log: logger.debug });

            let filePattern = `${config.recursive ? '**/' : ''}*`;
            if (options.isFeatureEnabled('extensions') && config.extensions && config.extensions.length > 0) {
                filePattern += `.{${config.extensions!.join(',')}}`;
            }

            logger.info('Processing files in %s with pattern %s', inputDirectory, filePattern);
            let fileCount = 0;
            await storage.forEachFileIn(inputDirectory!, async (file: string) => {
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
    const input: Input = command.opts();

    try {
        const config = await argumentHandler.validate(input);
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






