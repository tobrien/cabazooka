import { Args, Config, Feature, Logger } from "cabazooka";
import { process as processStructuredInput } from "./structured";
import { process as processUnstructuredInput } from "./unstructured";

export const process = async (
    config: Config,
    args: Args,
    features: Feature[],
    logger: Logger,
    callback: (file: string) => Promise<void>,
) => {
    if (!features.includes('input')) {
        throw new Error('Input feature is not enabled, skipping input processing');
    }

    const inputDirectory = config.inputDirectory;
    if (!inputDirectory) {
        throw new Error('Input directory is not configured');
    }

    let fileCount = 0;

    if (features.includes('structured-input')) {
        logger.debug('Processing Structured Input from %s', inputDirectory);
        fileCount = await processStructuredInput(config.inputStructure!, config.inputFilenameOptions!, config.extensions!, config.timezone, args.start, args.end, features, logger, inputDirectory, callback)


    } else {
        // Original Unstructured Input Logic
        logger.debug('Processing Unstructured Input from %s', inputDirectory);
        fileCount = await processUnstructuredInput(inputDirectory, config.recursive || false, config.extensions || [], logger, callback);
    }

    logger.info('Processed %d files matching criteria.', fileCount);
};
