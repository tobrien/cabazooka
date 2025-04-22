import { FilenameOption, OutputStructure } from 'options';

export const VERSION = '__VERSION__ (__GIT_BRANCH__/__GIT_COMMIT__ __GIT_TAGS__ __GIT_COMMIT_DATE__) __SYSTEM_INFO__';
export const PROGRAM_NAME = 'cabazooka';
export const DEFAULT_CHARACTER_ENCODING = 'utf-8';
export const DEFAULT_BINARY_TO_TEXT_ENCODING = 'base64';
export const DEFAULT_DIFF = true;
export const DEFAULT_LOG = false;
export const DEFAULT_TIMEZONE = 'Etc/UTC';
export const DATE_FORMAT_MONTH_DAY = 'M-D';
export const DATE_FORMAT_YEAR = 'YYYY';
export const DATE_FORMAT_YEAR_MONTH = 'YYYY-M';
export const DATE_FORMAT_YEAR_MONTH_DAY = 'YYYY-M-D';
export const DATE_FORMAT_YEAR_MONTH_DAY_SLASH = 'YYYY/M/D';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES = 'YYYY-M-D-HHmm';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES_SECONDS = 'YYYY-M-D-HHmmss';
export const DATE_FORMAT_YEAR_MONTH_DAY_HOURS_MINUTES_SECONDS_MILLISECONDS = 'YYYY-M-D-HHmmss.SSS';
export const DATE_FORMAT_MONTH = 'M';
export const DATE_FORMAT_DAY = 'D';
export const DATE_FORMAT_HOURS = 'HHmm';
export const DATE_FORMAT_MINUTES = 'mm';
export const DATE_FORMAT_SECONDS = 'ss';
export const DATE_FORMAT_MILLISECONDS = 'SSS';

export const DEFAULT_RECURSIVE = false;
export const DEFAULT_INPUT_DIRECTORY = './';
export const DEFAULT_OUTPUT_DIRECTORY = './';

export const DEFAULT_OUTPUT_STRUCTURE = 'month' as OutputStructure;
export const DEFAULT_OUTPUT_FILENAME_OPTIONS = ['date', 'subject'] as FilenameOption[];
export const DEFAULT_INPUT_STRUCTURE = 'month' as OutputStructure;
export const DEFAULT_INPUT_FILENAME_OPTIONS = ['date', 'subject'] as FilenameOption[];
export const DEFAULT_EXTENSIONS = ['md'] as string[];

export const ALLOWED_OUTPUT_STRUCTURES = ['none', 'year', 'month', 'day'] as OutputStructure[];
export const ALLOWED_OUTPUT_FILENAME_OPTIONS = ['date', 'time', 'subject'] as FilenameOption[];

export const ALLOWED_EXTENSIONS = ['md'] as string[];