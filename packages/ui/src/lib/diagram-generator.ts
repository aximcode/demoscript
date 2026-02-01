/**
 * Diagram Generator - Auto-generates Mermaid diagrams from step definitions
 *
 * Supports three modes (priority order):
 * 1. chart: provided -> use verbatim, step diagram: for highlighting only
 * 2. nodes: provided -> auto-generate from nodes + step diagram: for edges
 * 3. enabled: true -> fully auto-generate from step diagram: values
 */

import type { Step, DiagramSettings, NodeConfig } from '../types/schema';
import { parseRestMethod, isRestStep, isSlideStep, isShellStep } from '../types/schema';

export interface DiagramGeneratorConfig {
  enabled?: boolean;
  type?: 'flowchart' | 'sequence';
  direction?: 'LR' | 'TD';
  default_mode?: 'linear' | 'grouped' | 'explicit';
  nodes?: Record<string, NodeConfig>;
  participants?: Record<string, { label?: string }>;
  default_participants?: string[];
  show_step_numbers?: boolean;
}

export interface GeneratedDiagram {
  chart: string;                          // Mermaid syntax
  pathToIndex: Map<string, number>;       // Map diagram paths to step indices
  isCustom?: boolean;                     // True if using custom chart
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  style?: 'normal' | 'dashed' | 'thick' | 'dotted';
}

/**
 * Generate a diagram from steps and config
 */
export function generateDiagram(
  steps: Step[],
  config: DiagramGeneratorConfig
): GeneratedDiagram {
  const type = config.type || detectDiagramType(steps);

  if (type === 'sequence') {
    return generateSequenceDiagram(steps, config);
  }
  return generateFlowDiagram(steps, config);
}

/**
 * Detect diagram type from step diagram: syntax
 */
export function detectDiagramType(steps: Step[]): 'flowchart' | 'sequence' {
  for (const step of steps) {
    const path = step.diagram;
    if (path) {
      // Sequence diagram uses ->> or -->>
      if (path.includes('->>') || path.includes('-->>')) {
        return 'sequence';
      }
    }
  }
  return 'flowchart';
}

/**
 * Generate a flowchart from steps
 */
function generateFlowDiagram(
  steps: Step[],
  config: DiagramGeneratorConfig
): GeneratedDiagram {
  const edges: Edge[] = [];
  const pathToIndex = new Map<string, number>();

  // Collect edges from steps
  let prevNode: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let path = step.diagram;

    // Generate default if not specified (unless explicit mode)
    if (!path && config.default_mode !== 'explicit') {
      path = generateDefaultPath(step, prevNode, i, config);
    }

    if (path) {
      const edge = parseEdge(path);
      if (edge) {
        // Use diagram_label property if no inline label provided
        if (!edge.label && step.diagram_label) {
          edge.label = step.diagram_label;
        }
        // Use diagram_style property if provided
        if (step.diagram_style) {
          edge.style = step.diagram_style;
        }
        edges.push(edge);
        pathToIndex.set(path, i);
        prevNode = edge.to;
      } else {
        // Single node (no edge)
        prevNode = path;
        pathToIndex.set(path, i);
      }
    }
  }

  // Extract unique nodes
  const nodeIds = new Set<string>();
  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }

  // Generate Mermaid
  const direction = config.direction || 'LR';
  let chart = `flowchart ${direction}\n`;

  // Node definitions
  for (const nodeId of nodeIds) {
    const nodeConfig = config.nodes?.[nodeId];
    chart += `  ${formatNode(nodeId, nodeConfig)}\n`;
  }

  // Edge definitions (deduplicated)
  const seenEdges = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.from}->${edge.to}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      // Build label with optional step number prefix
      let labelText = edge.label || '';
      if (config.show_step_numbers) {
        // Find step index for this edge
        const edgePath = edge.label
          ? `${edge.from}->${edge.to}: ${edge.label}`
          : `${edge.from}->${edge.to}`;
        const stepIndex = pathToIndex.get(edgePath) ?? pathToIndex.get(`${edge.from}->${edge.to}`);
        if (stepIndex !== undefined) {
          const circled = toCircledNumber(stepIndex + 1);
          labelText = labelText ? `${circled} ${labelText}` : circled;
        }
      }
      const label = labelText ? `|${labelText}|` : '';
      const arrow = getArrowStyle(edge.style);
      chart += `  ${edge.from} ${arrow}${label} ${edge.to}\n`;
    }
  }

  return { chart, pathToIndex };
}

/**
 * Generate a sequence diagram from steps
 */
function generateSequenceDiagram(
  steps: Step[],
  config: DiagramGeneratorConfig
): GeneratedDiagram {
  const pathToIndex = new Map<string, number>();
  const participantOrder: string[] = [];  // Maintain order of first appearance
  const participantSet = new Set<string>();
  const messages: string[] = [];

  // Add default participants first (if configured)
  if (config.default_participants) {
    for (const p of config.default_participants) {
      if (!participantSet.has(p)) {
        participantSet.add(p);
        participantOrder.push(p);
      }
    }
  }

  // Process steps to extract participants and messages
  let prevParticipant: string | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let path = step.diagram;

    // Generate default path if not specified (unless explicit mode)
    if (!path && config.default_mode !== 'explicit') {
      path = generateDefaultSequencePath(step, prevParticipant, i, config);
    }

    if (path) {
      pathToIndex.set(path, i);

      // Parse sequence syntax: A->>B or A-->>B or A->>B: label
      const match = path.match(/^(\w+)(--?>>?)(\w+)(?::\s*(.+))?$/);
      if (match) {
        const [, from, arrow, to, label] = match;

        // Track participants in order of appearance
        if (!participantSet.has(from)) {
          participantSet.add(from);
          participantOrder.push(from);
        }
        if (!participantSet.has(to)) {
          participantSet.add(to);
          participantOrder.push(to);
        }

        // Generate message label: inline label > diagram_label property > auto-generated
        let messageLabel = label || step.diagram_label || generateMessageLabel(step, i);
        // Add step number prefix if enabled
        if (config.show_step_numbers) {
          const circled = toCircledNumber(i + 1);
          messageLabel = messageLabel ? `${circled} ${messageLabel}` : circled;
        }
        const msg = messageLabel ? `${from}${arrow}${to}: ${messageLabel}` : `${from}${arrow}${to}`;
        messages.push(`  ${msg}`);

        prevParticipant = to;
      }
    }
  }

  // Build chart
  let chart = 'sequenceDiagram\n';

  // Participant declarations (with labels from participants or nodes config)
  for (const p of participantOrder) {
    const pConfig = config.participants?.[p] || config.nodes?.[p];
    if (pConfig?.label) {
      chart += `  participant ${p} as ${pConfig.label}\n`;
    } else {
      chart += `  participant ${p}\n`;
    }
  }

  // Messages
  if (messages.length > 0) {
    chart += messages.join('\n') + '\n';
  }

  return { chart, pathToIndex };
}

/**
 * Generate a default sequence diagram path based on step content
 */
function generateDefaultSequencePath(
  step: Step,
  prevParticipant: string | null,
  _index: number,
  config: DiagramGeneratorConfig
): string | undefined {
  // Use default participants if available
  const defaults = config.default_participants || ['Client', 'Server'];
  const from = prevParticipant || defaults[0];
  const to = defaults.find(p => p !== from) || defaults[1] || 'Server';

  // Generate path based on step type
  if (isRestStep(step)) {
    return `${from}->>${to}`;
  }

  return undefined;
}

/**
 * Generate a message label from step content
 */
function generateMessageLabel(step: Step, _index: number): string {
  if (step.title) {
    return step.title;
  }

  if (isRestStep(step)) {
    const { method, endpoint } = parseRestMethod(step);
    return `${method} ${endpoint}`;
  }

  if (isShellStep(step)) {
    const cmd = ('shell' in step ? step.shell : step.command).split(' ')[0];
    return `run ${cmd}`;
  }

  return '';
}

/**
 * Convert a number to a circled Unicode character (①②③...)
 * Supports 1-50 for circled numbers, falls back to parentheses for others
 */
function toCircledNumber(n: number): string {
  // Unicode circled numbers: ① is U+2460 (decimal 9312)
  // Range: ① (1) to ⑳ (20) at U+2460-U+2473
  // Extended: ㉑ (21) to ㊿ (50) at U+3251-U+325F then U+32B1-U+32BF
  if (n >= 1 && n <= 20) {
    return String.fromCodePoint(0x2460 + n - 1);
  } else if (n >= 21 && n <= 35) {
    return String.fromCodePoint(0x3251 + n - 21);
  } else if (n >= 36 && n <= 50) {
    return String.fromCodePoint(0x32B1 + n - 36);
  }
  // Fallback for numbers > 50
  return `(${n})`;
}

/**
 * Parse an edge string like "A->B" or "A->B: label"
 */
function parseEdge(path: string): Edge | null {
  // Match: NodeA->NodeB or NodeA->NodeB: label
  const match = path.match(/^(\w+)->(\w+)(?::\s*(.+))?$/);
  if (match) {
    return {
      from: match[1],
      to: match[2],
      label: match[3],
    };
  }
  return null;
}

/**
 * Generate a default diagram path based on step content
 */
function generateDefaultPath(
  step: Step,
  prevNode: string | null,
  index: number,
  _config: DiagramGeneratorConfig
): string | undefined {
  let currentNode: string;

  if (step.title) {
    currentNode = sanitizeNodeId(step.title);
  } else if (isRestStep(step)) {
    const { method, endpoint } = parseRestMethod(step);
    currentNode = sanitizeNodeId(`${method}_${endpoint}`);
  } else if (isShellStep(step)) {
    const cmd = ('shell' in step ? step.shell : step.command).split(' ')[0];
    currentNode = sanitizeNodeId(`Shell_${cmd}`);
  } else if (isSlideStep(step)) {
    const content = 'slide' in step ? step.slide : step.content;
    const heading = extractFirstHeading(content);
    currentNode = heading ? sanitizeNodeId(heading) : `Slide_${index}`;
  } else {
    currentNode = `Step_${index}`;
  }

  // Connect to previous node if exists
  if (prevNode) {
    return `${prevNode}->${currentNode}`;
  }

  return currentNode;
}

/**
 * Sanitize a string to be a valid Mermaid node ID
 */
export function sanitizeNodeId(input: string): string {
  return input
    .replace(/^\//, '')                 // Remove leading slash
    .replace(/[^a-zA-Z0-9_]/g, '_')     // Replace invalid chars
    .replace(/^[0-9]/, '_$&')           // Can't start with number
    .replace(/_+/g, '_')                // Collapse underscores
    .replace(/_$/, '')                  // Remove trailing underscore
    .substring(0, 30);
}

/**
 * Format a node with its configuration
 */
export function formatNode(nodeId: string, config?: NodeConfig): string {
  const label = config?.label || nodeId;
  const shape = config?.shape || 'rectangle';

  switch (shape) {
    case 'circle': return `${nodeId}((${label}))`;
    case 'diamond': return `${nodeId}{${label}}`;
    case 'cylinder': return `${nodeId}[(${label})]`;
    case 'stadium': return `${nodeId}([${label}])`;
    case 'rounded': return `${nodeId}(${label})`;
    default: return `${nodeId}[${label}]`;
  }
}

/**
 * Get Mermaid arrow style syntax
 */
function getArrowStyle(style?: 'normal' | 'dashed' | 'thick' | 'dotted'): string {
  switch (style) {
    case 'dashed': return '-.->';
    case 'dotted': return '-.->';  // Mermaid uses same syntax for dotted
    case 'thick': return '==>';
    default: return '-->';
  }
}

/**
 * Extract first heading from markdown content
 */
function extractFirstHeading(content: string): string | null {
  const firstLine = content.trim().split('\n')[0];
  const match = firstLine.match(/^#+ (.+)$/);
  return match ? match[1] : null;
}

/**
 * Build path-to-index mapping from steps (for custom charts)
 * This allows highlighting in custom charts based on step diagram: values
 */
export function buildPathToIndexFromSteps(steps: Step[]): Map<string, number> {
  const pathToIndex = new Map<string, number>();

  for (let i = 0; i < steps.length; i++) {
    const path = steps[i].diagram;
    if (path) {
      pathToIndex.set(path, i);
    }
  }

  return pathToIndex;
}

/**
 * Determine the effective position based on settings
 * Implements smart defaults: LR -> top, TD -> sidebar
 */
export function getEffectivePosition(
  settings: DiagramSettings
): 'top' | 'bottom' | 'sidebar' | 'sticky' | 'toggle' {
  // Explicit position always wins (auto triggers smart defaults)
  if (settings.position && settings.position !== 'auto') {
    return settings.position;
  }

  // Smart defaults based on direction
  const direction = settings.direction || 'LR';
  return direction === 'TD' ? 'sidebar' : 'top';
}

/**
 * Check if diagram should be shown based on settings
 */
export function shouldShowDiagram(settings?: DiagramSettings): boolean {
  if (!settings) return false;
  return !!(settings.chart || settings.nodes || settings.enabled);
}
