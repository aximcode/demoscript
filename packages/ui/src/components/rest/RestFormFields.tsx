import type { FormField } from '../../types/schema';

interface Props {
  fields: FormField[];
  values: Record<string, string | number | boolean>;
  onChange: (name: string, value: string | number | boolean) => void;
  isFieldModified: (name: string) => boolean;
  disabled: boolean;
}

export function RestFormFields({ fields, values, onChange, isFieldModified, disabled }: Props) {
  const visibleFields = fields.filter((f) => !f.hidden);

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-slate-700/50 p-4 bg-gray-50/50 dark:bg-slate-900/30">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Request Parameters</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleFields.map((field) => (
          <div key={field.name} className="relative">
            <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">
              {field.label || field.name}
              {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
              {isFieldModified(field.name) && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                  modified
                </span>
              )}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={String(values[field.name] ?? '')}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={field.readonly || disabled}
                placeholder={field.placeholder}
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
              />
            ) : field.type === 'select' ? (
              <select
                value={String(values[field.name] ?? '')}
                onChange={(e) => onChange(field.name, e.target.value)}
                disabled={field.readonly || disabled}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
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
                onClick={() => onChange(field.name, !values[field.name])}
                disabled={field.readonly || disabled}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                  values[field.name] ? 'bg-theme-primary' : 'bg-gray-200 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    values[field.name] ? 'translate-x-5' : 'translate-x-0'
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
                  value={Number(values[field.name]) || field.min || 0}
                  onChange={(e) => onChange(field.name, Number(e.target.value))}
                  disabled={field.readonly || disabled}
                  className="flex-1 h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-theme-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="min-w-[3rem] text-right text-sm font-mono text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                  {values[field.name] ?? field.min ?? 0}
                </span>
              </div>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(values[field.name] ?? '')}
                onChange={(e) =>
                  onChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)
                }
                disabled={field.readonly || disabled}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-mono text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
