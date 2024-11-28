import { describe, it, expect } from 'vitest';
import { partialMatchKey } from '../src/util';

describe('partialMatchKey', () => {
  // プリミティブ値のテスト
  it('should return true for identical primitive values', () => {
    expect(partialMatchKey(['test'], ['test'])).toBe(true);
    expect(partialMatchKey([123], [123])).toBe(true);
  });

  it('should return false for different primitive values', () => {
    expect(partialMatchKey(['test'], ['different'])).toBe(false);
    expect(partialMatchKey([123], [456])).toBe(false);
  });

  it('should return false for different types', () => {
    expect(partialMatchKey(['123'], [123])).toBe(false);
  });

  // 配列のテスト
  it('should return true for identical arrays', () => {
    expect(partialMatchKey(['users', 'list'], ['users', 'list'])).toBe(true);
  });

  it('should return true for partial match arrays where a is prefix of b', () => {
    expect(partialMatchKey(['users'], ['users', 'list'])).toBe(true);
    expect(
      partialMatchKey(['users', 'list'], ['users', 'list', 'active'])
    ).toBe(true);
  });

  it('should return false for non-matching arrays', () => {
    expect(partialMatchKey(['users', 'list'], ['users', 'details'])).toBe(
      false
    );
    expect(partialMatchKey(['users', 'list'], ['admin', 'list'])).toBe(false);
  });

  // オブジェクトのテスト
  it('should return true for identical objects', () => {
    expect(partialMatchKey([{ id: 1 }], [{ id: 1 }])).toBe(true);
    expect(
      partialMatchKey([{ id: 1, name: 'test' }], [{ id: 1, name: 'test' }])
    ).toBe(true);
  });

  it('should return true for partial match objects where a is subset of b', () => {
    expect(partialMatchKey([{ id: 1 }], [{ id: 1, name: 'test' }])).toBe(true);
  });

  it('should return false for non-matching objects', () => {
    expect(partialMatchKey([{ id: 1 }], [{ id: 2 }])).toBe(false);
    expect(
      partialMatchKey([{ id: 1, name: 'test' }], [{ id: 1, name: 'different' }])
    ).toBe(false);
  });

  // 複雑なケースのテスト
  it('should handle nested objects and arrays', () => {
    expect(
      partialMatchKey(['users', { id: 1 }], ['users', { id: 1, extra: 'data' }])
    ).toBe(true);

    expect(
      partialMatchKey(
        ['users', { filters: { status: 'active' } }],
        ['users', { filters: { status: 'active', type: 'admin' } }]
      )
    ).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(partialMatchKey([], [])).toBe(true);
    expect(partialMatchKey([{}], [{}])).toBe(true);
  });
});
