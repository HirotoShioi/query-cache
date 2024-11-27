type QueryKey = string | number | object;
type NonEmptyArray<T> = [T, ...T[]];
type QueryFunction<T = unknown> = () => Promise<T>;
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
