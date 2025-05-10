import { Config, Options } from "cabazooka";
import { process } from './process';

export const create = (config: Config, options: Options) => {
    type ProcessCallback = (file: string, date?: Date) => Promise<void>;

    return {
        process: (callback: ProcessCallback, { start, end }: { start?: Date, end?: Date } = {}) => process(config, options.features, options.logger, callback, { start, end }),
    };
}