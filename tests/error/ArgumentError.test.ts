import { ArgumentError } from '../../src/error/ArgumentError';

describe('ArgumentError', () => {
    it('should create an ArgumentError with the correct name and message', () => {
        const argumentName = 'testArg';
        const message = 'Invalid argument value';
        const error = new ArgumentError(argumentName, message);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ArgumentError');
        expect(error.message).toBe(message);
    });

    it('should provide access to the argument name through the argument getter', () => {
        const argumentName = 'testArg';
        const message = 'Invalid argument value';
        const error = new ArgumentError(argumentName, message);

        expect(error.argument).toBe(argumentName);
    });

    it('should create an ArgumentError with a different argument name and message', () => {
        const argumentName = 'anotherArg';
        const message = 'Argument is required';
        const error = new ArgumentError(argumentName, message);

        expect(error.argument).toBe(argumentName);
        expect(error.message).toBe(message);
    });
});
