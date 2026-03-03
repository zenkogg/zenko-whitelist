/**
 * Server-side fetch wrapper that respects https_proxy env var in development.
 * Node.js's native fetch (undici) does not automatically use system proxy settings.
 * This file is server-only — never import it in client components.
 */

let dispatcher: unknown = undefined;
let initialized = false;

async function getDispatcher() {
  if (initialized) return dispatcher;
  initialized = true;

  const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
  if (proxyUrl) {
    try {
      const { ProxyAgent } = await import('undici');
      dispatcher = new ProxyAgent(proxyUrl);
    } catch {
      // undici unavailable, fall back to direct fetch
    }
  }
  return dispatcher;
}

export async function proxyFetch(url: string, init?: RequestInit): Promise<Response> {
  const d = await getDispatcher();
  if (d) {
    // Use undici fetch with the proxy dispatcher
    const { fetch: undiciFetch } = await import('undici');
    return undiciFetch(url, { ...init, dispatcher: d } as Parameters<typeof undiciFetch>[1]) as unknown as Response;
  }
  return fetch(url, init);
}
