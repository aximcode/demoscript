# DemoScript

[![Website](https://img.shields.io/badge/Website-demoscript.app-blue)](https://demoscript.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A framework for creating scripted, shareable product demonstrations. Write YAML files to define demo steps, and DemoScript provides a polished web UI for presenting and sharing them.

![DemoScript Demo](assets/demo.gif)

## Features

- **YAML-based demos** - Define demos with a simple, readable schema
- **Multiple step types** - Slides, REST, Shell, Browser, Code, Wait, Assert, GraphQL, Database
- **Variable chaining** - Save values from responses and use them in subsequent steps
- **Branching flows** - Create choose-your-own-adventure demos with choices and navigation
- **Step groups** - Organize steps into collapsible sections
- **Live & recorded modes** - Execute live or playback pre-recorded responses
- **Try It mode** - Modify inputs and re-execute steps in recorded playback
- **Static export** - Build standalone HTML files deployable anywhere
- **Gallery support** - Build multiple demos with an index page and metadata badges
- **Authentication** - Password-protect demos with SHA-256 hashing
- **Dashboard** - Overview screen with health checks and demo stats
- **Sidebar navigation** - Collapsible step list with completion status
- **Visual effects** - Confetti, sounds, neon glow, animated backgrounds
- **Tunnel support** - Share demos publicly via ngrok or Cloudflare tunnels
- **Schema validation** - JSON Schema validates YAML with helpful error messages
- **Live reload** - Watch mode auto-refreshes on file changes
- **Keyboard navigation** - Arrow keys, space, and shortcuts (press `?` for help)
- **Dark/Light mode** - Toggle theme support
- **Mobile responsive** - Works on tablets and phones

## Try It Online

See DemoScript in action without installing:

- [Hello World](https://demoscript.app/gallery/hello-world/) - Minimal starter demo
- [JSONPlaceholder](https://demoscript.app/gallery/jsonplaceholder/) - REST API tutorial
- [GitHub API](https://demoscript.app/gallery/github-api/) - Custom link handlers
- [Feature Showcase](https://demoscript.app/gallery/feature-showcase/) - All features demo

Browse all examples at [demoscript.app/gallery](https://demoscript.app/gallery/)

## Installation

### npm (recommended)

```bash
npm install -g demoscript-cli
```

Then run with:

```bash
demoscript serve ./my-demo
```

Or run directly with npx (no install required):

```bash
npx demoscript-cli serve ./my-demo
```

### Linux Packages

RPM and DEB packages are available in [Releases](https://github.com/aximcode/demoscript/releases).

```bash
# RHEL/Alma/Fedora
sudo rpm -ivh demoscript-1.0.0.noarch.rpm

# Ubuntu/Debian
sudo dpkg -i demoscript_1.0.0_all.deb
```

**Requires:** Node.js >= 18

## Quick Start

1. Create a demo file `demo.yaml`:

```yaml
title: "My API Demo"
description: "Demonstrate our API capabilities"

settings:
  base_url: "https://api.example.com"

steps:
  - slide: |
      # Welcome
      This demo shows our API in action.

  - rest: GET /users/1
    title: "Fetch User"
    save:
      userId: id
      userName: name

  - slide: |
      # Done!
      Fetched user: $userName (ID: $userId)
```

2. Run the demo:

```bash
demoscript serve ./demo.yaml
```

3. Or build a static site:

```bash
demoscript build ./demo.yaml -o dist
```

## CLI Commands

### `demoscript serve <demo>`

Start a development server with live execution.

```bash
demoscript serve examples/hello-world --port 3000 --host
```

Options:
- `-p, --port <port>` - Port number (default: 3000)
- `-H, --host [host]` - Bind to 0.0.0.0 for LAN access
- `-w, --watch` - Watch demo files and auto-reload on changes
- `--no-open` - Don't auto-open browser
- `--tunnel [provider]` - Create public tunnel (ngrok or cloudflare)
- `--tunnel-auth <user:pass>` - HTTP basic auth for tunnel (ngrok only)
- `--tunnel-name <name>` - Named Cloudflare tunnel
- `--tunnel-hostname <host>` - Custom hostname for named tunnel

**Tunnel examples:**

```bash
# Quick public URL with ngrok (default)
demoscript serve ./my-demo --tunnel

# Public URL with Cloudflare (no account required)
demoscript serve ./my-demo --tunnel cloudflare

# Password-protected tunnel
demoscript serve ./my-demo --tunnel --tunnel-auth "user:secret"

# Named Cloudflare tunnel with custom domain
demoscript serve ./my-demo --tunnel-name mytunnel --tunnel-hostname demo.example.com
```

### `demoscript record <demo>`

Execute all steps and save responses to `recordings.json`.

```bash
demoscript record examples/hello-world -o recordings.json
```

Options:
- `-o, --output <file>` - Output filename (default: recordings.json)

### `demoscript build <demo>`

Export demo as a static site.

```bash
# Single demo
demoscript build examples/hello-world -o dist

# All demos with gallery index
demoscript build examples --all -o dist
```

Options:
- `-o, --output <dir>` - Output directory (default: dist)
- `--all` - Build all demos in directory with gallery index

### `demoscript deploy <demo>`

Deploy demo to Netlify with one command.

```bash
# Draft deploy (preview URL)
demoscript deploy examples/hello-world

# Production deploy
demoscript deploy examples/hello-world --prod

# Deploy to specific site
demoscript deploy examples/hello-world --prod --site my-demo-site
```

Options:
- `-o, --output <dir>` - Build output directory (default: dist)
- `--prod` - Deploy to production (default is draft preview)
- `-s, --site <name>` - Netlify site name or ID

The deploy command will:
1. Check for Netlify CLI (installs if missing)
2. Authenticate with Netlify (if not logged in)
3. Record the demo (if no recordings.json exists)
4. Build the static site
5. Deploy to Netlify

### `demoscript export-video <demo>`

Export demo as an MP4 video.

```bash
demoscript export-video examples/browser-demo -o demo.mp4
```

Options:
- `-o, --output <file>` - Output video file (default: demo.mp4)
- `-w, --width <pixels>` - Video width (default: 1280)
- `-h, --height <pixels>` - Video height (default: 720)
- `-f, --fps <number>` - Frames per second (default: 30)
- `--delay <ms>` - Delay between steps in milliseconds (default: 2000)

**Note:** Requires a static build first (`demoscript build`).

### `demoscript export-gif <demo>`

Export demo as an animated GIF.

```bash
demoscript export-gif examples/browser-demo -o demo.gif --optimize
```

Options:
- `-o, --output <file>` - Output GIF file (default: demo.gif)
- `-w, --width <pixels>` - GIF width (default: 800)
- `-f, --fps <number>` - Frames per second (default: 10)
- `--delay <ms>` - Delay between steps in milliseconds (default: 2000)
- `--optimize` - Use two-pass encoding with palette generation (slower but better quality)

**Note:** Requires a static build first (`demoscript build`).

## YAML Schema

### Demo Configuration

```yaml
title: "Demo Title"           # Required
description: "Description"    # Optional
version: "1.0"               # Optional
author: "Author Name"        # Optional
tags: [tag1, tag2]           # Optional

# Gallery metadata (shown in gallery index)
metadata:
  duration: "5 minutes"       # Estimated demo duration
  difficulty: intermediate    # beginner | intermediate | advanced
  category: "Tutorial"        # Category for organization

settings:
  base_url: "https://api.example.com"
  openapi: "https://api.example.com/docs/json"  # OpenAPI spec URL
  polling:
    interval: 2000           # Default poll interval (ms)
    max_attempts: 30         # Default max poll attempts

steps:
  # Step definitions...
```

Gallery metadata is displayed as badges when building with `--all`. Difficulty levels show colored badges (green/yellow/red).

### Step Types

#### Slide Step

Display markdown content:

```yaml
- slide: |
    # Heading

    Markdown content with **formatting** and $variables
  title: "Optional Title"
```

#### REST Step

Make HTTP API calls:

```yaml
- rest: POST /api/endpoint
  title: "Create Resource"
  description: "Optional description"
  show_curl: true          # Display curl command for this request
  headers:
    Authorization: "Bearer $token"
  defaults:                # Set defaults for OpenAPI-generated fields
    fieldName: "default value"
  form:                    # Manual form fields (override OpenAPI)
    - name: fieldName
      label: "Display Label"
      default: "default value"
      type: text           # text, number, select, textarea
      required: true
      readonly: false
  body:                    # Alternative to form
    key: "value"
  save:
    varName: response.path.to.value
    httpStatus: _status    # Special keyword: HTTP status code (200, 404, etc.)
  results:
    - key: id
      label: "ID"
    - key: txHash
      type: ref            # Truncated identifier with copy button
      link: polygonscan    # Links to configured explorer
      link_key: tx         # Key within handler (uses polygonscan.tx template)
  poll:
    endpoint: "/api/status/$jobId"
    success_when: "response.status == 'complete'"
    failure_when: "response.status == 'error'"
    interval: 2000
    max_attempts: 30
```

**REST save keywords:**

| Keyword | Description |
|---------|-------------|
| `_status` | HTTP status code (200, 404, 500, etc.) |
| `path.to.value` | JSON path extraction from response body |

**Result types:**

| Type | Description |
|------|-------------|
| `text` | Plain text (default) |
| `ref` | Truncated identifier with copy button and optional link |
| `currency` | Formatted currency value |
| `code` | Syntax-highlighted code block |
| `json` | Formatted JSON with syntax highlighting |
| `table` | Render array data as a table |
| `link` | Clickable URL |
| `mono` | Monospace text (no truncation) |
| `relative_time` | Human-readable relative time (e.g., "2 hours ago") |

**Custom link handlers:**

Configure link handlers for any external service (GitHub, Jira, blockchain explorers, etc.):

```yaml
settings:
  links:
    # GitHub links
    github:
      user: "https://github.com/{value}"
      issue: "https://github.com/org/repo/issues/{value}"
      pr: "https://github.com/org/repo/pull/{value}"
    # Jira links
    jira:
      issue: "https://mycompany.atlassian.net/browse/{value}"
    # Blockchain explorer
    polygonscan:
      address: "https://amoy.polygonscan.com/address/{value}"
      tx: "https://amoy.polygonscan.com/tx/{value}"
```

Then reference in results with `link` and `link_key`:

```yaml
results:
  - key: username
    type: ref
    link: github       # Link handler name
    link_key: user     # Key within handler (uses github.user template)
  - key: issueNumber
    type: ref
    link: jira         # Link handler name
    link_key: issue    # Key within handler (uses jira.issue template)
  - key: contractAddress
    type: ref
    link: polygonscan  # Link handler name
    link_key: address  # Key within handler (uses polygonscan.address template)
```

#### Shell Step

Execute shell commands:

```yaml
- shell: echo "Hello World"
  title: "Run Command"
  shell_type: bash         # bash, powershell, cmd
  workdir: ./scripts
  env:
    MY_VAR: "value"
  confirm: true            # Require user confirmation
  save:
    result: stdout         # Save standard output to $result
    errors: stderr         # Save standard error to $errors
    exitCode: status       # Save exit code to $exitCode (0 = success)
```

**Shell save keywords:**

| Keyword | Description |
|---------|-------------|
| `stdout` | Standard output (recommended) |
| `stderr` | Standard error output |
| `status` | Exit code (0 = success, non-zero = error) |
| `output` | Legacy alias for `stdout` |

Example capturing multiple outputs:

```yaml
- shell: ls -la /tmp 2>&1
  title: "List Directory"
  save:
    listing: stdout        # The directory listing
    exitCode: status       # 0 if successful
```

#### Browser Step

Open URLs in the browser:

```yaml
- browser: https://example.com/dashboard/$userId
  title: "View Dashboard"
  description: "Open the user dashboard in browser"
```

In live mode, clicking "Open in Browser" launches the URL in the system default browser. Variables are substituted in the URL.

During recording (`demoscript record`), browser steps automatically capture a screenshot of the page using Puppeteer. Screenshots are saved to `assets/screenshots/` and displayed in playback mode.

#### Code Step

Display syntax-highlighted code snippets:

```yaml
- code: |
    const user = await api.getUser(id);
    console.log(user.name);
  language: javascript
  filename: example.js
  title: "Code Example"
  highlight: [1, 2]        # Optional: highlight specific lines
```

Supported languages: javascript, typescript, python, bash, json, yaml, sql, go, rust, java, c, cpp, and more.

#### Wait Step

Add timed delays with visual countdown:

```yaml
- wait: 2000               # Duration in milliseconds
  message: "Processing..." # Optional message
  title: "Brief Pause"
```

#### Assert Step

Validate conditions with pass/fail display:

```yaml
- assert: "$userId == 1"
  title: "Verify User ID"
  description: "Ensure we fetched the correct user"
  message: "Custom failure message"
```

Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`

Supports nested paths: `$response.data.id == 123`

#### GraphQL Step

Execute GraphQL queries:

```yaml
- graphql: |
    query GetUser($id: ID!) {
      user(id: $id) { name, email }
    }
  endpoint: "https://api.example.com/graphql"
  variables:
    id: "$userId"
  save:
    userName: data.user.name
  title: "Fetch User"
```

#### Database Step

Query MongoDB, PostgreSQL, or MySQL databases:

```yaml
# MongoDB
- db: findOne
  collection: users
  query: { email: "$userEmail" }
  save:
    userName: name
  title: "Find User"

# SQL
- db: query
  type: postgres
  query: "SELECT * FROM users WHERE id = $userId"
  save:
    userName: name
```

MongoDB operations: `find`, `findOne`, `insertOne`, `updateOne`, `deleteOne`

### Branching and Navigation

Create choose-your-own-adventure demos with step IDs, goto navigation, and user choices.

#### Step IDs

Give a step an ID to jump to it from elsewhere:

```yaml
- id: summary
  slide: |
    # Summary
    Demo complete!
```

#### Goto Navigation

Automatically jump to another step after completing:

```yaml
- code: |
    // Quick example
  title: "Code Sample"
  goto: summary   # Jump to summary step after this
```

#### Choice Branching

Present users with options that navigate to different paths:

```yaml
- slide: |
    # Choose Your Path
    Would you like a quick overview or deep dive?
  title: "Choose Path"
  choices:
    - label: "Quick Overview"
      description: "Jump to the summary"
      goto: summary
    - label: "Deep Dive"
      description: "See all the details"
      goto: deep-dive
```

### Step Groups

Organize related steps into collapsible groups:

```yaml
steps:
  - group: "Setup"
    description: "Initial configuration steps"
    collapsed: false
    steps:
      - slide: |
          # Setup
          Let's configure the environment.
      - shell: echo "Setting up..."

  - group: "Main Flow"
    steps:
      - rest: POST /api/start
        title: "Start Process"
```

Groups provide visual organization in the stepper UI and can be collapsed to hide completed sections.

### Variable Substitution

Use `$variableName` to reference saved values:

```yaml
- rest: GET /users/$userId
  headers:
    Authorization: Bearer $token
  form:
    - name: email
      default: "$userEmail"
```

Variables are extracted using `save:` with dot notation paths:

```yaml
save:
  userId: id                    # response.id
  userName: data.user.name      # response.data.user.name
```

### OpenAPI Integration

DemoScript can automatically generate form fields from OpenAPI/Swagger specifications. This reduces manual configuration and ensures forms stay in sync with your API.

**Setup:** Add the OpenAPI spec URL to your settings:

```yaml
settings:
  base_url: "https://api.example.com"
  openapi: "https://api.example.com/docs/json"
```

**Automatic form generation:** When an OpenAPI spec is configured, REST step forms are automatically generated from the request body schema:

```yaml
# Before: Manual form definition
- rest: POST /users
  form:
    - name: name
      type: text
      required: true
    - name: email
      type: text
      required: true
    - name: age
      type: number

# After: Just set defaults
- rest: POST /users
  defaults:
    name: "John Doe"
    email: "john@example.com"
```

**Priority rules (smart merge):**
1. **OpenAPI schema** - Base form fields (types, required flags, descriptions)
2. **`defaults:`** - Override default values only
3. **`form:`** - Partial override (only specified properties are changed, rest inherited)

Fields in `form:` inherit from OpenAPI + `defaults:`, so you only need to specify what you want to change:

```yaml
# OpenAPI provides: name, type, required
# defaults provides: default value
# form overrides: just the label
- rest: POST /plvs/$plvId/deposits
  defaults:
    amount: 1000
    wallet: "0x70997970..."
  form:
    - name: wallet
      label: "From Wallet"  # Only override label, keeps default from above
```

**Type mapping:**

| OpenAPI Type | Form Field Type |
|--------------|-----------------|
| `string` | `text` |
| `integer` / `number` | `number` |
| `boolean` | `select` (true/false) |
| `string` + `enum` | `select` |
| `array` / `object` | `textarea` (JSON) |

**Per-step override:** Use `openapi:` on individual steps to override the global spec:

```yaml
- rest: POST /external-api/users
  openapi: "https://external-api.com/docs/json"
  defaults:
    name: "Default Name"
```

### Authentication

Password-protect demos for restricted access:

```yaml
settings:
  auth:
    enabled: true
    password: "demo123"           # Required password
    message: "Enter demo password"  # Custom login prompt
```

For static builds, passwords are hashed with SHA-256 client-side. The password is never stored in plain text in the built output.

### Dashboard

Show an overview screen when the demo loads:

```yaml
settings:
  dashboard:
    enabled: true
    show_stats: true        # Step count, estimated duration
    show_health: true       # Service health indicators
    show_description: true  # Demo description

  health_checks:
    - name: "API Server"
      url: "http://localhost:8000/health"
    - name: "Database"
      url: "http://localhost:5432/health"
```

Health checks poll endpoints and show green/red status indicators. Click "Start Demo" to begin.

### Sidebar Navigation

Add a collapsible sidebar with step list:

```yaml
settings:
  sidebar:
    enabled: true
    collapsed: false      # Start expanded
    show_status: true     # Show completion checkmarks
```

The sidebar shows all steps with their titles and completion status. Click any step to jump directly to it.

### Visual Effects

Configure visual effects for engaging demos:

```yaml
settings:
  effects:
    confetti: true        # Fire confetti on step completion
    sounds: true          # Play success/error sounds
    transitions: true     # Animate step changes
    counters: true        # Animate numeric values
    neon_glow: true       # Neon text effects (dark mode)
    grid_background: true # Animated grid background
    glow_orbs: true       # Floating glow orbs
    sound_volume: 0.3     # Sound volume (0-1, default: 0.5)
```

All effects are **enabled by default** for maximum engagement. Disable specific effects for a more professional presentation:

```yaml
# Silent, minimal animation
settings:
  effects:
    confetti: false
    sounds: false

# Completely disable all effects
settings:
  effects:
    confetti: false
    sounds: false
    transitions: false
    counters: false
    neon_glow: false
    grid_background: false
    glow_orbs: false
```

**Effect descriptions:**

| Effect | Description |
|--------|-------------|
| `confetti` | Celebration particles when a step completes successfully |
| `sounds` | Audio feedback (success chord, error tone) |
| `transitions` | Slide animation when navigating between steps |
| `counters` | Animated number counting for numeric result values |
| `neon_glow` | Glowing neon text effects in dark mode |
| `grid_background` | Animated perspective grid background |
| `glow_orbs` | Floating colored orbs in the background |
| `sound_volume` | Master volume for all sound effects (0-1) |

### Dual Syntax

DemoScript supports two syntax styles for each step type:

**Concise syntax** (original, recommended for readability):
```yaml
- rest: GET /users/1
  title: "Fetch User"
  save:
    userId: id
```

**Explicit syntax** (verbose, self-documenting):
```yaml
- step: rest
  method: GET
  path: /users/1
  title: "Fetch User"
  save:
    userId: id
```

Both syntaxes are fully supported and can be mixed within the same demo. See [DESIGN.md](DESIGN.md) for the complete field mapping between syntaxes.

## Sharing Demos

There are several ways to share your demos with others:

### Option 1: LAN Sharing (Live Mode)

Share your demo with others on the same network:

```bash
demoscript serve ./my-demo --host --port 3000
```

This binds to `0.0.0.0` and displays both local and network URLs. Share the network URL (e.g., `http://192.168.1.100:3000`) with others on your LAN.

**Pros:** Real-time execution, interactive, immediate updates
**Cons:** Requires server running, only accessible on same network

### Option 2: One-Command Deploy to Netlify

Deploy directly to Netlify with a single command:

```bash
# Draft deploy (get preview URL)
demoscript deploy ./my-demo

# Production deploy
demoscript deploy ./my-demo --prod
```

This automatically records responses (if needed), builds, and deploys. Share the Netlify URL with anyone.

**Pros:** One command, permanent URL, works anywhere, free hosting
**Cons:** Requires Netlify account, pre-recorded responses only

### Option 3: Manual Static Site Hosting

Build a static site and host it anywhere:

```bash
# Record responses first
demoscript record ./my-demo

# Build static site
demoscript build ./my-demo -o dist
```

Deploy the `dist` folder to any static hosting:
- GitHub Pages
- Netlify
- Vercel
- AWS S3
- Any web server

**Pros:** Full control, works anywhere, permanent URL
**Cons:** More manual steps, requires pre-recorded responses

### Option 4: Gallery Site

Build multiple demos with a gallery index:

```bash
demoscript build ./examples --all -o dist
```

Creates a gallery page linking to all demos in the directory.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` or `Space` | Next step |
| `←` | Previous step |
| `R` | Reset demo |
| `?` | Show keyboard help |
| `Esc` | Close help dialog |

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full improvement guide including architecture recommendations, testing strategy, and desktop packaging plans.

### Planned Features

- **Embeddable widget** - iframe embed code for docs and blogs
- **Step-level reset** - Re-run individual steps without full reset
- **Variable editor** - Modify variables during presentation
- **Vercel deploy** - One-command deploy to Vercel (in addition to Netlify)

### Recently Added

- **Authentication** - Password-protect demos with SHA-256 hashing
- **Dashboard** - Overview screen with health checks and demo statistics
- **Sidebar navigation** - Collapsible step list with completion status
- **Enhanced visual effects** - Neon glow, animated grid background, floating orbs
- **Tunnel support** - Public URLs via ngrok or Cloudflare tunnels
- **cURL display** - Show curl commands for REST steps with `show_curl: true`
- **Result types** - Rich rendering for identifiers, code, tables, JSON, and more
- **Custom link handlers** - Configurable links for any service (GitHub, Jira, blockchain explorers)
- **Gallery metadata** - Duration, difficulty badges in gallery index
- **Sound controls** - Volume control and additional sound effects
- **OpenAPI integration** - Auto-generate form fields from OpenAPI/Swagger specs
- **Screenshot recording** - Browser steps now capture screenshots during recording
- **Video export** - Generate MP4 videos with `demoscript export-video`
- **GIF export** - Generate animated GIFs with `demoscript export-gif`

### Known Limitations

- No integration tests for CLI commands
- Shell commands require the server to be running locally
- Video/GIF export requires static build first

## Development

```bash
# Clone repository
git clone https://github.com/your-org/demoscript
cd demoscript

# Install dependencies
npm install

# Run UI development server
npm run dev

# Build all packages
npm run build

# Run tests
cd packages/cli && npm test
cd packages/ui && npm test

# Build RPM package (requires: dnf install rpm-build)
./scripts/build-packages.sh rpm

# Build DEB package (requires: apt install dpkg-dev debhelper)
./scripts/build-packages.sh deb
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

## Project Structure

```
demoscript/
├── packages/
│   ├── cli/          # CLI tool (serve, record, build, export)
│   └── ui/           # React web interface
├── examples/
│   ├── hello-world/       # Minimal starter demo
│   ├── jsonplaceholder/   # REST API tutorial
│   ├── github-api/        # Custom link handlers example
│   ├── feature-showcase/  # Comprehensive feature demo
│   └── browser-demo/      # Browser steps and export demo
├── packaging/
│   ├── rpm/               # RPM spec file
│   └── deb/               # Debian packaging files
├── scripts/
│   └── build-packages.sh  # Package build script
├── demo.schema.json  # JSON Schema for YAML validation
├── DESIGN.md         # Architecture documentation
├── ROADMAP.md        # Future plans and improvement guide
├── CONTRIBUTING.md   # Development guidelines
└── CHANGELOG.md      # Version history
```

## License

MIT
