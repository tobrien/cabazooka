import { Config } from "./cabazooka";
import {
    ALLOWED_EXTENSIONS,
    ALLOWED_INPUT_FILENAME_OPTIONS,
    ALLOWED_INPUT_STRUCTURES,
    ALLOWED_OUTPUT_FILENAME_OPTIONS,
    ALLOWED_OUTPUT_STRUCTURES,
} from "./constants";
import { ArgumentError } from "./error/ArgumentError";
import { FilenameOption, FilesystemStructure, Options } from "./cabazooka";
import * as Dates from "./util/dates";
import * as Storage from "./util/storage";

export { ArgumentError };

export const validate = async (config: Config, options: Options): Promise<void> => {

    const logger: typeof console = console;
    const storage = Storage.create({ log: logger.debug });

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

    const validateTimezone = (timezone: string): void => {
        const validOptions = Dates.validTimezones();
        if (validOptions.includes(timezone)) {
            return;
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

    // Validate timezone
    validateTimezone(config.timezone);

    if (options.features.includes('input') && config.inputDirectory) {
        await validateInputDirectory(config.inputDirectory);
    }

    if (options.features.includes('output') && config.outputDirectory) {
        await validateOutputDirectory(config.outputDirectory);
    }

    if (options.features.includes('structured-output')) {
        // Validate filename options if provided
        validateOutputStructure(config.outputStructure);
        validateOutputFilenameOptions(config.outputFilenameOptions, config.outputStructure as FilesystemStructure);
    }

    if (options.features.includes('extensions')) {
        validateExtensions(config.extensions);
    }

    if (options.features.includes('structured-input')) {
        validateInputStructure(config.inputStructure);
        validateInputFilenameOptions(config.inputFilenameOptions, config.inputStructure as FilesystemStructure);
    }

    return;
}





