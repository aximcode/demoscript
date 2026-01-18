/**
 * OpenAPI utilities - re-exported from @demoscript/shared
 *
 * This module re-exports all OpenAPI processing functions from the shared package
 * to maintain backward compatibility with existing CLI code.
 */

// Re-export all OpenAPI functions and types
export {
  fetchOpenApiSpec,
  clearOpenApiCache,
  generateFormFields,
  mergeFormFields,
  getEndpointInfo,
  generateResultFields,
} from '@demoscript/shared/openapi';

export type {
  OpenApiSpec,
  OpenApiPath,
  OpenApiOperation,
  OpenApiParameter,
  JsonSchema,
} from '@demoscript/shared/openapi';

// Re-export types that were imported here for backward compatibility
export type { FormField, ResultField } from '@demoscript/shared/types';
