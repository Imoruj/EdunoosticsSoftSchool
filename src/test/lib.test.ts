import { describe, it, expect } from 'vitest';
import { clampLimit } from '../lib/apiError';
import { getScoreFieldNumber, getHalfTermSummaryFromScores } from '../lib/reports/calculations';

describe('clampLimit', () => {
  it('returns 50 by default for undefined input', () => {
    expect(clampLimit(undefined)).toBe(50);
  });

  it('clamps to max', () => {
    expect(clampLimit(1000)).toBe(500);
    expect(clampLimit(1000, 100)).toBe(100);
  });

  it('parses string numbers', () => {
    expect(clampLimit('20')).toBe(20);
  });

  it('returns 50 for invalid input', () => {
    expect(clampLimit('abc')).toBe(50);
    expect(clampLimit(0)).toBe(50);
    expect(clampLimit(-5)).toBe(50);
  });
});

describe('getScoreFieldNumber', () => {
  it('handles plain numbers', () => {
    expect(getScoreFieldNumber(85)).toBe(85);
  });

  it('handles null/undefined as 0', () => {
    expect(getScoreFieldNumber(null)).toBe(0);
    expect(getScoreFieldNumber(undefined)).toBe(0);
  });

  it('handles Prisma Decimal-like objects', () => {
    expect(getScoreFieldNumber({ toNumber: () => 72.5 })).toBe(72.5);
  });
});

describe('getHalfTermSummaryFromScores', () => {
  it('computes average correctly', () => {
    const scores = [{ scoreValues: { ca1: 15 } }, { scoreValues: { ca1: 10 } }];
    // AssessmentTypeLike requires id, name, maxScore, order
    const assessmentTypes = [{ id: '1', name: 'CA1', maxScore: 20, order: 1 }];
    const result = getHalfTermSummaryFromScores(scores, assessmentTypes);
    expect(result.totalScore).toBe(25);
    expect(result.totalObtainable).toBe(40);
    expect(result.average).toBeCloseTo(62.5);
  });

  it('returns 0 average for empty scores', () => {
    const result = getHalfTermSummaryFromScores([], [] as any);
    expect(result.average).toBe(0);
  });
});
