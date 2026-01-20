/**
 * DemoScript YAML Schema Types
 */

// Re-export shared types for backward compatibility
export type {
  FormField,
  ResultField,
  SelectOption,
  TableColumn,
} from '@demoscript/shared/types';

// Re-export dashboard data types
export type {
  DataCard,
  DataList,
  DataListField,
  BadgeConfig,
  CardLayoutConfig,
  TableColumnConfig,
} from './dashboard-data';

import type { DataCard, DataList } from './dashboard-data';
import type { FormField, ResultField } from '@demoscript/shared/types';

export interface DemoConfig {
  title: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  metadata?: DemoMetadata;
  settings?: DemoSettings;
  steps: StepOrGroup[];
}

export interface EffectsSettings {
  confetti?: boolean;       // Fire confetti on step completion (default: true)
  sounds?: boolean;         // Play success/error sounds (default: true)
  transitions?: boolean;    // Animate step changes (default: true)
  counters?: boolean;       // Animate numeric values (default: true)
  neon_glow?: boolean;      // Neon text effects in dark mode (default: true)
  grid_background?: boolean; // Animated grid background in dark mode (default: true)
  glow_orbs?: boolean;      // Floating glow orbs in dark mode (default: true)
  sound_volume?: number;    // Sound volume 0-1 (default: 0.3)
}

export interface AuthSettings {
  enabled?: boolean;       // Enable password protection (default: false)
  password?: string;       // Password required to view the demo
  password_hash?: string;  // SHA-256 hash of password (for static builds)
  message?: string;        // Custom message on login screen
  title?: string;          // Custom title on login screen
}

export interface DashboardSettings {
  enabled?: boolean;        // Show dashboard on demo load (default: false)
  show_stats?: boolean;     // Show step count and duration estimate (default: true)
  show_health?: boolean;    // Show service health status (default: true)
  show_description?: boolean; // Show demo description (default: true)
  data_cards?: DataCard[];  // Live data cards (stats, links)
  data_lists?: DataList[];  // Data lists (transactions, items)
}

export interface SidebarSettings {
  enabled?: boolean;      // Enable sidebar navigation (default: false)
  collapsed?: boolean;    // Start sidebar collapsed (default: false)
  show_status?: boolean;  // Show step completion status (default: true)
}

export interface HealthCheck {
  name: string;           // Display name for the service
  url: string;            // Health check endpoint URL
  method?: 'GET' | 'HEAD'; // HTTP method (default: GET)
  interval?: number;      // Polling interval in ms (default: 10000)
}

export interface DemoMetadata {
  duration?: string;      // Estimated duration (e.g., '5 minutes')
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;      // Demo category
  thumbnail?: string;     // Thumbnail image URL or path
}

export interface DemoSettings {
  base_url?: string;
  theme?: ThemeSettings;
  polling?: PollingDefaults;
  links?: Record<string, LinkHandler>;
  openapi?: string;  // Global OpenAPI spec URL for auto-generating form fields
  effects?: EffectsSettings;  // Visual effects configuration
  auth?: AuthSettings;  // Authentication settings
  dashboard?: DashboardSettings;  // Dashboard/overview settings
  sidebar?: SidebarSettings;  // Sidebar navigation settings
  health_checks?: HealthCheck[];  // Service health check endpoints
}

export interface ThemeSettings {
  logo?: string;
  // Theme preset (purple is default, matches original DemoScript look)
  preset?: 'purple' | 'blue' | 'green' | 'teal' | 'orange' | 'rose';
  // Custom colors (override preset)
  primary?: string;   // Hex color for main brand color
  accent?: string;    // Hex color for secondary accent
  // Force light/dark mode (default: auto follows system preference)
  mode?: 'auto' | 'light' | 'dark';
  // Legacy field (deprecated, use 'primary' instead)
  primary_color?: string;
}

export interface PollingDefaults {
  interval?: number;
  max_attempts?: number;
}

export interface LinkHandler {
  [key: string]: string | undefined;
}

export interface BaseStep {
  title?: string;
  id?: string;
  goto?: string;
}

export interface Choice {
  label: string;
  description?: string;
  goto: string;
}

// Concise step types (original syntax)

export interface SlideStep extends BaseStep {
  slide: string;
  choices?: Choice[];
}

export interface RestStep extends BaseStep {
  rest: string;
  description?: string;
  base_url?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  form?: FormField[];
  save?: Record<string, string>;
  results?: ResultField[];
  wait_for?: string;
  poll?: PollingConfig;
  openapi?: string;                    // Per-step OpenAPI URL override
  defaults?: Record<string, unknown>;  // Default values for OpenAPI-generated fields
  show_curl?: boolean;                 // Show curl command for this request
}

export interface ShellStep extends BaseStep {
  shell: string;
  description?: string;
  shell_type?: 'bash' | 'powershell' | 'cmd';
  workdir?: string;
  confirm?: boolean;
  env?: Record<string, string>;
  save?: Record<string, string>;
}

export interface BrowserStep extends BaseStep {
  browser: string;
  description?: string;
  screenshot?: string;
}

export interface CodeStep extends BaseStep {
  code: string;
  language?: string;
  filename?: string;
  highlight?: number[];
}

export interface WaitStep extends BaseStep {
  wait: number;
  message?: string;
}

export interface AssertStep extends BaseStep {
  assert: string;
  message?: string;
  description?: string;
}

export interface GraphQLStep extends BaseStep {
  graphql: string;
  endpoint?: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
  save?: Record<string, string>;
  results?: ResultField[];
}

export interface DatabaseStep extends BaseStep {
  db: string;
  type?: 'mongodb' | 'postgres' | 'mysql';
  collection?: string;
  table?: string;
  query?: Record<string, unknown> | string;
  update?: Record<string, unknown>;
  document?: Record<string, unknown>;
  projection?: Record<string, number>;
  save?: Record<string, string>;
  results?: ResultField[];
  description?: string;
}

// Explicit step types (new syntax)

export interface ExplicitSlideStep extends BaseStep {
  step: 'slide';
  content: string;
  choices?: Choice[];
}

export interface ExplicitRestStep extends BaseStep {
  step: 'rest';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  base_url?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  form?: FormField[];
  save?: Record<string, string>;
  results?: ResultField[];
  wait_for?: string;
  poll?: PollingConfig;
  openapi?: string;                    // Per-step OpenAPI URL override
  defaults?: Record<string, unknown>;  // Default values for OpenAPI-generated fields
  show_curl?: boolean;                 // Show curl command for this request
}

export interface ExplicitShellStep extends BaseStep {
  step: 'shell';
  command: string;
  description?: string;
  shell_type?: 'bash' | 'powershell' | 'cmd';
  workdir?: string;
  confirm?: boolean;
  env?: Record<string, string>;
  save?: Record<string, string>;
}

export interface ExplicitBrowserStep extends BaseStep {
  step: 'browser';
  url: string;
  description?: string;
  screenshot?: string;
}

export interface ExplicitCodeStep extends BaseStep {
  step: 'code';
  source: string;
  language?: string;
  filename?: string;
  highlight?: number[];
}

export interface ExplicitWaitStep extends BaseStep {
  step: 'wait';
  duration: number;
  message?: string;
}

export interface ExplicitAssertStep extends BaseStep {
  step: 'assert';
  condition: string;
  message?: string;
  description?: string;
}

export interface ExplicitGraphQLStep extends BaseStep {
  step: 'graphql';
  query: string;
  endpoint?: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
  save?: Record<string, string>;
  results?: ResultField[];
}

export interface ExplicitDatabaseStep extends BaseStep {
  step: 'db';
  operation: string;
  type?: 'mongodb' | 'postgres' | 'mysql';
  collection?: string;
  table?: string;
  query?: Record<string, unknown> | string;
  update?: Record<string, unknown>;
  document?: Record<string, unknown>;
  projection?: Record<string, number>;
  save?: Record<string, string>;
  results?: ResultField[];
  description?: string;
}

// Step groups

export interface StepGroup {
  group: string;
  description?: string;
  collapsed?: boolean;
  steps: Step[];
}

// Union types

export type Step =
  | SlideStep
  | RestStep
  | ShellStep
  | BrowserStep
  | CodeStep
  | WaitStep
  | AssertStep
  | GraphQLStep
  | DatabaseStep
  | ExplicitSlideStep
  | ExplicitRestStep
  | ExplicitShellStep
  | ExplicitBrowserStep
  | ExplicitCodeStep
  | ExplicitWaitStep
  | ExplicitAssertStep
  | ExplicitGraphQLStep
  | ExplicitDatabaseStep;

export type StepOrGroup = Step | StepGroup;

// Supporting types (FormField, ResultField, SelectOption, TableColumn imported from @demoscript/shared)

export interface PollingConfig {
  endpoint: string;
  success_when: string;
  failure_when?: string;
  interval?: number;
  max_attempts?: number;
  save?: Record<string, string>;
}

export interface Recording {
  stepId: string;
  timestamp: string;
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    body: unknown;
  };
  // Shell command outputs
  output?: string;   // Legacy: alias for stdout
  stdout?: string;   // Standard output
  stderr?: string;   // Standard error
  status?: number;   // Exit code (0 = success)
  duration?: number;
}

export interface DemoRecordings {
  demoId?: string;
  demoVersion?: string;
  recordedAt: string;
  recordings: Recording[];
}

// Type guards

export function isStepGroup(item: StepOrGroup): item is StepGroup {
  return 'group' in item && 'steps' in item;
}

export function isSlideStep(step: Step): step is SlideStep | ExplicitSlideStep {
  return 'slide' in step || ('step' in step && (step as ExplicitSlideStep).step === 'slide');
}

export function isRestStep(step: Step): step is RestStep | ExplicitRestStep {
  return 'rest' in step || ('step' in step && (step as ExplicitRestStep).step === 'rest');
}

export function isShellStep(step: Step): step is ShellStep | ExplicitShellStep {
  return 'shell' in step || ('step' in step && (step as ExplicitShellStep).step === 'shell');
}

export function isBrowserStep(step: Step): step is BrowserStep | ExplicitBrowserStep {
  return 'browser' in step || ('step' in step && (step as ExplicitBrowserStep).step === 'browser');
}

export function isCodeStep(step: Step): step is CodeStep | ExplicitCodeStep {
  return 'code' in step || ('step' in step && (step as ExplicitCodeStep).step === 'code');
}

export function isWaitStep(step: Step): step is WaitStep | ExplicitWaitStep {
  return 'wait' in step || ('step' in step && (step as ExplicitWaitStep).step === 'wait');
}

export function isAssertStep(step: Step): step is AssertStep | ExplicitAssertStep {
  return 'assert' in step || ('step' in step && (step as ExplicitAssertStep).step === 'assert');
}

export function isGraphQLStep(step: Step): step is GraphQLStep | ExplicitGraphQLStep {
  return 'graphql' in step || ('step' in step && (step as ExplicitGraphQLStep).step === 'graphql');
}

export function isDatabaseStep(step: Step): step is DatabaseStep | ExplicitDatabaseStep {
  return 'db' in step || ('step' in step && (step as ExplicitDatabaseStep).step === 'db');
}

// Helper functions

export function getStepTitle(step: StepOrGroup, index: number): string {
  // Handle step groups
  if (isStepGroup(step)) {
    return step.group;
  }

  if (step.title) {
    return step.title;
  }

  if (isSlideStep(step)) {
    const content = 'slide' in step ? step.slide : step.content;
    const firstLine = content.trim().split('\n')[0];
    const match = firstLine.match(/^#+ (.+)$/);
    return match ? match[1] : `Slide ${index + 1}`;
  }

  if (isRestStep(step)) {
    if ('rest' in step) return step.rest;
    return `${step.method} ${step.path}`;
  }

  if (isShellStep(step)) {
    const cmd = 'shell' in step ? step.shell : step.command;
    return cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd;
  }

  if (isBrowserStep(step)) {
    return 'browser' in step ? step.browser : step.url;
  }

  if (isCodeStep(step)) {
    return step.filename || `Code ${index + 1}`;
  }

  if (isWaitStep(step)) {
    const duration = 'wait' in step ? step.wait : step.duration;
    return step.message || `Wait ${duration}ms`;
  }

  if (isAssertStep(step)) {
    const condition = 'assert' in step ? step.assert : step.condition;
    return condition.length > 30 ? condition.substring(0, 30) + '...' : condition;
  }

  if (isGraphQLStep(step)) {
    const query = 'graphql' in step ? step.graphql : step.query;
    const firstLine = query.trim().split('\n')[0];
    return firstLine.length > 40 ? firstLine.substring(0, 40) + '...' : firstLine;
  }

  if (isDatabaseStep(step)) {
    const op = 'db' in step ? step.db : step.operation;
    return `${op} ${step.collection || step.table || ''}`.trim();
  }

  return `Step ${index + 1}`;
}

export type StepType = 'slide' | 'rest' | 'shell' | 'browser' | 'code' | 'wait' | 'assert' | 'graphql' | 'db' | 'group';

export function getStepType(step: StepOrGroup): StepType {
  if (isStepGroup(step)) return 'group';
  if (isSlideStep(step)) return 'slide';
  if (isRestStep(step)) return 'rest';
  if (isShellStep(step)) return 'shell';
  if (isBrowserStep(step)) return 'browser';
  if (isCodeStep(step)) return 'code';
  if (isWaitStep(step)) return 'wait';
  if (isAssertStep(step)) return 'assert';
  if (isGraphQLStep(step)) return 'graphql';
  if (isDatabaseStep(step)) return 'db';
  throw new Error('Unknown step type');
}

export function parseRestMethod(step: RestStep | ExplicitRestStep): { method: string; endpoint: string } {
  if ('rest' in step) {
    const parts = step.rest.trim().split(/\s+/);
    if (parts.length === 1) {
      return { method: 'GET', endpoint: parts[0] };
    }
    return { method: parts[0].toUpperCase(), endpoint: parts.slice(1).join(' ') };
  }
  return { method: step.method, endpoint: step.path };
}

// Utility to flatten step groups into flat step array
export function flattenSteps(items: StepOrGroup[]): Step[] {
  const result: Step[] = [];
  for (const item of items) {
    if (isStepGroup(item)) {
      result.push(...item.steps);
    } else {
      result.push(item);
    }
  }
  return result;
}

// Helper functions to extract content from both concise and explicit step types

export function getSlideContent(step: SlideStep | ExplicitSlideStep): string {
  return 'slide' in step ? step.slide : step.content;
}

export function getShellCommand(step: ShellStep | ExplicitShellStep): string {
  return 'shell' in step ? step.shell : step.command;
}

export function getBrowserUrl(step: BrowserStep | ExplicitBrowserStep): string {
  return 'browser' in step ? step.browser : step.url;
}

export function getCodeSource(step: CodeStep | ExplicitCodeStep): string {
  return 'code' in step ? step.code : step.source;
}

export function getWaitDuration(step: WaitStep | ExplicitWaitStep): number {
  return 'wait' in step ? step.wait : step.duration;
}

export function getAssertCondition(step: AssertStep | ExplicitAssertStep): string {
  return 'assert' in step ? step.assert : step.condition;
}

export function getGraphQLQuery(step: GraphQLStep | ExplicitGraphQLStep): string {
  return 'graphql' in step ? step.graphql : step.query;
}

export function getDatabaseOperation(step: DatabaseStep | ExplicitDatabaseStep): string {
  return 'db' in step ? step.db : step.operation;
}
