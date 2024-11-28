type QueryKey = string | number | object;
type NonEmptyArray<T> = [T, ...T[]];
export type QueryFunctionContext = {
  signal?: AbortSignal;
};

type QueryFunction<T> = (context?: QueryFunctionContext) => Promise<T>;
type CreateQueryParams<T = unknown> = {
  queryFn: QueryFunction<T>;
  staleTime?: number;
  queryKey: NonEmptyArray<QueryKey>;
};

type ClearOptions = Partial<{
  resetOptions: boolean;
}>;

export type {
  QueryKey,
  NonEmptyArray,
  QueryFunction,
  CreateQueryParams,
  ClearOptions,
};
