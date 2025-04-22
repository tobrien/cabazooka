import { Command } from "commander";
import {
    ALLOWED_EXTENSIONS,
    ALLOWED_OUTPUT_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
    DEFAULT_EXTENSIONS,
    DEFAULT_INPUT_FILENAME_OPTIONS,
    DEFAULT_OUTPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_INPUT_STRUCTURE,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_RECURSIVE,
    DEFAULT_TIMEZONE,
    DATE_FORMAT_YEAR_MONTH_DAY
} from "./constants";
import { ArgumentError } from "./error/ArgumentError";
import * as Dates from "./util/dates";
import * as Storage from "./util/storage";
import { Config, Input } from "./cabazooka";
import { FilenameOption, OutputStructure, Options } from "./options";

export { ArgumentError };

export const create = (options: Options): {
    configure: (command: Command) => Promise<Command>;
    validate: (input: Input) => Promise<Config>;
} => {

    const logger: typeof console = console;
    const storage = Storage.create({ log: logger.debug });

    const configure = async (command: Command): Promise<Command> => {
        let retCommand = command;
        retCommand = retCommand.option('--timezone <timezone>', 'timezone for date calculations', options.defaults?.timezone || DEFAULT_TIMEZONE)
        if (options.isFeatureEnabled('input')) {
            retCommand = retCommand.option('-r, --recursive', 'recursive mode, process all files in the input directory', options.defaults?.recursive || DEFAULT_RECURSIVE)
            retCommand = retCommand.option('-i, --input-directory <inputDirectory>', 'input directory', options.defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY)
        }
        if (options.isFeatureEnabled('output')) {
            retCommand = retCommand.option('-o, --output-directory <outputDirectory>', 'output directory', options.defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY)
        }
        if (options.isFeatureEnabled('structured-output')) {
            retCommand = retCommand.option('--output-structure <type>', 'output directory structure (none/year/month/day)', options.defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE)
            retCommand = retCommand.option('--output-filename-options [outputFilenameOptions...]', 'filename format options (space-separated list of: date,time,subject) example \'date subject\'', options.defaults?.outputFilenameOptions || DEFAULT_OUTPUT_FILENAME_OPTIONS)
        }
        if (options.isFeatureEnabled('extensions')) {
            retCommand = retCommand.option('--extensions [extensions...]', 'file extensions to process (space-separated list of: mp3,mp4,mpeg,mpga,m4a,wav,webm)', options.defaults?.extensions || DEFAULT_EXTENSIONS);
        }

        if (options.isFeatureEnabled('structured-input')) {
            retCommand = retCommand.option('--input-structure <type>', 'input directory structure (none/year/month/day)', options.defaults?.inputStructure || DEFAULT_INPUT_STRUCTURE)
            retCommand = retCommand.option('--input-filename-options [options...]', 'filename format options (space-separated list of: date,time,subject)', options.defaults?.inputFilenameOptions || DEFAULT_INPUT_FILENAME_OPTIONS)
            retCommand = retCommand.option('--start <date>', `start date filter (${DATE_FORMAT_YEAR_MONTH_DAY})`)
            retCommand = retCommand.option('--end <date>', `end date filter (${DATE_FORMAT_YEAR_MONTH_DAY}), defaults to today`)
        }

        return retCommand;
    }

    const validate = async (input: Input): Promise<Config> => {

        const config: Partial<Config> = {};

        // Validate timezone
        const timezone: string = validateTimezone(input.timezone);
        config.timezone = timezone;

        if (options.isFeatureEnabled('input') && input.inputDirectory) {
            await validateInputDirectory(input.inputDirectory);
            config.inputDirectory = input.inputDirectory ?? DEFAULT_INPUT_DIRECTORY;
            config.recursive = input.recursive ?? DEFAULT_RECURSIVE;
        }

        if (options.isFeatureEnabled('output') && input.outputDirectory) {
            await validateOutputDirectory(input.outputDirectory);
            config.outputDirectory = input.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
        }

        if (options.isFeatureEnabled('structured-output')) {
            // Validate filename options if provided
            validateOutputStructure(input.outputStructure);
            validateOutputFilenameOptions(input.outputFilenameOptions, input.outputStructure as OutputStructure);
            config.outputStructure = (input.outputStructure ?? DEFAULT_OUTPUT_STRUCTURE) as OutputStructure;
            config.outputFilenameOptions = (input.outputFilenameOptions ?? DEFAULT_OUTPUT_FILENAME_OPTIONS) as FilenameOption[];
        }

        if (options.isFeatureEnabled('extensions')) {
            validateExtensions(input.extensions);
            config.extensions = input.extensions ?? DEFAULT_EXTENSIONS;
        }

        // Create date utility after timezone is validated
        const dateUtil = Dates.create({ timezone });

        if (options.isFeatureEnabled('structured-input')) {
            validateInputStructure(input.inputStructure);
            validateInputFilenameOptions(input.inputFilenameOptions, input.inputStructure as OutputStructure);
            validateStartEndDates(input.start, input.end, dateUtil);

            config.inputStructure = (input.inputStructure ?? DEFAULT_INPUT_STRUCTURE) as OutputStructure;
            config.inputFilenameOptions = (input.inputFilenameOptions ?? DEFAULT_INPUT_FILENAME_OPTIONS) as FilenameOption[];

            // Parse start date string into Date object
            config.startDate = input.start ? dateUtil.parse(input.start, DATE_FORMAT_YEAR_MONTH_DAY) : undefined;

            // Parse end date string (or today's date if end is undefined) into Date object
            const endDateString = input.end ?? dateUtil.today();
            config.endDate = dateUtil.parse(endDateString, DATE_FORMAT_YEAR_MONTH_DAY);

            // Re-validate after setting default end date (validation uses parsed dates internally)
            // Note: validateStartEndDates already checks if the parsed dates are valid and in correct order
            // We just need to pass the original strings (or the generated today string) for validation error messages.
            validateStartEndDates(input.start, endDateString, dateUtil);
        }

        return config as Config;
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
        const validOptions: OutputStructure[] = options.allowed?.outputStructures || ALLOWED_OUTPUT_STRUCTURES;
        if (outputStructure && !validOptions.includes(outputStructure as OutputStructure)) {
            throw new ArgumentError('--output-structure', `Invalid output structure: ${outputStructure}. Valid options are: ${validOptions.join(', ')}`);
        }
    }

    const validateOutputFilenameOptions = (outputFilenameOptions: string[] | undefined, outputStructure: OutputStructure | undefined): void => {
        if (outputFilenameOptions) {
            // Check if first argument contains commas - likely a comma-separated list
            if (outputFilenameOptions[0].includes(',')) {
                throw new ArgumentError('--output-filename-options', 'Filename options should be space-separated, not comma-separated. Example: --output-filename-options date time subject');
            }

            // Check if first argument looks like a quoted string containing multiple options
            if (outputFilenameOptions.length === 1 && outputFilenameOptions[0].split(' ').length > 1) {
                throw new ArgumentError('--output-filename-options', 'Filename options should not be quoted. Use: --output-filename-options date time subject instead of --output-filename-options "date time subject"');
            }
            const validOptions = options.allowed?.outputFilenameOptions || ALLOWED_OUTPUT_FILENAME_OPTIONS;
            const invalidOptions = outputFilenameOptions.filter(opt => !validOptions.includes(opt as FilenameOption));
            if (invalidOptions.length > 0) {
                throw new ArgumentError('--output-filename-options', `Invalid filename options: ${invalidOptions.join(', ')}. Valid options are: ${validOptions.join(', ')}`);
            }

            // Validate date option against output structure
            if (outputFilenameOptions.includes('date')) {
                if (outputStructure && outputStructure === 'day') {
                    throw new ArgumentError('--output-filename-options', 'Cannot use date in filename when output structure is "day"');
                }
            }
        }
    }

    const validateInputStructure = (inputStructure: string | undefined): void => {
        const validOptions: OutputStructure[] = options.allowed?.outputStructures || ALLOWED_OUTPUT_STRUCTURES;
        if (inputStructure && !validOptions.includes(inputStructure as OutputStructure)) {
            throw new ArgumentError('--input-structure', `Invalid input structure: ${inputStructure}. Valid options are: ${validOptions.join(', ')}`);
        }
    }

    const validateInputFilenameOptions = (inputFilenameOptions: string[] | undefined, inputStructure: OutputStructure | undefined): void => {
        if (inputFilenameOptions) {
            // Check if first argument contains commas - likely a comma-separated list
            if (inputFilenameOptions[0].includes(',')) {
                throw new ArgumentError('--input-filename-options', 'Filename options should be space-separated, not comma-separated. Example: --input-filename-options date time subject');
            }

            // Check if first argument looks like a quoted string containing multiple options
            if (inputFilenameOptions.length === 1 && inputFilenameOptions[0].split(' ').length > 1) {
                throw new ArgumentError('--input-filename-options', 'Filename options should not be quoted. Use: --input-filename-options date time subject instead of --input-filename-options "date time subject"');
            }
            const validOptions = options.allowed?.outputFilenameOptions || ALLOWED_OUTPUT_FILENAME_OPTIONS;
            const invalidOptions = inputFilenameOptions.filter(opt => !validOptions.includes(opt as FilenameOption));
            if (invalidOptions.length > 0) {
                throw new ArgumentError('--input-filename-options', `Invalid filename options: ${invalidOptions.join(', ')}. Valid options are: ${validOptions.join(', ')}`);
            }

            // Validate date option against input structure
            if (inputFilenameOptions.includes('date')) {
                if (inputStructure && inputStructure === 'day') {
                    throw new ArgumentError('--input-filename-options', 'Cannot use date in filename when input structure is "day"');
                }
            }
        }
    }

    const validateStartEndDates = (startDate: string | undefined, endDate: string | undefined, dateUtil: Dates.Utility): void => {
        if (startDate && !dateUtil.isValidDate(startDate, DATE_FORMAT_YEAR_MONTH_DAY)) {
            throw new ArgumentError('--start', `Invalid start date format: ${startDate}. Expected format: ${DATE_FORMAT_YEAR_MONTH_DAY}`);
        }
        if (endDate && !dateUtil.isValidDate(endDate, DATE_FORMAT_YEAR_MONTH_DAY)) {
            throw new ArgumentError('--end', `Invalid end date format: ${endDate}. Expected format: ${DATE_FORMAT_YEAR_MONTH_DAY}`);
        }
        if (startDate && endDate) {
            const start = dateUtil.parse(startDate, DATE_FORMAT_YEAR_MONTH_DAY);
            const end = dateUtil.parse(endDate, DATE_FORMAT_YEAR_MONTH_DAY);
            if (dateUtil.isAfter(start, end)) {
                throw new ArgumentError('--start', `Start date (${startDate}) cannot be after end date (${endDate}).`);
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




