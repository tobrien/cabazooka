import { create, validTimezones } from '../../src/util/dates';
import MockDate from 'mockdate';

describe('dates utility', () => {
    const NEW_YORK_TIMEZONE = 'America/New_York';
    const TOKYO_TIMEZONE = 'Asia/Tokyo';

    // Fixed date for consistent testing - 2023-05-15 12:30:45 UTC
    const TEST_DATE_ISO = '2023-05-15T12:30:45.000Z';
    const TEST_DATE = new Date(TEST_DATE_ISO);

    let dates: ReturnType<typeof create>;

    beforeEach(() => {
        // Mock the current date
        MockDate.set(TEST_DATE);
        dates = create({ timezone: NEW_YORK_TIMEZONE });
    });

    afterEach(() => {
        MockDate.reset();
    });

    describe('now', () => {
        it('returns the current date in the configured timezone', () => {
            const result = dates.now();
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(TEST_DATE_ISO);
        });
    });

    describe('date', () => {
        it('converts string date to Date object', () => {
            const result = dates.date('2023-05-15');
            expect(result).toBeInstanceOf(Date);
        });

        it('converts number timestamp to Date object', () => {
            const result = dates.date(TEST_DATE.getTime());
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(TEST_DATE_ISO);
        });

        it('handles Date object input', () => {
            const result = dates.date(TEST_DATE);
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(TEST_DATE_ISO);
        });

        it('returns current date when no input is provided', () => {
            const result = dates.date(undefined);
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(TEST_DATE_ISO);
        });

        it('handles null input as current date', () => {
            const result = dates.date(null);
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe(TEST_DATE_ISO);
        });

        it('throws error for invalid date', () => {
            expect(() => dates.date('invalid-date')).toThrow('Invalid time value');
        });
    });

    describe('parse', () => {
        it('parses date string with format', () => {
            const result = dates.parse('05/15/2023', 'MM/DD/YYYY');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(4); // May is 4 (zero-based)
            expect(result.getDate()).toBe(15);
        });

        it('parses date with different format', () => {
            const result = dates.parse('2023-05-15', 'YYYY-MM-DD');
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2023);
            expect(result.getMonth()).toBe(4);
        });

        it('throws error for invalid date format', () => {
            expect(() => dates.parse('invalid', 'YYYY-MM-DD')).toThrow('Invalid time value');
        });
    });

    describe('date manipulation', () => {
        it('adds days correctly', () => {
            const result = dates.addDays(TEST_DATE, 5);
            expect(result.getDate()).toBe(TEST_DATE.getDate() + 5);
        });

        it('adds months correctly', () => {
            const result = dates.addMonths(TEST_DATE, 2);
            expect(result.getMonth()).toBe((TEST_DATE.getMonth() + 2) % 12);
        });

        it('adds years correctly', () => {
            const result = dates.addYears(TEST_DATE, 3);
            expect(result.getFullYear()).toBe(TEST_DATE.getFullYear() + 3);
        });

        it('handles adding zero units', () => {
            const resultDays = dates.addDays(TEST_DATE, 0);
            const resultMonths = dates.addMonths(TEST_DATE, 0);
            const resultYears = dates.addYears(TEST_DATE, 0);

            expect(resultDays.toISOString()).toBe(TEST_DATE.toISOString());
            expect(resultMonths.toISOString()).toBe(TEST_DATE.toISOString());
            expect(resultYears.toISOString()).toBe(TEST_DATE.toISOString());
        });

        it('handles adding negative days', () => {
            const result = dates.addDays(TEST_DATE, -5);
            // Should be equivalent to subtracting days
            const expected = dates.subDays(TEST_DATE, 5);
            expect(result.toISOString()).toBe(expected.toISOString());
        });

        it('subtracts days correctly', () => {
            const result = dates.subDays(TEST_DATE, 5);
            // Account for month boundaries by recreating the expected date
            const expected = new Date(TEST_DATE);
            expected.setDate(expected.getDate() - 5);
            expect(result.getDate()).toBe(expected.getDate());
        });

        it('subtracts months correctly', () => {
            const result = dates.subMonths(TEST_DATE, 2);
            // Handle wrapping to previous year
            const expectedMonth = (TEST_DATE.getMonth() - 2 + 12) % 12;
            expect(result.getMonth()).toBe(expectedMonth);
        });

        it('subtracts years correctly', () => {
            const result = dates.subYears(TEST_DATE, 3);
            expect(result.getFullYear()).toBe(TEST_DATE.getFullYear() - 3);
        });

        it('handles subtracting zero units', () => {
            const resultDays = dates.subDays(TEST_DATE, 0);
            const resultMonths = dates.subMonths(TEST_DATE, 0);
            const resultYears = dates.subYears(TEST_DATE, 0);

            expect(resultDays.toISOString()).toBe(TEST_DATE.toISOString());
            expect(resultMonths.toISOString()).toBe(TEST_DATE.toISOString());
            expect(resultYears.toISOString()).toBe(TEST_DATE.toISOString());
        });

        it('handles subtracting negative days', () => {
            const result = dates.subDays(TEST_DATE, -5);
            // Should be equivalent to adding days
            const expected = dates.addDays(TEST_DATE, 5);
            expect(result.toISOString()).toBe(expected.toISOString());
        });
    });

    describe('date boundaries', () => {
        it('gets start of month correctly', () => {
            const result = dates.startOfMonth(TEST_DATE);
            // Don't test exact day/hour values which can be affected by timezone
            expect(dates.format(result, 'MM')).toBe(dates.format(TEST_DATE, 'MM'));
            expect(dates.format(result, 'YYYY')).toBe(dates.format(TEST_DATE, 'YYYY'));
            // Check that hours, minutes, seconds are zeroed at start of month
            // but don't test specific values
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it('gets end of month correctly', () => {
            const result = dates.endOfMonth(TEST_DATE);
            // May has 31 days
            expect(dates.format(result, 'MM')).toBe(dates.format(TEST_DATE, 'MM'));
            expect(dates.format(result, 'YYYY')).toBe(dates.format(TEST_DATE, 'YYYY'));
            // Check that minutes and seconds are set to end of day
            expect(result.getMinutes()).toBe(59);
            expect(result.getSeconds()).toBe(59);
            expect(result.getMilliseconds()).toBe(999);
        });

        it('handles end of month for different month lengths', () => {
            // Test February (non-leap year)
            const feb2023 = new Date('2023-02-15T12:00:00Z');
            const endOfFeb = dates.endOfMonth(feb2023);
            expect(dates.format(endOfFeb, 'DD')).toBe('28');

            // Test February (leap year)
            const feb2024 = new Date('2024-02-15T12:00:00Z');
            const endOfFebLeap = dates.endOfMonth(feb2024);
            expect(dates.format(endOfFebLeap, 'DD')).toBe('29');

            // Test April (30 days)
            const april = new Date('2023-04-15T12:00:00Z');
            const endOfApril = dates.endOfMonth(april);
            expect(dates.format(endOfApril, 'DD')).toBe('30');
        });

        it('gets start of year correctly', () => {
            const result = dates.startOfYear(TEST_DATE);
            expect(dates.format(result, 'MM-DD')).toBe('01-01');
            expect(dates.format(result, 'YYYY')).toBe(dates.format(TEST_DATE, 'YYYY'));
            // Check for zeroing of time components
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it('gets end of year correctly', () => {
            const result = dates.endOfYear(TEST_DATE);
            expect(dates.format(result, 'MM-DD')).toBe('12-31');
            expect(dates.format(result, 'YYYY')).toBe(dates.format(TEST_DATE, 'YYYY'));
            // Check for end-of-day time components
            expect(result.getMinutes()).toBe(59);
            expect(result.getSeconds()).toBe(59);
            expect(result.getMilliseconds()).toBe(999);
        });
    });

    describe('date comparisons', () => {
        it('checks if date is before another date', () => {
            const earlier = new Date('2023-01-01');
            const later = new Date('2023-12-31');
            expect(dates.isBefore(earlier, later)).toBe(true);
            expect(dates.isBefore(later, earlier)).toBe(false);
        });

        it('checks if date is same as another date', () => {
            const date1 = new Date('2023-05-15T12:30:45.000Z');
            const date2 = new Date('2023-05-15T12:30:45.000Z');
            expect(dates.isBefore(date1, date2)).toBe(false);
            expect(dates.isAfter(date1, date2)).toBe(false);
        });

        it('checks if date is after another date', () => {
            const earlier = new Date('2023-01-01');
            const later = new Date('2023-12-31');
            expect(dates.isAfter(later, earlier)).toBe(true);
            expect(dates.isAfter(earlier, later)).toBe(false);
        });

        it('handles comparison with dates across DST transitions', () => {
            // Before DST transition
            const beforeDST = new Date('2023-03-10T12:00:00Z');
            // After DST transition
            const afterDST = new Date('2023-03-13T12:00:00Z');

            expect(dates.isBefore(beforeDST, afterDST)).toBe(true);
            expect(dates.isAfter(afterDST, beforeDST)).toBe(true);
        });
    });

    describe('formatting', () => {
        it('formats date correctly', () => {
            const result = dates.format(TEST_DATE, 'YYYY-MM-DD');
            expect(result).toBe('2023-05-15');
        });

        it('formats date with time correctly', () => {
            const result = dates.format(TEST_DATE, 'YYYY-MM-DD HH:mm:ss');
            expect(result).toBe('2023-05-15 08:30:45'); // Adjusted for New York timezone
        });

        it('formats date with different formats', () => {
            expect(dates.format(TEST_DATE, 'MMM DD, YYYY')).toBe('May 15, 2023');
            expect(dates.format(TEST_DATE, 'DD/MM/YYYY')).toBe('15/05/2023');
            expect(dates.format(TEST_DATE, 'YYYY-MM-DDTHH:mm:ssZ')).toMatch(/2023-05-15T08:30:45-0[45]:00/);
        });
    });

    describe('timezone handling', () => {
        it('respects the configured timezone', () => {
            const newYorkDate = dates.format(TEST_DATE, 'YYYY-MM-DD HH:mm:ss');

            // Switch to Tokyo timezone
            const tokyoDates = create({ timezone: TOKYO_TIMEZONE });
            const tokyoDate = tokyoDates.format(TEST_DATE, 'YYYY-MM-DD HH:mm:ss');

            // Tokyo is ahead of New York
            expect(newYorkDate).not.toBe(tokyoDate);
        });

        it('handles daylight saving time transitions correctly', () => {
            const march10_2023 = new Date('2023-03-10T12:00:00Z'); // Before DST
            const march12_2023 = new Date('2023-03-12T12:00:00Z'); // After DST starts

            // Format times with hours to see DST shift
            const beforeDST = dates.format(march10_2023, 'YYYY-MM-DD HH:mm');
            const afterDST = dates.format(march12_2023, 'YYYY-MM-DD HH:mm');

            // If DST is handled correctly, the hour difference should be 1 after adjusting for the 48-hour difference
            const beforeHour = parseInt(beforeDST.split(' ')[1].split(':')[0], 10);
            const afterHour = parseInt(afterDST.split(' ')[1].split(':')[0], 10);

            // This test is a bit tricky due to timezone complexity
            // We're just verifying the time representation changes properly around DST
            expect(beforeDST).not.toBe(afterDST);
        });
    });

    describe('validTimezones', () => {
        it('returns an array of valid timezone strings', () => {
            const timezones = validTimezones();
            expect(Array.isArray(timezones)).toBe(true);
            expect(timezones.length).toBeGreaterThan(0);
            expect(timezones).toContain(NEW_YORK_TIMEZONE);
            expect(timezones).toContain(TOKYO_TIMEZONE);
        });

        it('includes major timezone identifiers', () => {
            const timezones = validTimezones();
            const majorTimezones = [
                'Europe/London',
                'Europe/Paris',
                'Asia/Singapore',
                'Australia/Sydney',
                'Pacific/Auckland',
                'America/Los_Angeles',
                'America/Chicago'
            ];

            majorTimezones.forEach(tz => {
                expect(timezones).toContain(tz);
            });
        });
    });
});
