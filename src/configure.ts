import { Command } from "commander";
import {
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
import { DefaultOptions, Feature } from "./cabazooka";

export { ArgumentError };

const addOption = (command: Command, option: string, description: string, addDefaults: boolean, defaultValue: boolean | string[] | string | undefined) => {
    if (addDefaults) {
        command.option(option, description, defaultValue)
    } else {
        const defaultDesc = defaultValue === undefined ? 'undefined' : Array.isArray(defaultValue) ? defaultValue.join(',') : defaultValue;
        const descriptionWithDefaults = `${description} (default: ${defaultDesc})`
        command.option(option, descriptionWithDefaults)
    }
}

export const configure = async (command: Command, defaults: DefaultOptions, addDefaults: boolean, features: Feature[]): Promise<void> => {
    const tzDefault = defaults?.timezone || DEFAULT_TIMEZONE;
    if (addDefaults) {
        command.option('--timezone <timezone>', 'timezone for date calculations', tzDefault)
    } else {
        command.option('--timezone <timezone>', `timezone for date calculations (default: ${tzDefault})`)
    }

    if (features.includes('input')) {
        addOption(command, '-r, --recursive', 'recursive mode, process all files in the input directory', addDefaults, defaults?.recursive !== undefined ? defaults.recursive : DEFAULT_RECURSIVE)
        addOption(command, '-i, --input-directory <inputDirectory>', 'input directory', addDefaults, defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY)
    }
    if (features.includes('output')) {
        addOption(command, '-o, --output-directory <outputDirectory>', 'output directory', addDefaults, defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY)
    }
    if (features.includes('structured-output')) {
        addOption(command, '--output-structure <type>', 'output directory structure (none/year/month/day)', addDefaults, defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE)
        addOption(command, '--output-filename-options [outputFilenameOptions...]', 'filename format options (space-separated list of: date,time,subject) example \'date subject\'', addDefaults, defaults?.outputFilenameOptions || DEFAULT_OUTPUT_FILENAME_OPTIONS)
    }
    if (features.includes('extensions')) {
        addOption(command, '--extensions [extensions...]', 'file extensions to process (space-separated list of: mp3,mp4,mpeg,mpga,m4a,wav,webm)', addDefaults, defaults?.extensions || DEFAULT_EXTENSIONS)
    }

    if (features.includes('structured-input')) {
        addOption(command, '--input-structure <type>', 'input directory structure (none/year/month/day)', addDefaults, defaults?.inputStructure || DEFAULT_INPUT_STRUCTURE)
        addOption(command, '--input-filename-options [options...]', 'filename format options (space-separated list of: date,time,subject)', addDefaults, defaults?.inputFilenameOptions || DEFAULT_INPUT_FILENAME_OPTIONS)
        addOption(command, '--start <date>', `start date filter (${DATE_FORMAT_YEAR_MONTH_DAY})`, addDefaults, undefined)
        addOption(command, '--end <date>', `end date filter (${DATE_FORMAT_YEAR_MONTH_DAY}), defaults to today`, addDefaults, undefined)
    }
}