import { jest } from '@jest/globals';
import { PROGRAM_NAME } from '../src/constants';
import { wrapLogger } from '../src/logger';
import type { Logger } from 'cabazooka';

// Mock the cabazooka module
jest.unstable_mockModule('cabazooka', () => ({
    Logger: jest.fn(),
}));

// Mock the constants module
jest.unstable_mockModule('../src/constants', () => ({
    PROGRAM_NAME: 'test-program',
}));

describe('wrapLogger', () => {
    let mockLogger: jest.Mocked<Logger>;
    let wrappedLogger: Logger;

    beforeEach(async () => {
        // We need to dynamically import after mocks are set up
        await import('cabazooka');
        await import('../src/constants');
        const { wrapLogger: actualWrapLogger } = await import('../src/logger');

        mockLogger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
            silly: jest.fn(),
        } as jest.Mocked<Logger>;

        wrappedLogger = actualWrapLogger(mockLogger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should wrap the debug method and prepend PROGRAM_NAME', () => {
        wrappedLogger.debug('test message', 'arg1', 'arg2');
        expect(mockLogger.debug).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).toHaveBeenCalledWith('[test-program] test message', 'arg1', 'arg2');
    });

    it('should wrap the info method and prepend PROGRAM_NAME', () => {
        wrappedLogger.info('test message', 'arg1');
        expect(mockLogger.info).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith('[test-program] test message', 'arg1');
    });

    it('should wrap the warn method and prepend PROGRAM_NAME', () => {
        wrappedLogger.warn('test message');
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('[test-program] test message');
    });

    it('should wrap the error method and prepend PROGRAM_NAME', () => {
        wrappedLogger.error('test message', { error: 'details' });
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith('[test-program] test message', { error: 'details' });
    });

    it('should wrap the verbose method and prepend PROGRAM_NAME', () => {
        wrappedLogger.verbose('test message');
        expect(mockLogger.verbose).toHaveBeenCalledTimes(1);
        expect(mockLogger.verbose).toHaveBeenCalledWith('[test-program] test message');
    });

    it('should wrap the silly method and prepend PROGRAM_NAME', () => {
        wrappedLogger.silly('test message');
        expect(mockLogger.silly).toHaveBeenCalledTimes(1);
        expect(mockLogger.silly).toHaveBeenCalledWith('[test-program] test message');
    });
});
