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
 * Hook to generate form fields from OpenAPI spec
 *
 * If manualForm is provided, returns it directly.
 * Otherwise, fetches the OpenAPI spec and generates form fields,
 * merging in any defaults.
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

    // If no OpenAPI URL or no defaults, nothing to generate
    if (!openapiUrl || !defaults) {
      setFormFields(undefined);
      setIsLoading(false);
      return;
    }

    // Skip for GET requests (no body)
    if (method.toUpperCase() === 'GET') {
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

        // Generate form fields from spec
        const openapiFields = generateFormFields(spec, method, path);

        if (openapiFields.length === 0) {
          // No fields generated, but we have defaults - create simple fields from defaults
          const fallbackFields: FormField[] = Object.entries(defaults!).map(([name, value]) => ({
            name,
            type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'toggle' : 'text',
            default: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
              ? value
              : String(value),
          }));
          setFormFields(fallbackFields);
        } else {
          // Merge OpenAPI fields with defaults
          const merged = mergeFormFields(openapiFields, defaults);
          setFormFields(merged);
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
