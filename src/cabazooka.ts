import { Command } from 'commander';
import { validate } from './validate';
import { configure, Config } from './configure';
import { applyDefaults } from './defaults';
import {
    Options,
    DEFAULT_ALLOWED_OPTIONS,
    DEFAULT_APP_OPTIONS,
    DEFAULT_FEATURES,
    DEFAULT_OPTIONS,
    Feature,
    Logger
} from "./options";
import { read, Args } from './read';

export * from './options';

import { create as createOperator, Operator } from './operate';

export interface Cabazooka {
    configure: (command: Command) => Promise<void>;
    setLogger: (logger: Logger) => void;
    read: (args: Args, features: Feature[]) => Promise<Partial<Config>>;
    applyDefaults: (config: Partial<Config>) => Config;
    validate: (config: Config) => Promise<void>;
    operate: (config: Config) => Promise<Operator>;
}

export const create = (
    creationOptsParam: Partial<Options> = {}
): Cabazooka => {

    let args: Args;

    const options: Options = {
        defaults: { ...DEFAULT_APP_OPTIONS, ...creationOptsParam.defaults },
        allowed: { ...DEFAULT_ALLOWED_OPTIONS, ...creationOptsParam.allowed },
        features: creationOptsParam.features || DEFAULT_FEATURES,
        addDefaults: creationOptsParam.addDefaults === undefined ? DEFAULT_OPTIONS.addDefaults : creationOptsParam.addDefaults,
        logger: creationOptsParam.logger || DEFAULT_OPTIONS.logger
    };

    return {
        configure: async (command: Command) => configure(command, options.defaults || {}, options.addDefaults, options.features),
        setLogger: (logger: Logger) => {
            options.logger = logger;
        },
        read: async (pArgs: Args, features: Feature[]) => {
            args = pArgs;
            return read(args, features);
        },
        applyDefaults: (config: Partial<Config>) => applyDefaults(config, options.features, options.defaults || {}),
        validate: async (config: Config) => validate(config, options),
        operate: async (config: Config) => createOperator(config, args, options),
    }
}





