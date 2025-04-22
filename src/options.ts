import { ALLOWED_EXTENSIONS, ALLOWED_OUTPUT_FILENAME_OPTIONS, ALLOWED_OUTPUT_STRUCTURES, DEFAULT_EXTENSIONS, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE } from "./constants";
import { Config } from "./cabazooka";

export type Feature = 'input' | 'output' | 'structured-output' | 'structured-input' | 'extensions';

export type FilenameOption = 'date' | 'time' | 'subject';
export type OutputStructure = 'none' | 'year' | 'month' | 'day';


export interface DefaultOptions {
    timezone?: string;
    recursive?: boolean;
    inputDirectory?: string;
    outputDirectory?: string;
    outputStructure?: OutputStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
}

export interface AllowedOptions {
    outputStructures?: OutputStructure[];
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
}

export interface Options {
    defaults?: DefaultOptions,
    allowed?: AllowedOptions,
    isFeatureEnabled: (feature: Feature) => boolean;
}

export const DEFAULT_APP_OPTIONS: DefaultOptions = {
    timezone: DEFAULT_TIMEZONE,
    recursive: DEFAULT_RECURSIVE,
    inputDirectory: DEFAULT_INPUT_DIRECTORY,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    outputStructure: DEFAULT_OUTPUT_STRUCTURE,
    outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
    extensions: DEFAULT_EXTENSIONS,
}

export const DEFAULT_ALLOWED_OPTIONS: AllowedOptions = {
    outputStructures: ALLOWED_OUTPUT_STRUCTURES,
    outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
    extensions: ALLOWED_EXTENSIONS,
}

export const DEFAULT_FEATURES: Feature[] = ['output', 'structured-output', 'input', 'extensions'];

export const createOptions = (
    options: { defaults?: DefaultOptions, allowed?: AllowedOptions, features?: Feature[] } = { defaults: DEFAULT_APP_OPTIONS, allowed: DEFAULT_ALLOWED_OPTIONS, features: DEFAULT_FEATURES }): Options => {

    const defaults = options.defaults || DEFAULT_APP_OPTIONS;
    const allowed = options.allowed || DEFAULT_ALLOWED_OPTIONS;
    const features = options.features || DEFAULT_FEATURES;

    const isFeatureEnabled = (feature: Feature) => {
        return features.includes(feature);
    }

    return {
        defaults,
        allowed,
        isFeatureEnabled,
    }
}
