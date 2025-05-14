import { Args, Operator, Options } from 'cabazooka';
import { Config } from './cabazooka';
import * as Input from './input/input';
import * as Output from './output';

export const create = async (config: Config, args: Args, options: Options): Promise<Operator> => {

    const output = Output.create(config, options);
    const input = Input.create(config, options);

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






