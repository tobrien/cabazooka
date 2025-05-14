import { Logger } from 'cabazooka';
import * as Storage from "../util/storage";

// Process files with unstructured input pattern
export const process = async (
    inputDirectory: string,
    recursive: boolean,
    extensions: string[],
    limit: number | undefined,
    logger: Logger,
    callback: (file: string) => Promise<void>
): Promise<number> => {
    const storage = Storage.create({ log: logger.debug });

    let fileCount = 0;
    let filePattern = `${recursive ? '**/' : ''}*`;

    if (extensions && extensions.length > 0) {
        // Ensure the pattern correctly handles extensions with or without recursion
        if (recursive) {
            filePattern = `**/*.{${extensions.join(',')}}`;
        } else {
            filePattern = `*.{${extensions.join(',')}}`;
        }
        logger.debug(`Applying extension filter: ${extensions.join(',')}`);
    } else if (!recursive) {
        // Non-recursive without extension filter: only files in the top directory
        filePattern = `*.*`; // Adjust if files without extensions need matching
    }

    logger.info('Processing unstructured files %s in %s with pattern %s',
        recursive ? 'recursively' : 'non-recursively', inputDirectory, filePattern);

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
    }, { pattern: filePattern, limit });

    return fileCount;
};

