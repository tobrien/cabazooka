import { Config, Feature, Args } from "cabazooka";
import { ArgumentError } from "./error/ArgumentError";

export { ArgumentError };

export const read = async (args: Args, features: Feature[]): Promise<Partial<Config>> => {

    const config: Partial<Config> = {};

    config.timezone = args.timezone;
    if (features.includes('input')) {
        config.inputDirectory = args.inputDirectory;
    }
    if (features.includes('structured-input')) {
        config.inputStructure = args.inputStructure;
        config.inputFilenameOptions = args.inputFilenameOptions;
    }
    if (features.includes('output')) {
        config.outputDirectory = args.outputDirectory;
    }
    if (features.includes('structured-output')) {
        config.outputStructure = args.outputStructure;
        config.outputFilenameOptions = args.outputFilenameOptions;
    }
    if (features.includes('extensions')) {
        config.extensions = args.extensions;
    }

    return config;
}