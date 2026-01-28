import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';
import { existsSync, readFileSync } from 'fs';
import express from 'express';
import type { ViteDevServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import chokidar from 'chokidar';
import { loadDemo } from '../lib/loader.js';
import { createRestProxy } from '../server/rest-proxy.js';
import { createShellExecutor } from '../server/shell-executor.js';
import { handleSandboxRequest, sandboxOpenApiSpec } from '@demoscript/shared/sandbox';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the host's LAN IP address (first non-loopback IPv4)
 */
function getHostIp(): string | null {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function getNetworkUrl(port: number): string | null {
  const hostIp = getHostIp();
  return hostIp ? `http://${hostIp}:${port}` : null;
}

/**
 * Replace localhost/127.0.0.1 with the actual host IP in URLs
 */
function replaceLocalhostWithIp(url: string, hostIp: string): string {
  return url
    .replace(/localhost/gi, hostIp)
    .replace(/127\.0\.0\.1/g, hostIp);
}

/**
 * Substitute ${host_ip} variable and optionally replace localhost in config
 */
function processConfigForNetwork(config: Record<string, unknown>, hostIp: string | null, autoReplace: boolean): Record<string, unknown> {
  if (!hostIp) return config;

  const processValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      // Always substitute ${host_ip} variable
      let result = value.replace(/\$\{host_ip\}/gi, hostIp);
      // If autoReplace is enabled, also replace localhost/127.0.0.1
      if (autoReplace) {
        result = replaceLocalhostWithIp(result, hostIp);
      }
      return result;
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (value && typeof value === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        processed[k] = processValue(v);
      }
      return processed;
    }
    return value;
  };

  return processValue(config) as Record<string, unknown>;
}

interface ServeOptions {
  port: number;
  host?: string;
  open: boolean;
  watch?: boolean;
}

export async function serve(demoPath: string, options: ServeOptions): Promise<void> {
  const { port, host, open, watch } = options;

  // Resolve demo path
  const resolvedPath = resolve(process.cwd(), demoPath);
  const demoDir = resolvedPath.endsWith('.yaml') ? dirname(resolvedPath) : resolvedPath;
  const demoFile = resolvedPath.endsWith('.yaml') ? resolvedPath : resolve(resolvedPath, 'demo.yaml');

  console.log(chalk.blue('Starting DemoScript server...'));
  console.log(chalk.gray(`  Demo: ${demoFile}`));

  // Load and validate demo config
  let { config, recordings, openapiSpec } = await loadDemo(demoFile);

  console.log(chalk.green(`  Loaded: ${config.title}`));
  console.log(chalk.gray(`  Steps: ${config.steps.length}`));

  // Get host IP for network substitution
  // When --host is used (host === '0.0.0.0'), auto-replace localhost with LAN IP
  const hostIp = getHostIp();
  const autoReplaceLocalhost = host === '0.0.0.0';

  if (hostIp && autoReplaceLocalhost) {
    console.log(chalk.gray(`  Host IP: ${hostIp} (auto-replacing localhost)`));
  }

  // Create Express app
  const app = express();
  app.use(express.json());

  // API endpoints for demo data
  // Process config to substitute ${host_ip} and optionally replace localhost
  app.get('/api/demo', (_req, res) => {
    const processedConfig = processConfigForNetwork(config as unknown as Record<string, unknown>, hostIp, autoReplaceLocalhost);
    res.json({ config: processedConfig, recordings, openapiSpec });
  });

  // Track WebSocket clients for live reload
  const wsClients = new Set<WebSocket>();

  // REST proxy for live execution
  app.post('/api/execute', createRestProxy());

  // Shell executor for live execution
  app.post('/api/execute-shell', createShellExecutor());

  // Sandbox API - OpenAPI spec
  app.get('/sandbox/openapi.json', (_req, res) => {
    res.json(sandboxOpenApiSpec);
  });

  // Sandbox API handler - handles both /sandbox and /sandbox/* routes
  async function sandboxHandler(req: express.Request, res: express.Response): Promise<void> {
    try {
      const sandboxPath = req.path.replace('/sandbox', '') || '/';
      const response = await handleSandboxRequest({
        method: req.method,
        path: sandboxPath,
        body: req.body,
        headers: req.headers as Record<string, string>,
      });
      res.status(response.status).json(response.body);
    } catch (err) {
      console.error('Sandbox error:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Sandbox error' });
    }
  }
  app.all('/sandbox', sandboxHandler);
  app.all('/sandbox/*', sandboxHandler);

  // Browser opener for browser steps
  app.post('/api/open-browser', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }
      const openModule = await import('open');
      await openModule.default(url);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to open browser' });
    }
  });

  // Determine UI serving mode:
  // 1. Development (monorepo): Use Vite dev server with HMR
  // 2. Published package: Serve pre-built UI dist statically

  // Try multiple paths for different environments
  const uiSourcePaths = [
    resolve(__dirname, '../../..', 'ui'),        // Development (from dist/commands/)
    resolve(__dirname, '../../../..', 'ui'),     // Development (from bundled dist/)
  ];
  const uiDistPaths = [
    resolve(__dirname, '..', 'ui-dist'),         // Development (from dist/commands/)
    resolve(__dirname, 'ui-dist'),               // Bundled/installed (from bundle.cjs location)
  ];

  const uiSourcePath = uiSourcePaths.find(p => existsSync(resolve(p, 'vite.config.ts'))) || uiSourcePaths[0];
  const uiDistPath = uiDistPaths.find(p => existsSync(resolve(p, 'index.html'))) || uiDistPaths[0];
  const useViteDevServer = existsSync(resolve(uiSourcePath, 'vite.config.ts'));

  let vite: ViteDevServer | null = null;

  if (useViteDevServer) {
    // Development mode: use Vite with HMR (dynamically import vite)
    const { createServer: createViteServer } = await import('vite');
    const serverOptions: Record<string, unknown> = {
      middlewareMode: true,
      hmr: {
        port: port + 1,
        host: host || 'localhost',
      },
    };
    vite = await createViteServer({
      root: uiSourcePath,
      configFile: resolve(uiSourcePath, 'vite.config.ts'),
      server: serverOptions,
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (existsSync(uiDistPath)) {
    // Published package mode: serve pre-built UI
    // Inject demo config into index.html
    const indexHtml = readFileSync(join(uiDistPath, 'index.html'), 'utf-8');
    const injectedHtml = indexHtml.replace(
      '</head>',
      `<script>window.__DEMOSCRIPT_API__ = true;</script></head>`
    );
    app.get('/', (_req, res) => {
      res.type('html').send(injectedHtml);
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
    console.log(chalk.green.bold('  DemoScript is running!'));
    console.log();
    console.log(`  ${chalk.cyan('Local:')}   http://localhost:${port}`);
    if (host === '0.0.0.0') {
      const networkUrl = getNetworkUrl(port);
      if (networkUrl) {
        console.log(`  ${chalk.cyan('Network:')} ${networkUrl}`);
      }
    }

    console.log(`  ${chalk.cyan('Mode:')}    ${chalk.yellow('Live execution enabled')}`);
    if (watch) {
      console.log(`  ${chalk.cyan('Watch:')}   ${chalk.green('Enabled')}`);
    }
    console.log();
    console.log(chalk.gray("  Press 'q' to quit"));
    console.log();

    if (open) {
      import('open').then((mod) => mod.default(`http://localhost:${port}`)).catch(() => {
        // Ignore if open fails
      });
    }
  });

  // Set up WebSocket server for live reload
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    wsClients.add(ws);
    ws.on('close', () => {
      wsClients.delete(ws);
    });
  });

  // Set up file watcher if --watch flag is enabled
  let watcher: ReturnType<typeof chokidar.watch> | null = null;

  if (watch) {
    const recordingsFile = join(demoDir, 'recordings.json');
    const filesToWatch = [demoFile];

    if (existsSync(recordingsFile)) {
      filesToWatch.push(recordingsFile);
    }

    watcher = chokidar.watch(filesToWatch, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on('change', async (changedPath: string) => {
      console.log(chalk.yellow(`  File changed: ${changedPath}`));

      try {
        const reloaded = await loadDemo(demoFile);
        config = reloaded.config;
        recordings = reloaded.recordings;
        openapiSpec = reloaded.openapiSpec;

        console.log(chalk.green(`  Reloaded: ${config.title}`));

        // Notify all connected clients (with network substitution applied)
        const processedConfig = processConfigForNetwork(config as unknown as Record<string, unknown>, hostIp, autoReplaceLocalhost);
        const message = JSON.stringify({ type: 'reload', config: processedConfig, recordings, openapiSpec });
        for (const client of wsClients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        }
      } catch (err) {
        console.log(chalk.red(`  Reload failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
      }
    });
  }

  // Handle graceful shutdown
  process.stdin.setRawMode?.(true);
  process.stdin.resume();
  process.stdin.on('data', (data) => {
    const key = data.toString();
    if (key === 'q' || key === '\u0003') {
      console.log(chalk.gray('\nShutting down...'));
      watcher?.close();
      wss.close();
      server.close();
      vite?.close();
      process.exit(0);
    }
  });
}
