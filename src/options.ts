import { ALLOWED_EXTENSIONS, ALLOWED_OUTPUT_FILENAME_OPTIONS, ALLOWED_OUTPUT_STRUCTURES, DEFAULT_EXTENSIONS, DEFAULT_OUTPUT_FILENAME_OPTIONS, DEFAULT_INPUT_DIRECTORY, DEFAULT_OUTPUT_DIRECTORY, DEFAULT_OUTPUT_STRUCTURE, DEFAULT_RECURSIVE, DEFAULT_TIMEZONE, DEFAULT_INPUT_FILENAME_OPTIONS, DEFAULT_INPUT_STRUCTURE, ALLOWED_INPUT_FILENAME_OPTIONS, ALLOWED_INPUT_STRUCTURES } from "./constants";
import { z } from "zod";

export type Feature = 'input' | 'output' | 'structured-output' | 'structured-input' | 'extensions';

export const FilenameOptionSchema = z.enum([
    'date',
    'time',
    'subject',
]);

export type FilenameOption = z.infer<typeof FilenameOptionSchema>;

export const FilesystemStructureSchema = z.enum([
    'none',
    'year',
    'month',
    'day',
]);

export type FilesystemStructure = z.infer<typeof FilesystemStructureSchema>;

export interface DefaultOptions {
    timezone?: string;
    recursive?: boolean;
    inputDirectory?: string;
    inputStructure?: FilesystemStructure;
    inputFilenameOptions?: FilenameOption[];
    outputDirectory?: string;
    outputStructure?: FilesystemStructure;
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
    startDate?: string;
    endDate?: string;
}

export interface AllowedOptions {
    inputStructures?: FilesystemStructure[];
    inputFilenameOptions?: FilenameOption[];
    outputStructures?: FilesystemStructure[];
    outputFilenameOptions?: FilenameOption[];
    extensions?: string[];
}

export interface Options {
    defaults?: DefaultOptions,
    allowed?: AllowedOptions,
    features: Feature[],
    addDefaults: boolean;
    logger: Logger;
}

export interface Logger {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    verbose: (message: string, ...args: any[]) => void;
    silly: (message: string, ...args: any[]) => void;
}

export const DEFAULT_APP_OPTIONS: DefaultOptions = {
    timezone: DEFAULT_TIMEZONE,
    recursive: DEFAULT_RECURSIVE,
    inputDirectory: DEFAULT_INPUT_DIRECTORY,
    inputStructure: DEFAULT_INPUT_STRUCTURE,
    inputFilenameOptions: DEFAULT_INPUT_FILENAME_OPTIONS,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    outputStructure: DEFAULT_OUTPUT_STRUCTURE,
    outputFilenameOptions: DEFAULT_OUTPUT_FILENAME_OPTIONS,
    extensions: DEFAULT_EXTENSIONS,
}

export const DEFAULT_ALLOWED_OPTIONS: AllowedOptions = {
    inputStructures: ALLOWED_INPUT_STRUCTURES,
    inputFilenameOptions: ALLOWED_INPUT_FILENAME_OPTIONS,
    outputStructures: ALLOWED_OUTPUT_STRUCTURES,
    outputFilenameOptions: ALLOWED_OUTPUT_FILENAME_OPTIONS,
    extensions: ALLOWED_EXTENSIONS,
}

export const DEFAULT_FEATURES: Feature[] = ['output', 'structured-output', 'input', 'extensions'];

export const DEFAULT_LOGGER: Logger = {
    // eslint-disable-next-line no-console
    debug: (message: string, ...args: any[]) => console.debug(message, ...args),
    // eslint-disable-next-line no-console
    info: (message: string, ...args: any[]) => console.info(message, ...args),
    // eslint-disable-next-line no-console
    warn: (message: string, ...args: any[]) => console.warn(message, ...args),
    // eslint-disable-next-line no-console
    error: (message: string, ...args: any[]) => console.error(message, ...args),
    // eslint-disable-next-line no-console
    verbose: (message: string, ...args: any[]) => console.log(message, ...args),
    // eslint-disable-next-line no-console
    silly: (message: string, ...args: any[]) => console.log(message, ...args),
}

export const DEFAULT_OPTIONS = {
    defaults: DEFAULT_APP_OPTIONS,
    allowed: DEFAULT_ALLOWED_OPTIONS,
    features: DEFAULT_FEATURES,
    addDefaults: true,
    logger: DEFAULT_LOGGER,
};

