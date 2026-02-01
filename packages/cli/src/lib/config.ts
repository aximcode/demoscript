import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.demoscript');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  token?: string;
  username?: string;
  email?: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = 'https://demoscript.app';

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): CliConfig {
  try {
    if (existsSync(CONFIG_FILE)) {
      const content = readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content) as CliConfig;
    }
  } catch {
    // Ignore errors, return empty config
  }
  return {};
}

export function saveConfig(config: CliConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getToken(): string | undefined {
  return loadConfig().token;
}

export function getApiUrl(): string {
  return loadConfig().apiUrl || DEFAULT_API_URL;
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
  }
}

export function updateToken(token: string): void {
  const config = loadConfig();
  config.token = token;
  saveConfig(config);
}

// CLI User-Agent for API requests (used by server to determine token expiry)
export const CLI_USER_AGENT = 'demoscript-cli/1.0';

// Helper to make authenticated API requests with automatic token refresh
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const config = loadConfig();
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers: {
      'User-Agent': CLI_USER_AGENT,
      ...(config.token && { 'Authorization': `Bearer ${config.token}` }),
      ...options.headers,
    },
  });

  // Check for refreshed token
  const newToken = response.headers.get('X-New-Token');
  if (newToken) {
    updateToken(newToken);
  }

  return response;
}
