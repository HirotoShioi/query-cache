import { Query } from './query';
import { QueryKeyHash } from './queryKeyHash';
import { NonEmptyArray, QueryKey } from './types';

async function sha256(data: string): Promise<string> {
  if (isServer) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(data);
    const result = hash.digest('hex');
    return result;
  }
  return crypto.subtle
    .digest('SHA-256', new TextEncoder().encode(data))
    .then((buffer) => {
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    });
}

async function matchQuery(filters: {
  queryKeys: NonEmptyArray<QueryKey>;
  exactMatchOnly?: boolean;
  query: Query;
}): Promise<boolean> {
  const { queryKeys, exactMatchOnly, query } = filters;
  if (queryKeys) {
    if (exactMatchOnly) {
      const queryKeyHash = await QueryKeyHash.create(queryKeys);
      return queryKeyHash.equals(query.queryKeyHash);
    }
    return partialMatchKey(queryKeys, query.queryKey);
  }
  return true;
}

function partialMatchKey(a: QueryKey[], b: QueryKey[]): boolean;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function partialMatchKey(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  // 配列の場合は、それぞれの要素が前方部分一致するかチェックする
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.every((item, index) => partialMatchKey(item, b[index]));
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return Object.keys(a).every((key) => partialMatchKey(a[key], b[key]));
  }

  return false;
}

const isServer = typeof window === 'undefined' || 'Deno' in globalThis;
export { matchQuery, sha256, partialMatchKey, isServer };
