import { HashKeyMap } from './hashKeyMap';
import { Query } from './query';
import { QueryKeyHash } from './queryKeyHash';
import {
  ClearOptions,
  CreateQueryParams,
  NonEmptyArray,
  QueryKey,
} from './types';
import { matchQuery } from './util';

type QueryStoreOptions = Partial<{
  maxSize: number;
  staleTime: number;
}>;

/**
 * QueryStore is a singleton class that manages the queries in the cache.
 */
class QueryStore {
  private static instance: QueryStore;
  #cache: HashKeyMap<Query>;
  #maxSize = Infinity;
  #staleTime = Infinity;

  private constructor() {
    this.#cache = new HashKeyMap();
  }

  get size(): number {
    return this.#cache.size;
  }

  get maxSize(): number {
    return this.#maxSize;
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
    };

    if (sanitizedOptions.maxSize !== undefined) {
      this.#maxSize = sanitizedOptions.maxSize;
    }

    if (sanitizedOptions.staleTime !== undefined) {
      this.#staleTime = sanitizedOptions.staleTime;
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

  async invalidate(queryId: QueryKeyHash, refetch = true): Promise<void> {
    const query = this.#cache.get(queryId);
    await query?.invalidate(refetch);
  }

  async invalidateAll(refetch = true): Promise<void> {
    for (const query of this.#cache.values()) {
      await query.invalidate(refetch);
    }
  }

  static getInstance(): QueryStore {
    if (!QueryStore.instance) {
      QueryStore.instance = new QueryStore();
    }
    return QueryStore.instance;
  }

  clear({ resetOptions = false }: ClearOptions = {}): void {
    if (this.#cache.size > 0) {
      // キャッシュ内の各クエリのクリーンアップを実行
      for (const query of this.#cache.values()) {
        query.destroy();
      }
      // キャッシュをクリア
      this.#cache.clear();
      // インスタンスへの参照を削除
      this.#cache = new HashKeyMap();
    }
    if (resetOptions) {
      this.setOptions({
        maxSize: Infinity,
        staleTime: Infinity,
      });
    }
  }
}

export default QueryStore;
export type { QueryStoreOptions };
