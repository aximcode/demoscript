/**
 * OpenAPI processing utilities for DemoScript
 * Generates form fields and result fields from OpenAPI specs
 * Provides endpoint browsing and search functionality
 */

import type { FormField, ResultField } from '../types/index.js';

// Endpoint info for browser display
export interface EndpointInfo {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated?: boolean;
}

// OpenAPI 3.0 Types

export interface OpenApiSpec {
  openapi?: string;  // OpenAPI 3.0
  swagger?: string;  // Swagger 2.0
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, OpenApiPath>;
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
  definitions?: Record<string, JsonSchema>;  // Swagger 2.0
}

export interface OpenApiPath {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
  patch?: OpenApiOperation;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content: Record<string, { schema: JsonSchema }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: JsonSchema }>;
  }>;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';  // 'body' for Swagger 2.0
  required?: boolean;
  schema?: JsonSchema;
  description?: string;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  default?: unknown;
  description?: string;
  enum?: unknown[];
  items?: JsonSchema;
  $ref?: string;
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

// In-memory cache for OpenAPI specs
const specCache = new Map<string, { spec: OpenApiSpec; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch and cache an OpenAPI spec
 */
export async function fetchOpenApiSpec(url: string): Promise<OpenApiSpec | null> {
  // Check cache
  const cached = specCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.spec;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch OpenAPI spec from ${url}: ${response.status}`);
      return null;
    }

    const spec = await response.json() as OpenApiSpec;

    // Validate it looks like an OpenAPI or Swagger spec
    if ((!spec.openapi && !spec.swagger) || !spec.paths) {
      console.warn(`Invalid OpenAPI spec from ${url}: missing openapi/swagger or paths`);
      return null;
    }

    // Cache the spec
    specCache.set(url, { spec, timestamp: Date.now() });

    return spec;
  } catch (err) {
    console.warn(`Error fetching OpenAPI spec from ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Clear the OpenAPI spec cache
 */
export function clearOpenApiCache(): void {
  specCache.clear();
}

/**
 * Resolve a $ref in an OpenAPI spec
 */
function resolveRef(spec: OpenApiSpec, ref: string): JsonSchema | null {
  // Handle OpenAPI 3.0: #/components/schemas/SchemaName
  const componentsMatch = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (componentsMatch && spec.components?.schemas) {
    return spec.components.schemas[componentsMatch[1]] || null;
  }

  // Handle Swagger 2.0: #/definitions/SchemaName
  const definitionsMatch = ref.match(/^#\/definitions\/(.+)$/);
  if (definitionsMatch && spec.definitions) {
    return spec.definitions[definitionsMatch[1]] || null;
  }

  return null;
}

/**
 * Resolve a schema, handling $ref and allOf
 */
function resolveSchema(spec: OpenApiSpec, schema: JsonSchema): JsonSchema {
  if (schema.$ref) {
    const resolved = resolveRef(spec, schema.$ref);
    if (resolved) {
      return resolveSchema(spec, resolved);
    }
  }

  if (schema.allOf) {
    // Merge all schemas in allOf
    const merged: JsonSchema = { type: 'object', properties: {}, required: [] };
    for (const subSchema of schema.allOf) {
      const resolved = resolveSchema(spec, subSchema);
      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
      }
      if (resolved.required) {
        merged.required = [...(merged.required || []), ...resolved.required];
      }
    }
    return merged;
  }

  return schema;
}

/**
 * Map OpenAPI type to FormField type
 */
function mapType(schema: JsonSchema): FormField['type'] {
  if (schema.enum) {
    return 'select';
  }

  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'select'; // Will have true/false options
    case 'array':
    case 'object':
      return 'textarea'; // JSON input
    case 'string':
    default:
      return 'text';
  }
}

/**
 * Generate select options from schema
 */
function generateOptions(schema: JsonSchema): Array<{ value: string; label: string }> | undefined {
  if (schema.enum) {
    return schema.enum.map(v => ({
      value: String(v),
      label: String(v),
    }));
  }

  if (schema.type === 'boolean') {
    return [
      { value: 'true', label: 'true' },
      { value: 'false', label: 'false' },
    ];
  }

  return undefined;
}

/**
 * Generate FormField[] from an OpenAPI operation's request body
 */
export function generateFormFields(
  spec: OpenApiSpec,
  method: string,
  path: string
): FormField[] {
  const pathObj = spec.paths[path];
  if (!pathObj) {
    // Try with path parameters like /plvs/{plvId}/deposits
    const normalizedPath = path.replace(/\$\w+/g, match => `{${match.slice(1)}}`);
    const matchingPath = Object.keys(spec.paths).find(p => {
      const pattern = p.replace(/\{[^}]+\}/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(normalizedPath);
    });
    if (matchingPath) {
      return generateFormFieldsFromPath(spec, spec.paths[matchingPath], method);
    }
    return [];
  }

  return generateFormFieldsFromPath(spec, pathObj, method);
}

function generateFormFieldsFromPath(
  spec: OpenApiSpec,
  pathObj: OpenApiPath,
  method: string
): FormField[] {
  const operation = pathObj[method.toLowerCase() as keyof OpenApiPath];
  if (!operation) {
    return [];
  }

  let bodySchema: JsonSchema | null = null;

  // OpenAPI 3.0: requestBody.content['application/json'].schema
  if (operation.requestBody) {
    const jsonContent = operation.requestBody.content['application/json'];
    if (jsonContent?.schema) {
      bodySchema = jsonContent.schema;
    }
  }

  // Swagger 2.0: parameters with in: 'body'
  if (!bodySchema && operation.parameters) {
    const bodyParam = operation.parameters.find(p => p.in === 'body');
    if (bodyParam?.schema) {
      bodySchema = bodyParam.schema;
    }
  }

  if (!bodySchema) {
    return [];
  }

  const schema = resolveSchema(spec, bodySchema);
  if (!schema.properties) {
    return [];
  }

  const requiredFields = schema.required || [];
  const fields: FormField[] = [];

  for (const [name, propSchema] of Object.entries(schema.properties)) {
    const resolved = resolveSchema(spec, propSchema);
    const field: FormField = {
      name,
      label: resolved.description || name,
      type: mapType(resolved),
      required: requiredFields.includes(name),
    };

    // Add default if present
    if (resolved.default !== undefined) {
      field.default = resolved.default as string | number;
    }

    // Add options for select fields
    const options = generateOptions(resolved);
    if (options) {
      field.options = options;
    }

    // Add placeholder from description if no label override
    if (resolved.description && field.label === name) {
      field.placeholder = resolved.description;
    }

    fields.push(field);
  }

  return fields;
}

/**
 * Merge OpenAPI-generated fields with manual defaults and overrides
 *
 * Priority (smart merge - each layer inherits from previous):
 * 1. OpenAPI schema (base: type, required, options, description)
 * 2. defaults: values (override default values only)
 * 3. form: fields (partial override - only specified properties are changed)
 *
 * This allows YAML like:
 *   defaults:
 *     wallet: "0x..."
 *   form:
 *     - name: wallet
 *       label: "From Wallet"  # Only override the label, inherit default from above
 */
export function mergeFormFields(
  openapiFields: FormField[],
  defaults?: Record<string, unknown>,
  manualFields?: FormField[]
): FormField[] {
  // Start with OpenAPI fields
  const fieldMap = new Map<string, FormField>();

  for (const field of openapiFields) {
    fieldMap.set(field.name, { ...field });
  }

  // Apply defaults
  if (defaults) {
    for (const [name, value] of Object.entries(defaults)) {
      const existing = fieldMap.get(name);
      if (existing) {
        existing.default = value as string | number;
      } else {
        // Create a new field for defaults not in OpenAPI
        fieldMap.set(name, {
          name,
          default: value as string | number,
          type: typeof value === 'number' ? 'number' : 'text',
        });
      }
    }
  }

  // Apply manual overrides (smart merge - inherit from OpenAPI + defaults)
  if (manualFields) {
    for (const manualField of manualFields) {
      const existing = fieldMap.get(manualField.name);
      if (existing) {
        // Merge: start with existing (OpenAPI + defaults), override only specified properties
        const merged: FormField = { ...existing };

        // Only override properties that are explicitly set in the manual field
        if (manualField.label !== undefined) merged.label = manualField.label;
        if (manualField.type !== undefined) merged.type = manualField.type;
        if (manualField.default !== undefined) merged.default = manualField.default;
        if (manualField.required !== undefined) merged.required = manualField.required;
        if (manualField.readonly !== undefined) merged.readonly = manualField.readonly;
        if (manualField.hidden !== undefined) merged.hidden = manualField.hidden;
        if (manualField.placeholder !== undefined) merged.placeholder = manualField.placeholder;
        if (manualField.options !== undefined) merged.options = manualField.options;

        fieldMap.set(manualField.name, merged);
      } else {
        // No existing field - use manual field as-is
        fieldMap.set(manualField.name, { ...manualField });
      }
    }
  }

  return Array.from(fieldMap.values());
}

/**
 * Get endpoint info from OpenAPI for display
 */
export function getEndpointInfo(
  spec: OpenApiSpec,
  method: string,
  path: string
): { summary?: string; description?: string } | null {
  const pathObj = spec.paths[path];
  if (!pathObj) {
    return null;
  }

  const operation = pathObj[method.toLowerCase() as keyof OpenApiPath];
  if (!operation) {
    return null;
  }

  return {
    summary: operation.summary,
    description: operation.description,
  };
}

/**
 * Convert camelCase/snake_case to human-readable label
 */
function formatLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
}

/**
 * Map OpenAPI schema to DemoScript result type based on format, type, and property name
 */
function mapSchemaToResultType(
  schema: JsonSchema,
  propertyName: string
): ResultField['type'] {
  const nameLower = propertyName.toLowerCase();

  // Array or object -> JSON tree viewer
  if (schema.type === 'array' || schema.type === 'object') {
    return 'json';
  }

  // Check format first (takes precedence)
  if (schema.format) {
    switch (schema.format) {
      case 'date-time':
      case 'date':
        return 'relative_time';
      case 'uri':
      case 'url':
        return 'link';
      case 'uuid':
        return 'mono';
    }
  }

  // Name-based heuristics for strings
  if (schema.type === 'string') {
    if (nameLower.includes('url') || nameLower.includes('link') || nameLower.includes('href')) {
      return 'link';
    }
    if (nameLower.includes('id') || nameLower.includes('uuid')) {
      return 'mono';
    }
    // Identifiers that benefit from truncation (addresses, hashes, etc.)
    if (nameLower.includes('address') || nameLower.includes('wallet')) {
      return 'ref';
    }
    if (nameLower.includes('hash') || nameLower.includes('txid') || nameLower === 'tx') {
      return 'ref';
    }
  }

  // Number-based heuristics
  if (schema.type === 'number' || schema.type === 'integer') {
    if (nameLower.includes('price') || nameLower.includes('amount') ||
        nameLower.includes('balance') || nameLower.includes('total') ||
        nameLower.includes('cost') || nameLower.includes('fee')) {
      return 'currency';
    }
    if (nameLower.includes('id')) {
      return 'mono';
    }
  }

  return 'text';
}

/**
 * Generate ResultField[] from an OpenAPI operation's response schema
 *
 * When a REST step doesn't specify `results:`, this function can auto-generate
 * result fields from the OpenAPI response schema.
 */
export function generateResultFields(
  spec: OpenApiSpec,
  method: string,
  path: string
): ResultField[] {
  const pathObj = spec.paths[path];
  if (!pathObj) {
    // Try with path parameters like /plvs/{plvId}/deposits
    const normalizedPath = path.replace(/\$\w+/g, match => `{${match.slice(1)}}`);
    const matchingPath = Object.keys(spec.paths).find(p => {
      const pattern = p.replace(/\{[^}]+\}/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(normalizedPath);
    });
    if (matchingPath) {
      return generateResultFieldsFromPath(spec, spec.paths[matchingPath], method);
    }
    return [];
  }

  return generateResultFieldsFromPath(spec, pathObj, method);
}

function generateResultFieldsFromPath(
  spec: OpenApiSpec,
  pathObj: OpenApiPath,
  method: string
): ResultField[] {
  const operation = pathObj[method.toLowerCase() as keyof OpenApiPath];
  if (!operation) {
    return [];
  }

  // Get 200 or 201 response
  const successResponse = operation.responses['200'] || operation.responses['201'];
  if (!successResponse?.content) {
    return [];
  }

  // Get JSON response schema
  const jsonContent = successResponse.content['application/json'];
  if (!jsonContent?.schema) {
    return [];
  }

  // Always show response as a collapsible JSON tree
  // This provides a consistent experience and lets users see the full structure
  return [{
    key: '',
    label: 'Response',
    type: 'json',
    expandedDepth: 2
  }];
}

// --- Endpoint Browser Utilities ---

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

/**
 * Extract all endpoints from an OpenAPI spec
 */
export function getAllEndpoints(spec: OpenApiSpec): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];

  for (const [path, pathObj] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathObj[method];
      if (operation) {
        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          tags: operation.tags || ['Untagged'],
          deprecated: false, // OpenAPI 3.0 has deprecated field on operation
        });
      }
    }
  }

  return endpoints;
}

/**
 * Group endpoints by their first tag
 * Returns a Map where keys are tag names and values are arrays of endpoints
 */
export function groupEndpointsByTag(spec: OpenApiSpec): Map<string, EndpointInfo[]> {
  const endpoints = getAllEndpoints(spec);
  const grouped = new Map<string, EndpointInfo[]>();

  for (const endpoint of endpoints) {
    // Use first tag, or 'Untagged' if no tags
    const tag = endpoint.tags[0] || 'Untagged';

    if (!grouped.has(tag)) {
      grouped.set(tag, []);
    }
    grouped.get(tag)!.push(endpoint);
  }

  // Sort endpoints within each tag by path, then method
  for (const [, tagEndpoints] of grouped) {
    tagEndpoints.sort((a, b) => {
      const pathCompare = a.path.localeCompare(b.path);
      if (pathCompare !== 0) return pathCompare;
      return HTTP_METHODS.indexOf(a.method.toLowerCase() as typeof HTTP_METHODS[number]) -
             HTTP_METHODS.indexOf(b.method.toLowerCase() as typeof HTTP_METHODS[number]);
    });
  }

  // Sort tags alphabetically, but put 'Untagged' last
  const sortedMap = new Map<string, EndpointInfo[]>();
  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Untagged') return 1;
    if (b === 'Untagged') return -1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    sortedMap.set(key, grouped.get(key)!);
  }

  return sortedMap;
}

/**
 * Search endpoints by query string
 * Searches in path, method, summary, description, and operationId
 */
export function searchEndpoints(spec: OpenApiSpec, query: string): EndpointInfo[] {
  if (!query.trim()) {
    return getAllEndpoints(spec);
  }

  const q = query.toLowerCase().trim();
  const endpoints = getAllEndpoints(spec);

  return endpoints.filter(endpoint => {
    return (
      endpoint.path.toLowerCase().includes(q) ||
      endpoint.method.toLowerCase().includes(q) ||
      endpoint.summary?.toLowerCase().includes(q) ||
      endpoint.description?.toLowerCase().includes(q) ||
      endpoint.operationId?.toLowerCase().includes(q) ||
      endpoint.tags.some(tag => tag.toLowerCase().includes(q))
    );
  });
}

/**
 * Get operation details for a specific endpoint
 */
export function getOperationDetails(
  spec: OpenApiSpec,
  method: string,
  path: string
): OpenApiOperation | null {
  const pathObj = spec.paths[path];
  if (!pathObj) return null;

  return pathObj[method.toLowerCase() as keyof OpenApiPath] || null;
}

/**
 * Get parameter fields for an endpoint (path, query, header params)
 */
export function getParameterFields(
  spec: OpenApiSpec,
  method: string,
  path: string
): FormField[] {
  const operation = getOperationDetails(spec, method, path);
  if (!operation?.parameters) return [];

  const fields: FormField[] = [];

  for (const param of operation.parameters) {
    // Skip body parameters (handled separately)
    if (param.in === 'body') continue;

    const schema = param.schema || { type: 'string' };
    const resolved = resolveSchema(spec, schema);

    const field: FormField = {
      name: param.name,
      label: param.description || formatLabel(param.name),
      type: mapType(resolved),
      required: param.required || false,
      placeholder: `${param.in} parameter`,
    };

    if (resolved.default !== undefined) {
      field.default = resolved.default as string | number;
    }

    const options = generateOptions(resolved);
    if (options) {
      field.options = options;
    }

    fields.push(field);
  }

  return fields;
}
