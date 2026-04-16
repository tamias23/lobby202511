const logger = require('../src/utils/logger');
const { isGuestId } = require('../src/utils/auth');

describe('Utility Functions', () => {
    describe('Logger', () => {
        let spyLog, spyWarn, spyError;
        
        beforeEach(() => {
            spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});
            spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
            spyError = jest.spyOn(console, 'error').mockImplementation(() => {});
            process.env.LOG_LEVEL = 'debug';
        });

        afterEach(() => {
            spyLog.mockRestore();
            spyWarn.mockRestore();
            spyError.mockRestore();
        });

        test('logger.info logs to console.log', () => {
            logger.info('Test', 'message');
            expect(spyLog).toHaveBeenCalled();
            expect(spyLog.mock.calls[0][0]).toContain('[INFO ] [Test]');
        });

        test('logger.error logs to console.error', () => {
            logger.error('Test', 'err');
            expect(spyError).toHaveBeenCalled();
            expect(spyError.mock.calls[0][0]).toContain('[ERROR] [Test]');
        });

        test('logger.warn logs to console.warn', () => {
            logger.warn('Test', 'warning');
            expect(spyWarn).toHaveBeenCalled();
        });

        test('logger.debug logs to console.log when level is debug', () => {
            process.env.LOG_LEVEL = 'debug';
            logger.debug('Test', 'debug msg');
            expect(spyLog).toHaveBeenCalled();
        });

        test('logger.debug does not log when level is info', () => {
            process.env.LOG_LEVEL = 'info';
            logger.debug('Test', 'debug msg');
            expect(spyLog).not.toHaveBeenCalled();
        });

        test('logger respects numeric precedence (error < debug)', () => {
            process.env.LOG_LEVEL = 'error';
            logger.info('Test', 'msg');
            expect(spyLog).not.toHaveBeenCalled();
            logger.error('Test', 'err');
            expect(spyError).toHaveBeenCalled();
        });
    });

    describe('Auth Utils', () => {
        test('isGuestId returns true for guest_ prefix', () => {
            expect(isGuestId('guest_abc123')).toBe(true);
        });

        test('isGuestId returns false for other prefixes', () => {
            expect(isGuestId('user_123')).toBe(false);
            expect(isGuestId('admin')).toBe(false);
        });

        test('isGuestId returns false for empty string', () => {
            expect(isGuestId('')).toBe(false);
        });

        test('isGuestId is case sensitive (by default)', () => {
            expect(isGuestId('GUEST_123')).toBe(false);
        });
    });
});
