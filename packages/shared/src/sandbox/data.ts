/**
 * Sandbox API - In-memory data store
 *
 * This module provides an in-memory data store for the Sandbox API.
 * Data is ephemeral and resets on server restart.
 *
 * Session-scoped stores are used for recording to prevent concurrent user conflicts.
 */

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  type: 'export' | 'import' | 'process';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: unknown;
  createdAt: string;
  completedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export interface SandboxRequest {
  method: string;
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  sessionId?: string; // Optional session ID for isolated data stores
}

export interface SandboxResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

// In-memory data store structure
interface DataStore {
  users: Map<string, User>;
  jobs: Map<string, Job>;
  tokens: Map<string, string>; // token -> userId
  idCounter: number;
}

// Session-scoped stores for concurrent isolation
const sessions = new Map<string, DataStore>();

// Default shared store (for live playback, not recording)
let defaultStore: DataStore;

// Seed data
const seedUsers: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { email: 'admin@example.com', name: 'Admin User', role: 'admin' },
  { email: 'alice@example.com', name: 'Alice Johnson', role: 'user' },
  { email: 'bob@example.com', name: 'Bob Smith', role: 'user' },
  { email: 'demo@example.com', name: 'Demo User', role: 'viewer' },
];

// Helper to generate unique IDs within a store
function generateIdForStore(store: DataStore): string {
  return `${Date.now().toString(36)}-${(++store.idCounter).toString(36)}`;
}

// Create a fresh store with seed data
function createFreshStore(): DataStore {
  const store: DataStore = {
    users: new Map(),
    jobs: new Map(),
    tokens: new Map(),
    idCounter: 0,
  };

  const now = new Date().toISOString();
  for (const userData of seedUsers) {
    const id = generateIdForStore(store);
    store.users.set(id, {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }

  return store;
}

// Initialize default store on load
defaultStore = createFreshStore();

// Get the appropriate store for a session
function getStore(sessionId?: string): DataStore {
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (session) return session;
  }
  return defaultStore;
}

/**
 * Create an isolated sandbox session for recording
 * Returns a session ID that should be passed to all subsequent requests
 */
export function createSandboxSession(): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  sessions.set(sessionId, createFreshStore());
  return sessionId;
}

/**
 * Destroy a sandbox session and clean up its data
 */
export function destroySandboxSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Reset the default data store (for backwards compatibility)
 * @deprecated Use createSandboxSession() for isolated recording
 */
export function resetSandboxData(): void {
  defaultStore = createFreshStore();
}

// Public ID generator (uses default store for backwards compatibility)
export function generateId(sessionId?: string): string {
  return generateIdForStore(getStore(sessionId));
}

// User operations
export function getUsers(sessionId?: string): User[] {
  return Array.from(getStore(sessionId).users.values());
}

export function getUserById(id: string, sessionId?: string): User | undefined {
  return getStore(sessionId).users.get(id);
}

export function getUserByEmail(email: string, sessionId?: string): User | undefined {
  return Array.from(getStore(sessionId).users.values()).find((u) => u.email === email);
}

export function createUser(data: { email: string; name: string; role?: User['role'] }, sessionId?: string): User {
  const store = getStore(sessionId);
  const id = generateIdForStore(store);
  const now = new Date().toISOString();
  const user: User = {
    id,
    email: data.email,
    name: data.name,
    role: data.role || 'user',
    createdAt: now,
    updatedAt: now,
  };
  store.users.set(id, user);
  return user;
}

export function updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>, sessionId?: string): User | undefined {
  const store = getStore(sessionId);
  const user = store.users.get(id);
  if (!user) return undefined;

  const updated: User = {
    ...user,
    ...data,
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: new Date().toISOString(),
  };
  store.users.set(id, updated);
  return updated;
}

export function deleteUser(id: string, sessionId?: string): boolean {
  return getStore(sessionId).users.delete(id);
}

// Job operations
export function getJobs(sessionId?: string): Job[] {
  return Array.from(getStore(sessionId).jobs.values());
}

export function getJobById(id: string, sessionId?: string): Job | undefined {
  return getStore(sessionId).jobs.get(id);
}

export function createJob(data: { type: Job['type'] }, sessionId?: string): Job {
  const store = getStore(sessionId);
  const id = generateIdForStore(store);
  const job: Job = {
    id,
    type: data.type,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  store.jobs.set(id, job);

  // Simulate async job progress (only for default store, not during recording)
  if (!sessionId) {
    simulateJobProgress(id, sessionId);
  } else {
    // For recording, immediately mark as completed
    store.jobs.set(id, {
      ...job,
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      result: { message: 'Job completed successfully', processedItems: 42 },
    });
  }

  return store.jobs.get(id)!;
}

export function updateJob(id: string, data: Partial<Omit<Job, 'id' | 'createdAt'>>, sessionId?: string): Job | undefined {
  const store = getStore(sessionId);
  const job = store.jobs.get(id);
  if (!job) return undefined;

  const updated: Job = {
    ...job,
    ...data,
    id: job.id,
    createdAt: job.createdAt,
  };
  store.jobs.set(id, updated);
  return updated;
}

// Simulate job progress over time (only for live playback)
function simulateJobProgress(jobId: string, sessionId?: string): void {
  const progressSteps = [
    { delay: 500, progress: 0, status: 'running' as const },
    { delay: 1000, progress: 25, status: 'running' as const },
    { delay: 1500, progress: 50, status: 'running' as const },
    { delay: 2000, progress: 75, status: 'running' as const },
    { delay: 2500, progress: 100, status: 'completed' as const },
  ];

  const store = getStore(sessionId);
  for (const step of progressSteps) {
    setTimeout(() => {
      const job = store.jobs.get(jobId);
      if (job && job.status !== 'failed') {
        updateJob(jobId, {
          progress: step.progress,
          status: step.status,
          ...(step.status === 'completed' ? {
            completedAt: new Date().toISOString(),
            result: { message: 'Job completed successfully', processedItems: 42 }
          } : {}),
        }, sessionId);
      }
    }, step.delay);
  }
}

// Auth operations
export function createToken(userId: string, sessionId?: string): string {
  const store = getStore(sessionId);
  const token = `sandbox_${generateIdForStore(store)}_${Math.random().toString(36).substring(2)}`;
  store.tokens.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string, sessionId?: string): string | undefined {
  // Handle "Bearer " prefix
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  return getStore(sessionId).tokens.get(cleanToken);
}

export function invalidateToken(token: string, sessionId?: string): boolean {
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  return getStore(sessionId).tokens.delete(cleanToken);
}
