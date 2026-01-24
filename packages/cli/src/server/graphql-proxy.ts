import type { RequestHandler } from 'express';

interface GraphQLProxyRequest {
  endpoint: string;
  query: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export function createGraphQLProxy(): RequestHandler {
  return async (req, res) => {
    try {
      const { endpoint, query, variables, headers } = req.body as GraphQLProxyRequest;

      if (!endpoint || !query) {
        res.status(400).json({ error: 'Missing endpoint or query' });
        return;
      }

      // Validate endpoint is a valid URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(endpoint);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          res.status(400).json({ error: 'Endpoint must be an HTTP or HTTPS URL' });
          return;
        }
      } catch {
        res.status(400).json({ error: `Invalid endpoint URL: ${endpoint}` });
        return;
      }
      const fetchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const responseBody = await response.json().catch(() => null) as {
        errors?: Array<{ message: string }>;
        [key: string]: unknown;
      } | null;

      if (!response.ok) {
        res.status(response.status).json({
          error: responseBody?.errors?.[0]?.message || `Request failed with status ${response.status}`,
          ...(responseBody || {}),
        });
        return;
      }

      res.json(responseBody);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'GraphQL request failed';
      console.error('[GraphQL Proxy Error]', errorMessage);
      try {
        res.status(500).json({ error: errorMessage });
      } catch {
        // Response already sent or connection closed
      }
    }
  };
}
