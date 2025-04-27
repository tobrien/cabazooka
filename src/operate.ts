import { Config } from './configure';
import * as Input from './input/input';
import {
    Options
} from "./options";
import * as Output from './output';
import { Args } from './read';

export * from './options';

export interface Operator {
    process: (callback: (file: string) => Promise<void>) => Promise<void>;
    constructFilename: (createDate: Date, type: string, hash: string, options?: { subject?: string }) => Promise<string>;
    constructOutputDirectory: (createDate: Date) => Promise<string>;
}

export const create = async (config: Config, args: Args, options: Options): Promise<Operator> => {

    const output = Output.create(config, options);
    const input = Input.create(config, args, options);

    const constructFilename = async (createDate: Date, type: string, hash: string, context?: { subject?: string }): Promise<string> => {
        if (!options.features.includes('output')) {
            throw new Error('Output feature is not enabled, skipping output construction');
        }
        return output.constructFilename(createDate, type, hash, context);
    }

    const constructOutputDirectory = async (createDate: Date): Promise<string> => {
        if (!options.features.includes('output')) {
            throw new Error('Output feature is not enabled, skipping output construction');
        }
        return output.constructOutputDirectory(createDate);
    }

    return {
        process: input.process,
        constructFilename,
        constructOutputDirectory,
    }

}






