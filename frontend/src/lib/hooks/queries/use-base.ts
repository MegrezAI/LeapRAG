import {
  useQueryClient,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
  type InfiniteData
} from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT } from '@/lib/constants/common';

export const useInvalidateQuery = (key: QueryKey) => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: key });
  };
};

export const useSetQueryData = () => {
  const queryClient = useQueryClient();

  return (queryKey: readonly unknown[], updater: (oldData: any | undefined) => any) => {
    queryClient.setQueryData(queryKey, updater);
  };
};

interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

interface UseInfiniteQueryListParams<TData, TParams> {
  queryKey: QueryKey;
  queryFn: (
    params: TParams & { page: number; page_size: number }
  ) => Promise<PaginatedResponse<TData>>;
  params?: TParams;
  pageSize?: number;
  options?: Omit<
    UseInfiniteQueryOptions<
      PaginatedResponse<TData>,
      Error,
      InfiniteData<PaginatedResponse<TData>>,
      PaginatedResponse<TData>,
      QueryKey,
      number
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  >;
}

export function useInfiniteQueryList<TData, TParams>({
  queryKey,
  queryFn,
  params = {} as TParams,
  pageSize = PAGE_SIZE_DEFAULT,
  options = {}
}: UseInfiniteQueryListParams<TData, TParams>) {
  return useInfiniteQuery({
    queryKey: [...queryKey, params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      queryFn({
        ...params,
        page: pageParam as number,
        page_size: pageSize
      }),
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      return lastPage.count > allPages.length * pageSize ? nextPage : undefined;
    },
    ...options
  });
}
