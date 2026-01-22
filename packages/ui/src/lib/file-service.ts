/**
 * Client-side file service for Visual Builder
 * Encapsulates all file API calls to avoid duplication across components
 */

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isYaml: boolean;
}

export interface DirectoryListing {
  path: string;
  parent: string;
  items: FileItem[];
}

export interface FileContent {
  path: string;
  content: string;
}

export interface SaveResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface InitialDemo {
  path: string | null;
  config: unknown | null;
}

/**
 * File service for interacting with the builder CLI's file API
 * Only available in CLI mode (window.__DEMOSCRIPT_CLI_MODE__)
 */
export const fileService = {
  /**
   * List contents of a directory
   */
  async listDirectory(dir?: string): Promise<DirectoryListing> {
    const url = new URL('/api/files', window.location.origin);
    if (dir) {
      url.searchParams.set('dir', dir);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to list directory');
    }
    return response.json();
  },

  /**
   * Read file contents
   */
  async readFile(path: string): Promise<FileContent> {
    const url = new URL('/api/file', window.location.origin);
    url.searchParams.set('path', path);
    const response = await fetch(url.toString());
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to read file');
    }
    return response.json();
  },

  /**
   * Save file contents
   */
  async saveFile(path: string, content: string): Promise<SaveResult> {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save file');
    }
    return response.json();
  },

  /**
   * Get the initially loaded demo (if CLI was started with a demo path)
   */
  async getInitialDemo(): Promise<InitialDemo> {
    const response = await fetch('/api/editor/demo');
    if (!response.ok) {
      return { path: null, config: null };
    }
    return response.json();
  },
};

/**
 * Check if we're running in CLI mode (has filesystem access)
 */
export function isCliMode(): boolean {
  return !!(window as unknown as { __DEMOSCRIPT_CLI_MODE__?: boolean }).__DEMOSCRIPT_CLI_MODE__;
}

/**
 * Check if cloud features are enabled
 */
export function isCloudEnabled(): boolean {
  return !!(window as unknown as { __DEMOSCRIPT_CLOUD_ENABLED__?: boolean }).__DEMOSCRIPT_CLOUD_ENABLED__;
}
