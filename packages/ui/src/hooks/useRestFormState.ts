import { useState, useMemo, useCallback, useEffect, useRef, SetStateAction, Dispatch } from 'react';
import { substituteVariables } from '../lib/variable-substitution';
import type { FormField } from '../types/schema';

interface UseRestFormStateProps {
  form: FormField[] | undefined;
  variables: Record<string, unknown>;
}

type FormValue = string | number | boolean;

interface UseRestFormStateReturn {
  formValues: Record<string, FormValue>;
  setFormValues: Dispatch<SetStateAction<Record<string, FormValue>>>;
  defaultValues: Record<string, FormValue>;
  hasModifications: boolean;
  isFieldModified: (fieldName: string) => boolean;
}

// Helper to compute default values from form fields
function computeDefaults(form: FormField[] | undefined, variables: Record<string, unknown>): Record<string, FormValue> {
  const defaults: Record<string, FormValue> = {};
  form?.forEach((field) => {
    const defaultValue = field.default ?? (field.type === 'toggle' ? false : '');
    defaults[field.name] = typeof defaultValue === 'string'
      ? substituteVariables(defaultValue, variables)
      : defaultValue;
  });
  return defaults;
}

// Create a stable key for form fields to detect when they actually change
function getFormKey(form: FormField[] | undefined): string {
  if (!form) return '';
  return form.map(f => `${f.name}:${f.default ?? ''}`).join('|');
}

export function useRestFormState({ form, variables }: UseRestFormStateProps): UseRestFormStateReturn {
  // Initialize form values from defaults
  const [formValues, setFormValues] = useState<Record<string, FormValue>>(() =>
    computeDefaults(form, variables)
  );

  // Track the previous form key to detect actual changes
  const prevFormKeyRef = useRef<string>(getFormKey(form));

  // Compute default values for modification detection
  const defaultValues = useMemo(() => computeDefaults(form, variables), [form, variables]);

  // Re-initialize form values when form fields change (e.g., OpenAPI fields loaded)
  useEffect(() => {
    const currentFormKey = getFormKey(form);
    if (currentFormKey !== prevFormKeyRef.current) {
      prevFormKeyRef.current = currentFormKey;
      setFormValues(computeDefaults(form, variables));
    }
  }, [form, variables]);

  // Check if form values have been modified from defaults
  const hasModifications = useMemo(() => {
    if (!form) return false;
    return form.some((field) => {
      const currentVal = String(formValues[field.name] ?? '');
      const defaultVal = String(defaultValues[field.name] ?? '');
      return currentVal !== defaultVal;
    });
  }, [formValues, defaultValues, form]);

  // Check if specific field is modified
  const isFieldModified = useCallback((fieldName: string): boolean => {
    const currentVal = String(formValues[fieldName] ?? '');
    const defaultVal = String(defaultValues[fieldName] ?? '');
    return currentVal !== defaultVal;
  }, [formValues, defaultValues]);

  return {
    formValues,
    setFormValues,
    defaultValues,
    hasModifications,
    isFieldModified,
  };
}
