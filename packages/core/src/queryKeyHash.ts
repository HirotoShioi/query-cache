import { QueryKey, NonEmptyArray } from './types';
import { sha256 } from './util';

/**
 * QueryKeyHash is a class that represents the hash of the query key.
 * hash is used to identify the query within the cache.
 */
export class QueryKeyHash {
  #id: string;

  private constructor(hash: string) {
    this.#id = hash;
  }

  static async create(keys: NonEmptyArray<QueryKey>): Promise<QueryKeyHash> {
    const hash = await sha256(JSON.stringify(keys));
    return new QueryKeyHash(hash);
  }

  toString(): string {
    return this.#id;
  }

  equals(other: QueryKeyHash): boolean {
    return this.#id === other.#id;
  }
}
