import { useState, useEffect, useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import { substituteVariables } from '../lib/variable-substitution';
import type { FormStep as FormStepType, ExplicitFormStep, FormField } from '../types/schema';
import { getFormTitle } from '../types/schema';
import { GlowingCard, SuccessCheck } from './effects';

interface Props {
  step: FormStepType | ExplicitFormStep;
}

type FormValue = string | number | boolean;

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  value: FormValue | undefined;
  onChange: (value: FormValue) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
        <span>{field.label || field.name}</span>
        {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.readonly || disabled}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-y"
        />
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.readonly || disabled}
          className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'toggle' ? (
        <button
          type="button"
          onClick={() => onChange(!value)}
          disabled={field.readonly || disabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            value ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-slate-600'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      ) : field.type === 'slider' ? (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={Number(value) || field.min || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={field.readonly || disabled}
            className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="min-w-[3rem] text-right text-sm font-mono text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
            {value ?? field.min ?? 0}
          </span>
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) =>
            onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
          }
          disabled={field.readonly || disabled}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
        />
      )}
    </div>
  );
}

export function FormStep({ step }: Props) {
  const { state, dispatch, getStepStatus } = useDemo();
  const [formValues, setFormValues] = useState<Record<string, FormValue>>({});
  const [error, setError] = useState<string | null>(null);

  const status = getStepStatus(state.currentStep);
  const title = getFormTitle(step);
  const fields = step.fields || [];
  const submitLabel = step.submit_label || 'Continue';

  // Initialize form values from field defaults
  useEffect(() => {
    const initialValues: Record<string, FormValue> = {};
    for (const field of fields) {
      const defaultValue = field.default ?? (field.type === 'toggle' ? false : '');
      initialValues[field.name] = typeof defaultValue === 'string'
        ? substituteVariables(defaultValue, state.variables)
        : defaultValue;
    }
    setFormValues(initialValues);
    setError(null);
  }, [step, state.currentStep]);

  // Check if all required fields are filled
  const isValid = useMemo(() => {
    return fields.every((field) => {
      if (!field.required) return true;
      const value = formValues[field.name];
      if (value === undefined || value === null || value === '') return false;
      return true;
    });
  }, [fields, formValues]);

  const handleSubmit = () => {
    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }

    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'executing' } });
    setError(null);

    // Save form values to variables
    if (step.save) {
      const newVariables: Record<string, unknown> = {};
      for (const [varName, source] of Object.entries(step.save)) {
        if (source === '$formData') {
          // Save entire form data
          newVariables[varName] = { ...formValues };
        } else if (source.startsWith('$')) {
          // Save specific field value
          const fieldName = source.slice(1);
          if (formValues[fieldName] !== undefined) {
            newVariables[varName] = formValues[fieldName];
          }
        }
      }

      if (Object.keys(newVariables).length > 0) {
        dispatch({ type: 'SET_VARIABLES', payload: newVariables });
      }
    }

    // Mark step complete
    dispatch({ type: 'SET_STEP_STATUS', payload: { step: state.currentStep, status: 'complete' } });
  };

  const handleChange = (name: string, value: FormValue) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <GlowingCard isActive={status === 'complete'} color="indigo" intensity="medium">
      <div className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md dark:shadow-xl border border-gray-200 dark:border-indigo-500/20 overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
                {step.description && (
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            {status === 'complete' && <SuccessCheck size={24} animated={false} />}
          </div>
        </div>

        {/* Form fields */}
        {fields.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
            <div className="space-y-4">
              {fields.filter(f => !f.hidden).map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={formValues[field.name]}
                  onChange={(val) => handleChange(field.name, val)}
                  disabled={status === 'executing' || status === 'complete'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
          <button
            onClick={handleSubmit}
            disabled={status === 'executing' || status === 'complete'}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2"
          >
            {status === 'executing' ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : status === 'complete' ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Submitted
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {submitLabel}
              </>
            )}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500/30">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success message with saved values */}
        {status === 'complete' && step.save && (
          <div className="p-4 bg-green-50 dark:bg-green-500/10">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Form data saved to variables
            </div>
          </div>
        )}
      </div>
    </GlowingCard>
  );
}
