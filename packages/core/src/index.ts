import QueryStore, { QueryStoreOptions } from './queryStore';
import type { CreateQueryParams, NonEmptyArray, QueryKey } from './types';

class QueryCacheClient {
  #queryStore: QueryStore;

  constructor(args: { maxSize?: number; staleTime?: number } = {}) {
    this.#queryStore = new QueryStore(args.maxSize, args.staleTime);
  }

  async cache<T = unknown>(params: CreateQueryParams<T>): Promise<T> {
    if (params.queryKey.length <= 0) {
      throw new Error('Keys must be provided');
    }
    if (this.#queryStore.isFull) {
      return params.queryFn();
    }
    const queryExists = await this.#queryStore.queryExists(params.queryKey);
    if (queryExists) {
      return this.#queryStore.get<T>(params.queryKey);
    }
    await this.#queryStore.set(params);
    return this.#queryStore.get<T>(params.queryKey);
  }

  async invalidateCache({
    queryKey,
    refetch = true,
    exact = false,
  }: Partial<{
    queryKey: NonEmptyArray<QueryKey>;
    refetch: boolean;
    exact: boolean;
  }> = {}) {
    if (!queryKey) {
      await this.#queryStore.invalidateAll(refetch);
      return;
    }
    const queries = await this.#queryStore.findQueries({
      queryKeys: queryKey,
      exactMatchOnly: exact,
    });
    for (const query of queries) {
      query.invalidate(refetch);
    }
  }

  clear(options: Partial<{ resetOptions: boolean }> = {}) {
    this.#queryStore.clear(options);
  }

  setOptions(options: QueryStoreOptions) {
    this.#queryStore.setOptions(options);
  }

  async isStale(queryKeys: NonEmptyArray<QueryKey>): Promise<boolean> {
    return this.#queryStore.isStale(queryKeys);
  }

  get size(): number {
    return this.#queryStore.size;
  }
}

export { QueryCacheClient };

export type { CreateQueryParams };
