import { Command } from "commander";
import { Args, Config } from "./cabazooka";
import {
    ALLOWED_EXTENSIONS,
    ALLOWED_INPUT_FILENAME_OPTIONS,
    ALLOWED_INPUT_STRUCTURES,
    ALLOWED_OUTPUT_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
    DATE_FORMAT_YEAR_MONTH_DAY,
    DEFAULT_EXTENSIONS,
    DEFAULT_INPUT_DIRECTORY,
    DEFAULT_INPUT_FILENAME_OPTIONS,
    DEFAULT_INPUT_STRUCTURE,
    DEFAULT_OUTPUT_DIRECTORY,
    DEFAULT_OUTPUT_FILENAME_OPTIONS,
    DEFAULT_OUTPUT_STRUCTURE,
    DEFAULT_RECURSIVE,
    DEFAULT_TIMEZONE
} from "./constants";
import { ArgumentError } from "./error/ArgumentError";
import { FilenameOption, FilesystemStructure, Options } from "./options";
import * as Dates from "./util/dates";
import * as Storage from "./util/storage";

export { ArgumentError };

export const create = (options: Options): {
    configure: (command: Command) => Promise<Command>;
    validate: (args: Args) => Promise<Config>;
} => {

    const logger: typeof console = console;
    const storage = Storage.create({ log: logger.debug });

    const configure = async (command: Command): Promise<Command> => {
        let retCommand = command;
        retCommand = retCommand.option('--timezone <timezone>', 'timezone for date calculations', options.addDefaults ? options.defaults?.timezone || DEFAULT_TIMEZONE : undefined)
        if (options.features.includes('input')) {
            retCommand = retCommand.option('-r, --recursive', 'recursive mode, process all files in the input directory', options.addDefaults ? options.defaults?.recursive || DEFAULT_RECURSIVE : undefined)
            retCommand = retCommand.option('-i, --input-directory <inputDirectory>', 'input directory', options.addDefaults ? options.defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY : undefined)
        }
        if (options.features.includes('output')) {
            retCommand = retCommand.option('-o, --output-directory <outputDirectory>', 'output directory', options.addDefaults ? options.defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY : undefined)
        }
        if (options.features.includes('structured-output')) {
            retCommand = retCommand.option('--output-structure <type>', 'output directory structure (none/year/month/day)', options.addDefaults ? options.defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE : undefined)
            retCommand = retCommand.option('--output-filename-options [outputFilenameOptions...]', 'filename format options (space-separated list of: date,time,subject) example \'date subject\'', options.addDefaults ? options.defaults?.outputFilenameOptions || DEFAULT_OUTPUT_FILENAME_OPTIONS : undefined)
        }
        if (options.features.includes('extensions')) {
            retCommand = retCommand.option('--extensions [extensions...]', 'file extensions to process (space-separated list of: mp3,mp4,mpeg,mpga,m4a,wav,webm)', options.addDefaults ? options.defaults?.extensions || DEFAULT_EXTENSIONS : undefined);
        }

        if (options.features.includes('structured-input')) {
            retCommand = retCommand.option('--input-structure <type>', 'input directory structure (none/year/month/day)', options.addDefaults ? options.defaults?.inputStructure || DEFAULT_INPUT_STRUCTURE : undefined)
            retCommand = retCommand.option('--input-filename-options [options...]', 'filename format options (space-separated list of: date,time,subject)', options.addDefaults ? options.defaults?.inputFilenameOptions || DEFAULT_INPUT_FILENAME_OPTIONS : undefined)
            retCommand = retCommand.option('--start <date>', `start date filter (${DATE_FORMAT_YEAR_MONTH_DAY})`)
            retCommand = retCommand.option('--end <date>', `end date filter (${DATE_FORMAT_YEAR_MONTH_DAY}), defaults to today`)
        }

        return retCommand;
    }

    const validate = async (args: Args): Promise<Config> => {

        const config: Partial<Config> = {};

        // Validate timezone
        const timezone: string = validateTimezone(args.timezone);
        config.timezone = timezone;

        if (options.features.includes('input') && args.inputDirectory) {
            await validateInputDirectory(args.inputDirectory);
            config.inputDirectory = options.addDefaults ? args.inputDirectory ?? DEFAULT_INPUT_DIRECTORY : undefined;
            config.recursive = options.addDefaults ? args.recursive ?? DEFAULT_RECURSIVE : undefined;
        }

        if (options.features.includes('output') && args.outputDirectory) {
            await validateOutputDirectory(args.outputDirectory);
            config.outputDirectory = options.addDefaults ? args.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY : undefined;
        }

        if (options.features.includes('structured-output')) {
            // Validate filename options if provided
            validateOutputStructure(args.outputStructure);
            validateOutputFilenameOptions(args.outputFilenameOptions, args.outputStructure as FilesystemStructure);
            config.outputStructure = options.addDefaults ? (args.outputStructure ?? DEFAULT_OUTPUT_STRUCTURE) as FilesystemStructure : undefined;
            config.outputFilenameOptions = options.addDefaults ? (args.outputFilenameOptions ?? DEFAULT_OUTPUT_FILENAME_OPTIONS) as FilenameOption[] : undefined;
        }

        if (options.features.includes('extensions')) {
            validateExtensions(args.extensions);
            config.extensions = options.addDefaults ? args.extensions ?? DEFAULT_EXTENSIONS : undefined;
        }

        // Create date utility after timezone is validated
        const dateUtil = Dates.create({ timezone });

        if (options.features.includes('structured-input')) {
            validateInputStructure(args.inputStructure);
            validateInputFilenameOptions(args.inputFilenameOptions, args.inputStructure as FilesystemStructure);

            // Validate the date strings first
            validateStartEndDates(args.start, args.end, dateUtil);

            config.inputStructure = options.addDefaults ? (args.inputStructure ?? DEFAULT_INPUT_STRUCTURE) as FilesystemStructure : undefined;
            config.inputFilenameOptions = options.addDefaults ? (args.inputFilenameOptions ?? DEFAULT_INPUT_FILENAME_OPTIONS) as FilenameOption[] : undefined;

            // Create DateRange object if start or end dates are relevant
            // Note: Validation ensures dates are valid and start <= end if both are provided
            if (args.start || args.end) {
                let startDate: Date;
                let endDate: Date;

                // Handle end date
                if (args.end) {
                    endDate = dateUtil.parse(args.end, DATE_FORMAT_YEAR_MONTH_DAY);
                } else {
                    // If only start is provided, end defaults to today
                    endDate = dateUtil.now();
                }

                // Handle start date
                if (args.start) {
                    startDate = dateUtil.parse(args.start, DATE_FORMAT_YEAR_MONTH_DAY);
                } else {
                    // If only end is provided, start defaults to 31 days before end
                    // (This mirrors the logic from crudzap, adjust if needed)
                    startDate = dateUtil.subDays(endDate, 31);
                }

                // We re-check the order here after defaults might have been applied,
                // although validateStartEndDates should catch explicit invalid orders.
                if (dateUtil.isBefore(endDate, startDate)) {
                    // This case should theoretically not be reachable due to prior validation
                    // but is kept as a safeguard.
                    throw new ArgumentError('--start', `Start date (${dateUtil.format(startDate, DATE_FORMAT_YEAR_MONTH_DAY)}) cannot be after end date (${dateUtil.format(endDate, DATE_FORMAT_YEAR_MONTH_DAY)}).`);
                }

                config.dateRange = {
                    start: startDate!,
                    end: endDate!
                };
            }
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
        const validOptions: FilesystemStructure[] = options.allowed?.outputStructures || ALLOWED_OUTPUT_STRUCTURES;
        if (outputStructure && !validOptions.includes(outputStructure as FilesystemStructure)) {
            throw new ArgumentError('--output-structure', `Invalid output structure: ${outputStructure}. Valid options are: ${validOptions.join(', ')}`);
        }
    }

    const validateOutputFilenameOptions = (outputFilenameOptions: string[] | undefined, outputStructure: FilesystemStructure | undefined): void => {
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
        const validOptions: FilesystemStructure[] = options.allowed?.inputStructures || ALLOWED_INPUT_STRUCTURES;
        if (inputStructure && !validOptions.includes(inputStructure as FilesystemStructure)) {
            throw new ArgumentError('--input-structure', `Invalid input structure: ${inputStructure}. Valid options are: ${validOptions.join(', ')}`);
        }
    }

    const validateInputFilenameOptions = (inputFilenameOptions: string[] | undefined, inputStructure: FilesystemStructure | undefined): void => {
        if (inputFilenameOptions) {
            // Check if first argument contains commas - likely a comma-separated list
            if (inputFilenameOptions[0].includes(',')) {
                throw new ArgumentError('--input-filename-options', 'Filename options should be space-separated, not comma-separated. Example: --input-filename-options date time subject');
            }

            // Check if first argument looks like a quoted string containing multiple options
            if (inputFilenameOptions.length === 1 && inputFilenameOptions[0].split(' ').length > 1) {
                throw new ArgumentError('--input-filename-options', 'Filename options should not be quoted. Use: --input-filename-options date time subject instead of --input-filename-options "date time subject"');
            }
            const validOptions = options.allowed?.inputFilenameOptions || ALLOWED_INPUT_FILENAME_OPTIONS;
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




