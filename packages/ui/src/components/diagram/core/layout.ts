/**
 * Layout algorithms for diagram positioning
 * Supports both flowchart (topological) and sequence diagram layouts
 */

/**
 * Node definition from chart parsing
 */
export interface NodeDefinition {
  label: string;
  type: string;
}

/**
 * Connection between two nodes
 */
export interface Connection {
  from: string;
  to: string;
  label?: string;
}

/**
 * Sequence diagram message parsed from chart
 */
export interface SequenceMessage {
  from: string;
  to: string;
  label?: string;
  isAsync: boolean;
}

/**
 * Parse Mermaid-style flowchart definition
 * Supports:
 * - Node definitions: Client([Client]) or API[API Server] or Auth{Auth Service}
 * - Connections: Client -->|1| API or Client --> API
 */
export function parseFlowchartDefinition(chart: string): {
  nodeDefinitions: Map<string, NodeDefinition>;
  connections: Connection[];
  direction: 'LR' | 'TD';
} {
  const nodeDefinitions = new Map<string, NodeDefinition>();
  const connections: Connection[] = [];

  // Detect direction from flowchart directive
  const direction = chart.includes('flowchart TD') || chart.includes('flowchart TB') ? 'TD' : 'LR';

  const lines = chart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('flowchart'));

  for (const line of lines) {
    // Parse node definitions like: Client([Client]) or API[API Server] or Auth{Auth Service}
    const nodeMatch = line.match(/^(\w+)(\[|\(|\{)(.+?)(\]|\)|\})\s*$/);
    if (nodeMatch) {
      const [, id, openBracket, label] = nodeMatch;
      let type = 'default';
      if (openBracket === '(') type = 'circle';
      else if (openBracket === '{') type = 'diamond';
      nodeDefinitions.set(id, { label: label.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, ''), type });
      continue;
    }

    // Parse connections like: Client -->|1| API or Client --> API
    const connMatch = line.match(/(\w+)\s*-->(|\|[^|]+\|)\s*(\w+)/);
    if (connMatch) {
      const [, from, labelPart, to] = connMatch;
      const label = labelPart ? labelPart.replace(/^\||\|$/g, '') : undefined;
      connections.push({ from, to, label });

      // Auto-create node definitions if not explicitly defined
      if (!nodeDefinitions.has(from)) {
        nodeDefinitions.set(from, { label: from, type: 'default' });
      }
      if (!nodeDefinitions.has(to)) {
        nodeDefinitions.set(to, { label: to, type: 'default' });
      }
    }
  }

  return { nodeDefinitions, connections, direction };
}

/**
 * Parse Mermaid-style sequence diagram definition
 * Supports:
 * - Participants: participant Client or Client
 * - Messages: Client->>Server: Request or Client-->>Server: Async Response
 */
export function parseSequenceDiagram(chart: string): {
  participants: string[];
  messages: SequenceMessage[];
} {
  const participants: string[] = [];
  const participantSet = new Set<string>();
  const messages: SequenceMessage[] = [];

  const lines = chart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('sequenceDiagram'));

  for (const line of lines) {
    // Parse participant declarations: participant Client or Client
    const participantMatch = line.match(/^participant\s+(\w+)/i);
    if (participantMatch) {
      const name = participantMatch[1];
      if (!participantSet.has(name)) {
        participants.push(name);
        participantSet.add(name);
      }
      continue;
    }

    // Parse messages: Client->>Server: Request or Client-->>Server: Async
    // Patterns:
    // ->>  : sync message (solid arrow)
    // -->> : async message (dashed arrow)
    // ->   : sync message (solid arrow, alt syntax)
    // -->  : async message (dashed arrow, alt syntax)
    const messageMatch = line.match(/^(\w+)\s*(--?>>?)\s*(\w+)(?:\s*:\s*(.+))?$/);
    if (messageMatch) {
      const [, from, arrow, to, label] = messageMatch;
      const isAsync = arrow.startsWith('--');

      messages.push({ from, to, label, isAsync });

      // Auto-add participants if not declared
      if (!participantSet.has(from)) {
        participants.push(from);
        participantSet.add(from);
      }
      if (!participantSet.has(to)) {
        participants.push(to);
        participantSet.add(to);
      }
    }
  }

  return { participants, messages };
}

/**
 * Calculate flowchart layout using topological sort
 */
export function calculateFlowchartLayout(
  nodeDefinitions: Map<string, NodeDefinition>,
  connections: Connection[],
  direction: 'LR' | 'TD' = 'LR'
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeIds = Array.from(nodeDefinitions.keys());

  // Build adjacency for topological sort
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outEdges.set(id, []);
  }

  for (const conn of connections) {
    inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    outEdges.get(conn.from)?.push(conn.to);
  }

  // Topological layers
  const layers: string[][] = [];
  const remaining = new Set(nodeIds);

  while (remaining.size > 0) {
    const layer: string[] = [];
    for (const id of remaining) {
      if ((inDegree.get(id) || 0) === 0) {
        layer.push(id);
      }
    }

    if (layer.length === 0) {
      // Handle cycles - just add remaining
      layer.push(...remaining);
      remaining.clear();
    } else {
      for (const id of layer) {
        remaining.delete(id);
        for (const target of outEdges.get(id) || []) {
          inDegree.set(target, (inDegree.get(target) || 0) - 1);
        }
      }
    }

    layers.push(layer);
  }

  // Position nodes - compact spacing
  const xSpacing = direction === 'LR' ? 120 : 0;
  const ySpacing = direction === 'LR' ? 60 : 150;

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const layerHeight = layer.length * ySpacing;
    const startY = -layerHeight / 2 + ySpacing / 2;

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      const id = layer[nodeIdx];
      if (direction === 'LR') {
        positions.set(id, {
          x: layerIdx * xSpacing,
          y: startY + nodeIdx * ySpacing,
        });
      } else {
        positions.set(id, {
          x: startY + nodeIdx * 200,
          y: layerIdx * ySpacing,
        });
      }
    }
  }

  return positions;
}

/**
 * Calculate sequence diagram layout
 * Places participants horizontally, messages arranged vertically
 */
export function calculateSequenceLayout(
  participants: string[],
  messageCount: number
): {
  participantPositions: Map<string, { x: number; y: number }>;
  lifelineHeight: number;
  messageYPositions: number[];
} {
  const participantPositions = new Map<string, { x: number; y: number }>();

  // Spacing configuration
  const participantSpacing = 180; // Horizontal spacing between participants
  const messageSpacing = 50;      // Vertical spacing between messages
  const topMargin = 20;           // Space above first participant
  const messageStartY = 60;       // Y position where messages start

  // Calculate total width and center participants
  const totalWidth = (participants.length - 1) * participantSpacing;
  const startX = -totalWidth / 2;

  // Position participants horizontally
  participants.forEach((participant, index) => {
    participantPositions.set(participant, {
      x: startX + index * participantSpacing,
      y: topMargin,
    });
  });

  // Calculate lifeline height based on number of messages
  const lifelineHeight = messageStartY + messageCount * messageSpacing + 40;

  // Calculate Y positions for each message
  const messageYPositions: number[] = [];
  for (let i = 0; i < messageCount; i++) {
    messageYPositions.push(topMargin + messageStartY + i * messageSpacing);
  }

  return { participantPositions, lifelineHeight, messageYPositions };
}

/**
 * Detect diagram type from chart content
 */
export function detectDiagramType(chart: string): 'flowchart' | 'sequence' {
  const trimmed = chart.trim().toLowerCase();

  // Check for sequence diagram indicators
  if (trimmed.startsWith('sequencediagram')) {
    return 'sequence';
  }

  // Check for sequence message syntax: ->> or -->>
  if (chart.includes('->>') || chart.includes('-->>')) {
    return 'sequence';
  }

  // Check for participant declarations
  if (/participant\s+\w+/i.test(chart)) {
    return 'sequence';
  }

  // Default to flowchart
  return 'flowchart';
}
