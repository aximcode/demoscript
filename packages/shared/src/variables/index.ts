/**
 * Variable substitution utilities
 * Replaces $variableName with stored values and extracts nested values from objects
 */

/**
 * Replace $variableName references with values from the variables object
 * @param text - The text containing variable references (e.g., "Hello $name")
 * @param variables - Object mapping variable names to values
 * @returns Text with variables substituted
 */
export function substituteVariables(
  text: string,
  variables: Record<string, unknown>
): string {
  return text.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, varName) => {
    if (varName in variables) {
      const value = variables[varName];
      return String(value ?? '');
    }
    return match;
  });
}

/**
 * Recursively substitute variables in strings within an object/array
 * @param obj - Object, array, or string to process
 * @param variables - Object mapping variable names to values
 * @returns Deep copy with all string values substituted
 */
export function substituteInObject<T>(
  obj: T,
  variables: Record<string, unknown>
): T {
  if (typeof obj === 'string') {
    return substituteVariables(obj, variables) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => substituteInObject(item, variables)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, variables);
    }
    return result as T;
  }

  return obj;
}

/**
 * Find all variable names used in a string (e.g., "$accessToken" -> "accessToken")
 * @param text - String to search for variable references
 * @returns Array of unique variable names found
 */
export function findVariablesInString(text: string): string[] {
  const matches = text.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

/**
 * Find all variable names used in an object (recursively)
 * @param obj - Object to search for variable references
 * @returns Array of unique variable names found
 */
export function findVariablesInObject(obj: unknown): string[] {
  if (typeof obj === 'string') {
    return findVariablesInString(obj);
  }

  if (Array.isArray(obj)) {
    return [...new Set(obj.flatMap(item => findVariablesInObject(item)))];
  }

  if (obj !== null && typeof obj === 'object') {
    return [...new Set(
      Object.values(obj).flatMap(value => findVariablesInObject(value))
    )];
  }

  return [];
}

/**
 * Find variables that are used but not defined
 * @param usedVars - Array of variable names that are used
 * @param definedVars - Object of defined variables
 * @returns Array of variable names that are used but not defined
 */
export function findMissingVariables(
  usedVars: string[],
  definedVars: Record<string, unknown>
): string[] {
  return usedVars.filter(varName => !(varName in definedVars));
}

/**
 * Extract a value from a nested object using dot and bracket notation
 * Supports paths like: "name", "[0].id", "data[0].name", "items[2].value[0]"
 * @param obj - The object to extract from
 * @param path - The path to the value (e.g., "user.profile.name" or "items[0].id")
 * @returns The value at the path, or undefined if not found
 */
export function extractValueByPath(obj: unknown, path: string): unknown {
  // Return entire object for empty path
  if (!path) {
    return obj;
  }

  // Parse path into segments, handling both dot and bracket notation
  const segments: (string | number)[] = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === '[') {
      // Array index: [0], [123], etc.
      const end = path.indexOf(']', i);
      if (end === -1) break;
      const index = parseInt(path.slice(i + 1, end), 10);
      if (!isNaN(index)) {
        segments.push(index);
      }
      i = end + 1;
      // Skip trailing dot if present
      if (path[i] === '.') i++;
    } else if (path[i] === '.') {
      // Skip leading dots
      i++;
    } else {
      // Property name: find end at next . or [
      let end = i;
      while (end < path.length && path[end] !== '.' && path[end] !== '[') {
        end++;
      }
      if (end > i) {
        segments.push(path.slice(i, end));
      }
      i = end;
      // Skip trailing dot if present
      if (path[i] === '.') i++;
    }
  }

  // Traverse the path
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof segment === 'number') {
      // Array index access
      if (Array.isArray(current)) {
        current = current[segment];
      } else {
        return undefined;
      }
    } else {
      // Property access
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

/**
 * HTTP methods that do not accept request bodies
 */
const BODYLESS_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Check if HTTP method supports request body
 * @param method - HTTP method (e.g., "GET", "POST")
 * @returns true if the method supports a request body
 */
export function methodSupportsBody(method: string): boolean {
  return !BODYLESS_METHODS.includes(method.toUpperCase());
}

/**
 * Parse REST step string into method and endpoint
 * @param rest - REST step string (e.g., "POST /users" or "GET /health")
 * @returns Object with method and endpoint
 * @throws Error if the format is invalid
 */
export function parseRestStep(rest: string): { method: string; endpoint: string } {
  const match = rest.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(.+)$/i);
  if (!match) {
    throw new Error(`Invalid REST format: ${rest}`);
  }
  return { method: match[1].toUpperCase(), endpoint: match[2] };
}
