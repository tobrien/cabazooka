import path from 'path';
import { DATE_FORMAT_DAY, DATE_FORMAT_MONTH, DATE_FORMAT_MONTH_DAY, DATE_FORMAT_YEAR, DATE_FORMAT_YEAR_MONTH_DAY } from './constants';
import { Config } from './cabazooka';
import * as Dates from './util/dates';
import * as Storage from './util/storage';
import { Options } from 'cabazooka';

export const create = (config: Config, options: Options): {
    constructFilename: (date: Date, type: string, hash: string, options?: { subject?: string }) => string;
    constructOutputDirectory: (creationTime: Date) => string;
} => {
    const logger = options.logger;
    const timezone = config.timezone || 'UTC';
    const dates = Dates.create({ timezone });
    const storage: Storage.Utility = Storage.create({ log: logger.debug });

    const { outputDirectory, outputStructure, outputFilenameOptions } = config;

    function formatDate(date: Date, outputStructure: 'none' | 'year' | 'month' | 'day'): string {

        if (!outputStructure) {
            throw new Error('Unable to Create Output: Output structure is not set');
        }

        switch (outputStructure) {
            case 'none':
                return dates.format(date, DATE_FORMAT_YEAR_MONTH_DAY);
            case 'year':
                return dates.format(date, DATE_FORMAT_MONTH_DAY);
            case 'month':
                return dates.format(date, DATE_FORMAT_DAY);
            case 'day':
                throw new Error('Cannot use date in filename when output structure is "day"');
        }
    }

    function sanitizeFilenameString(str: string): string {
        // Replace any character that is not alphanumeric, hyphen, underscore, or dot with an underscore
        return str.replace(/[^a-zA-Z0-9\-_.]/g, '_')
            // Replace multiple consecutive underscores with a single underscore
            .replace(/_+/g, '_')
            // Remove leading and trailing underscores
            .replace(/^_+|_+$/g, '')
            // Ensure the string is not empty
            .replace(/^$/, 'untitled');
    }

    function constructFilename(
        date: Date,
        type: string,
        hash: string,
        options: {
            subject?: string;
        } = {}
    ): string {
        const parts: string[] = [];

        // Add date if requested
        if (outputFilenameOptions?.includes('date')) {
            const dateStr = formatDate(date, outputStructure!);
            parts.push(dateStr);
        }

        // Add time if requested
        if (outputFilenameOptions?.includes('time')) {
            const dates = Dates.create({ timezone });
            const timeStr = dates.format(date, 'HHmm');
            parts.push(timeStr);
        }

        // Add message ID
        parts.push(hash);
        parts.push(type);

        // Add subject if requested
        if (outputFilenameOptions?.includes('subject')) {
            // Sanitize the provided subject, defaulting to empty string if undefined/null
            parts.push(sanitizeFilenameString(options.subject || ''));
        }

        return parts.join('-');
    }

    function constructOutputDirectory(creationTime: Date) {

        // Throw this error to ensure that we don't success if outputDirectory or outputStructure are not set
        if (!outputDirectory) {
            throw new Error('Unable to Create Output: Output directory is not set');
        }


        if (!outputStructure) {
            throw new Error('Unable to Create Output: Output structure is not set');
        }


        const date = dates.date(creationTime);
        const year = dates.format(date, DATE_FORMAT_YEAR);
        const month = dates.format(date, DATE_FORMAT_MONTH);
        const day = dates.format(date, DATE_FORMAT_DAY);

        let outputPath: string;
        switch (outputStructure) {
            case 'year':
                outputPath = path.join(outputDirectory!, year);
                break;
            case 'month':
                outputPath = path.join(outputDirectory!, year, month);
                break;
            case 'day':
                outputPath = path.join(outputDirectory!, year, month, day);
                break;
            default:
                outputPath = outputDirectory!;
        }

        storage.createDirectory(outputPath);
        return outputPath;
    }

    return {
        constructFilename,
        constructOutputDirectory,
    }
}
