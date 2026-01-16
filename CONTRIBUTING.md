# Contributing to DemoScript

Thank you for your interest in contributing to DemoScript! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/demoscript.git
   cd demoscript
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   cd packages/cli && npm test
   cd ../ui && npm test
   ```

## Project Structure

```
demoscript/
├── packages/
│   ├── cli/          # CLI tool (serve, record, build commands)
│   │   ├── src/
│   │   │   ├── commands/   # CLI command implementations
│   │   │   ├── lib/        # Shared utilities
│   │   │   └── server/     # Express middleware
│   │   └── package.json
│   └── ui/           # React web interface
│       ├── src/
│       │   ├── components/ # React components
│       │   ├── context/    # React context providers
│       │   ├── lib/        # Utility functions
│       │   └── types/      # TypeScript types
│       └── package.json
├── examples/         # Example demos
└── package.json      # Root workspace config
```

## Development Workflow

### UI Development

```bash
cd packages/ui
npm run dev
```

This starts the Vite dev server with hot reload.

### CLI Development

```bash
cd packages/cli
npm run build
```

Then test with:
```bash
node dist/index.js serve ../examples/hello-world
```

### Running a Demo

```bash
npm run build
node packages/cli/dist/index.js serve examples/hello-world --port 3000
```

## Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS
- **Formatting**: Use your editor's default formatting

### Guidelines

1. Keep components small and focused
2. Use TypeScript types from `packages/ui/src/types/schema.ts`
3. Test utility functions (see `*.test.ts` files)
4. Avoid adding dependencies unless necessary

## Testing

We use Vitest for testing. Tests are located alongside source files with `.test.ts` suffix.

```bash
# Run CLI tests
cd packages/cli && npm test

# Run UI tests
cd packages/ui && npm test
```

### Writing Tests

- Test utility functions thoroughly
- Focus on edge cases and error handling
- Use descriptive test names

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure tests pass
4. Update documentation if needed
5. Submit a pull request

### PR Guidelines

- Keep PRs focused on a single feature or fix
- Include a clear description of changes
- Reference any related issues

## Adding a New Step Type

To add a new step type:

1. **Define the type** in `packages/ui/src/types/schema.ts`:
   ```typescript
   export interface MyNewStep extends BaseStep {
     myNew: string;
     // ... other properties
   }
   ```

2. **Create the component** in `packages/ui/src/components/MyNewStep.tsx`

3. **Add type guard** in `packages/ui/src/types/schema.ts`:
   ```typescript
   export function isMyNewStep(step: Step): step is MyNewStep {
     return 'myNew' in step;
   }
   ```

4. **Register in StepViewer** (`packages/ui/src/components/StepViewer.tsx`):
   ```typescript
   if (isMyNewStep(step)) {
     return <MyNewStep step={step} />;
   }
   ```

5. **Add CLI support** if the step needs server-side execution

## Reporting Issues

When reporting issues, please include:

- DemoScript version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the project's license.
