import { Logger } from "winston";
import * as path from 'path';
import { Config, DateRange } from "./cabazooka";
import { Options } from "./options";
import * as Storage from "./util/storage";

// Helper function to parse date string based on expected format
// Returns null if parsing fails
const parseDateFromString = (
    dateStr: string,
    format: 'YYYY-M-D-HHmm' | 'M-D-HHmm' | 'D-HHmm' | 'HHmm',
    shouldParseTime: boolean, // New required parameter
    year?: number,
    month?: number,
    day?: number
): Date | null => {
    // Basic validation
    if (!dateStr) return null;

    try {
        let y = year ?? 0;
        let mo = month ?? 0; // JS months are 0-indexed
        let d = day ?? 1; // JS days are 1-indexed
        let h = 0; // Default to 0
        let mi = 0; // Default to 0

        // Remove potential leading/trailing non-alphanumeric if needed, split by common separators
        const cleanedDateStr = dateStr.replace(/[^\p{L}\p{N}]*(.*?)[^\p{L}\p{N}]*$/u, '$1');
        const parts = cleanedDateStr.split(/[-_]/); // Allow dash or underscore

        switch (format) {
            case 'YYYY-M-D-HHmm': {
                if (parts.length < 4 && shouldParseTime) return null; // Need time part if parsing it
                if (parts.length < 3 && !shouldParseTime) return null; // Need at least date part
                y = parseInt(parts[0], 10);
                mo = parseInt(parts[1], 10) - 1; // Adjust month
                d = parseInt(parts[2], 10);
                if (shouldParseTime) {
                    const timePartYD = parts[3];
                    if (timePartYD.length < 4) return null; // Ensure HHmm exists
                    h = parseInt(timePartYD.substring(0, 2), 10);
                    mi = parseInt(timePartYD.substring(2, 4), 10);
                }
                break;
            }
            case 'M-D-HHmm': {
                if (year === undefined) return null;
                if (parts.length < 3 && shouldParseTime) return null;
                if (parts.length < 2 && !shouldParseTime) return null;
                mo = parseInt(parts[0], 10) - 1; // Adjust month
                d = parseInt(parts[1], 10);
                if (shouldParseTime) {
                    const timePartMD = parts[2];
                    if (timePartMD.length < 4) return null; // Ensure HHmm exists
                    h = parseInt(timePartMD.substring(0, 2), 10);
                    mi = parseInt(timePartMD.substring(2, 4), 10);
                }
                break;
            }
            case 'D-HHmm': {
                if (year === undefined || month === undefined) return null;
                if (parts.length < 2 && shouldParseTime) return null;
                if (parts.length < 1 && !shouldParseTime) return null;
                d = parseInt(parts[0], 10);
                if (shouldParseTime) {
                    const timePartD = parts[1];
                    if (timePartD.length < 4) return null; // Ensure HHmm exists
                    h = parseInt(timePartD.substring(0, 2), 10);
                    mi = parseInt(timePartD.substring(2, 4), 10);
                }
                break;
            }
            case 'HHmm':
                if (year === undefined || month === undefined || day === undefined) return null;
                if (shouldParseTime) {
                    if (cleanedDateStr.length !== 4) return null;
                    h = parseInt(cleanedDateStr.substring(0, 2), 10);
                    mi = parseInt(cleanedDateStr.substring(2, 4), 10);
                } // Else h=0, mi=0 (set by defaults)
                break;
            default:
                return null;
        }

        // Validate parsed numbers
        if (isNaN(y) || isNaN(mo) || isNaN(d)) {
            throw new Error(`Invalid date components in date string "${dateStr}" with format ${format}: Y:${y} M:${mo} D:${d}`);
        }

        // Set hour and minute to 0 if not provided
        if (isNaN(h)) {
            h = 0;
        }
        if (isNaN(mi)) {
            mi = 0;
        }

        if (mo < 0 || mo > 11 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) {
            throw new Error(`Invalid date components in date string "${dateStr}" with format ${format}: Y:${y} M:${mo + 1} D:${d} H:${h} m:${mi}`);
        }




        const date = new Date(Date.UTC(y, mo, d, h, mi));
        // Double check components as Date object might adjust invalid dates (e.g. Feb 30th -> Mar 2nd)
        if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo || date.getUTCDate() !== d || date.getUTCHours() !== h || date.getUTCMinutes() !== mi) {
            // console.debug(`Date validation failed for Y:${y} M:${mo} D:${d} H:${h} m:${mi}. JS Date adjusted it.`);
            return null;
        }

        return date;
    } catch (e) {
        // console.error(`Error parsing date string "${dateStr}" with format ${format}:`, e);
        return null;
    }
};

// Helper to check if date is within range (start inclusive, end exclusive)
const isDateInRange = (date: Date, range?: DateRange): boolean => {
    if (!range || (!range.start && !range.end)) return true; // No range or empty range means all dates are valid

    // Ensure range dates are Date objects
    const startDate = range.start ? (range.start instanceof Date ? range.start : new Date(range.start)) : null;
    const endDate = range.end ? (range.end instanceof Date ? range.end : new Date(range.end)) : null;

    // Validate parsed range dates
    const isStartDateValid = startDate && !isNaN(startDate.getTime());
    const isEndDateValid = endDate && !isNaN(endDate.getTime());


    if (isStartDateValid && date < startDate!) {
        return false;
    }
    // End date is exclusive
    if (isEndDateValid && date >= endDate!) {
        return false;
    }
    return true;
};


export const create = (config: Config, options: Options, logger: Logger | typeof console) => {

    const storage: Storage.Utility = Storage.create({ log: logger.debug });

    // Define the callback type to include the optional date
    // **IMPORTANT**: The caller needs to update their callback signature
    type ProcessCallback = (file: string, date?: Date) => Promise<void>;

    // Get the appropriate file pattern based on config and options
    const getFilePattern = (): string => {
        let pattern = '**/*'; // Start with a broad pattern for recursive search
        if (options.isFeatureEnabled('extensions') && config.extensions && config.extensions.length > 0) {
            if (config.extensions.length === 1) {
                pattern = `**/*.${config.extensions[0]}`;
            } else {
                pattern = `**/*.{${config.extensions.join(',')}}`;
            }
            logger.debug(`Applying extension filter: ${config.extensions.join(',')}`);
        } else {
            pattern = `**/*.*`;
            logger.debug(`No extension filter applied, using pattern: ${pattern}`);
        }
        return pattern;
    };

    // Parse date from file path based on the input structure
    const parseDateFromFilePath = (
        relativePath: string,
        filename: string,
        structure: string,
        shouldParseTime: boolean
    ): Date | null => {
        const pathParts = relativePath.split(path.sep);
        const filenameWithoutExt = path.basename(filename, path.extname(filename));

        let parsedDate: Date | null = null;
        let year: number | undefined;
        let month: number | undefined; // 0-indexed month for Date constructor
        let day: number | undefined;

        switch (structure) {
            case 'none':
                // Filename format: YYYY-M-D-HHmm...
                parsedDate = parseDateFromString(filenameWithoutExt, 'YYYY-M-D-HHmm', shouldParseTime);
                break;
            case 'year':
                // Path: YYYY / M-D-HHmm...
                if (pathParts.length >= 1) {
                    year = parseInt(pathParts[0], 10);
                    if (!isNaN(year)) {
                        parsedDate = parseDateFromString(filenameWithoutExt, 'M-D-HHmm', shouldParseTime, year);
                    } else {
                        logger.warn(`Invalid year format in path: ${pathParts[0]}`);
                    }
                } else {
                    logger.warn(`File path does not match expected 'year' structure (YYYY/...)`);
                }
                break;
            case 'month':
                // Path: YYYY / MM / D-HHmm...
                if (pathParts.length >= 2) {
                    year = parseInt(pathParts[0], 10);
                    const monthDir = parseInt(pathParts[1], 10); // Month from dir (1-indexed)
                    if (!isNaN(year) && !isNaN(monthDir) && monthDir >= 1 && monthDir <= 12) {
                        month = monthDir - 1; // Adjust month for Date object (0-indexed)
                        parsedDate = parseDateFromString(filenameWithoutExt, 'D-HHmm', shouldParseTime, year, month);
                    } else {
                        logger.warn(`Invalid year/month format in path: ${pathParts[0]}/${pathParts[1]}`);
                    }
                } else {
                    logger.warn(`File path does not match expected 'month' structure (YYYY/MM/...)`);
                }
                break;
            case 'day':
                // Path: YYYY / MM / DD / HHmm...
                if (pathParts.length >= 3) {
                    year = parseInt(pathParts[0], 10);
                    const monthDir = parseInt(pathParts[1], 10); // Month from dir (1-indexed)
                    day = parseInt(pathParts[2], 10); // Day from dir (1-indexed)
                    if (!isNaN(year) && !isNaN(monthDir) && monthDir >= 1 && monthDir <= 12 && !isNaN(day) && day >= 1 && day <= 31) {
                        month = monthDir - 1; // Adjust month (0-indexed)
                        parsedDate = parseDateFromString(filenameWithoutExt, 'HHmm', shouldParseTime, year, month, day);
                    } else {
                        logger.warn(`Invalid year/month/day format in path: ${pathParts[0]}/${pathParts[1]}/${pathParts[2]}`);
                    }
                } else {
                    logger.warn(`File path does not match expected 'day' structure (YYYY/MM/DD/...)`);
                }
                break;
            default:
                logger.error(`Fatal: Unknown input structure "${structure}" specified in config.`);
                throw new Error(`Unknown input structure "${structure}" specified.`);
        }

        return parsedDate;
    };

    // Process a single file from the structured input
    const processStructuredFile = async (
        filePath: string,
        inputDirectory: string,
        structure: string,
        shouldParseTime: boolean,
        callback: ProcessCallback,
        pattern: string
    ): Promise<boolean> => {
        // Skip if filePath somehow points to the inputDirectory itself or is not a file
        if (filePath === inputDirectory || !path.extname(filePath) && pattern.endsWith('*.*')) {
            return false;
        }

        const relativePath = path.relative(inputDirectory, filePath);
        const pathParts = relativePath.split(path.sep);
        const filename = pathParts.pop(); // Filename is the last part

        if (!filename) {
            logger.warn(`Could not determine filename for path: ${filePath}`);
            return false;
        }

        try {
            const parsedDate = parseDateFromFilePath(relativePath, filename, structure, shouldParseTime);

            if (parsedDate) {
                // Apply date range filtering
                if (isDateInRange(parsedDate, config.dateRange)) {
                    logger.debug('Processing file %s with date %s', filePath, parsedDate.toISOString());
                    await callback(filePath, parsedDate);
                    return true;
                } else {
                    const dateRangeDisplay = config.dateRange ?
                        `from ${config.dateRange.start ? new Date(config.dateRange.start).toISOString() : 'beginning'} up to ${config.dateRange.end ? new Date(config.dateRange.end).toISOString() : 'end'}` :
                        'all dates';
                    logger.debug('Skipping file %s, date %s out of range %s', filePath, parsedDate.toISOString(), dateRangeDisplay);
                }
            } else {
                logger.warn('Could not parse date for file %s with structure "%s" (filename base: "%s", path parts: %s)',
                    filePath, structure, path.basename(filename, path.extname(filename)), pathParts.join('/'));
            }
        } catch (error) {
            // Log error from the callback or date parsing/filtering itself
            if (error instanceof Error) {
                logger.error('Error processing file %s: %s\n%s', filePath, error.message, error.stack);
            } else {
                logger.error('Error processing file %s: %s', filePath, error);
            }
        }

        return false;
    };

    // Process files with unstructured input pattern
    const processUnstructuredInput = async (
        inputDirectory: string,
        callback: ProcessCallback
    ): Promise<number> => {
        let fileCount = 0;
        let filePattern = `${config.recursive ? '**/' : ''}*`;

        if (options.isFeatureEnabled('extensions') && config.extensions && config.extensions.length > 0) {
            // Ensure the pattern correctly handles extensions with or without recursion
            if (config.recursive) {
                filePattern = `**/*.{${config.extensions.join(',')}}`;
            } else {
                filePattern = `*.{${config.extensions.join(',')}}`;
            }
            logger.debug(`Applying extension filter: ${config.extensions.join(',')}`);
        } else if (!config.recursive) {
            // Non-recursive without extension filter: only files in the top directory
            filePattern = `*.*`; // Adjust if files without extensions need matching
        }

        logger.info('Processing unstructured files %s in %s with pattern %s',
            config.recursive ? 'recursively' : 'non-recursively', inputDirectory, filePattern);

        await storage.forEachFileIn(inputDirectory, async (file: string) => {
            try {
                logger.debug('Processing file %s', file);
                // Call callback without date for unstructured input
                await callback(file); // Pass undefined for the date parameter
                fileCount++;
            } catch (error) {
                if (error instanceof Error) {
                    logger.error('Error processing file %s: %s\n%s', file, error.message, error.stack);
                } else {
                    logger.error('Error processing file %s: %s', file, error);
                }
            }
        }, { pattern: filePattern });

        return fileCount;
    };

    // Main process function
    const process = async (callback: ProcessCallback) => {
        if (!options.isFeatureEnabled('input')) {
            throw new Error('Input feature is not enabled, skipping input processing');
        }

        const inputDirectory = config.inputDirectory;
        if (!inputDirectory) {
            throw new Error('Input directory is not configured');
        }

        let fileCount = 0;

        if (options.isFeatureEnabled('structured-input')) {
            logger.debug('Processing Structured Input from %s', inputDirectory);

            const startDateRange = config.dateRange?.start ? new Date(config.dateRange.start) : null;
            const endDateRange = config.dateRange?.end ? new Date(config.dateRange.end) : null;
            const dateRangeDisplay = config.dateRange ? `from ${startDateRange?.toISOString() ?? 'beginning'} up to ${endDateRange?.toISOString() ?? 'end'}` : 'all dates';

            // Validate date range dates if provided
            if (config.dateRange?.start && (!startDateRange || isNaN(startDateRange.getTime()))) {
                logger.warn(`Invalid start date provided in dateRange: ${config.dateRange.start}`);
            }
            if (config.dateRange?.end && (!endDateRange || isNaN(endDateRange.getTime()))) {
                logger.warn(`Invalid end date provided in dateRange: ${config.dateRange.end}`);
            }

            // Structured Input Logic
            const structure = config.inputStructure ?? 'none'; // Default to 'none' if not specified
            logger.info(`Processing structured input with structure "${structure}" in %s for date range: ${dateRangeDisplay}`, inputDirectory);

            // Determine if time should be parsed from filenames
            const shouldParseTime = config.inputFilenameOptions?.includes('time') ?? false;
            if (shouldParseTime) {
                logger.debug('Filename time parsing enabled based on inputFilenameOptions.');
            } else {
                logger.debug('Filename time parsing disabled; defaulting times to 00:00 UTC.');
            }

            const pattern = getFilePattern();
            logger.debug('Processing Structured Input with pattern %s from %s', pattern, inputDirectory);

            await storage.forEachFileIn(inputDirectory, async (filePath: string) => {
                const processed = await processStructuredFile(
                    filePath,
                    inputDirectory,
                    structure,
                    shouldParseTime,
                    callback,
                    pattern
                );

                if (processed) {
                    fileCount++;
                }
            }, { pattern });
        } else {
            // Original Unstructured Input Logic
            logger.debug('Processing Unstructured Input from %s', inputDirectory);
            fileCount = await processUnstructuredInput(inputDirectory, callback);
        }

        logger.info('Processed %d files matching criteria.', fileCount);
    };

    return {
        process,
        // Export these methods for testing
        _internal: {
            getFilePattern,
            parseDateFromFilePath,
            processStructuredFile,
            processUnstructuredInput,
            parseDateFromString,
            isDateInRange
        }
    };
}

// NOTE: The DateRange interface should ideally live alongside the Config definition
// e.g., in ./cabazooka.ts
// export interface DateRange {
//     start?: string | Date; // ISO date string or Date object
//     end?: string | Date; // ISO date string or Date object
// }