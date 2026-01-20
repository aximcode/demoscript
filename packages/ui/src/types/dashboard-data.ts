/**
 * Dashboard Data Types
 * Types for data_cards and data_lists dashboard features
 */

// Data Card Types
export interface DataCard {
  label: string;
  url?: string;              // API endpoint (optional for static values)
  value?: string | number;   // JSON path or static value
  type?: 'number' | 'text' | 'currency' | 'link';
  poll_interval?: number;    // Polling interval in ms
  icon?: string;             // Optional icon name
}

// Badge Configuration for card layouts
export interface BadgeConfig {
  key: string;               // JSON path to value
  label?: string;            // Optional label override
  variants?: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'>;
}

// Card Layout Configuration
export interface CardLayoutConfig {
  badges?: BadgeConfig[];
  title: {
    key: string;
    type?: 'text' | 'currency' | 'number';
    prefix_key?: string;     // Key for prefix (e.g., type -> +/-)
    suffix_key?: string;     // Key for suffix (e.g., tokenSymbol)
  };
  fields?: DataListField[];
}

// Field Configuration (shared between card and table layouts)
export interface DataListField {
  key: string;
  label?: string;
  type?: 'text' | 'ref' | 'currency' | 'mono' | 'relative_time' | 'link';
  link?: string;             // Link handler name (github, jira, etc.) from settings.links
  link_key?: string;         // Key within link handler (e.g., 'user', 'address', 'tx')
}

// Table Column Configuration
export interface TableColumnConfig {
  key: string;
  label: string;
  type?: DataListField['type'];
  link?: string;
  link_key?: string;
}

// Data List Configuration
export interface DataList {
  label: string;
  url: string;               // API endpoint
  items: string;             // JSON path to array
  layout?: 'cards' | 'table';
  limit?: number;
  poll_interval?: number;
  empty_message?: string;
  card?: CardLayoutConfig;
  columns?: TableColumnConfig[];
}
