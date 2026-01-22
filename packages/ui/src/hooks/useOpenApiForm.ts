import { useState, useEffect } from 'react';
import { fetchOpenApiSpec, generateFormFields, mergeFormFields } from '@demoscript/shared/openapi';
import type { FormField } from '../types/schema';

interface UseOpenApiFormProps {
  openapiUrl: string | undefined;
  method: string;
  path: string;
  defaults?: Record<string, unknown>;
  manualForm?: FormField[];
}

interface UseOpenApiFormReturn {
  formFields: FormField[] | undefined;
  isLoading: boolean;
  error: string | null;
}

/**
 * Strip query string from path for OpenAPI lookup
 * e.g., "/pet/findByStatus?status=available" -> "/pet/findByStatus"
 */
function stripQueryString(path: string): string {
  const queryIndex = path.indexOf('?');
  return queryIndex >= 0 ? path.slice(0, queryIndex) : path;
}

/**
 * Hook to generate form fields from OpenAPI spec
 *
 * If manualForm is provided, returns it directly.
 * Otherwise, fetches the OpenAPI spec and generates form fields,
 * merging in any defaults.
 *
 * Supports both request body fields (POST/PUT/PATCH) and
 * query/path parameters (GET and all methods).
 */
export function useOpenApiForm({
  openapiUrl,
  method,
  path,
  defaults,
  manualForm,
}: UseOpenApiFormProps): UseOpenApiFormReturn {
  const [formFields, setFormFields] = useState<FormField[] | undefined>(manualForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If manual form is provided, use it directly
    if (manualForm && manualForm.length > 0) {
      setFormFields(manualForm);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If no OpenAPI URL, nothing to generate
    if (!openapiUrl) {
      setFormFields(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function loadSpec() {
      try {
        const spec = await fetchOpenApiSpec(openapiUrl!);
        if (cancelled) return;

        if (!spec) {
          setError('Failed to load OpenAPI spec');
          setFormFields(undefined);
          setIsLoading(false);
          return;
        }

        // Strip query string from path for OpenAPI lookup
        const cleanPath = stripQueryString(path);

        // Generate form fields from spec (includes query/path params and body fields)
        const openapiFields = generateFormFields(spec, method, cleanPath);

        if (openapiFields.length === 0 && defaults) {
          // No fields generated from OpenAPI, but we have defaults - create simple fields
          const fallbackFields: FormField[] = Object.entries(defaults).map(([name, value]) => ({
            name,
            type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'toggle' : 'text',
            default: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? value
              : String(value),
          }));
          setFormFields(fallbackFields);
        } else if (openapiFields.length > 0) {
          // Merge OpenAPI fields with defaults (if any)
          const merged = defaults ? mergeFormFields(openapiFields, defaults) : openapiFields;
          setFormFields(merged);
        } else {
          // No fields and no defaults
          setFormFields(undefined);
        }

        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error loading OpenAPI spec');
        setFormFields(undefined);
        setIsLoading(false);
      }
    }

    loadSpec();

    return () => {
      cancelled = true;
    };
  }, [openapiUrl, method, path, defaults, manualForm]);

  return { formFields, isLoading, error };
}
