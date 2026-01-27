/**
 * Sandbox API - Exports
 *
 * A self-contained mock API for testing DemoScript demos.
 */

// OpenAPI specs
export { sandboxOpenApiSpec, type SandboxOpenApiSpec } from './openapi.js';
export { bookstoreOpenApiSpec } from './domains/bookstore/openapi.js';
export { fintechOpenApiSpec } from './domains/fintech/openapi.js';
export { healthcareOpenApiSpec } from './domains/healthcare/openapi.js';

// Request handlers
export { handleSandboxRequest, resetSandboxData, createSandboxSession, destroySandboxSession } from './handlers.js';

// Types
export type {
  User,
  Job,
  AuthResponse,
  ApiError,
  SandboxRequest,
  SandboxResponse,
} from './data.js';
