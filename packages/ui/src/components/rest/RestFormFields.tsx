import { useMemo } from 'react';
import type { FormField } from '../../types/schema';

interface Props {
  fields: FormField[];
  values: Record<string, string | number | boolean>;
  onChange: (name: string, value: string | number | boolean) => void;
  isFieldModified: (name: string) => boolean;
  disabled: boolean;
}

// Render a single form field
function FieldInput({
  field,
  value,
  onChange,
  isModified,
  disabled,
}: {
  field: FormField;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  isModified: boolean;
  disabled: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
        <span className="truncate">{field.label || field.name}</span>
        {field.required && <span className="text-red-500 dark:text-red-400 flex-shrink-0">*</span>}
        {isModified && (
          <span className="flex-shrink-0 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
            modified
          </span>
        )}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.readonly || disabled}
          placeholder={field.placeholder}
          rows={field.rows ?? 2}
          className="w-full px-3 py-1.5 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary resize-y"
        />
      ) : field.type === 'select' ? (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.readonly || disabled}
          className="w-full px-3 py-1.5 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
        >
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
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            value ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-slate-600'
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
            className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-theme-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-full px-3 py-1.5 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
        />
      )}
    </div>
  );
}

// Render a group of fields with a header
function FieldGroup({
  title,
  fields,
  values,
  onChange,
  isFieldModified,
  disabled,
}: {
  title: string;
  fields: FormField[];
  values: Record<string, string | number | boolean>;
  onChange: (name: string, value: string | number | boolean) => void;
  isFieldModified: (name: string) => boolean;
  disabled: boolean;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
        {title}
      </h4>
      <div className="grid gap-x-3 gap-y-2 md:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(val) => onChange(field.name, val)}
            isModified={isFieldModified(field.name)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export function RestFormFields({ fields, values, onChange, isFieldModified, disabled }: Props) {
  const visibleFields = fields.filter((f) => !f.hidden);

  // Group fields by paramIn type
  const { pathFields, queryFields, bodyFields } = useMemo(() => {
    const path: FormField[] = [];
    const query: FormField[] = [];
    const body: FormField[] = [];

    for (const field of visibleFields) {
      if (field.paramIn === 'path') {
        path.push(field);
      } else if (field.paramIn === 'query') {
        query.push(field);
      } else {
        body.push(field);
      }
    }

    return { pathFields: path, queryFields: query, bodyFields: body };
  }, [visibleFields]);

  if (visibleFields.length === 0) {
    return null;
  }

  // Determine if we need section headers (only if multiple types present)
  const hasMultipleSections = [pathFields, queryFields, bodyFields].filter(arr => arr.length > 0).length > 1;

  return (
    <div className="border-b border-gray-200 dark:border-slate-700/50 p-3 bg-gray-50/50 dark:bg-slate-900/30">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
        Request Parameters
      </h3>

      {hasMultipleSections ? (
        <div className="space-y-3">
          <FieldGroup
            title="Path Parameters"
            fields={pathFields}
            values={values}
            onChange={onChange}
            isFieldModified={isFieldModified}
            disabled={disabled}
          />
          <FieldGroup
            title="Query Parameters"
            fields={queryFields}
            values={values}
            onChange={onChange}
            isFieldModified={isFieldModified}
            disabled={disabled}
          />
          <FieldGroup
            title="Request Body"
            fields={bodyFields}
            values={values}
            onChange={onChange}
            isFieldModified={isFieldModified}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="grid gap-x-3 gap-y-2 md:grid-cols-2">
          {visibleFields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(val) => onChange(field.name, val)}
              isModified={isFieldModified(field.name)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
