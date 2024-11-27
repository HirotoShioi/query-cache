import QueryStore, { QueryStoreOptions } from './queryStore';
import type { CreateQueryParams, NonEmptyArray, QueryKey } from './types';

async function query<T = unknown>(params: CreateQueryParams<T>): Promise<T> {
  const queryStore = QueryStore.getInstance();
  if (params.queryKey.length <= 0) {
    throw new Error('Keys must be provided');
  }
  if (queryStore.isFull) {
    return params.queryFn();
  }
  const queryExists = await queryStore.queryExists(params.queryKey);
  if (queryExists) {
    return queryStore.get<T>(params.queryKey);
  }
  await queryStore.set(params);
  return queryStore.get<T>(params.queryKey);
}

type InvalidateQueriesParams = Partial<{
  queryKey: NonEmptyArray<QueryKey>;
  refetch: boolean;
  exact: boolean;
}>;

async function invalidate({
  queryKey,
  refetch = true,
  exact = false,
}: InvalidateQueriesParams = {}) {
  const queryStore = QueryStore.getInstance();
  if (!queryKey) {
    await queryStore.invalidateAll(refetch);
    return;
  }
  const queries = await queryStore.findQueries({
    queryKeys: queryKey,
    exactMatchOnly: exact,
  });
  for (const query of queries) {
    query.invalidate(refetch);
  }
}

type ClearOptions = Partial<{
  resetOptions: boolean;
}>;

function clear(options: ClearOptions = {}) {
  QueryStore.getInstance().clear(options);
}

function setOptions(options: QueryStoreOptions) {
  QueryStore.getInstance().setOptions(options);
}

export const cache = {
  query,
  invalidate,
  clear,
  setOptions,
  get size() {
    return QueryStore.getInstance().size;
  },
};

export type { CreateQueryParams, InvalidateQueriesParams };
