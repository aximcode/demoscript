/**
 * @demoscript/shared - Shared utilities for DemoScript packages
 *
 * This package provides:
 * - Type definitions (FormField, ResultField)
 * - OpenAPI processing utilities (generateFormFields, mergeFormFields, etc.)
 *
 * Used by:
 * - packages/cli - For OpenAPI integration in local development
 * - packages/cloud - For OpenAPI integration in cloud recordings
 * - packages/ui - For type definitions
 */

// Re-export all types
export * from './types/index.js';

// Re-export OpenAPI utilities
export * from './openapi/index.js';
