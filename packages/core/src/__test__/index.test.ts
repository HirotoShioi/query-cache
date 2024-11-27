import { describe, it, expect, beforeEach } from 'vitest';
import { cache } from '..';
import type { QueryKey, NonEmptyArray } from '../types';
import * as fc from 'fast-check';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Test helper function
const createCounterQuery = (
  queryKey: NonEmptyArray<QueryKey>,
  staleTime?: number
) => {
  let count = 0;
  return () =>
    cache.query<number>({
      queryKey,
      queryFn: async () => {
        count++;
        return count;
      },
      staleTime,
    });
};

const createSimpleQuery = <T = number>(
  queryKey: NonEmptyArray<QueryKey>,
  returnValue: T = 1 as T
) => {
  return () =>
    cache.query<T>({
      queryKey,
      queryFn: async () => returnValue,
    });
};

describe.sequential('Query - Browser Environment', () => {
  beforeEach(() => {
    cache.clear({ resetOptions: true });
  });

  it('should work in browser environment', async () => {
    const query = createSimpleQuery(['test']);
    const result = await query();
    expect(result).toEqual(1);
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should return same result when called with same key', async () => {
    const query = createCounterQuery(['test']);
    const result = await query();
    expect(result).toEqual(1);
    const result2 = await query();
    expect(result2).toEqual(1);
  });

  it('should invalidate cache', async () => {
    const query = createCounterQuery(['invalidate-test']);
    const firstResult = await query();
    expect(firstResult).toEqual(1);
    await cache.invalidate({
      queryKey: ['invalidate-test'],
    });
    expect(await query()).toEqual(2);
  });

  it('should invalidate cache with refetch', async () => {
    const query = createCounterQuery(['invalidate-test']);
    const firstResult = await query();
    expect(firstResult).toEqual(1);
    await cache.invalidate({
      queryKey: ['invalidate-test'],
      refetch: true,
    });
    expect(await query()).toEqual(2);
  });

  it('should not refetch when refetch is false', async () => {
    const query = createCounterQuery(['no-refetch-test']);
    const result = await query();
    expect(result).toEqual(1);
    await cache.invalidate({
      queryKey: ['no-refetch-test'],
      refetch: false,
    });
    expect(await query()).toEqual(2);
  });

  it('should refetch when called after invalidateQueries', async () => {
    const query = createCounterQuery(['no-refetch-test']);
    await query();
    await cache.invalidate({
      queryKey: ['no-refetch-test'],
      refetch: false,
    });
    expect(await query()).toEqual(2);
  });

  it('should clear cache', async () => {
    const query = createSimpleQuery(['clear-test'], {
      data: 'clear test data',
    });
    await query();
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('should invalidate cache with multiple keys', async () => {
    const query1 = createCounterQuery(['invalidate-multiple-test', 'key1']);
    const query2 = createCounterQuery(['invalidate-multiple-test', 'key-two']);

    await query1();
    await query2();

    await cache.invalidate({
      queryKey: ['invalidate-multiple-test'],
    });

    expect(await query1()).toEqual(2);
    expect(await query2()).toEqual(2);
  });

  it('should work with object key', async () => {
    const query = createSimpleQuery([{ test: 'test' }]);
    const result = await query();
    expect(result).toBe(1);
  });

  it('should work with number key', async () => {
    const query = createSimpleQuery([1]);
    const result = await query();
    expect(result).toBe(1);
  });

  it('should invalidate all queries', async () => {
    const q1 = createCounterQuery([1]);
    const q2 = createCounterQuery([2]);

    await q1();
    await q2();

    await cache.invalidate();

    expect(await q1()).toBe(2);
    expect(await q2()).toBe(2);
  });

  it('should invalidate only exact matching queries', async () => {
    const query1 = createCounterQuery(['users', 'list']);
    const query2 = createCounterQuery(['users', 'list', 'active']);
    const query3 = createCounterQuery(['users', 'details']);

    await query1();
    await query2();
    await query3();

    await cache.invalidate({
      queryKey: ['users', 'list'],
    });

    expect(await query1()).toBe(2);
    expect(await query2()).toBe(2);
    expect(await query3()).toBe(1);

    await cache.invalidate({
      queryKey: ['list', 'users'],
    });

    expect(await query1()).toBe(2);
    expect(await query2()).toBe(2);
    expect(await query3()).toBe(1);
  });
  it('should invalidate only exact matching queries', async () => {
    const query1 = createCounterQuery(['users', 'list']);
    const query2 = createCounterQuery(['users', 'list', 'active']);
    await query1();
    await query2();
    await cache.invalidate({
      queryKey: ['users', 'list'],
      exact: true,
    });
    expect(await query1()).toBe(2);
    expect(await query2()).toBe(1);
  });

  it('should refetch after staleTime has passed', async () => {
    const query = createCounterQuery(['stale-test'], 100);

    // First fetch
    expect(await query()).toBe(1);

    // Refetch within staleTime (returned from cache)
    await sleep(50);
    expect(await query()).toBe(1);

    // Refetch after staleTime has passed
    await sleep(100);
    expect(await query()).toBe(2);
  });
  it('should delete least recently used queries when cache is full', async () => {
    cache.setOptions({
      maxSize: 2,
    });
    const query1 = createCounterQuery(['lru-test'], 100);
    await query1();
    const query2 = createCounterQuery(['lru-test', 'key2'], 100);
    await query2();
    const query3 = createCounterQuery(['lru-test', 'key3'], 100);
    await query3();
    expect(cache.size).toBe(2);
  });
  it('should not cache when cache is set to 0', async () => {
    cache.setOptions({
      maxSize: 0,
    });
    const query = createCounterQuery(['no-cache-test']);
    await query();
    expect(cache.size).toBe(0);
  });
  it('should ignore when the options are invalid', async () => {
    cache.setOptions({
      maxSize: -1,
      staleTime: -1,
    });
    expect(cache.size).toBe(0);
    const query = createCounterQuery(['invalid-options-test']);
    await query();
    expect(cache.size).toBe(1);
  });
  it('cache even if the queryFn returns falsy values', async () => {
    let falsyCount = 0;
    const query = () =>
      cache.query({
        queryKey: ['falsy-test'],
        queryFn: async () => {
          falsyCount++;
          return false;
        },
      });
    await query();
    expect(cache.size).toBe(1);
    expect(falsyCount).toBe(1);
    await query();
    expect(falsyCount).toBe(1);
    let undefinedCount = 0;
    const query2 = () =>
      cache.query({
        queryKey: ['undefined-test'],
        queryFn: async () => {
          undefinedCount++;
          return undefined;
        },
      });
    await query2();
    expect(cache.size).toBe(2);
    expect(undefinedCount).toBe(1);
    await query2();
    expect(undefinedCount).toBe(1);
  });
  it('should work with empty string queryKey', async () => {
    const query = createSimpleQuery([[{ id: '', version: 0 }], ''], 1);
    const result = await query();
    expect(result).toBe(1);
    expect(cache.size).toBe(1);
    await query();
    expect(cache.size).toBe(1);
  });
});

// Test with random queryKey and queryFn like quickcheck
import AsyncLock from 'async-lock';
const lock = new AsyncLock();
describe('Query Property Tests', () => {
  it('should handle random queryKey and queryFn combinations', () => {
    fc.assert(
      fc.asyncProperty(
        // queryKeyのアービトラリを定義
        fc.oneof(
          // 空文字列と空白文字列を除外
          fc.string(),
          fc
            .array(fc.oneof(fc.string(), fc.integer(), fc.boolean()))
            .filter((arr) => arr.length > 0),
          fc.record({
            id: fc.string(),
            version: fc.integer(),
          })
        ),
        fc.anything(),
        async (queryKey: QueryKey, mockData: unknown) => {
          await lock.acquire('property-test', async () => {
            cache.clear({ resetOptions: true });
            expect(cache.size).toBe(0);
            const query = () =>
              cache.query({
                queryKey: [queryKey],
                queryFn: async () => mockData,
              });

            const result = await query();
            expect(result).toEqual(mockData);
          });
        }
      ),
      { verbose: true, numRuns: 10_000 }
    );
  });

  it('should handle async queryFn with random data', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        fc.anything(),
        async (queryKey: string, mockData: unknown) => {
          await lock.acquire('property-test', async () => {
            cache.clear({ resetOptions: true });
            expect(cache.size).toBe(0);
            const query = () =>
              cache.query({
                queryKey: [queryKey],
                queryFn: async () => mockData,
              });
            const result = await query();
            expect(result).toEqual(mockData);
          });
        }
      ),
      { verbose: true, numRuns: 10_000 }
    );
  });
});
