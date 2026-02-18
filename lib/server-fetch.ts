import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'node:fs';

interface ServerFetchResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
  buffer: () => Promise<Buffer>;
  headers: Map<string, string>;
}

/**
 * Server-side fetch that uses curl as transport locally (for VPN compatibility)
 * and native fetch on Vercel where there's no VPN issue.
 */
export function serverFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  } = {}
): Promise<ServerFetchResponse> {
  // On Vercel, use native fetch — no VPN proxy issues there
  if (process.env.VERCEL) {
    return nativeFetch(url, options);
  }

  // Locally, use curl to bypass VPN TLS interception
  return curlFetch(url, options);
}

async function nativeFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }
): Promise<ServerFetchResponse> {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
    signal: AbortSignal.timeout(options.timeout || 30000),
  });

  const arrayBuffer = await response.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);

  const headersMap = new Map<string, string>();
  response.headers.forEach((value, key) => {
    headersMap.set(key.toLowerCase(), value);
  });

  return {
    ok: response.ok,
    status: response.status,
    text: async () => bodyBuffer.toString('utf-8'),
    json: async () => JSON.parse(bodyBuffer.toString('utf-8')),
    buffer: async () => bodyBuffer,
    headers: headersMap,
  };
}

function curlFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }
): Promise<ServerFetchResponse> {
  const headerFile = join(tmpdir(), `sf-headers-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const args: string[] = [
    '-sS',
    '--http1.1',
    '--max-time', String((options.timeout || 30000) / 1000),
    '-D', headerFile,
    '-w', '\n%{http_code}',
  ];

  if (options.method) {
    args.push('-X', options.method);
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      args.push('-H', `${key}: ${value}`);
    }
  }

  if (options.body) {
    args.push('--data-raw', options.body);
  }

  args.push(url);

  try {
    const result = execFileSync('curl', args, {
      timeout: options.timeout || 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const output = result.toString('binary');
    const lastNewline = output.lastIndexOf('\n');
    const statusStr = output.substring(lastNewline + 1).trim();
    const bodyStr = output.substring(0, lastNewline);
    const bodyBuffer = Buffer.from(bodyStr, 'binary');
    const status = parseInt(statusStr) || 0;

    const headersMap = new Map<string, string>();
    try {
      const headerContent = readFileSync(headerFile, 'utf-8');
      const headerLines = headerContent.split(/\r?\n/);
      for (const line of headerLines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          headersMap.set(line.substring(0, colonIdx).toLowerCase().trim(), line.substring(colonIdx + 1).trim());
        }
      }
    } catch {
      // Header file may not exist if curl failed early
    } finally {
      try { unlinkSync(headerFile); } catch {}
    }

    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: async () => bodyBuffer.toString('utf-8'),
      json: async () => JSON.parse(bodyBuffer.toString('utf-8')),
      buffer: async () => bodyBuffer,
      headers: headersMap,
    });
  } catch (error: any) {
    try { unlinkSync(headerFile); } catch {}
    return Promise.reject(new Error(`serverFetch failed: ${error.message}`));
  }
}
