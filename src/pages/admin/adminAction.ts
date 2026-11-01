import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-fetch';

/** POST/PATCH to an admin route, surface the server's error text, then refresh admin data. */
export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, method = 'POST', body }: { url: string; method?: string; body?: unknown }) => {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
    onError: (err: Error) => window.alert(err.message),
  });
}
