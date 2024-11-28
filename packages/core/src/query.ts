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
  #abortController: AbortController | null = null;

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
    // キャンセル用のAbortControllerを設定
    this.#abortController = new AbortController();
    const signal = this.#abortController.signal;

    try {
      const data = await this.#queryFn({ signal });
      this.setData(data);
      return data;
    } catch (error) {
      if (signal.aborted) {
        console.warn('Query was cancelled');
      } else {
        this.clear();
      }
      throw error;
    } finally {
      this.#abortController = null; // 処理完了後にリセット
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

  isStale(): boolean {
    return Date.now() - this.#timestamp >= this.#staleTime;
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
    this.cancel(); // 現在の処理をキャンセル
  }

  async invalidate(refetch = true): Promise<void> {
    this.clear();
    if (refetch) {
      await this.dispatch();
    }
  }

  cancel(): void {
    if (this.#abortController) {
      this.#abortController.abort();
      this.#abortController = null;
    }
  }
}

export { Query };
export type { QueryParams };
