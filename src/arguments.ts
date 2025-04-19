import { Command } from "commander";
import {
    ALLOWED_EXTENSIONS,
    ALLOWED_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
    DEFAULT_EXTENSIONS,
    DEFAULT_FILENAME_OPTIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_RECURSIVE,
    DEFAULT_TIMEZONE
} from "./constants";
import { ArgumentError } from "./error/ArgumentError";
import * as Dates from "./util/dates";
import * as Storage from "./util/storage";
import { Options, Config, OutputStructure, FilenameOption, Input } from "./cabazooka";

export const create = (options: Options): {
    configure: (command: Command) => Promise<Command>;
    validate: (input: Input) => Promise<Config>;
} => {

    const logger: typeof console = console;
    const storage = Storage.create({ log: logger.debug });

    const configure = async (command: Command): Promise<Command> => {
        command.option('--timezone <timezone>', 'timezone for date calculations', options.defaults?.timezone || DEFAULT_TIMEZONE)
            .option('-r, --recursive', 'recursive mode, process all files in the input directory', options.defaults?.recursive || DEFAULT_RECURSIVE)
            .option('-o, --output-directory <outputDirectory>', 'output directory', options.defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY)
            .option('-i, --input-directory <inputDirectory>', 'input directory', options.defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY)
            .option('--output-structure <type>', 'output directory structure (none/year/month/day)', options.defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE)
            .option('--filename-options [filenameOptions...]', 'filename format options (space-separated list of: date,time,subject) example \'date subject\'', options.defaults?.filenameOptions || DEFAULT_FILENAME_OPTIONS)
            .option('--extensions [extensions...]', 'file extensions to process (space-separated list of: mp3,mp4,mpeg,mpga,m4a,wav,webm)', options.defaults?.extensions || DEFAULT_EXTENSIONS);

        return command;
    }

    const validate = async (input: Input): Promise<Config> => {

        // Validate timezone
        const timezone: string = validateTimezone(input.timezone);


        if (input.inputDirectory) {
            await validateInputDirectory(input.inputDirectory);
        }

        if (input.outputDirectory) {
            await validateOutputDirectory(input.outputDirectory);
        }

        // Validate filename options if provided
        validateOutputStructure(input.outputStructure);
        validateFilenameOptions(input.filenameOptions, input.outputStructure as OutputStructure);

        validateExtensions(input.extensions);

        return {
            extensions: input.extensions ?? DEFAULT_EXTENSIONS,
            filenameOptions: (input.filenameOptions ?? DEFAULT_FILENAME_OPTIONS) as FilenameOption[],
            inputDirectory: input.inputDirectory ?? DEFAULT_INPUT_DIRECTORY,
            outputDirectory: input.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY,
            outputStructure: (input.outputStructure ?? DEFAULT_OUTPUT_STRUCTURE) as OutputStructure,
            recursive: input.recursive ?? DEFAULT_RECURSIVE,
            timezone: timezone,
        };
    }

    const validateInputDirectory = async (inputDirectory: string) => {
        // eslint-disable-next-line no-console
        const storage = Storage.create({ log: console.log });
        if (!storage.isDirectoryReadable(inputDirectory)) {
            throw new Error(`Input directory does not exist: ${inputDirectory}`);
        }
    }

    const validateOutputDirectory = async (outputDirectory: string) => {
        const isDirectoryWritable = await storage.isDirectoryWritable(outputDirectory);
        if (!isDirectoryWritable) {
            throw new Error(`Output directory does not exist: ${outputDirectory}`);
        }
    }

    const validateOutputStructure = (outputStructure: string | undefined): void => {
        const validOptions = options.allowed?.outputStructures || ALLOWED_OUTPUT_STRUCTURES;
        if (outputStructure && !validOptions.includes(outputStructure as OutputStructure)) {
            throw new ArgumentError('--output-structure', `Invalid output structure: ${outputStructure}. Valid options are: ${validOptions.join(', ')}`);
        }
    }

    const validateFilenameOptions = (filenameOptions: string[] | undefined, outputStructure: OutputStructure | undefined): void => {
        if (filenameOptions) {
            // Check if first argument contains commas - likely a comma-separated list
            if (filenameOptions[0].includes(',')) {
                throw new ArgumentError('--filename-options', 'Filename options should be space-separated, not comma-separated. Example: --filename-options date time subject');
            }

            // Check if first argument looks like a quoted string containing multiple options
            if (filenameOptions.length === 1 && filenameOptions[0].split(' ').length > 1) {
                throw new ArgumentError('--filename-options', 'Filename options should not be quoted. Use: --filename-options date time subject instead of --filename-options "date time subject"');
            }
            const validOptions = options.allowed?.filenameOptions || ALLOWED_FILENAME_OPTIONS;
            const invalidOptions = filenameOptions.filter(opt => !validOptions.includes(opt as FilenameOption));
            if (invalidOptions.length > 0) {
                throw new ArgumentError('--filename-options', `Invalid filename options: ${invalidOptions.join(', ')}. Valid options are: ${validOptions.join(', ')}`);
            }

            // Validate date option against output structure
            if (filenameOptions.includes('date')) {
                if (outputStructure && outputStructure === 'day') {
                    throw new ArgumentError('--filename-options', 'Cannot use date in filename when output structure is "day"');
                }
            }
        }
    }

    const validateTimezone = (timezone: string): string => {
        const validOptions = Dates.validTimezones();
        if (validOptions.includes(timezone)) {
            return timezone;
        }
        throw new ArgumentError('--timezone', `Invalid timezone: ${timezone}. Valid options are: ${validOptions.join(', ')}`);
    }

    const validateExtensions = (extensions: string[] | undefined): void => {
        const validOptions = options.allowed?.extensions || ALLOWED_EXTENSIONS;
        if (extensions) {
            const invalidOptions = extensions.filter(ext => !validOptions.includes(ext));
            if (invalidOptions.length > 0) {
                throw new ArgumentError('--extensions', `Invalid extensions: ${invalidOptions.join(', ')}. Valid options are: ${validOptions.join(', ')}`);
            }
        }
    }


    return {
        configure,
        validate,
    }
}




