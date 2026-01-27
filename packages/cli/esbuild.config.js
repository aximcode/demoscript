import * as esbuild from 'esbuild';
import { writeFileSync, mkdirSync, readFileSync, copyFileSync, rmSync, existsSync } from 'fs';

// Clean dist folder (except ui-dist which is copied separately)
if (existsSync('dist')) {
  // Remove everything except ui-dist
  rmSync('dist/bundle.cjs', { force: true });
  rmSync('dist/index.js', { force: true });
  rmSync('dist/demo.schema.json', { force: true });
  rmSync('dist/commands', { recursive: true, force: true });
  rmSync('dist/lib', { recursive: true, force: true });
  rmSync('dist/server', { recursive: true, force: true });
  rmSync('dist/types.js', { force: true });
  rmSync('dist/types.js.map', { force: true });
  rmSync('dist/types.d.ts', { force: true });
  rmSync('dist/types.d.ts.map', { force: true });
  rmSync('dist/index.d.ts', { force: true });
  rmSync('dist/index.d.ts.map', { force: true });
  rmSync('dist/index.js.map', { force: true });
}

// Read version from package.json at build time
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Dependencies that must stay external:
// - Native binaries (ffmpeg-static)
// - Dev-only with complex paths (vite)
// Note: puppeteer-core can be bundled (no browser download)
const externalDeps = [
  'ffmpeg-static',
  'vite',
];

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/bundle.cjs',
  external: externalDeps,
  // Inject import.meta.url polyfill for CJS and version constant
  define: {
    'import.meta.url': 'importMetaUrl',
    '__PKG_VERSION__': JSON.stringify(pkg.version),
  },
  banner: {
    js: 'const importMetaUrl = require("url").pathToFileURL(__filename).href;',
  },
  sourcemap: false,
  minify: false,
  metafile: true,
}).then(result => {
  const outputs = result.metafile.outputs;
  for (const [file, info] of Object.entries(outputs)) {
    console.log(`${file}: ${(info.bytes / 1024).toFixed(1)} KB`);
  }

  // Create ESM entry point with shebang
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/index.js', `#!/usr/bin/env node
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('./bundle.cjs');
`);
  console.log('dist/index.js: ESM entry point created');

  // Copy schema file to dist for validation
  copyFileSync('../../demo.schema.json', 'dist/demo.schema.json');
  console.log('dist/demo.schema.json: Schema copied');
});
