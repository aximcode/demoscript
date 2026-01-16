# DemoScript

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
- **Live execution** - Execute API calls and shell commands in real-time
- **Authentication** - Password-protect demos with SHA-256 hashing
- **Dashboard** - Overview screen with health checks and demo stats
- **Sidebar navigation** - Collapsible step list with completion status
- **Visual effects** - Confetti, sounds, neon glow, animated backgrounds
- **Schema validation** - JSON Schema validates YAML with helpful error messages
- **Live reload** - Watch mode auto-refreshes on file changes
- **Keyboard navigation** - Arrow keys, space, and shortcuts (press `?` for help)
- **Dark/Light mode** - Toggle theme support
- **Mobile responsive** - Works on tablets and phones

## Try It Online

See DemoScript in action without installing:

- [Hello World](https://mgosha.github.io/demoscript/hello-world/) - Minimal starter demo
- [JSONPlaceholder](https://mgosha.github.io/demoscript/jsonplaceholder/) - REST API tutorial
- [GitHub API](https://mgosha.github.io/demoscript/github-api/) - Custom link handlers
- [Feature Showcase](https://mgosha.github.io/demoscript/feature-showcase/) - All features demo

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

RPM and DEB packages are available in [Releases](https://github.com/mgosha/demoscript/releases).

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

## YAML Schema

### Demo Configuration

```yaml
title: "Demo Title"           # Required
description: "Description"    # Optional
version: "1.0"               # Optional
author: "Author Name"        # Optional
tags: [tag1, tag2]           # Optional

settings:
  base_url: "https://api.example.com"
  openapi: "https://api.example.com/docs/json"  # OpenAPI spec URL
  polling:
    interval: 2000           # Default poll interval (ms)
    max_attempts: 30         # Default max poll attempts

steps:
  # Step definitions...
```

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
      type: tx             # Special type with explorer link
      link: polygonscan    # Links to configured explorer
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
| `address` | Identifier with copy button and optional link |
| `tx` | Transaction/reference ID with optional link |
| `token` | Token/resource identifier with optional link |
| `currency` | Formatted currency value |
| `code` | Syntax-highlighted code block |
| `json` | Formatted JSON with syntax highlighting |
| `table` | Render array data as a table |
| `link` | Clickable URL |

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

Then reference in results:

```yaml
results:
  - key: username
    type: address
    link: github       # Opens https://github.com/{username}
  - key: issueNumber
    type: tx
    link: jira         # Opens Jira issue
  - key: contractAddress
    type: address
    link: polygonscan  # Opens blockchain explorer
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

#### Browser Step

Open URLs in the browser:

```yaml
- browser: https://example.com/dashboard/$userId
  title: "View Dashboard"
  description: "Open the user dashboard in browser"
```

In live mode, clicking "Open in Browser" launches the URL in the system default browser. Variables are substituted in the URL.

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

### Authentication

Password-protect demos for restricted access:

```yaml
settings:
  auth:
    enabled: true
    password: "demo123"           # Required password
    message: "Enter demo password"  # Custom login prompt
```

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

All effects are **enabled by default** for maximum engagement.

## Sharing Demos

### LAN Sharing (Live Mode)

Share your demo with others on the same network:

```bash
demoscript serve ./my-demo --host --port 3000
```

This binds to `0.0.0.0` and displays both local and network URLs. Share the network URL (e.g., `http://192.168.1.100:3000`) with others on your LAN.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `→` or `Space` | Next step |
| `←` | Previous step |
| `R` | Reset demo |
| `?` | Show keyboard help |
| `Esc` | Close help dialog |

## Cloud Platform

For additional features like cloud hosting, static builds, video/GIF export, and team collaboration, check out [DemoScript Cloud](https://demoscript.app).

## Development

```bash
# Clone repository
git clone https://github.com/mgosha/demoscript
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
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

## Project Structure

```
demoscript/
├── packages/
│   ├── cli/          # CLI tool (serve command)
│   └── ui/           # React web interface
├── examples/
│   ├── hello-world/       # Minimal starter demo
│   ├── jsonplaceholder/   # REST API tutorial
│   ├── github-api/        # Custom link handlers example
│   └── feature-showcase/  # Comprehensive feature demo
├── demo.schema.json  # JSON Schema for YAML validation
├── DESIGN.md         # Architecture documentation
├── CONTRIBUTING.md   # Development guidelines
└── CHANGELOG.md      # Version history
```

## License

MIT
