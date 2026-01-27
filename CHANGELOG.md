# Changelog

All notable changes to DemoScript will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-10

### Added

- **New Step Types**
  - `code` - Syntax-highlighted code display with line numbers, copy button, optional line highlighting
  - `wait` - Timed delays with countdown timer and progress bar
  - `assert` - Condition validation with pass/fail display (supports ==, !=, >, <, >=, <=)
  - `graphql` - GraphQL query execution with variables editor
  - `db` - Database queries (MongoDB, PostgreSQL, MySQL support)
- **GlowingCard Colors** - Added yellow, pink, red, emerald glow effects for new step types
- **Condition Evaluator** - Expression parser for assert step validations

### Fixed

- GlowingCard component now supports all required color variants

## [0.1.0] - 2026-01-10

### Added

- Initial release of DemoScript
- **CLI Commands**
  - `serve` - Development server with live execution
  - `record` - Execute steps and save responses to recordings.json
  - `build` - Export demos as static sites
  - `build --all` - Build gallery index for multiple demos
  - `deploy` - One-command Netlify deployment
- **Step Types**
  - `slide` - Markdown content slides
  - `rest` - REST API calls with form inputs
  - `shell` - Shell command execution
  - `browser` - Open URLs in browser
- **Features**
  - YAML-based demo configuration
  - Variable substitution with `$variableName` syntax
  - Polling support for async operations
  - Conditional step execution with `condition`
  - Light/dark mode toggle
  - Keyboard navigation (arrows, space, 'r' to reset)
  - Live reload with `--watch` flag
  - LAN access with `--host` flag
- **UI Components**
  - Step-by-step navigation
  - Response viewer with JSON formatting
  - Error display with retry functionality
  - Progress indicators for polling
- **Documentation**
  - README with quick start guide
  - YAML schema reference
  - Example demos (hello-world, feature-showcase, browser-demo)

### Technical

- Monorepo structure with npm workspaces
- TypeScript strict mode
- React 18 with Vite
- Tailwind CSS for styling
- Vitest for testing
- Express + Vite middleware for dev server
