import { describe, it, expect } from 'vitest';
import { formatFileSize, formatDate } from '../../app/utils/format';

describe('Format Utilities', () => {
    describe('formatFileSize', () => {
        it('should return "-" when no bytes provided', () => {
            expect(formatFileSize()).toBe('-');
            expect(formatFileSize(0)).toBe('-');
            expect(formatFileSize(undefined)).toBe('-');
        });

        it('should format bytes correctly', () => {
            expect(formatFileSize(500)).toBe('500 B');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1536)).toBe('1.5 KB');
        });

        it('should format kilobytes correctly', () => {
            expect(formatFileSize(10240)).toBe('10 KB');
            expect(formatFileSize(102400)).toBe('100 KB');
        });

        it('should format megabytes correctly', () => {
            expect(formatFileSize(1048576)).toBe('1 MB');
            expect(formatFileSize(1572864)).toBe('1.5 MB');
            expect(formatFileSize(104857600)).toBe('100 MB');
        });

        it('should format gigabytes correctly', () => {
            expect(formatFileSize(1073741824)).toBe('1 GB');
            expect(formatFileSize(1610612736)).toBe('1.5 GB');
        });
    });

    describe('formatDate', () => {
        it('should format ISO date string correctly', () => {
            const result = formatDate('2024-01-15T10:00:00Z');
            expect(result).toBe('January 15, 2024');
        });

        it('should format date-only string correctly', () => {
            const result = formatDate('2024-06-20');
            expect(result).toBe('June 20, 2024');
        });

        it('should format different months correctly', () => {
            expect(formatDate('2024-03-01')).toBe('March 1, 2024');
            expect(formatDate('2024-12-25')).toBe('December 25, 2024');
        });

        it('should handle edge cases for dates', () => {
            expect(formatDate('2020-02-29')).toBe('February 29, 2020'); // Leap year
            expect(formatDate('2024-01-01')).toBe('January 1, 2024');
            expect(formatDate('2024-12-31')).toBe('December 31, 2024');
        });
    });
});
