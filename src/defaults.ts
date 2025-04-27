import { Config } from './configure';
import { DEFAULT_EXTENSIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_INPUT_FILENAME_OPTIONS, DEFAULT_INPUT_STRUCTURE, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE } from './constants';
import { DefaultOptions, Feature } from './options';

export * from './options';

export const applyDefaults = (config: Partial<Config>, features: Feature[], defaults: DefaultOptions): Config => {
    const configWithDefaults = {
        ...config,
    }

    configWithDefaults.timezone = config.timezone || (defaults?.timezone || DEFAULT_TIMEZONE);
    if (features.includes('input')) {
        configWithDefaults.recursive = config.recursive === undefined ? (defaults?.recursive ?? DEFAULT_RECURSIVE) : config.recursive;
        configWithDefaults.inputDirectory = config.inputDirectory || (defaults?.inputDirectory || DEFAULT_INPUT_DIRECTORY);
    }
    if (features.includes('output')) {
        configWithDefaults.outputDirectory = config.outputDirectory || (defaults?.outputDirectory || DEFAULT_OUTPUT_DIRECTORY);
    }
    if (features.includes('structured-output')) {
        configWithDefaults.outputStructure = config.outputStructure || (defaults?.outputStructure || DEFAULT_OUTPUT_STRUCTURE);
        configWithDefaults.outputFilenameOptions = config.outputFilenameOptions || (defaults?.outputFilenameOptions || DEFAULT_OUTPUT_FILENAME_OPTIONS);
    }
    if (features.includes('extensions')) {
        configWithDefaults.extensions = config.extensions || (defaults?.extensions || DEFAULT_EXTENSIONS);
    }

    if (features.includes('structured-input')) {
        configWithDefaults.inputStructure = config.inputStructure || (defaults?.inputStructure || DEFAULT_INPUT_STRUCTURE);
        configWithDefaults.inputFilenameOptions = config.inputFilenameOptions || (defaults?.inputFilenameOptions || DEFAULT_INPUT_FILENAME_OPTIONS);
    }

    return configWithDefaults as Config;
}

