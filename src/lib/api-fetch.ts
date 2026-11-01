let tokenGetter: (() => Promise<string | null>) | null = null;

export function setSessionTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = tokenGetter ? await tokenGetter() : null;
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers, credentials: init.credentials ?? 'same-origin' });
}
