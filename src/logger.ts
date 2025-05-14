import { Logger } from "cabazooka";
import { PROGRAM_NAME } from "./constants";

export const wrapLogger = (toWrap: Logger): Logger => {

    const log = (level: keyof Logger, message: string, ...args: any[]) => {

        message = `[${PROGRAM_NAME}] ${message}`;
        toWrap[level](message, ...args);
    }

    return {
        debug: (message: string, ...args: any[]) => log('debug', message, ...args),
        info: (message: string, ...args: any[]) => log('info', message, ...args),
        warn: (message: string, ...args: any[]) => log('warn', message, ...args),
        error: (message: string, ...args: any[]) => log('error', message, ...args),
        verbose: (message: string, ...args: any[]) => log('verbose', message, ...args),
        silly: (message: string, ...args: any[]) => log('silly', message, ...args),
    }
}