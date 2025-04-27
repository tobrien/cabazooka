import { Args, Config, Options } from "cabazooka";
import { process } from './process';

export const create = (config: Config, args: Args, options: Options) => {
    type ProcessCallback = (file: string, date?: Date) => Promise<void>;

    return {
        process: (callback: ProcessCallback) => process(config, args, options.features, options.logger, callback),
    };
}