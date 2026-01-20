/**
 * @demoscript/shared - Shared utilities for DemoScript packages
 *
 * This package provides:
 * - Type definitions (FormField, ResultField)
 * - OpenAPI processing utilities (generateFormFields, mergeFormFields, etc.)
 * - Variable substitution utilities (substituteVariables, extractValueByPath, etc.)
 *
 * Used by CLI and UI packages for OpenAPI integration, type definitions,
 * and variable substitution.
 */

// Re-export all types
export * from './types/index.js';

// Re-export OpenAPI utilities
export * from './openapi/index.js';

// Re-export variable utilities
export * from './variables/index.js';
