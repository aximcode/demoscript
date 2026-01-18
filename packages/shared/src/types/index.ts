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
  type?: 'text' | 'address' | 'tx' | 'token' | 'link' | 'currency' | 'code' | 'table' | 'json' | 'mono' | 'relative_time';
  link?: string;
  format?: string;
  columns?: TableColumn[];
  // JSON viewer options
  expandedDepth?: number;
}
