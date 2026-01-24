/**
 * Terminal Parser - Parses terminal content into command/output lines
 *
 * Lines starting with the prompt (default: "$") are commands.
 * All other lines are output.
 */

export interface TerminalLine {
  type: 'command' | 'output';
  text: string;
}

/**
 * Parse terminal content string into structured lines
 * @param content - Multi-line terminal content
 * @param prompt - Command prompt string (default: "$")
 * @returns Array of terminal lines with type and text
 */
export function parseTerminalContent(content: string, prompt: string = '$'): TerminalLine[] {
  const lines = content.split('\n');
  const result: TerminalLine[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith(prompt)) {
      // This is a command - extract the part after the prompt
      const commandText = trimmed.slice(prompt.length).trimStart();
      result.push({
        type: 'command',
        text: commandText,
      });
    } else {
      // This is output
      result.push({
        type: 'output',
        text: line,
      });
    }
  }

  return result;
}

/**
 * Group consecutive output lines together for more efficient rendering
 * @param lines - Array of terminal lines
 * @returns Array of terminal blocks (commands stay single, outputs grouped)
 */
export interface TerminalBlock {
  type: 'command' | 'output';
  lines: string[];
}

export function groupTerminalLines(lines: TerminalLine[]): TerminalBlock[] {
  const blocks: TerminalBlock[] = [];
  let currentOutputLines: string[] = [];

  for (const line of lines) {
    if (line.type === 'command') {
      // Flush any pending output
      if (currentOutputLines.length > 0) {
        blocks.push({ type: 'output', lines: currentOutputLines });
        currentOutputLines = [];
      }
      // Add command as single-line block
      blocks.push({ type: 'command', lines: [line.text] });
    } else {
      // Accumulate output lines
      currentOutputLines.push(line.text);
    }
  }

  // Flush remaining output
  if (currentOutputLines.length > 0) {
    blocks.push({ type: 'output', lines: currentOutputLines });
  }

  return blocks;
}
