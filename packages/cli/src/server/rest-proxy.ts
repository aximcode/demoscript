import type { RequestHandler } from 'express';
import { methodSupportsBody } from '@demoscript/shared/variables';

interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export function createRestProxy(): RequestHandler {
  return async (req, res) => {
    const { method, url, headers, body } = req.body as ProxyRequest;

    if (!method || !url) {
      res.status(400).json({ error: 'Missing method or url' });
      return;
    }

    try {
      // Handle relative URLs by prepending the local server address
      let absoluteUrl = url;
      if (url.startsWith('/')) {
        const protocol = req.protocol;
        const host = req.get('host') || 'localhost';
        absoluteUrl = `${protocol}://${host}${url}`;
      }

      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      const fetchOptions: RequestInit = {
        method,
        headers: fetchHeaders,
      };

      if (body && methodSupportsBody(method)) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(absoluteUrl, fetchOptions);
      const responseBody = await response.json().catch(() => null);

      res.json({
        status: response.status,
        data: responseBody,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Proxy request failed',
      });
    }
  };
}
