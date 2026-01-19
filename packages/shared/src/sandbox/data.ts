/**
 * Sandbox API - In-memory data store
 *
 * This module provides an in-memory data store for the Sandbox API.
 * Data is ephemeral and resets on server restart.
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
}

export interface SandboxResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

// Helper to generate unique IDs
let idCounter = 0;
export function generateId(): string {
  return `${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
}

// In-memory data store
interface DataStore {
  users: Map<string, User>;
  jobs: Map<string, Job>;
  tokens: Map<string, string>; // token -> userId
}

const store: DataStore = {
  users: new Map(),
  jobs: new Map(),
  tokens: new Map(),
};

// Seed data
const seedUsers: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { email: 'admin@example.com', name: 'Admin User', role: 'admin' },
  { email: 'alice@example.com', name: 'Alice Johnson', role: 'user' },
  { email: 'bob@example.com', name: 'Bob Smith', role: 'user' },
  { email: 'demo@example.com', name: 'Demo User', role: 'viewer' },
];

// Initialize store with seed data
function initializeStore(): void {
  store.users.clear();
  store.jobs.clear();
  store.tokens.clear();
  idCounter = 0;

  const now = new Date().toISOString();
  for (const userData of seedUsers) {
    const id = generateId();
    store.users.set(id, {
      ...userData,
      id,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// Initialize on load
initializeStore();

/**
 * Reset the data store to initial seed data
 */
export function resetSandboxData(): void {
  initializeStore();
}

// User operations
export function getUsers(): User[] {
  return Array.from(store.users.values());
}

export function getUserById(id: string): User | undefined {
  return store.users.get(id);
}

export function getUserByEmail(email: string): User | undefined {
  return Array.from(store.users.values()).find((u) => u.email === email);
}

export function createUser(data: { email: string; name: string; role?: User['role'] }): User {
  const id = generateId();
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

export function updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt'>>): User | undefined {
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

export function deleteUser(id: string): boolean {
  return store.users.delete(id);
}

// Job operations
export function getJobs(): Job[] {
  return Array.from(store.jobs.values());
}

export function getJobById(id: string): Job | undefined {
  return store.jobs.get(id);
}

export function createJob(data: { type: Job['type'] }): Job {
  const id = generateId();
  const job: Job = {
    id,
    type: data.type,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
  };
  store.jobs.set(id, job);

  // Simulate async job progress
  simulateJobProgress(id);

  return job;
}

export function updateJob(id: string, data: Partial<Omit<Job, 'id' | 'createdAt'>>): Job | undefined {
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

// Simulate job progress over time
function simulateJobProgress(jobId: string): void {
  const progressSteps = [
    { delay: 500, progress: 0, status: 'running' as const },
    { delay: 1000, progress: 25, status: 'running' as const },
    { delay: 1500, progress: 50, status: 'running' as const },
    { delay: 2000, progress: 75, status: 'running' as const },
    { delay: 2500, progress: 100, status: 'completed' as const },
  ];

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
        });
      }
    }, step.delay);
  }
}

// Auth operations
export function createToken(userId: string): string {
  const token = `sandbox_${generateId()}_${Math.random().toString(36).substring(2)}`;
  store.tokens.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string): string | undefined {
  // Handle "Bearer " prefix
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  return store.tokens.get(cleanToken);
}

export function invalidateToken(token: string): boolean {
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
  return store.tokens.delete(cleanToken);
}
