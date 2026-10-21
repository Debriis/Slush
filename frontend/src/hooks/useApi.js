import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
export function useApi(path, enabled = true) {
  return useQuery({ queryKey: [path], queryFn: ({ signal }) => api(path, { signal }), enabled });
}
export function usePages(path, enabled = true) {
  return useInfiniteQuery({
    queryKey: [path],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api(`${path}${path.includes('?') ? '&' : '?'}page=${pageParam}`, { signal }),
    getNextPageParam: (last) => last.nextPage ?? undefined,
    enabled,
  });
}
export function useAction(path, method = 'POST', invalidates = []) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(typeof path === 'function' ? path(body) : path, { method, body }),
    onSuccess: () => {
      for (const prefix of invalidates)
        void cache.invalidateQueries({
          predicate: (q) => String(q.queryKey[0]).startsWith(prefix),
        });
    },
  });
}
export function useRequest(prefixes = []) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'POST', body }) => api(path, { method, body }),
    onSuccess: () => {
      for (const prefix of prefixes)
        void cache.invalidateQueries({
          predicate: (q) => String(q.queryKey[0]).startsWith(prefix),
        });
    },
  });
}
