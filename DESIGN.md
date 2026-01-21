# DemoScript Design Document

## Overview

DemoScript is a framework for creating scripted, shareable product demonstrations. Users write simple YAML files describing demo steps, and the framework provides:

- A beautiful web UI for stepping through demos
- Live execution mode for presenters (runs real commands/APIs)
- Viewer mode for sharing (plays back recorded responses)
- Static site generation for portable, self-contained demos

## Goals

1. **Simplicity** - A novice can write a demo script in YAML
2. **Shareability** - Export demos as static sites that work anywhere
3. **Flexibility** - Support REST APIs, shell commands, and explanatory slides
4. **Dual Mode** - Live execution for presenters, recorded playback for viewers

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Workflow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. Write YAML ──► 2. Record ──► 3. Build ──► 4. Share         │
│                                                                  │
│   demo.yaml         recordings.json   dist/index.html   URL/file │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        System Components                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   CLI Tool   │  │  Dev Server  │  │   Static Builder     │   │
│  │              │  │              │  │                      │   │
│  │ - init       │  │ - REST proxy │  │ - Parse YAML         │   │
│  │ - new        │  │ - Shell exec │  │ - Bundle React app   │   │
│  │ - serve      │  │ - WebSocket  │  │ - Embed recordings   │   │
│  │ - record     │  │   (live UI)  │  │ - Output static HTML │   │
│  │ - build      │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    React Web UI                           │   │
│  │                                                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │   │
│  │  │ Stepper │ │  Slide  │ │  REST   │ │     Shell       │ │   │
│  │  │         │ │ Viewer  │ │ Viewer  │ │     Viewer      │ │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ │   │
│  │  │  Form Builder   │ │ Result Renderer │ │  Controls   │ │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────┘ │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Visual Demo Builder

The DemoScript Builder is a CLI-based tool for creating demos interactively without writing YAML by hand.

```
$ demoscript builder
  → Opens browser to http://localhost:3002/builder

┌─────────────────────────────────────────────────────────────────┐
│ Mode: (•) OpenAPI  ( ) Custom                    [Clear All]    │
├─────────────────────────────────────────────────────────────────┤
│ OPENAPI MODE:                  │ CUSTOM MODE:                   │
│ URL: [spec url______] [Fetch]  │ Base URL: [https://api...]     │
│                                │ Method:   [POST ▼]             │
│ ENDPOINTS        EXECUTION     │ Path:     [/users]             │
│ [Search...]      ┌──────────┐  │ Headers:  [textarea]           │
│                  │ Form     │  │ Body:     [JSON textarea]      │
│ Users            │ fields   │  │                                │
│  ├ GET /users    │ from     │  │ [Execute]                      │
│  └ POST /users   │ OpenAPI  │  │                                │
│                  └──────────┘  │                                │
│ [Execute] [+ Add to Demo]      │ [+ Add to Demo]                │
├────────────────────────────────┴────────────────────────────────┤
│ DEMO STEPS                     │ EXPORT                         │
│ [1] POST /users    [Edit][Del] │ [Copy YAML]                    │
│ [2] GET /users/$id [Edit][Del] │ [Download YAML]                │
│                                │                                │
│ Variables: $userId = 123       │                                │
└────────────────────────────────┴────────────────────────────────┘
```

### Builder Components

- **EndpointBrowser**: Fetches OpenAPI spec, groups endpoints by tag, provides search
- **ExecutionPanel**: Generates forms from OpenAPI, executes requests, displays responses
- **CustomEndpoint**: Manual mode for entering method/URL/body without OpenAPI
- **StepSequence**: Drag-and-drop list of demo steps with edit/delete
- **ExportPanel**: YAML generation with copy/download functionality

### Shared Package (`@demoscript/shared/builder`)

Types and utilities:
- `BuilderStep`, `BuilderState`: Type definitions
- `generateDemoYaml()`: Converts builder state to YAML format
- `stepToYaml()`: Converts individual step to YAML lines

### OpenAPI Utilities (`@demoscript/shared/openapi`)

Endpoint browser functions:
- `groupEndpointsByTag()`: Groups endpoints by their first tag
- `searchEndpoints()`: Filters endpoints by query string
- `getAllEndpoints()`: Extracts all endpoints from spec
- `getParameterFields()`: Generates form fields for path/query params

## Project Structure

```
demoscript/
├── packages/
│   ├── cli/                    # CLI tool (Node.js)
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── commands/
│   │   │   │   ├── init.ts
│   │   │   │   ├── new.ts
│   │   │   │   ├── serve.ts
│   │   │   │   ├── record.ts
│   │   │   │   └── build.ts
│   │   │   ├── server/         # Dev server for live execution
│   │   │   │   ├── index.ts
│   │   │   │   ├── rest-proxy.ts
│   │   │   │   └── shell-executor.ts
│   │   │   └── builder/        # Static site generator
│   │   │       ├── index.ts
│   │   │       └── templates/
│   │   └── package.json
│   │
│   └── ui/                     # React web UI
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── DemoRunner.tsx
│       │   │   ├── StepViewer.tsx
│       │   │   ├── SlideStep.tsx
│       │   │   ├── RestStep.tsx
│       │   │   ├── ShellStep.tsx
│       │   │   ├── FormBuilder.tsx
│       │   │   ├── ResultRenderer.tsx
│       │   │   ├── Stepper.tsx
│       │   │   └── Controls.tsx
│       │   ├── context/
│       │   │   └── DemoContext.tsx
│       │   ├── hooks/
│       │   │   ├── useDemo.ts
│       │   │   └── useExecution.ts
│       │   ├── types/
│       │   │   └── schema.ts
│       │   └── lib/
│       │       ├── variable-substitution.ts
│       │       └── result-formatting.ts
│       ├── index.html
│       └── package.json
│
├── examples/
│   ├── hello-world/           # Minimal intro demo
│   │   └── demo.yaml
│   ├── feature-showcase/      # Comprehensive feature demo
│   │   ├── demo.yaml
│   │   └── recordings.json
│   └── browser-demo/          # Browser automation demo
│       └── demo.yaml
│
├── package.json                # Monorepo root
├── DESIGN.md                   # This document
└── README.md
```

## YAML Schema Specification

### Demo Configuration

```yaml
# demo.yaml

# Required metadata
title: "Demo Title"
description: "What this demo shows"

# Optional metadata
version: "1.0"
author: "Your Name"
tags: ["api", "tutorial"]

# Optional global settings
settings:
  base_url: "http://localhost:8000"   # Default base URL for REST calls
  theme:
    logo: "./assets/logo.png"         # Optional logo image
    preset: "purple"                  # Color preset: purple|blue|green|teal|orange|rose
    primary: "#8b5cf6"                # Custom primary color (overrides preset)
    accent: "#06b6d4"                 # Custom accent color (overrides preset)
    mode: "auto"                      # Force light/dark mode: auto|light|dark
  polling:
    interval: 2000                     # Default polling interval (ms)
    max_attempts: 30                   # Default max polling attempts
  effects:
    confetti: true                     # Fire confetti on step completion
    sounds: true                       # Play success/error sounds
    transitions: true                  # Animate step changes
    counters: true                     # Animate numeric values

# Demo steps (required)
steps:
  - slide: ...
  - rest: ...
  - shell: ...
```

### Step Types

#### Slide Step
Displays markdown content for explanations.

```yaml
- slide: |
    # Welcome

    This demo shows **feature X**.

    We'll cover:
    - Step one
    - Step two

  # Optional: title shown in stepper (defaults to first heading)
  title: "Introduction"
```

#### REST Step
Makes HTTP API calls.

```yaml
- rest: POST /api/tokens
  title: "Create Token"
  description: "Deploy a new ERC-20 token"

  # Optional: override base_url for this step
  base_url: "http://different-server:8080"

  # Request headers (optional)
  headers:
    Authorization: "Bearer $authToken"
    Content-Type: "application/json"

  # Request body (optional, for POST/PUT/PATCH)
  body:
    name: "Demo Dollar"
    symbol: "DEMOD"
    decimals: 18

  # Form fields - allows user to edit values before execution
  form:
    - name: name
      label: "Token Name"
      type: text              # text, number, select, textarea
      default: "Demo Dollar"
      required: true
    - name: symbol
      label: "Symbol"
      type: text
      default: "DEMOD"
    - name: decimals
      label: "Decimals"
      type: number
      default: 18

  # Store values from response for use in later steps
  # Use JSON paths for response body, or special keywords like _status
  save:
    tokenAddress: tokenAddress      # save response.tokenAddress as $tokenAddress
    tokenSymbol: symbol             # save response.symbol as $tokenSymbol
    httpStatus: _status             # save HTTP status code (200, 404, etc.)

  # How to display results
  results:
    - key: id
      label: "Resource ID"
      type: text
    - key: username
      label: "Username"
      type: ref                      # text, ref, link, currency, code, table, json, mono, relative_time
      link: github                   # Optional: configured link handler
      link_key: user                 # Optional: key within link handler

  # Polling for async operations (optional)
  wait_for: abtJobId                 # Response field containing job ID
  poll:
    endpoint: "http://localhost:8088/api/jobs/$jobId"
    success_when: "status == 'completed'"
    failure_when: "status == 'failed'"
    interval: 2000
    max_attempts: 30
```

**REST save keywords:**

| Keyword | Description |
|---------|-------------|
| `_status` | HTTP status code (200, 404, 500, etc.) |
| `path.to.value` | JSON path extraction from response body (e.g., `data.user.id`) |

#### Shell Step
Executes shell commands.

```yaml
- shell: docker ps --format "table {{.Names}}\t{{.Status}}"
  title: "List Containers"
  description: "Show running Docker containers"

  # Optional: shell type (defaults to system default)
  shell_type: bash                   # bash, powershell, cmd

  # Optional: working directory
  workdir: /path/to/project

  # Optional: require confirmation before running
  confirm: true

  # Optional: environment variables
  env:
    NODE_ENV: production

  # Optional: capture command outputs
  save:
    containerList: stdout            # Standard output → $containerList
    errors: stderr                   # Standard error → $errors
    exitCode: status                 # Exit code (0=success) → $exitCode
```

**Shell save keywords:**

| Keyword | Description |
|---------|-------------|
| `stdout` | Standard output from the command |
| `stderr` | Standard error output |
| `status` | Exit code (0 = success, non-zero = error) |
| `output` | Legacy alias for `stdout` (for backward compatibility) |

Unlike REST steps where `save` maps JSON response paths, shell steps use these special keywords to capture different parts of command execution.

#### Browser Step
Opens or displays a URL.

```yaml
- browser: https://app.example.com/dashboard
  title: "View Dashboard"
  description: "See the result in the web UI"

  # Optional: screenshot to show in viewer mode
  screenshot: ./assets/dashboard.png
```

#### Code Step
Displays syntax-highlighted code snippets (display only, not executed).

```yaml
- code: |
    const response = await fetch('/api/users');
    const users = await response.json();
    console.log(users);
  language: javascript
  filename: example.js
  title: "JavaScript Example"

  # Optional: highlight specific lines
  highlight: [2, 3]
```

Supported languages: javascript, typescript, python, bash, json, yaml, sql, go, rust, java, c, cpp, and more.

#### Wait Step
Adds a timed delay with visual countdown.

```yaml
- wait: 2000                    # Duration in milliseconds
  message: "Processing..."      # Optional message to display
  title: "Brief Pause"
```

#### Assert Step
Validates conditions and shows pass/fail results.

```yaml
- assert: "$userId == 1"
  title: "Verify User ID"
  description: "Ensure we fetched the correct user"
  message: "Expected user ID 1"  # Custom failure message
```

Supported operators:
- `==` (equals)
- `!=` (not equals)
- `>`, `>=`, `<`, `<=` (numeric comparisons)

Supports nested paths: `$response.data.id == 123`

#### GraphQL Step
Executes GraphQL queries and mutations.

```yaml
- graphql: |
    query GetUser($id: ID!) {
      user(id: $id) {
        name
        email
      }
    }
  endpoint: "https://api.example.com/graphql"
  variables:
    id: "$userId"
  headers:
    Authorization: "Bearer $token"
  save:
    userName: data.user.name
  title: "Fetch User"
```

#### Database Step
Queries databases (MongoDB, PostgreSQL, MySQL).

```yaml
# MongoDB example
- db: findOne
  collection: users
  query: { email: "$userEmail" }
  projection: { password: 0 }
  save:
    userId: _id
    userName: name
  title: "Find User"

# MongoDB operations: find, findOne, insertOne, updateOne, deleteOne

# SQL example (PostgreSQL/MySQL)
- db: query
  type: postgres
  query: "SELECT * FROM users WHERE id = $userId"
  save:
    userName: name
  title: "Query User"
```

Database connection is configured in settings:

```yaml
settings:
  database_url: "mongodb://localhost:27017/mydb"
```

### OpenAPI Integration

DemoScript can automatically generate form fields from OpenAPI/Swagger specifications. This reduces manual form configuration and keeps demos in sync with API schemas.

#### Configuration

Add the OpenAPI spec URL to settings:

```yaml
settings:
  base_url: "http://localhost:8000"
  openapi: "http://localhost:8000/docs/json"  # OpenAPI 3.0 spec URL
```

Per-step override:

```yaml
- rest: POST /external-api/users
  openapi: "http://external-api.com/docs/json"  # Override for this step
```

#### Form Field Generation

The loader fetches the OpenAPI spec and generates form fields from request body schemas:

```
┌──────────────────────────────────────────────────────────────┐
│                   OpenAPI Form Generation                      │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│   1. Fetch OpenAPI spec ──► Parse JSON                        │
│                                                                │
│   2. Match endpoint ──► GET /tokens → paths["/tokens"]["get"] │
│                                                                │
│   3. Extract requestBody.content.application/json.schema      │
│                                                                │
│   4. Resolve $refs and allOf merges                           │
│                                                                │
│   5. Convert schema properties → FormField[]                  │
│      - type: string → text                                    │
│      - type: integer/number → number                          │
│      - type: boolean → select (true/false)                    │
│      - enum → select with options                             │
│      - array/object → textarea (JSON)                         │
│                                                                │
│   6. Apply merge priority (smart merge):                      │
│      OpenAPI schema → defaults → form (partial override)      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

#### Merge Priority (Smart Merge)

1. **OpenAPI schema** (base) - Field types, required flags, descriptions from API spec
2. **`defaults:`** - Override default values only, preserves OpenAPI field definition
3. **`form:`** - Partial override, inherits from OpenAPI + defaults, only overrides specified properties

Fields in `form:` inherit all properties from OpenAPI and `defaults:`, so you only specify what you want to change.

Example:

```yaml
- rest: POST /tokens
  # OpenAPI generates: name (text, required), symbol (text, required), decimals (number)
  defaults:
    name: "Demo Dollar"     # Override default only
    symbol: "DEMOD"
    decimals: 18
  form:
    - name: decimals        # Partial override - just add label and readonly
      label: "Token Decimals"
      readonly: true        # Inherits default: 18 from defaults section above
```

#### Caching

OpenAPI specs are cached in memory with a 5-minute TTL to avoid repeated fetches during development.

Key files:
- `packages/cli/src/lib/openapi.ts` - OpenAPI fetcher and form generator
- `packages/cli/src/lib/loader.ts` - Integrates OpenAPI processing

### Visual Effects Configuration

DemoScript includes configurable visual effects for engaging presentations.

#### Effects Settings

Configure effects in the `settings` block:

```yaml
settings:
  effects:
    confetti: true      # Fire confetti particles on step completion
    sounds: true        # Play success/error audio feedback
    transitions: true   # Animate step navigation (slide/fade)
    counters: true      # Animate numeric values counting up
```

All effects are **enabled by default** for maximum engagement. Each can be individually disabled.

#### Effect Descriptions

| Effect | Description | Implementation |
|--------|-------------|----------------|
| `confetti` | Celebration particles on step success | Uses `canvas-confetti` library |
| `sounds` | Audio feedback (success chord, error tone) | Web Audio API synthesis |
| `transitions` | Slide animation between steps | CSS transforms with React |
| `counters` | Number counting animation | `react-countup` library |

#### Architecture

Effects are managed centrally using the Separation of Concerns principle:

```
┌──────────────────────────────────────────────────────────────┐
│                   Effect Orchestration                          │
├──────────────────────────────────────────────────────────────┤
│                                                                  │
│   StepViewer ──► useStepEffects() ──► triggers effects          │
│                                                                  │
│   Step components ONLY render content                           │
│   Effects hook watches stepStatuses for changes                 │
│   Configuration read from state.config.settings.effects         │
│                                                                  │
└──────────────────────────────────────────────────────────────┘
```

Key files:
- `packages/ui/src/hooks/useStepEffects.ts` - Centralized effect triggering
- `packages/ui/src/components/effects/` - Effect components (Confetti, SoundEffects, etc.)
- `packages/ui/src/types/schema.ts` - EffectsSettings interface

### Theme System

DemoScript supports customizable color themes via YAML configuration.

#### Theme Configuration

```yaml
settings:
  theme:
    # Option 1: Use a preset theme
    preset: "purple"              # purple (default) | blue | green | teal | orange | rose

    # Option 2: Custom colors (overrides preset)
    primary: "#8b5cf6"            # Main brand color (buttons, gradients, accents)
    accent: "#06b6d4"             # Secondary color (gradient endpoints, highlights)

    # Option 3: Force light/dark mode
    mode: "auto"                  # auto | light | dark
```

#### Color Presets

| Preset | Primary | Accent | Use Case |
|--------|---------|--------|----------|
| `purple` | #8b5cf6 | #06b6d4 | Default DemoScript look |
| `blue` | #3b82f6 | #8b5cf6 | Corporate, professional |
| `green` | #10b981 | #3b82f6 | Fintech, nature |
| `teal` | #14b8a6 | #f59e0b | Modern, fresh |
| `orange` | #f97316 | #8b5cf6 | Energetic, warm |
| `rose` | #f43f5e | #8b5cf6 | Bold, vibrant |

#### Architecture

The theme system uses CSS custom properties for dynamic color injection:

```
┌──────────────────────────────────────────────────────────────┐
│                    Theme System Flow                           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│   1. YAML config loads ──► theme settings extracted           │
│                                                                │
│   2. DemoRunner ──► getThemeColors() ──► resolves colors      │
│      (preset lookup or custom colors)                         │
│                                                                │
│   3. applyThemeColors() ──► injects CSS variables on <html>   │
│      --color-primary: #8b5cf6                                 │
│      --color-accent: #06b6d4                                  │
│      --color-primary-rgb: 139, 92, 246                        │
│      --color-accent-rgb: 6, 182, 212                          │
│                                                                │
│   4. Components use CSS variables via Tailwind classes        │
│      from-theme-primary, text-theme-accent, etc.              │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

Key files:
- `packages/ui/src/lib/theme-colors.ts` - Presets and color utilities
- `packages/ui/src/context/ThemeContext.tsx` - Theme state and mode management
- `packages/ui/src/index.css` - CSS variables and utility classes
- `packages/ui/tailwind.config.js` - Tailwind color configuration

### Branching and Navigation

Steps can define unique identifiers and navigation targets for non-linear demo flows.

#### Step IDs

Assign a unique ID to any step for targeting:

```yaml
- id: summary
  slide: |
    # Summary
    ...
```

#### Goto Navigation

Jump to a specific step after completion:

```yaml
- rest: POST /api/data
  title: "Create Data"
  goto: summary    # Jump to step with id: summary after this step
```

#### Choice Branching

Slide steps can present interactive choices:

```yaml
- slide: |
    # Choose Your Path

    Would you like to see more details or skip to the summary?
  choices:
    - label: "See Details"
      description: "Continue with full demo"
      goto: details
    - label: "Skip to Summary"
      description: "Jump ahead"
      goto: summary

- id: details
  slide: |
    # Detailed Information
    ...
  goto: summary    # Continue to summary after details

- id: summary
  slide: |
    # Summary
    ...
```

### Step Groups

Organize related steps into collapsible groups:

```yaml
steps:
  - group: "Setup"
    description: "Initial configuration"
    collapsed: false    # Optional: start collapsed
    steps:
      - slide: |
          # Getting Started
          ...
      - rest: POST /api/setup

  - group: "Main Flow"
    steps:
      - rest: GET /api/data
      - rest: POST /api/process

  # Ungrouped steps still work
  - slide: |
      # Conclusion
      ...
```

Groups appear as collapsible sections in the UI stepper.

### Try It Mode

When viewing a demo in recorded mode, users can modify form field values. If values differ from the recording defaults, a "Try with your values" button appears, allowing live API execution while still in recorded mode.

This enables:
- Viewers to experiment with different inputs
- Comparison between recorded and live responses
- Interactive demos without full live mode

### Dual Syntax

DemoScript supports two syntax styles for step definitions:

#### Concise Syntax (Original)

```yaml
- rest: GET /users/1
  title: "Fetch User"
  save:
    userName: name
```

#### Explicit Syntax (New)

```yaml
- step: rest
  method: GET
  path: /users/1
  title: "Fetch User"
  save:
    userName: name
```

Both syntaxes are fully supported and can be mixed within the same demo. The explicit syntax offers better IDE autocomplete and clearer structure for complex steps.

Explicit field mappings:
| Step Type | Concise Field | Explicit Fields |
|-----------|---------------|-----------------|
| slide | `slide:` | `step: slide`, `content:` |
| rest | `rest:` | `step: rest`, `method:`, `path:` |
| shell | `shell:` | `step: shell`, `command:` |
| browser | `browser:` | `step: browser`, `url:` |
| code | `code:` | `step: code`, `source:` |
| wait | `wait:` | `step: wait`, `duration:` |
| assert | `assert:` | `step: assert`, `condition:` |
| graphql | `graphql:` | `step: graphql`, `query:` |
| db | `db:` | `step: db`, `operation:` |

### Variable Substitution

Variables saved from previous steps can be used anywhere with `$variableName`:

```yaml
- rest: POST /api/tokens
  save:
    tokenId: id

- rest: GET /api/tokens/$tokenId    # In endpoint
  title: "Get Token $tokenId"       # In title
  headers:
    X-Token: $tokenId               # In headers

- shell: echo "Token ID is $tokenId"  # In shell commands

- slide: |
    Created token with ID: **$tokenId**   # In markdown
```

### Link Handlers

Link handlers create clickable links to external services. Define them in `settings.links`:

```yaml
settings:
  links:
    # GitHub integration
    github:
      user: "https://github.com/{value}"
      issue: "https://github.com/org/repo/issues/{value}"
      pr: "https://github.com/org/repo/pull/{value}"
    # Jira integration
    jira:
      issue: "https://mycompany.atlassian.net/browse/{value}"
    # Blockchain explorer
    polygonscan:
      address: "https://amoy.polygonscan.com/address/{value}"
      tx: "https://amoy.polygonscan.com/tx/{value}"
```

Then reference handlers in results:

```yaml
results:
  - key: username
    type: ref
    link: github       # Link handler name
    link_key: user     # Key within handler (uses github.user template)
  - key: ticketId
    type: ref
    link: jira         # Link handler name
    link_key: issue    # Key within handler (uses jira.issue template)
  - key: walletAddress
    type: ref
    link: polygonscan
    link_key: address  # Uses polygonscan.address template
```

The `{value}` placeholder is replaced with the actual result value.

## CLI Commands

### `demoscript init`
Initialize a new DemoScript project.

```bash
$ demoscript init
Creating new DemoScript project...
? Project name: my-demos
? Default base URL (optional): http://localhost:8000

Created:
  my-demos/
  ├── demoscript.config.yaml
  ├── demos/
  │   └── example/
  │       └── demo.yaml
  └── package.json

Run: cd my-demos && npm install
```

### `demoscript new <name>`
Create a new demo from template.

```bash
$ demoscript new product-tour
Created demos/product-tour/demo.yaml
Edit the file and run: demoscript serve product-tour
```

### `demoscript serve <name>`
Start dev server for live demo presentation.

```bash
$ demoscript serve feature-showcase
Starting DemoScript server...
  Demo: feature-showcase
  Mode: Live execution enabled
  URL:  http://localhost:3000

Press 'r' to reload, 'q' to quit
```

### `demoscript record <name>`
Execute all steps and save responses.

```bash
$ demoscript record feature-showcase
Recording demo: feature-showcase

[1/6] Introduction (slide) - skipped
[2/6] Create Token (rest) - POST /api/tokens
      ✓ Response saved (234ms)
[3/6] Create Vault (rest) - POST /api/vaults
      ✓ Response saved (189ms)
[4/6] Deposit Funds (rest) - POST /api/deposits
      ✓ Polling complete (4.2s)
[5/6] Check Balance (rest) - GET /api/plvs/xxx
      ✓ Response saved (45ms)
[6/6] Summary (slide) - skipped

Saved: demos/feature-showcase/recordings.json
```

### `demoscript build <name>`
Export demo as static site.

```bash
$ demoscript build feature-showcase
Building demo: feature-showcase

✓ Parsed demo.yaml
✓ Loaded recordings.json
✓ Bundled UI components
✓ Generated static assets

Output: dist/feature-showcase/
  ├── index.html (487 KB)
  ├── assets/
  └── recordings.json

Deploy anywhere or open index.html directly.
```

### `demoscript build --all`
Build all demos with gallery index.

```bash
$ demoscript build --all
Building all demos...

✓ feature-showcase
✓ product-tour
✓ api-overview

Generated gallery: dist/index.html
Total size: 1.4 MB
```

### `demoscript export-video <demo>`
Export demo as MP4 video.

```bash
$ demoscript export-video examples/browser-demo -o demo.mp4
Exporting video: examples/browser-demo
  Resolution: 1280x720
  FPS: 30
  Step delay: 2000ms

Demo: Browser Step Demo
Steps: 10

Capturing frames...
  Frame 1: Initial
  Frame 31: Step 2
  ...
✓ Captured 300 frames

Encoding video...
✓ Video saved: demo.mp4
```

Uses Puppeteer to capture frames and ffmpeg to encode. Requires a static build first.

### `demoscript export-gif <demo>`
Export demo as animated GIF.

```bash
$ demoscript export-gif examples/browser-demo -o demo.gif --optimize
Exporting GIF: examples/browser-demo
  Width: 800px
  FPS: 10
  Step delay: 2000ms
  Optimize: yes

Demo: Browser Step Demo
Steps: 10

Capturing frames...
✓ Captured 100 frames

Encoding GIF (optimizing)...
✓ GIF saved: demo.gif (2.35 MB)
```

With `--optimize`, uses two-pass encoding with palette generation for better quality.

## Media Export Architecture

### Screenshot Capture (Browser Steps)

During `demoscript record`, browser steps are captured using Puppeteer:

```
┌──────────────────────────────────────────────────────────────┐
│                     Recording Flow                             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│   Browser Step ──► Puppeteer Launch ──► Navigate to URL       │
│                                                                │
│   Wait for page load ──► Capture Screenshot ──► Save PNG      │
│                                                                │
│   Output: assets/screenshots/step-<id>.png                    │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

Key files:
- `packages/cli/src/lib/screenshot.ts` - Puppeteer wrapper
- `packages/cli/src/commands/record.ts` - Browser step handling

### Video/GIF Export

Export commands use a frame-based approach:

```
┌──────────────────────────────────────────────────────────────┐
│                     Export Flow                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│   1. Load static build ──► Open in Puppeteer                  │
│                                                                │
│   2. Navigate steps ──► Capture PNG frames                    │
│      (use keyboard navigation, delay between steps)          │
│                                                                │
│   3. Encode frames ──► ffmpeg ──► MP4/GIF output             │
│                                                                │
│   4. Cleanup temp frames                                      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

Key files:
- `packages/cli/src/lib/video-encoder.ts` - ffmpeg wrapper
- `packages/cli/src/commands/export-video.ts` - Video export
- `packages/cli/src/commands/export-gif.ts` - GIF export

Dependencies:
- `puppeteer` - Browser automation for screenshot capture
- `ffmpeg-static` - Bundled ffmpeg binary
- `fluent-ffmpeg` - Node.js ffmpeg wrapper

## React UI Components

### Component Hierarchy

```
<DemoProvider>
  <DemoRunner>
    <Header />
    <Stepper steps={...} currentStep={...} />
    <StepViewer>
      {step.type === 'slide' && <SlideStep />}
      {step.type === 'rest' && <RestStep />}
      {step.type === 'shell' && <ShellStep />}
    </StepViewer>
    <Controls />
  </DemoRunner>
</DemoProvider>
```

### Key Components

#### DemoRunner
Main orchestrator. Manages current step, execution state, stored variables.

#### Stepper
Visual progress indicator showing all steps with completion status.

#### SlideStep
Renders markdown content with syntax highlighting for code blocks.

#### RestStep
Shows:
- Method + endpoint (with syntax highlighting)
- Editable form for request body
- Request preview (curl-like display)
- Response with formatted results
- Polling status when applicable

#### ShellStep
Shows:
- Command with typing animation
- Output with ANSI color support
- Working directory indicator

#### FormBuilder
Dynamically generates form fields from YAML config.

#### ResultRenderer
Formats response values based on type (ref, currency, etc.) with appropriate links.

#### Controls
Navigation buttons, keyboard shortcuts, mode toggle (live/recorded).

## Execution Modes

### Live Mode (Presenter)
- Requires dev server running (`demoscript serve`)
- Actually executes REST calls and shell commands
- Shows real responses
- Can save new recordings

### Recorded Mode (Viewer)
- Works from static build
- No server required
- Plays back saved responses
- Form edits don't affect output (informational only)

### Mode Detection
The UI detects which mode based on:
1. If running from dev server → Live mode available
2. If running from static build → Recorded mode only

A toggle in the UI allows switching to recorded mode even when live is available (useful for testing recordings).

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up monorepo structure (npm workspaces)
- [ ] Create TypeScript types for YAML schema
- [ ] Build YAML parser with validation
- [ ] Create basic CLI scaffolding

### Phase 2: UI Core
- [ ] Port reusable components from relink demo-ui
- [ ] Create DemoRunner component
- [ ] Implement Stepper component
- [ ] Build SlideStep (markdown rendering)
- [ ] Build RestStep (form, request preview, results)
- [ ] Implement variable substitution

### Phase 3: Execution Engine
- [ ] Create dev server with REST proxy
- [ ] Implement shell command executor
- [ ] Add polling support for async operations
- [ ] Build recording capture system

### Phase 4: Static Builder
- [ ] Create Vite-based build pipeline
- [ ] Embed demo config and recordings in build
- [ ] Generate standalone HTML/JS bundles
- [ ] Add gallery index generation

### Phase 5: Polish & Example
- [ ] Create ReLink on-chain demo as example
- [ ] Add keyboard shortcuts
- [ ] Implement theming/branding
- [ ] Write documentation
- [ ] Test end-to-end workflow

## Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Monorepo | npm workspaces | Simple, no extra tooling |
| CLI | Node.js + Commander | Standard, well-supported |
| Server | Express + ws | Simple REST + WebSocket |
| UI | React 18 + TypeScript | Familiar, component-based |
| Bundler | Vite | Fast builds, good DX |
| Styling | Tailwind CSS | Rapid UI development |
| Markdown | react-markdown + remark-gfm | GitHub-flavored markdown |
| YAML | js-yaml | Standard YAML parser |
| Syntax Highlighting | Prism or Shiki | Code blocks in slides |

## Success Criteria

1. **Feature showcase works** - Complex demos with all step types work correctly
2. **Novice-friendly** - Someone unfamiliar with the codebase can create a demo by reading examples
3. **Shareable** - Built demos work when opened as local files or hosted anywhere
4. **Live execution** - Presenters can run real commands/APIs during demos
5. **Professional appearance** - UI looks polished enough for customer demos

## Open Questions

1. **Authentication**: How to handle APIs that require auth tokens? Environment variables? Secure storage?
2. **Large responses**: Should we truncate large API responses? Allow expandable sections?
3. **Error recovery**: If a step fails mid-demo, how do we handle retry/skip/abort?

*Resolved:*
- ~~Conditional steps~~ - Implemented via `goto` navigation
- ~~Branching~~ - Implemented via `choices` on slide steps

## Schema Validation

DemoScript includes JSON Schema validation for demo files. The schema is at `demo.schema.json` in the project root.

To enable IDE autocomplete, add this comment at the top of your demo.yaml:

```yaml
# yaml-language-server: $schema=../../demo.schema.json
```

Or configure your IDE's YAML extension to associate `.yaml` files with the schema.

## Appendix: Example Demos

See the examples directory for complete demo implementations:
- `examples/hello-world/` - Minimal 3-step intro
- `examples/feature-showcase/` - Comprehensive feature demo
- `examples/browser-demo/` - Browser automation demo
