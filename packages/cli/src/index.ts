#!/usr/bin/env node

import { Command } from 'commander';
import { serve } from './commands/serve.js';
import { push } from './commands/push.js';
import { login, logout, whoami } from './commands/login.js';

// Version injected at build time by esbuild
declare const __PKG_VERSION__: string;

const program = new Command();

program
  .name('demoscript')
  .description('Framework for creating scripted, shareable product demonstrations')
  .version(__PKG_VERSION__);

program
  .command('serve <demo>')
  .description('Start dev server for live demo presentation')
  .option('-p, --port <port>', 'Port to run server on', '3000')
  .option('-H, --host [host]', 'Host to bind to (use --host for 0.0.0.0)')
  .option('--no-open', 'Do not open browser automatically')
  .option('-w, --watch', 'Watch demo files for changes and reload')
  .action(async (demo: string, options: { port: string; host?: string | boolean; open: boolean; watch?: boolean }) => {
    const host = options.host === true ? '0.0.0.0' : (typeof options.host === 'string' ? options.host : undefined);
    await serve(demo, { port: parseInt(options.port, 10), host, open: options.open, watch: options.watch });
  });

// Cloud commands
program
  .command('login')
  .description('Login to DemoScript Cloud')
  .action(async () => {
    await login();
  });

program
  .command('logout')
  .description('Logout from DemoScript Cloud')
  .action(async () => {
    await logout();
  });

program
  .command('whoami')
  .description('Show current logged in user')
  .action(async () => {
    await whoami();
  });

program
  .command('push <demo>')
  .description('Push demo to DemoScript Cloud')
  .option('-s, --slug <slug>', 'Demo slug (default: directory name)')
  .option('-t, --title <title>', 'Demo title (default: from YAML)')
  .option('--public', 'Make demo public (default)')
  .option('--private', 'Make demo private')
  .action(async (demo: string, options: { slug?: string; title?: string; public?: boolean; private?: boolean }) => {
    await push(demo, options);
  });

program.parse();
