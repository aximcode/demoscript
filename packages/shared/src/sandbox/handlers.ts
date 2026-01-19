/**
 * Sandbox API - Request Handlers
 *
 * Framework-agnostic request handlers for the Sandbox API.
 * These can be used with Express, Hono, or any other framework.
 */

import {
  type SandboxRequest,
  type SandboxResponse,
  type User,
  type Job,
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getJobs,
  getJobById,
  createJob,
  createToken,
  getUserIdFromToken,
  resetSandboxData,
} from './data.js';

export { resetSandboxData };

// Error response helper
function errorResponse(status: number, error: string, code: string, details?: unknown): SandboxResponse {
  return {
    status,
    body: { error, code, ...(details ? { details } : {}) },
  };
}

// Success response helper
function successResponse(status: number, body: unknown): SandboxResponse {
  return { status, body };
}

// Route matcher helpers
function matchRoute(path: string, pattern: string): Record<string, string> | null {
  // Convert pattern like '/users/{id}' to regex
  const paramNames: string[] = [];
  const regexPattern = pattern.replace(/\{([^}]+)\}/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return params;
}

// Auth check helper
function checkAuth(req: SandboxRequest): { userId: string } | null {
  const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
  if (!authHeader) return null;

  const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const userId = getUserIdFromToken(token);
  if (!userId) return null;

  return { userId };
}

// Individual handlers
function handleHealth(): SandboxResponse {
  return successResponse(200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

function handleLogin(req: SandboxRequest): SandboxResponse {
  const body = req.body as { email?: string; password?: string } | undefined;

  if (!body?.email || !body?.password) {
    return errorResponse(400, 'Email and password are required', 'INVALID_INPUT');
  }

  // Find or create user by email
  let user = getUserByEmail(body.email);
  if (!user) {
    // In sandbox mode, auto-create users on login
    user = createUser({ email: body.email, name: body.email.split('@')[0], role: 'user' });
  }

  const token = createToken(user.id);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return successResponse(200, { token, user, expiresAt });
}

function handleListUsers(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '10'), 10), 100);
  const roleFilter = query.role as User['role'] | undefined;

  let users = getUsers();

  // Filter by role if specified
  if (roleFilter && ['admin', 'user', 'viewer'].includes(roleFilter)) {
    users = users.filter((u) => u.role === roleFilter);
  }

  const total = users.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginatedUsers = users.slice(start, start + limit);

  return successResponse(200, {
    users: paginatedUsers,
    total,
    page,
    limit,
    totalPages,
  });
}

function handleCreateUser(req: SandboxRequest): SandboxResponse {
  const body = req.body as { email?: string; name?: string; role?: User['role'] } | undefined;

  if (!body?.email || !body?.name) {
    return errorResponse(400, 'Email and name are required', 'INVALID_INPUT');
  }

  // Check for duplicate email
  if (getUserByEmail(body.email)) {
    return errorResponse(409, 'Email already exists', 'DUPLICATE_EMAIL');
  }

  const user = createUser({
    email: body.email,
    name: body.name,
    role: body.role,
  });

  return successResponse(201, user);
}

function handleGetUser(userId: string): SandboxResponse {
  const user = getUserById(userId);
  if (!user) {
    return errorResponse(404, 'User not found', 'NOT_FOUND');
  }
  return successResponse(200, user);
}

function handleUpdateUser(userId: string, req: SandboxRequest): SandboxResponse {
  const body = req.body as { email?: string; name?: string; role?: User['role'] } | undefined;

  if (!body || Object.keys(body).length === 0) {
    return errorResponse(400, 'No update fields provided', 'INVALID_INPUT');
  }

  const user = updateUser(userId, body);
  if (!user) {
    return errorResponse(404, 'User not found', 'NOT_FOUND');
  }

  return successResponse(200, user);
}

function handleDeleteUser(userId: string): SandboxResponse {
  const deleted = deleteUser(userId);
  if (!deleted) {
    return errorResponse(404, 'User not found', 'NOT_FOUND');
  }
  return successResponse(200, { success: true, message: 'User deleted' });
}

function handleListJobs(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const statusFilter = query.status as Job['status'] | undefined;

  let jobs = getJobs();

  // Filter by status if specified
  if (statusFilter && ['pending', 'running', 'completed', 'failed'].includes(statusFilter)) {
    jobs = jobs.filter((j) => j.status === statusFilter);
  }

  return successResponse(200, { jobs, total: jobs.length });
}

function handleCreateJob(req: SandboxRequest): SandboxResponse {
  const body = req.body as { type?: Job['type'] } | undefined;

  if (!body?.type || !['export', 'import', 'process'].includes(body.type)) {
    return errorResponse(400, 'Valid job type is required (export, import, process)', 'INVALID_INPUT');
  }

  const job = createJob({ type: body.type });
  return successResponse(201, job);
}

function handleGetJob(jobId: string): SandboxResponse {
  const job = getJobById(jobId);
  if (!job) {
    return errorResponse(404, 'Job not found', 'NOT_FOUND');
  }
  return successResponse(200, job);
}

function handleEcho(req: SandboxRequest): SandboxResponse {
  return successResponse(200, {
    echo: req.body || {},
    timestamp: new Date().toISOString(),
    method: req.method,
  });
}

function handleError(code: string): SandboxResponse {
  const statusCode = parseInt(code, 10);

  const errorMessages: Record<number, { error: string; code: string }> = {
    400: { error: 'Bad Request', code: 'BAD_REQUEST' },
    401: { error: 'Unauthorized', code: 'UNAUTHORIZED' },
    403: { error: 'Forbidden', code: 'FORBIDDEN' },
    404: { error: 'Not Found', code: 'NOT_FOUND' },
    500: { error: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    502: { error: 'Bad Gateway', code: 'BAD_GATEWAY' },
    503: { error: 'Service Unavailable', code: 'SERVICE_UNAVAILABLE' },
  };

  const errorInfo = errorMessages[statusCode];
  if (!errorInfo) {
    return errorResponse(400, 'Invalid error code', 'INVALID_ERROR_CODE');
  }

  return errorResponse(statusCode, errorInfo.error, errorInfo.code);
}

/**
 * Main request handler for the Sandbox API
 *
 * @param req - The incoming request
 * @returns A SandboxResponse with status and body
 */
export async function handleSandboxRequest(req: SandboxRequest): Promise<SandboxResponse> {
  // Normalize path - remove leading slash if present
  const path = req.path.startsWith('/') ? req.path : `/${req.path}`;
  const method = req.method.toUpperCase();

  // Health check (no auth required)
  if (path === '/health' && method === 'GET') {
    return handleHealth();
  }

  // OpenAPI spec (no auth required, handled by caller)
  if (path === '/openapi.json' && method === 'GET') {
    // This is handled by the framework integration to return the spec directly
    return errorResponse(404, 'OpenAPI spec should be served by framework', 'NOT_IMPLEMENTED');
  }

  // Login (no auth required)
  if (path === '/auth/login' && method === 'POST') {
    return handleLogin(req);
  }

  // Echo (no auth required)
  if (path === '/echo' && method === 'POST') {
    return handleEcho(req);
  }

  // Error generator (no auth required)
  const errorMatch = matchRoute(path, '/error/{code}');
  if (errorMatch && method === 'GET') {
    return handleError(errorMatch.code);
  }

  // All other routes require auth (but we'll be lenient in sandbox mode)
  // const auth = checkAuth(req);
  // If we wanted to enforce auth:
  // if (!auth) {
  //   return errorResponse(401, 'Authentication required', 'UNAUTHORIZED');
  // }

  // User routes
  if (path === '/users') {
    if (method === 'GET') return handleListUsers(req);
    if (method === 'POST') return handleCreateUser(req);
  }

  const userMatch = matchRoute(path, '/users/{id}');
  if (userMatch) {
    if (method === 'GET') return handleGetUser(userMatch.id);
    if (method === 'PUT') return handleUpdateUser(userMatch.id, req);
    if (method === 'DELETE') return handleDeleteUser(userMatch.id);
  }

  // Job routes
  if (path === '/jobs') {
    if (method === 'GET') return handleListJobs(req);
    if (method === 'POST') return handleCreateJob(req);
  }

  const jobMatch = matchRoute(path, '/jobs/{id}');
  if (jobMatch && method === 'GET') {
    return handleGetJob(jobMatch.id);
  }

  // Not found
  return errorResponse(404, `Route not found: ${method} ${path}`, 'NOT_FOUND');
}
