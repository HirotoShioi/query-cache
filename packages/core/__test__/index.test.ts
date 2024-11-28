import { describe, it, expect } from 'vitest';
import { QueryCache } from '..';
import type { QueryKey, NonEmptyArray } from '../src/types';
import * as fc from 'fast-check';

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

type CreateCounterQueryParams = {
  queryKey: NonEmptyArray<QueryKey>;
  staleTime?: number;
  queryCache?: QueryCache;
};
// Test helper function
const createCounterQuery = ({
  queryKey,
  staleTime,
  queryCache,
}: CreateCounterQueryParams) => {
  let count = 0;
  const query = queryCache ?? new QueryCache();
  const queryFn = () =>
    query.cache<number>({
      queryKey,
      queryFn: async () => {
        count++;
        return count;
      },
      staleTime,
    });
  return {
    queryFn,
    query,
  };
};

type CreateSimpleQueryParams<T> = {
  queryKey: NonEmptyArray<QueryKey>;
  returnValue: T;
  queryCache?: QueryCache;
};
const createSimpleQuery = <T>({
  queryKey,
  returnValue,
  queryCache,
}: CreateSimpleQueryParams<T>) => {
  const query = queryCache ?? new QueryCache();
  const queryFn = () =>
    query.cache<T>({
      queryKey,
      queryFn: async () => returnValue,
    });
  return {
    queryFn,
    query,
  };
};

describe.sequential('Query - Browser Environment', () => {
  it('should work in browser environment', async () => {
    const { query, queryFn } = createSimpleQuery({
      queryKey: ['test'],
      returnValue: 1,
    });
    const result = await queryFn();
    expect(result).toEqual(1);
    expect(query.size).toBe(1);
    query.clear();
    expect(query.size).toBe(0);
  });

  it('should return same result when called with same key', async () => {
    const { queryFn } = createCounterQuery({
      queryKey: ['test'],
    });
    const result = await queryFn();
    expect(result).toEqual(1);
    const result2 = await queryFn();
    expect(result2).toEqual(1);
  });

  it('should invalidate cache', async () => {
    const { queryFn, query } = createCounterQuery({
      queryKey: ['invalidate-test'],
    });
    const firstResult = await queryFn();
    expect(firstResult).toEqual(1);
    await query.invalidateCache({
      queryKey: ['invalidate-test'],
    });
    expect(await queryFn()).toEqual(2);
  });

  it('should invalidate cache with refetch', async () => {
    const { queryFn, query } = createCounterQuery({
      queryKey: ['invalidate-test'],
    });
    const firstResult = await queryFn();
    expect(firstResult).toEqual(1);
    await query.invalidateCache({
      queryKey: ['invalidate-test'],
      refetch: true,
    });
    expect(await queryFn()).toEqual(2);
  });

  it('should not refetch when refetch is false', async () => {
    const { queryFn, query } = createCounterQuery({
      queryKey: ['no-refetch-test'],
    });
    const result = await queryFn();
    expect(result).toEqual(1);
    await query.invalidateCache({
      queryKey: ['no-refetch-test'],
      refetch: false,
    });
    expect(await queryFn()).toEqual(2);
  });

  it('should refetch when called after invalidateQueries', async () => {
    const { queryFn, query } = createCounterQuery({
      queryKey: ['no-refetch-test'],
    });
    await queryFn();
    await query.invalidateCache({
      queryKey: ['no-refetch-test'],
      refetch: false,
    });
    expect(await queryFn()).toEqual(2);
  });

  it('should clear cache', async () => {
    const { query, queryFn } = createSimpleQuery({
      queryKey: ['clear-test'],
      returnValue: 'clear test data',
    });
    await queryFn();
    query.clear();
    expect(query.size).toBe(0);
  });

  it('should invalidate cache with multiple keys', async () => {
    const query = new QueryCache();
    const { queryFn: query1Fn } = createCounterQuery({
      queryKey: ['invalidate-multiple-test', 'key1'],
      queryCache: query,
    });
    const { queryFn: query2Fn } = createCounterQuery({
      queryKey: ['invalidate-multiple-test', 'key-two'],
      queryCache: query,
    });

    await query1Fn();
    await query2Fn();

    await query.invalidateCache({
      queryKey: ['invalidate-multiple-test'],
    });

    expect(await query1Fn()).toEqual(2);
    expect(await query2Fn()).toEqual(2);
  });

  it('should work with object key', async () => {
    const { queryFn } = createSimpleQuery({
      queryKey: [{ test: 'test' }],
      returnValue: 1,
    });
    const result = await queryFn();
    expect(result).toBe(1);
  });

  it('should work with number key', async () => {
    const { queryFn } = createSimpleQuery({
      queryKey: [1],
      returnValue: 1,
    });
    const result = await queryFn();
    expect(result).toBe(1);
  });

  it('should invalidate all queries', async () => {
    const query = new QueryCache();
    const { queryFn: q1Fn } = createCounterQuery({
      queryKey: [1],
      queryCache: query,
    });
    const { queryFn: q2Fn } = createCounterQuery({
      queryKey: [2],
      queryCache: query,
    });

    await q1Fn();
    await q2Fn();

    await query.invalidateCache();

    expect(await q1Fn()).toBe(2);
    expect(await q2Fn()).toBe(2);
  });

  it('should invalidate only exact matching queries', async () => {
    const query = new QueryCache();
    const { queryFn: query1Fn } = createCounterQuery({
      queryKey: ['users', 'list'],
      queryCache: query,
    });
    const { queryFn: query2Fn } = createCounterQuery({
      queryKey: ['users', 'list', 'active'],
      queryCache: query,
    });
    const { queryFn: query3Fn } = createCounterQuery({
      queryKey: ['users', 'details'],
      queryCache: query,
    });

    await query1Fn();
    await query2Fn();
    await query3Fn();

    await query.invalidateCache({
      queryKey: ['users', 'list'],
    });

    expect(await query1Fn()).toBe(2);
    expect(await query2Fn()).toBe(2);
    expect(await query3Fn()).toBe(1);

    await query.invalidateCache({
      queryKey: ['list', 'users'],
    });

    expect(await query1Fn()).toBe(2);
    expect(await query2Fn()).toBe(2);
    expect(await query3Fn()).toBe(1);
  });
  it('should invalidate only exact matching queries', async () => {
    const query = new QueryCache();
    const { queryFn: query1Fn } = createCounterQuery({
      queryKey: ['users', 'list'],
      queryCache: query,
    });
    const { queryFn: query2Fn } = createCounterQuery({
      queryKey: ['users', 'list', 'active'],
      queryCache: query,
    });
    await query1Fn();
    await query2Fn();
    await query.invalidateCache({
      queryKey: ['users', 'list'],
      exact: true,
    });
    expect(await query1Fn()).toBe(2);
    expect(await query2Fn()).toBe(1);
  });

  it('should refetch after staleTime has passed', async () => {
    const { queryFn } = createCounterQuery({
      queryKey: ['stale-test'],
      staleTime: 100,
    });

    // First fetch
    expect(await queryFn()).toBe(1);

    // Refetch within staleTime (returned from cache)
    await sleep(50);
    expect(await queryFn()).toBe(1);

    // Refetch after staleTime has passed
    await sleep(100);
    expect(await queryFn()).toBe(2);
  });
  it('should delete least recently used queries when cache is full', async () => {
    const query = new QueryCache({
      maxSize: 2,
    });
    const { queryFn: query1Fn } = createCounterQuery({
      queryKey: ['lru-test'],
      queryCache: query,
    });
    await query1Fn();
    const { queryFn: query2Fn } = createCounterQuery({
      queryKey: ['lru-test', 'key2'],
      queryCache: query,
    });
    await query2Fn();
    const { queryFn: query3Fn } = createCounterQuery({
      queryKey: ['lru-test', 'key3'],
      queryCache: query,
    });
    await query3Fn();
    expect(query.size).toBe(2);
  });
  it('should not cache when cache is set to 0', async () => {
    const query = new QueryCache({
      maxSize: 0,
    });
    const { queryFn: counterQueryFn } = createCounterQuery({
      queryKey: ['no-cache-test'],
      queryCache: query,
    });
    await counterQueryFn();
    expect(query.size).toBe(0);
  });
  it('should ignore when the options are invalid', async () => {
    const query = new QueryCache({
      maxSize: -1,
      staleTime: -1,
    });
    expect(query.size).toBe(0);
    const { queryFn: counterQueryFn } = createCounterQuery({
      queryKey: ['invalid-options-test'],
      queryCache: query,
    });
    await counterQueryFn();
    expect(query.size).toBe(1);
  });
  it('cache even if the queryFn returns falsy values', async () => {
    let falsyCount = 0;
    const query = new QueryCache();
    const falsyQuery = () =>
      query.cache({
        queryKey: ['falsy-test'],
        queryFn: async () => {
          falsyCount++;
          return false;
        },
      });
    await falsyQuery();
    expect(query.size).toBe(1);
    expect(falsyCount).toBe(1);
    await falsyQuery();
    expect(falsyCount).toBe(1);
    let undefinedCount = 0;
    const undefinedQuery = () =>
      query.cache({
        queryKey: ['undefined-test'],
        queryFn: async () => {
          undefinedCount++;
          return undefined;
        },
      });
    await undefinedQuery();
    expect(query.size).toBe(2);
    expect(undefinedCount).toBe(1);
    await undefinedQuery();
    expect(undefinedCount).toBe(1);
  });
  it('should work with empty string queryKey', async () => {
    const { queryFn: simpleQueryFn, query } = createSimpleQuery({
      queryKey: [[{ id: '', version: 0 }], ''],
      returnValue: 1,
    });
    const result = await simpleQueryFn();
    expect(result).toBe(1);
    expect(query.size).toBe(1);
    await simpleQueryFn();
    expect(query.size).toBe(1);
  });
});

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
          const query = new QueryCache();
          const randomQuery = () =>
            query.cache({
              queryKey: [queryKey],
              queryFn: async () => mockData,
            });

          const result = await randomQuery();
          expect(result).toEqual(mockData);
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
          const query = new QueryCache();
          expect(query.size).toBe(0);
          const randomQuery = () =>
            query.cache({
              queryKey: [queryKey],
              queryFn: async () => mockData,
            });
          const result = await randomQuery();
          expect(result).toEqual(mockData);
        }
      ),
      { verbose: true, numRuns: 10_000 }
    );
  });
});
