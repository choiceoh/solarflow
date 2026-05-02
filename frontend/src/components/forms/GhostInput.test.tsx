import { describe, expect, it } from 'vitest';
import { trimGhostToFit } from './ghostInputHelpers';

describe('trimGhostToFit', () => {
  it('maxLength 미지정 시 ghost 그대로 반환', () => {
    expect(trimGhostToFit('hello', ' world')).toBe(' world');
    expect(trimGhostToFit('hello', ' world', 0)).toBe(' world');
    expect(trimGhostToFit('hello', ' world', undefined)).toBe(' world');
  });

  it('value + ghost 가 maxLength 이내면 ghost 그대로', () => {
    expect(trimGhostToFit('hello', ' world', 100)).toBe(' world');
    expect(trimGhostToFit('hello', ' world', 11)).toBe(' world');
  });

  it('value + ghost 가 maxLength 초과 시 ghost 잘라서 반환', () => {
    // value=5, ghost=' world'(6) → 11. maxLength=8 → remaining=3 → ' wo'
    expect(trimGhostToFit('hello', ' world', 8)).toBe(' wo');
    // remaining=0 → 빈 문자열
    expect(trimGhostToFit('hello', ' world', 5)).toBe('');
  });

  it('value 가 이미 maxLength 도달했으면 빈 문자열', () => {
    expect(trimGhostToFit('hello', ' world', 5)).toBe('');
    expect(trimGhostToFit('hello', ' world', 4)).toBe('');
  });

  it('빈 ghost 는 빈 문자열', () => {
    expect(trimGhostToFit('hello', '', 100)).toBe('');
  });
});
