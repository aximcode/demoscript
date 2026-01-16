# DemoScript: Improvement & Architecture Guide

**January 2026**

---

## Executive Summary

DemoScript is a well-architected framework for creating scripted, shareable product demonstrations. The YAML-based approach, comprehensive step types, and multiple distribution options (npm, static export, Netlify deploy) position it well for adoption.

This document outlines recommendations for improving the project across several dimensions: architecture refinements, desktop packaging via Tauri, testing strategy, and critically, managing feature scope to maintain focus on the core value proposition.

---

## Current Strengths

### Clear Problem/Solution Fit

DemoScript addresses a real pain point: API and product demos are tedious to create, difficult to share, and break when APIs change. The YAML-based approach is readable, version-controllable, and diffable.

### Comprehensive Feature Set

- Multiple step types (REST, Shell, Browser, GraphQL, Database) cover most demo scenarios
- Variable chaining and branching enable non-trivial demo flows
- OpenAPI integration auto-generates forms from API specs
- Live vs recorded modes provide flexibility for different use cases
- Static export solves the sharing problem elegantly

### Distribution Done Right

The project covers major installation vectors: npm/npx for developers, RPM/DEB for Linux sysadmins, and one-command Netlify deploy for sharing. This reduces friction for different user personas.

### Good Developer Experience

- JSON Schema validation with helpful error messages
- Live reload in watch mode
- Keyboard shortcuts for presentation flow
- Tunnel support (ngrok/Cloudflare) for quick sharing

---

## Feature Creep: A Critical Concern

The current feature set is extensive: video export, GIF export, Netlify deploy, tunnel support, authentication, dashboards, health checks, visual effects, OpenAPI integration, multiple database types, and more.

**The Risk:** Each feature adds maintenance burden, testing surface area, and cognitive load for users. The core value proposition is simple: *YAML → interactive demo*. Features that don't directly serve this risk diluting focus.

### Recommended Feature Tiers

| Tier | Features | Rationale |
|------|----------|-----------|
| **Core** | YAML parsing, step execution, variable chaining, REST/Shell/Slide steps, static export, live server | Essential for the primary use case. Must be rock-solid. |
| **Important** | OpenAPI integration, branching/choices, Browser steps, recording, JSON Schema validation | Significant productivity gains. Worth maintaining. |
| **Nice-to-Have** | Video/GIF export, tunnel support, visual effects (confetti, neon, orbs), Netlify deploy, authentication, health checks, GraphQL, Database steps | Consider whether each justifies ongoing maintenance cost. |

### Questions to Ask Before Adding Features

1. Does this serve the core use case (YAML → interactive demo)?
2. Can users achieve this with external tools instead?
3. What is the ongoing maintenance burden?
4. Does this increase the testing surface significantly?
5. Will this confuse new users or complicate documentation?

### Features to Consider Deprecating or Spinning Off

- **Video/GIF export:** Users could use screen recording tools (OBS, etc.) instead. High maintenance, requires Puppeteer/ffmpeg.
- **Visual effects (confetti, neon glow, orbs):** Fun but not essential. Could be an optional plugin.
- **Database steps:** Niche use case. Most demos focus on APIs, not direct DB access.
- **Health checks/Dashboard:** Useful but adds complexity. Could be documented as "bring your own" with examples.

---

## Desktop Packaging with Tauri

DemoScript is an excellent candidate for desktop packaging. The UI is already React-based, and a desktop app would provide better OS integration, offline capability, and a polished "DemoScript Studio" experience.

### Why Tauri Over Electron

| Aspect | Electron | Tauri |
|--------|----------|-------|
| **Binary Size** | ~150-200 MB (bundles Chromium) | ~5-15 MB (uses system WebView) |
| **Memory Usage** | Higher (full Chromium process) | Lower (lightweight WebView) |
| **Backend Language** | Node.js (familiar) | Rust (can shell out to Node) |
| **Security Model** | Full Node.js access from renderer | Explicit command allowlist |
| **C/C++ Integration** | Via native Node addons | Native via Rust FFI (excellent) |
| **Startup Time** | Slower | Faster |
| **Auto-Updates** | Electron-updater (works) | Built-in updater (simpler) |

**Recommendation:** Tauri is the better choice for DemoScript. The smaller binary size aligns with the tool's utility nature, and Rust's performance is beneficial for file operations and process management.

### Integration Architecture Options

#### Option A: Rust Shells Out to Node CLI (Recommended Starting Point)

```
┌─────────────────────────────────────┐
│         Tauri App (Rust)            │
│  ┌─────────────────────────────┐    │
│  │   React UI (packages/ui)    │    │
│  └─────────────────────────────┘    │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐    │
│  │  Tauri Commands (Rust)      │    │
│  │  - serve_demo()             │    │
│  │  - record_demo()            │    │
│  │  - build_demo()             │    │
│  └─────────────────────────────┘    │
│              │                      │
│              ▼ (spawns process)     │
│  ┌─────────────────────────────┐    │
│  │  Node.js Sidecar            │    │
│  │  (demoscript CLI bundled)   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

**Pros:**
- Minimal changes to existing codebase
- CLI remains the source of truth
- Quick path to working desktop app

**Cons:**
- Requires Node.js bundled as sidecar (~40-60 MB added)
- IPC overhead for CLI invocations

**Implementation:**
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn serve_demo(path: String, port: u16) -> Result<String, String> {
    let output = Command::new_sidecar("node")
        .args(["demoscript", "serve", &path, "-p", &port.to_string()])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok("Server started".to_string())
}
```

#### Option B: Port Core Logic to Rust (Future Consideration)

**Pros:**
- Single binary, no Node dependency
- Better performance
- Smaller total size

**Cons:**
- Significant rewrite effort
- Two codebases to maintain (or deprecate CLI)

**When to consider:** Only if Option A proves problematic (bundle size complaints, Node version conflicts) or if you want to eventually deprecate the CLI in favor of desktop-only.

### Desktop-Specific Features

A desktop app enables features not possible in browser or CLI:

| Feature | Description | Priority |
|---------|-------------|----------|
| **File associations** | Double-click `.yaml` or `.demo` files to open | High |
| **System tray** | Background server with status indicator, quick actions | High |
| **Native file dialogs** | Open/save demos with OS-native UI | High |
| **Recent files** | Quick access to recently opened demos | Medium |
| **Offline mode** | Full functionality without network | Medium |
| **Auto-updates** | Tauri's built-in updater support | Medium |
| **Global shortcuts** | Start/stop server from anywhere | Low |
| **Menu bar integration** | macOS menu bar app option | Low |

### Implementation Roadmap

1. **Initialize Tauri** (1-2 hours)
   ```bash
   cd packages
   npm create tauri-app@latest desktop -- --template react-ts
   ```

2. **Configure frontend** (1 hour)
   - Point Tauri's `devPath` to `../ui` dev server
   - Point `distDir` to `../ui/dist` for builds

3. **Add Node.js sidecar** (2-3 hours)
   - Download and bundle Node.js binary for each platform
   - Configure in `tauri.conf.json`:
   ```json
   {
     "tauri": {
       "bundle": {
         "externalBin": ["binaries/node"]
       }
     }
   }
   ```

4. **Implement Tauri commands** (4-6 hours)
   - `serve_demo(path, port)` - Start live server
   - `stop_server()` - Stop running server
   - `record_demo(path, output)` - Record responses
   - `build_demo(path, output)` - Static export
   - `open_file_dialog()` - Native file picker
   - `get_recent_files()` - Recent file list

5. **Add system tray** (2-3 hours)
   - Server status indicator (green/red)
   - Quick actions: Open demo, Stop server, Quit

6. **Cross-platform builds** (2-3 hours)
   - GitHub Actions workflow for Windows, macOS, Linux
   - Code signing setup (especially for macOS)

**Estimated total: 2-3 days for basic desktop app**

---

## Testing Strategy

The README acknowledges a testing gap, particularly for CLI commands. Given the number of moving parts, a structured testing approach is essential.

### Recommended Test Layers

| Layer | What to Test | Tools | Priority |
|-------|--------------|-------|----------|
| **Unit** | YAML parsing, variable substitution, step validation | Jest/Vitest | High |
| **Integration** | CLI commands (serve, record, build), API step execution | Jest + child_process | High |
| **E2E** | Full demo playback in browser, keyboard navigation | Playwright | Medium |
| **Snapshot** | Static build output, generated HTML structure | Jest snapshots | Medium |

### Specific Test Cases to Add

#### CLI Integration Tests (High Priority)

```typescript
// packages/cli/tests/commands.test.ts
describe('demoscript serve', () => {
  it('starts server on specified port', async () => {
    const proc = spawn('demoscript', ['serve', 'fixtures/hello-world', '-p', '4000']);
    await waitForServer('http://localhost:4000');
    expect(await fetch('http://localhost:4000')).toHaveStatus(200);
    proc.kill();
  });

  it('fails gracefully on invalid YAML', async () => {
    const result = await exec('demoscript serve fixtures/invalid-yaml');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('YAML validation error');
  });
});

describe('demoscript build', () => {
  it('generates valid static site', async () => {
    await exec('demoscript build fixtures/hello-world -o tmp/dist');
    expect(fs.existsSync('tmp/dist/index.html')).toBe(true);
    // Validate HTML structure
  });

  it('embeds recordings in static build', async () => {
    await exec('demoscript record fixtures/hello-world -o tmp/recordings.json');
    await exec('demoscript build fixtures/hello-world -o tmp/dist');
    const html = fs.readFileSync('tmp/dist/index.html', 'utf-8');
    expect(html).toContain('recordings');
  });
});
```

#### YAML Parser Unit Tests (High Priority)

```typescript
describe('YAML Parser', () => {
  it('parses all step types correctly', () => {
    const demo = parseDemo('fixtures/all-step-types.yaml');
    expect(demo.steps).toHaveLength(9); // slide, rest, shell, browser, code, wait, assert, graphql, db
  });

  it('resolves variable references', () => {
    const context = { userId: '123', token: 'abc' };
    const result = resolveVariables('Bearer $token for user $userId', context);
    expect(result).toBe('Bearer abc for user 123');
  });

  it('validates against JSON Schema', () => {
    expect(() => parseDemo('fixtures/invalid-schema.yaml')).toThrow(/validation/i);
  });
});
```

#### UI E2E Tests (Medium Priority)

```typescript
// packages/ui/tests/e2e/demo-playback.spec.ts
test('keyboard navigation works', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.keyboard.press('ArrowRight'); // Next step
  await expect(page.locator('[data-step="1"]')).toBeVisible();
  await page.keyboard.press('ArrowLeft'); // Previous step
  await expect(page.locator('[data-step="0"]')).toBeVisible();
});

test('variable chaining works across steps', async ({ page }) => {
  await page.goto('http://localhost:3000/variable-demo');
  await page.click('[data-action="execute"]'); // Execute REST step
  await page.keyboard.press('ArrowRight');
  // Verify variable was substituted in next step
  await expect(page.locator('.step-content')).toContainText('User: John');
});
```

### CI Pipeline Recommendations

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test --workspace=packages/cli
      - run: npm test --workspace=packages/ui

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

---

## Architecture Recommendations

### Monorepo Structure

The current `packages/cli` and `packages/ui` structure is good. Ensure you're using npm workspaces (or pnpm/yarn) for dependency management:

```json
// package.json (root)
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces"
  }
}
```

If adding Tauri desktop:
```
packages/
├── cli/          # CLI tool
├── ui/           # React web interface
├── desktop/      # Tauri desktop app (new)
└── core/         # Shared logic (consider extracting)
```

### Consider Extracting Shared Core

If pursuing Tauri (especially Option B), extract shared logic:

```
packages/core/
├── parser.ts      # YAML parsing, validation
├── variables.ts   # Variable substitution
├── steps/         # Step type definitions
└── schema.ts      # JSON Schema utilities
```

This allows both CLI and desktop to share the same parsing/validation logic without duplication.

### API Surface for UI

Currently, does `demoscript serve` bundle the UI and serve it, or are they separate? If bundled:

- **Good:** Single command starts everything
- **Risk:** UI changes require CLI rebuild

Consider a clear contract between CLI and UI:
- CLI provides REST API or WebSocket for step execution
- UI is a standalone build that connects to CLI backend
- Static export embeds recordings directly, no backend needed

---

## Browser Step Improvements

Recording screenshots via Puppeteer during `demoscript record` is clever. Consider these enhancements:

### Live Screenshot Mode

Add a `--screenshots` flag to `serve` mode for demos hitting real staging environments:

```bash
demoscript serve ./my-demo --screenshots
```

This would capture screenshots on-demand during live presentation, useful when:
- You want to show real data from staging
- The target app changes frequently
- Pre-recorded screenshots become stale

### Screenshot Caching

For recorded mode, cache screenshots with content hashes:

```
assets/screenshots/
├── step-3-abc123.png  # Hash of URL + timestamp
└── manifest.json      # Maps step IDs to screenshots
```

This avoids re-capturing unchanged pages during `record`.

---

## Documentation Improvements

The README is comprehensive but long. Consider:

### Quickstart Separation

Move the quick examples to a separate `docs/quickstart.md`, keep README focused on:
- What is DemoScript (2-3 sentences)
- Installation (npm, one line)
- Basic usage (serve, build)
- Links to full docs

### Interactive Examples

Host the example demos on a public URL (GitHub Pages or Netlify) so users can see DemoScript in action before installing:

```
https://mgosha.github.io/demoscript/examples/hello-world/
https://mgosha.github.io/demoscript/examples/feature-showcase/
```

### Video Walkthrough

A 3-5 minute video showing:
1. Writing a simple YAML demo
2. Running `demoscript serve`
3. Executing steps live
4. Building and deploying static version

This is more effective than extensive written docs for onboarding.

---

## Summary of Recommendations

### Immediate (This Week)

1. **Add CLI integration tests** - Basic smoke tests for serve/build/record
2. **Set up GitHub Actions CI** - Run tests on every PR
3. **Review feature scope** - Identify candidates for deprecation

### Short-Term (This Month)

4. **Extract shared core** - If not already using workspaces, set them up
5. **Tauri prototype** - Basic desktop app with file open/serve
6. **Trim documentation** - Separate quickstart from reference

### Medium-Term (This Quarter)

7. **Complete Tauri desktop** - System tray, file associations, auto-update
8. **E2E test suite** - Playwright tests for UI flows
9. **Host interactive examples** - Public demo gallery

### Long-Term Considerations

10. **Rust port evaluation** - If desktop gains traction, consider native core
11. **Plugin architecture** - Allow effects, step types as optional plugins
12. **SaaS option** - Hosted version for teams without CLI installation

---

## Appendix: Tauri Resources

- **Tauri Documentation:** https://tauri.app/v1/guides/
- **Tauri + React:** https://tauri.app/v1/guides/getting-started/setup/vite
- **Sidecar (bundling binaries):** https://tauri.app/v1/guides/building/sidecar
- **System Tray:** https://tauri.app/v1/guides/features/system-tray
- **Auto-Updater:** https://tauri.app/v1/guides/distribution/updater
- **Cross-Platform Builds:** https://tauri.app/v1/guides/building/cross-platform

---

*Document generated January 2026. Review and update as project evolves.*
