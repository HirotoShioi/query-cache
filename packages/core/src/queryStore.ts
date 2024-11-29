import { HashKeyMap } from './hashKeyMap';
import { Query } from './query';
import { QueryKeyHash } from './queryKeyHash';
import { CreateQueryParams, NonEmptyArray, QueryKey } from './types';
import { matchQuery } from './util';

type QueryStoreOptions = Partial<{
  maxSize: number;
  staleTime: number;
  refetchOnInvalidate: boolean;
}>;

/**
 * QueryStore is a singleton class that manages the queries in the cache.
 */
class QueryStore {
  #cache: HashKeyMap<Query>;
  #maxSize = Infinity;
  #staleTime = Infinity;
  #refetchOnInvalidate = true;

  constructor(
    maxSize = Infinity,
    staleTime = Infinity,
    refetchOnInvalidate = true
  ) {
    this.#cache = new HashKeyMap();
    this.setOptions({ maxSize, staleTime, refetchOnInvalidate });
  }

  get size(): number {
    return this.#cache.size;
  }

  get maxSize(): number {
    return this.#maxSize;
  }

  get refetchOnInvalidate(): boolean {
    return this.#refetchOnInvalidate;
  }

  get staleTime(): number {
    return this.#staleTime;
  }

  setOptions(options: QueryStoreOptions): void {
    const sanitizedOptions = {
      maxSize:
        options.maxSize !== undefined && options.maxSize >= 0
          ? options.maxSize
          : undefined,
      staleTime:
        options.staleTime !== undefined && options.staleTime >= 0
          ? options.staleTime
          : undefined,
      refetchOnInvalidate: options.refetchOnInvalidate,
    };

    if (sanitizedOptions.maxSize !== undefined) {
      this.#maxSize = sanitizedOptions.maxSize;
    }

    if (sanitizedOptions.staleTime !== undefined) {
      this.#staleTime = sanitizedOptions.staleTime;
    }

    if (sanitizedOptions.refetchOnInvalidate !== undefined) {
      this.#refetchOnInvalidate = sanitizedOptions.refetchOnInvalidate;
    }
  }

  async set(params: CreateQueryParams): Promise<void> {
    const query = await Query.create({
      ...params,
      staleTime: params.staleTime ?? this.#staleTime,
    });
    this.#cache.set(query.queryKeyHash, query);
    if (this.#cache.size > this.#maxSize) {
      this.#removeStaleQueries(this.#cache.size - this.#maxSize);
    }
  }

  #removeStaleQueries(count: number): void {
    const queries = Array.from(this.#cache.values());
    queries.sort((a, b) => a.timestamp - b.timestamp);
    for (const [i, query] of queries.entries()) {
      if (i >= count) {
        break;
      }
      this.#cache.delete(query.queryKeyHash);
      query.destroy();
    }
  }

  get isFull(): boolean {
    return this.#cache.size >= this.#maxSize;
  }

  async queryExists(queryKey: NonEmptyArray<QueryKey>): Promise<boolean> {
    const keyHash = await QueryKeyHash.create(queryKey);
    return this.#cache.has(keyHash);
  }

  async findQueries(filters: {
    queryKeys: NonEmptyArray<QueryKey>;
    exactMatchOnly?: boolean;
  }): Promise<Query[]> {
    const queries = Array.from(this.#cache.values());
    if (Object.keys(filters).length > 0) {
      const result = await Promise.all(
        queries.map(async (query) => await matchQuery({ ...filters, query }))
      );
      return queries.filter((_, index) => result[index]);
    }
    return queries;
  }

  async get<T>(queryKey: NonEmptyArray<QueryKey>): Promise<T> {
    const hash = await QueryKeyHash.create(queryKey);
    const query = this.#cache.get(hash);
    if (!query) {
      throw new Error(`Query not found: ${queryKey} ${hash}`);
    }
    return (await query.getData()) as T;
  }

  async invalidateQueries(
    queryKeys?: NonEmptyArray<QueryKey>,
    refetch = this.#refetchOnInvalidate,
    exact = false
  ): Promise<void> {
    if (!queryKeys) {
      for (const query of this.#cache.values()) {
        await query.invalidate(refetch);
      }
      return;
    }
    const queries = await this.findQueries({
      queryKeys,
      exactMatchOnly: exact,
    });
    for (const query of queries) {
      await query.invalidate(refetch);
    }
  }

  clear() {
    this.#cache.clear();
  }

  async isStale(queryKeys: NonEmptyArray<QueryKey>): Promise<boolean> {
    const queries = await this.findQueries({ queryKeys, exactMatchOnly: true });
    return queries.some((query) => query.isStale());
  }
}

export default QueryStore;
export type { QueryStoreOptions };
