/**
 * Shared types for DemoScript packages
 * Used by CLI, Cloud, and UI
 */

/**
 * Option for select fields
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Form field definition for REST step inputs
 * Supports text, number, select, textarea, toggle, and slider types
 */
export interface FormField {
  name: string;
  label?: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'toggle' | 'slider';
  default?: string | number | boolean;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  // Slider-specific properties
  min?: number;
  max?: number;
  step?: number;
  // Textarea-specific properties
  rows?: number;  // Default number of rows for textarea (default: 2)
  // Parameter location (from OpenAPI)
  paramIn?: 'query' | 'path' | 'body';  // Where parameter is sent (default: body)
}

/**
 * Table column definition for result display
 */
export interface TableColumn {
  key: string;
  label: string;
}

/**
 * Result field definition for displaying API response data
 * Supports various display types for different data formats
 */
export interface ResultField {
  key: string;
  label?: string;
  type?: 'text' | 'ref' | 'link' | 'currency' | 'code' | 'table' | 'json' | 'mono' | 'relative_time';
  link?: string;           // Link handler name (e.g., 'github', 'polygonscan')
  link_key?: string;       // Key within link handler (e.g., 'user', 'address', 'tx')
  format?: string;
  columns?: TableColumn[];
  // JSON viewer options
  expandedDepth?: number;
}
