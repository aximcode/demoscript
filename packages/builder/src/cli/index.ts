/**
 * DemoScript Builder CLI command
 * Starts a local server for the visual demo builder
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';
import express from 'express';
import chalk from 'chalk';
import { handleSandboxRequest, sandboxOpenApiSpec } from '@demoscript/shared/sandbox';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuilderOptions {
  port: number;
  host?: string;
  open: boolean;
}

function getNetworkUrl(port: number): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:${port}`;
      }
    }
  }
  return null;
}

/**
 * Create a simple REST proxy handler
 */
function createRestProxy(): express.RequestHandler {
  return async (req, res) => {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      // Handle local sandbox paths directly without external fetch
      if (url.startsWith('/sandbox')) {
        const sandboxPath = url.replace('/sandbox', '') || '/';
        const result = await handleSandboxRequest({
          method: method || 'GET',
          path: sandboxPath,
          params: {},
          query: {},
          body: body,
        });
        return res.json({
          status: result.status,
          headers: { 'content-type': 'application/json' },
          data: result.body,
        });
      }

      const fetchHeaders: Record<string, string> = {};
      if (headers) {
        Object.assign(fetchHeaders, headers);
      }
      if (body && !fetchHeaders['Content-Type']) {
        fetchHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method: method || 'GET',
        headers: fetchHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const contentType = response.headers.get('content-type');
      let data;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      res.json({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Request failed',
      });
    }
  };
}

export async function builder(options: BuilderOptions): Promise<void> {
  const { port, host, open } = options;

  console.log(chalk.blue('Starting DemoScript Builder...'));

  const app = express();
  app.use(express.json());

  // REST proxy for executing requests
  app.post('/api/execute', createRestProxy());

  // OpenAPI spec proxy (to bypass CORS)
  app.get('/api/openapi', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: 'url query parameter is required' });
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
      }
      const spec = await response.json();
      res.json(spec);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch OpenAPI spec' });
    }
  });

  // Sandbox API - self-contained mock API for demos
  app.get('/sandbox/openapi.json', (_req, res) => {
    res.json(sandboxOpenApiSpec);
  });

  // Sandbox API handler - handles both /sandbox and /sandbox/* routes
  async function sandboxHandler(req: express.Request, res: express.Response): Promise<void> {
    const sandboxPath = req.path.replace('/sandbox', '') || '/';
    const result = await handleSandboxRequest({
      method: req.method,
      path: sandboxPath,
      params: req.params,
      query: req.query as Record<string, string | string[]>,
      body: req.body,
    });
    res.status(result.status).json(result.body);
  }

  app.all('/sandbox', sandboxHandler);
  app.all('/sandbox/*', sandboxHandler);

  // Determine UI serving mode
  // When bundled with esbuild, __dirname is packages/cli/dist
  // When running from source, __dirname is packages/builder/src/cli or packages/builder/dist/cli
  const uiSourcePaths = [
    resolve(__dirname, '..', 'ui'),                    // packages/cli/dist -> packages/ui (bundled)
    resolve(__dirname, '../../../..', 'ui'),           // packages/builder/dist/cli -> packages/ui
    resolve(__dirname, '../../..', 'ui'),              // packages/builder/src/cli -> packages/ui
  ];
  const uiDistPaths = [
    resolve(__dirname, 'ui-dist'),                     // packages/cli/dist/ui-dist (bundled)
    resolve(__dirname, '../../../cli/dist', 'ui-dist'), // packages/builder/dist/cli -> cli bundled UI
    resolve(__dirname, '../..', 'ui-dist'),             // If builder has its own ui-dist
  ];

  const uiSourcePath = uiSourcePaths.find(p => existsSync(resolve(p, 'vite.config.ts'))) || uiSourcePaths[0];
  const uiDistPath = uiDistPaths.find(p => existsSync(resolve(p, 'index.html'))) || uiDistPaths[0];
  const useViteDevServer = existsSync(resolve(uiSourcePath, 'vite.config.ts'));

  if (useViteDevServer) {
    // Development mode: use Vite with HMR
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: uiSourcePath,
      configFile: resolve(uiSourcePath, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: {
          port: port + 1,
          host: host || 'localhost',
        },
      },
      appType: 'spa',
    });

    // Serve /builder with injected flag (before vite middlewares)
    app.get('/builder', async (_req, res) => {
      const indexPath = resolve(uiSourcePath, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');
      html = await vite.transformIndexHtml('/builder', html);
      html = html.replace('</head>', '<script>window.__DEMOSCRIPT_BUILDER__ = true;</script></head>');
      res.type('html').send(html);
    });

    // Serve /builder-embed for iframe embedding (cloud dashboard)
    app.get('/builder-embed', async (_req, res) => {
      const indexPath = resolve(uiSourcePath, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');
      html = await vite.transformIndexHtml('/builder-embed', html);
      html = html.replace('</head>', '<script>window.__DEMOSCRIPT_BUILDER__ = true; window.__DEMOSCRIPT_BUILDER_EMBEDDED__ = true;</script></head>');
      res.type('html').send(html);
    });

    // Serve /editor (new unified editor)
    app.get('/editor', async (_req, res) => {
      const indexPath = resolve(uiSourcePath, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');
      html = await vite.transformIndexHtml('/editor', html);
      html = html.replace('</head>', '<script>window.__DEMOSCRIPT_EDITOR__ = true;</script></head>');
      res.type('html').send(html);
    });

    // Serve /editor-embed for iframe embedding (cloud dashboard)
    app.get('/editor-embed', async (_req, res) => {
      const indexPath = resolve(uiSourcePath, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');
      html = await vite.transformIndexHtml('/editor-embed', html);
      html = html.replace('</head>', '<script>window.__DEMOSCRIPT_EDITOR__ = true; window.__DEMOSCRIPT_EDITOR_EMBEDDED__ = true;</script></head>');
      res.type('html').send(html);
    });

    // Redirect root to editor (new default)
    app.get('/', (_req, res) => {
      res.redirect('/editor');
    });

    app.use(vite.middlewares);
  } else if (existsSync(uiDistPath)) {
    // Published package mode: serve pre-built UI
    const indexHtml = readFileSync(join(uiDistPath, 'index.html'), 'utf-8');
    const injectedHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_BUILDER__ = true;</script></head>`
    );

    // Serve /builder path
    app.get('/builder', (_req, res) => {
      res.type('html').send(injectedHtml);
    });

    // Serve /builder-embed for iframe embedding (cloud dashboard)
    const embeddedHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_BUILDER__ = true; window.__DEMOSCRIPT_BUILDER_EMBEDDED__ = true;</script></head>`
    );
    app.get('/builder-embed', (_req, res) => {
      res.type('html').send(embeddedHtml);
    });

    // Serve /editor (new unified editor)
    const editorHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_EDITOR__ = true;</script></head>`
    );
    app.get('/editor', (_req, res) => {
      res.type('html').send(editorHtml);
    });

    // Serve /editor-embed for iframe embedding
    const editorEmbeddedHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_EDITOR__ = true; window.__DEMOSCRIPT_EDITOR_EMBEDDED__ = true;</script></head>`
    );
    app.get('/editor-embed', (_req, res) => {
      res.type('html').send(editorEmbeddedHtml);
    });

    // Redirect root to editor (new default)
    app.get('/', (_req, res) => {
      res.redirect('/editor');
    });

    app.use(express.static(uiDistPath));
  } else {
    console.error(chalk.red('Error: UI files not found. Please rebuild the package.'));
    process.exit(1);
  }

  // Start server
  const listenHost = host || 'localhost';
  const server = app.listen(port, listenHost, async () => {
    console.log();
    console.log(chalk.green.bold('  DemoScript Builder is running!'));
    console.log();
    console.log(`  ${chalk.cyan('Editor:')}  http://localhost:${port}/editor ${chalk.gray('(new)')}`);
    console.log(`  ${chalk.cyan('Builder:')} http://localhost:${port}/builder ${chalk.gray('(legacy)')}`);
    if (host === '0.0.0.0') {
      const networkUrl = getNetworkUrl(port);
      if (networkUrl) {
        console.log(`  ${chalk.cyan('Network:')} ${networkUrl}/editor`);
      }
    }
    console.log();
    console.log(chalk.gray("  Press 'q' to quit"));
    console.log();

    if (open) {
      import('open').then((mod) => mod.default(`http://localhost:${port}/editor`)).catch(() => {
        // Ignore if open fails
      });
    }
  });

  // Handle graceful shutdown
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.on('data', (data) => {
    const key = data.toString();
    if (key === 'q' || key === '\u0003') {
      console.log(chalk.gray('\nShutting down...'));
      server.close();
      process.exit(0);
    }
  });
}
