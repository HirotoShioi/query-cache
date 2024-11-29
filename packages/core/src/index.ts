import QueryStore, { QueryStoreOptions } from './queryStore';
import type { CreateQueryParams, NonEmptyArray, QueryKey } from './types';

class QueryCache {
  #queryStore: QueryStore;

  constructor(
    args: {
      maxSize?: number;
      staleTime?: number;
      refetchOnInvalidate?: boolean;
    } = {}
  ) {
    this.#queryStore = new QueryStore(
      args.maxSize,
      args.staleTime,
      args.refetchOnInvalidate
    );
  }

  async cache<T>(params: CreateQueryParams<T>): Promise<T> {
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
    refetch,
    exact,
  }: Partial<{
    queryKey: NonEmptyArray<QueryKey>;
    refetch: boolean;
    exact: boolean;
  }> = {}) {
    await this.#queryStore.invalidateQueries(queryKey, refetch, exact);
  }

  get options(): QueryStoreOptions {
    return {
      maxSize: this.#queryStore.maxSize,
      staleTime: this.#queryStore.staleTime,
      refetchOnInvalidate: this.#queryStore.refetchOnInvalidate,
    };
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

  clear() {
    this.#queryStore.clear();
  }
}

export { QueryCache };

export type { CreateQueryParams };
