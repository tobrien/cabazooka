import { Feature, FilenameOption, FilesystemStructure, Logger } from 'cabazooka';
import * as path from 'path';
import { z } from 'zod';
import { ArgumentError } from "../configure";
import { DATE_FORMAT_YEAR_MONTH_DAY } from '../constants';
import * as Dates from "../util/dates";
import * as Storage from "../util/storage";

export const DateRangeSchema = z.object({
    start: z.date(),
    end: z.date(),
});

export type DateRange = z.infer<typeof DateRangeSchema>;

// Get the appropriate file pattern based on config and options
export const getFilePattern = (features: Feature[], extensions: string[], logger: Logger): string => {
    // Validate extensions: they should not start with a dot.
    if (extensions && extensions.length > 0) {
        for (const ext of extensions) {
            if (ext.startsWith('.')) {
                // Throw an error as the dot is added automatically by the pattern generation.
                // Using ArgumentError might be more consistent if available and appropriate here.
                throw new Error(`Invalid extension format: "${ext}". Extensions should not start with a dot ('.').`);
            }
        }
    }

    let pattern = '**/*'; // Start with a broad pattern for recursive search
    if (features.includes('extensions') && extensions && extensions.length > 0) {
        if (extensions.length === 1) {
            pattern = `**/*.${extensions[0]}`;
        } else {
            pattern = `**/*.{${extensions.join(',')}}`;
        }
        logger.debug(`Applying extension filter: ${extensions.join(',')}`);
    } else {
        pattern = `**/*.*`;
        logger.debug(`No extension filter applied, using pattern: ${pattern}`);
    }
    return pattern;
};


// Helper function to parse date string based on expected format
// Returns null if parsing fails
export const parseDateFromString = (
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
        const cleanedDateStr = dateStr.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
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
                    if (parts[0].length !== 4) return null;
                    h = parseInt(parts[0].substring(0, 2), 10);
                    mi = parseInt(parts[0].substring(2, 4), 10);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        // console.error(`Error parsing date string "${dateStr}" with format ${format}:`, e);
        return null;
    }
};

// Helper to check if date is within range (start inclusive, end exclusive)
export const isDateInRange = (date: Date, range?: DateRange): boolean => {
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

export const calculateDateRange = (timezone: string, startDate: Date, endDate: Date): DateRange => {

    // Create date utility after timezone is validated
    const dateUtil = Dates.create({ timezone });

    const now = dateUtil.now();
    const range: DateRange = {
        start: dateUtil.subDays(now, 31),
        end: now,
    }

    // Note: Validation ensures dates are valid and start <= end if both are provided
    if (startDate || endDate) {

        // Handle end date
        if (endDate) {
            range.end = dateUtil.parse(endDate, DATE_FORMAT_YEAR_MONTH_DAY);
        }

        // Handle start date
        if (startDate) {
            range.start = dateUtil.parse(startDate, DATE_FORMAT_YEAR_MONTH_DAY);
        }

        // We re-check the order here after defaults might have been applied,
        // although validateStartEndDates should catch explicit invalid orders.
        if (dateUtil.isBefore(range.end, range.start)) {
            // This case should theoretically not be reachable due to prior validation
            // but is kept as a safeguard.
            throw new ArgumentError('--start', `Start date (${dateUtil.format(range.start, DATE_FORMAT_YEAR_MONTH_DAY)}) cannot be after end date (${dateUtil.format(range.end, DATE_FORMAT_YEAR_MONTH_DAY)}).`);
        }

    }

    return range;
}



// Parse date from file path based on the input structure
export const parseDateFromFilePath = (
    relativePath: string,
    filename: string,
    structure: string,
    shouldParseTime: boolean,
    logger: Logger
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
export const processStructuredFile = async (
    filePath: string,
    inputDirectory: string,
    structure: string,
    shouldParseTime: boolean,
    callback: (file: string, date?: Date) => Promise<void>,
    pattern: string,
    dateRange: DateRange,
    logger: Logger
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
        const parsedDate = parseDateFromFilePath(relativePath, filename, structure, shouldParseTime, logger);

        if (parsedDate) {
            // Apply date range filtering
            if (isDateInRange(parsedDate, dateRange)) {
                logger.debug('Processing file %s with date %s', filePath, parsedDate.toISOString());
                await callback(filePath, parsedDate);
                return true;
            } else {
                const dateRangeDisplay = dateRange ?
                    `from ${dateRange.start ? new Date(dateRange.start).toISOString() : 'beginning'} up to ${dateRange.end ? new Date(dateRange.end).toISOString() : 'end'}` :
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

export const process = async (
    inputStructure: FilesystemStructure,
    inputFilenameOptions: FilenameOption[],
    extensions: string[],
    timezone: string,
    start: Date,
    end: Date,
    features: Feature[],
    logger: Logger,
    inputDirectory: string,
    callback: (file: string, date?: Date) => Promise<void>,
): Promise<number> => {
    const storage = Storage.create({ log: logger.debug });
    const dateRange = calculateDateRange(timezone, start, end);

    let fileCount = 0;

    // Validate date range dates if provided
    if (dateRange?.start && (!dateRange.start || isNaN(dateRange.start.getTime()))) {
        logger.warn(`Invalid start date provided in dateRange: ${dateRange.start}`);
    }
    if (dateRange?.end && (!dateRange.end || isNaN(dateRange.end.getTime()))) {
        logger.warn(`Invalid end date provided in dateRange: ${dateRange.end}`);
    }

    // Structured Input Logic
    const structure = inputStructure ?? 'none'; // Default to 'none' if not specified
    logger.info(`Processing structured input with structure "${structure}" in %s for date range: ${JSON.stringify(dateRange)}`, inputDirectory);

    // Determine if time should be parsed from filenames
    const shouldParseTime = inputFilenameOptions?.includes('time') ?? false;
    if (shouldParseTime) {
        logger.debug('Filename time parsing enabled based on inputFilenameOptions.');
    } else {
        logger.debug('Filename time parsing disabled; defaulting times to 00:00 UTC.');
    }

    const filePattern = getFilePattern(features, extensions || [], logger);

    logger.debug('Processing Structured Input with pattern %s from %s', filePattern, inputDirectory);

    await storage.forEachFileIn(inputDirectory, async (filePath: string) => {
        const processed = await processStructuredFile(
            filePath,
            inputDirectory,
            structure,
            shouldParseTime,
            callback,
            filePattern,
            dateRange,
            logger
        );

        if (processed) {
            fileCount++;
        }
    }, { pattern: filePattern });

    return fileCount;
}




