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
 * Server-side fetch that uses curl as transport.
 * Needed because Node.js's fetch (undici) and https module don't work
 * through certain VPN proxies that do TLS interception.
 * curl respects system proxy settings natively.
 *
 * Only used for external API calls (Twitter OAuth). Not needed on Vercel
 * where native fetch works fine, but harmless there too.
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
  // Write headers to a temp file to avoid HTTP/2 parsing issues with -i
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

    // Last line is the status code from -w
    const output = result.toString('binary');
    const lastNewline = output.lastIndexOf('\n');
    const statusStr = output.substring(lastNewline + 1).trim();
    const bodyStr = output.substring(0, lastNewline);
    const bodyBuffer = Buffer.from(bodyStr, 'binary');
    const status = parseInt(statusStr) || 0;

    // Parse response headers from temp file
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
