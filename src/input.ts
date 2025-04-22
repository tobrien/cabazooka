import { Logger } from "winston";
import { Config } from "./cabazooka";
import { Options } from "./options";
import * as Storage from "./util/storage";

export const create = (config: Config, options: Options, logger: Logger | typeof console) => {

    const storage: Storage.Utility = Storage.create({ log: logger.debug });

    const process = async (callback: (file: string) => Promise<void>) => {

        if (!options.isFeatureEnabled('input')) {
            throw new Error('Input feature is not enabled, skipping input processing');
        }

        // Look through all files in the input directory
        const inputDirectory = config.inputDirectory;

        let filePattern = `${config.recursive ? '**/' : ''}*`;
        if (options.isFeatureEnabled('extensions') && config.extensions && config.extensions.length > 0) {
            filePattern += `.{${config.extensions!.join(',')}}`;
        }

        logger.info('Processing files in %s with pattern %s', inputDirectory, filePattern);
        let fileCount = 0;
        await storage.forEachFileIn(inputDirectory!, async (file: string) => {
            try {
                logger.debug('Processing file %s', file);
                await callback(file);
                fileCount++;
            } catch (error) {
                logger.error('Error processing file %s: %s\n\n%s\n\n', file, error, (error as Error).stack);
            }
        }, { pattern: filePattern });

        logger.info('Processed %d files', fileCount);

    }

    return {
        process
    }
}