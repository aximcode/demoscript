/**
 * DemoScript Builder CLI command
 * Starts a local server for the visual demo builder
 */

import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { networkInterfaces, homedir } from 'os';
import express from 'express';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { handleSandboxRequest, sandboxOpenApiSpec } from '@demoscript/shared/sandbox';

// Config utilities (inline to avoid circular dependency)
interface CliConfig {
  token?: string;
  username?: string;
  email?: string;
  apiUrl?: string;
}

const CONFIG_FILE = join(homedir(), '.demoscript', 'config.json');
const DEFAULT_API_URL = 'https://demoscript.app';

function loadCliConfig(): CliConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content) as CliConfig;
    }
  } catch {
    // Ignore errors
  }
  return {};
}

function getApiUrl(): string {
  return loadCliConfig().apiUrl || DEFAULT_API_URL;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuilderOptions {
  port: number;
  host?: string;
  open: boolean;
  demoPath?: string;
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
 * Create a GraphQL proxy handler
 */
function createGraphQLProxy(): express.RequestHandler {
  return async (req, res) => {
    try {
      const { endpoint, query, variables, headers } = req.body;

      if (!endpoint || !query) {
        res.status(400).json({ error: 'Missing endpoint or query' });
        return;
      }

      // Validate endpoint is a valid URL
      try {
        const parsedUrl = new URL(endpoint);
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

  console.log(chalk.blue('Starting DemoScript Visual Editor...'));

  const app = express();
  app.use(express.json());

  // REST proxy for executing requests
  app.post('/api/execute', createRestProxy());

  // GraphQL proxy for executing GraphQL requests
  app.post('/api/execute-graphql', createGraphQLProxy());

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

  // Demo file handling for CLI mode
  let loadedDemoPath: string | null = null;
  let loadedDemoConfig: unknown = null;

  // Load demo if path provided
  if (options.demoPath) {
    const resolvedPath = resolve(process.cwd(), options.demoPath);
    const demoFile = resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')
      ? resolvedPath
      : resolve(resolvedPath, 'demo.yaml');

    if (existsSync(demoFile)) {
      try {
        const content = readFileSync(demoFile, 'utf-8');
        loadedDemoConfig = yaml.load(content);
        loadedDemoPath = demoFile;
        console.log(chalk.gray(`  Demo: ${demoFile}`));
      } catch (err) {
        console.error(chalk.yellow(`  Warning: Failed to load demo: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    } else {
      console.error(chalk.yellow(`  Warning: Demo file not found: ${demoFile}`));
    }
  }

  // GET /api/editor/demo - Get initially loaded demo
  app.get('/api/editor/demo', (_req, res) => {
    res.json({
      path: loadedDemoPath,
      config: loadedDemoConfig,
    });
  });

  // GET /api/files - List directory contents
  app.get('/api/files', (req, res) => {
    const dir = (req.query.dir as string) || process.cwd();

    try {
      const resolvedDir = resolve(dir);
      const entries = readdirSync(resolvedDir, { withFileTypes: true });

      const items = entries
        .filter(e => !e.name.startsWith('.')) // Hide hidden files
        .map(e => ({
          name: e.name,
          path: join(resolvedDir, e.name),
          isDirectory: e.isDirectory(),
          isYaml: e.isFile() && (e.name.endsWith('.yaml') || e.name.endsWith('.yml')),
        }))
        .sort((a, b) => {
          // Directories first, then files
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

      res.json({
        path: resolvedDir,
        parent: dirname(resolvedDir),
        items,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list directory' });
    }
  });

  // GET /api/file - Read file contents
  app.get('/api/file', (req, res) => {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: 'path query parameter is required' });
    }

    try {
      const resolvedPath = resolve(filePath);

      if (!existsSync(resolvedPath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const content = readFileSync(resolvedPath, 'utf-8');
      res.json({ path: resolvedPath, content });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read file' });
    }
  });

  // POST /api/file - Save file contents
  app.post('/api/file', (req, res) => {
    const { path: filePath, content } = req.body;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'path and content are required' });
    }

    try {
      const resolvedPath = resolve(filePath);
      const dir = dirname(resolvedPath);

      // Create directory if it doesn't exist
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(resolvedPath, content, 'utf-8');

      // Update tracked demo path
      loadedDemoPath = resolvedPath;

      res.json({ success: true, path: resolvedPath });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save file' });
    }
  });

  // Cloud API endpoints (private repo only)

  // GET /api/auth/status - Check if user is logged in
  app.get('/api/auth/status', (_req, res) => {
    const config = loadCliConfig();
    res.json({
      isLoggedIn: !!config.token,
      username: config.username,
      email: config.email,
    });
  });

  // POST /api/push - Push demo to cloud
  app.post('/api/push', async (req, res) => {
    const config = loadCliConfig();
    const apiUrl = getApiUrl();

    if (!config.token) {
      return res.status(401).json({ error: 'Not logged in. Run `demoscript login` first.' });
    }

    const { slug, title, yaml_content, is_public } = req.body;

    if (!slug || !yaml_content) {
      return res.status(400).json({ error: 'slug and yaml_content are required' });
    }

    try {
      // Check if demo exists
      const listResponse = await fetch(`${apiUrl}/api/demos`, {
        headers: { 'Authorization': `Bearer ${config.token}` },
      });

      if (!listResponse.ok) {
        if (listResponse.status === 401) {
          return res.status(401).json({ error: 'Authentication expired. Run `demoscript login` again.' });
        }
        throw new Error('Failed to fetch demos');
      }

      const demosData = await listResponse.json() as { demos: Array<{ id: string; slug: string }> };
      const existingDemo = demosData.demos.find((d) => d.slug === slug);

      let response: Response;

      if (existingDemo) {
        // Update existing
        response = await fetch(`${apiUrl}/api/demos/${existingDemo.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug, title, yaml_content, is_public }),
        });
      } else {
        // Create new
        response = await fetch(`${apiUrl}/api/demos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ slug, title, yaml_content, is_public }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Push failed');
      }

      res.json({
        success: true,
        url: `${apiUrl}/u/${config.username}/${slug}`,
        updated: !!existingDemo,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Push failed' });
    }
  });

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

    // Serve /editor
    app.get('/editor', async (_req, res) => {
      const indexPath = resolve(uiSourcePath, 'index.html');
      let html = readFileSync(indexPath, 'utf-8');
      html = await vite.transformIndexHtml('/editor', html);
      html = html.replace('</head>', '<script>window.__DEMOSCRIPT_EDITOR__ = true; window.__DEMOSCRIPT_CLI_MODE__ = true; window.__DEMOSCRIPT_CLOUD_ENABLED__ = true;</script></head>');
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

    // Serve /editor
    const editorHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_EDITOR__ = true; window.__DEMOSCRIPT_CLI_MODE__ = true; window.__DEMOSCRIPT_CLOUD_ENABLED__ = true;</script></head>`
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
    console.log(chalk.green.bold('  DemoScript Visual Editor is running!'));
    console.log();
    console.log(`  ${chalk.cyan('Editor:')} http://localhost:${port}/editor`);
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
