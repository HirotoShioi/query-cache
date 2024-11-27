import { QueryKeyHash } from './queryKeyHash';

class HashKeyMap<V> {
  #map: Map<string, V>;

  constructor() {
    this.#map = new Map();
  }

  set(key: QueryKeyHash, value: V): this {
    this.#map.set(key.toString(), value);
    return this;
  }

  get(key: QueryKeyHash): V | undefined {
    return this.#map.get(key.toString());
  }

  delete(key: QueryKeyHash): this {
    this.#map.delete(key.toString());
    return this;
  }

  has(key: QueryKeyHash): boolean {
    return this.#map.has(key.toString());
  }

  get size(): number {
    return this.#map.size;
  }
  values(): V[] {
    return Array.from(this.#map.values());
  }

  clear(): void {
    this.#map.clear();
  }
}

export { HashKeyMap };
