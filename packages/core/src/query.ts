import { QueryKeyHash } from './queryKeyHash';
import { NonEmptyArray, QueryFunction, QueryKey } from './types';

type QueryParams<T = unknown> = {
  queryFn: QueryFunction<T>;
  staleTime: number;
  queryKey: NonEmptyArray<QueryKey>;
};

type QueryConstructorParams<T = unknown> = QueryParams<T> & {
  queryKeyHash: QueryKeyHash;
};

/**
 * Query is a class that represents a query in the cache.
 */
class Query<T = unknown> {
  #isSet = false;
  #data: T | undefined = undefined;
  #timestamp = 0;
  #queryFn: QueryFunction<T>;
  #staleTime: number;
  #queryKeyHash: QueryKeyHash;
  #queryKey: NonEmptyArray<QueryKey>;
  static async create<T>(params: QueryParams<T>): Promise<Query<T>> {
    const queryKeyHash = await QueryKeyHash.create(params.queryKey);
    return new Query({
      ...params,
      queryKeyHash: queryKeyHash,
      queryKey: params.queryKey,
    });
  }

  private constructor(params: QueryConstructorParams<T>) {
    this.#queryFn = params.queryFn;
    this.#staleTime = params.staleTime;
    this.#queryKeyHash = params.queryKeyHash;
    this.#queryKey = params.queryKey;
  }

  private async dispatch(): Promise<T> {
    try {
      const data = await this.#queryFn();
      this.setData(data);
      return data;
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  async getData(): Promise<T> {
    if (this.#isSet && Date.now() - this.#timestamp < this.#staleTime) {
      return Promise.resolve(this.#data as T);
    }
    return this.dispatch();
  }

  setData(data: T): void {
    this.#data = data;
    this.#isSet = true;
    this.#timestamp = Date.now();
  }

  get timestamp(): number {
    return this.#timestamp;
  }

  get queryKeyHash(): QueryKeyHash {
    return this.#queryKeyHash;
  }

  get queryKey(): NonEmptyArray<QueryKey> {
    return this.#queryKey;
  }

  destroy(): void {
    this.clear();
  }

  clear(): void {
    this.#data = undefined;
    this.#isSet = false;
    this.#timestamp = 0;
  }

  async invalidate(refetch = true): Promise<void> {
    this.clear();
    if (refetch) {
      await this.dispatch();
    }
  }
}

export { Query };
export type { QueryParams };
