/**
 * Sandbox API - OpenAPI 3.0 Specification
 *
 * A mock API for testing DemoScript demos without external dependencies.
 */

export const sandboxOpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DemoScript Sandbox API',
    version: '1.0.0',
    description: 'A mock API for testing DemoScript demos. Provides user management, async jobs, authentication, and utility endpoints.',
    contact: {
      name: 'DemoScript',
      url: 'https://demoscript.app',
    },
  },
  servers: [
    { url: '/sandbox', description: 'Local CLI' },
    { url: 'https://demoscript.app/api/sandbox', description: 'DemoScript Cloud' },
  ],
  tags: [
    { name: 'health', description: 'Health check endpoints' },
    { name: 'auth', description: 'Authentication endpoints' },
    { name: 'users', description: 'User management' },
    { name: 'jobs', description: 'Async job management' },
    { name: 'utility', description: 'Utility endpoints' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Health check',
        description: 'Returns the health status of the API',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Authenticate user',
        description: 'Login with email and password to get an authentication token',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                    example: 'demo@example.com',
                  },
                  password: {
                    type: 'string',
                    format: 'password',
                    description: 'User password (any value accepted in sandbox)',
                    example: 'demo123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successfully authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/users': {
      get: {
        tags: ['users'],
        summary: 'List users',
        description: 'Get a paginated list of all users',
        operationId: 'listUsers',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (1-indexed)',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: 'role',
            in: 'query',
            description: 'Filter by role',
            schema: { type: 'string', enum: ['admin', 'user', 'viewer'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    users: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                    total: { type: 'integer', description: 'Total number of users' },
                    page: { type: 'integer', description: 'Current page' },
                    limit: { type: 'integer', description: 'Items per page' },
                    totalPages: { type: 'integer', description: 'Total number of pages' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['users'],
        summary: 'Create user',
        description: 'Create a new user',
        operationId: 'createUser',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'name'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                    example: 'newuser@example.com',
                  },
                  name: {
                    type: 'string',
                    description: 'User full name',
                    example: 'New User',
                  },
                  role: {
                    type: 'string',
                    enum: ['admin', 'user', 'viewer'],
                    default: 'user',
                    description: 'User role',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '409': {
            description: 'Email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['users'],
        summary: 'Get user',
        description: 'Get a user by ID',
        operationId: 'getUser',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'User found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['users'],
        summary: 'Update user',
        description: 'Update an existing user',
        operationId: 'updateUser',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email address',
                  },
                  name: {
                    type: 'string',
                    description: 'User full name',
                  },
                  role: {
                    type: 'string',
                    enum: ['admin', 'user', 'viewer'],
                    description: 'User role',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'User updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['users'],
        summary: 'Delete user',
        description: 'Delete a user by ID',
        operationId: 'deleteUser',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'User ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'User deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User deleted' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/jobs': {
      get: {
        tags: ['jobs'],
        summary: 'List jobs',
        description: 'Get a list of all async jobs',
        operationId: 'listJobs',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filter by status',
            schema: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Job' },
                    },
                    total: { type: 'integer', description: 'Total number of jobs' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['jobs'],
        summary: 'Create job',
        description: 'Create a new async job. The job will progress through pending -> running -> completed over ~3 seconds.',
        operationId: 'createJob',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['export', 'import', 'process'],
                    description: 'Type of job to create',
                    example: 'export',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Job created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['jobs'],
        summary: 'Get job status',
        description: 'Get the current status of an async job. Poll this endpoint to track job progress.',
        operationId: 'getJob',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Job ID',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Job found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          '404': {
            description: 'Job not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/echo': {
      post: {
        tags: ['utility'],
        summary: 'Echo request',
        description: 'Returns the request body back in the response. Useful for testing.',
        operationId: 'echo',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
                description: 'Any JSON object',
                example: { message: 'Hello, World!', number: 42 },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Echo response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    echo: {
                      type: 'object',
                      additionalProperties: true,
                      description: 'The request body that was sent',
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                    method: { type: 'string', example: 'POST' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/error/{code}': {
      get: {
        tags: ['utility'],
        summary: 'Generate error',
        description: 'Returns a specific HTTP error code. Useful for testing error handling.',
        operationId: 'generateError',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            description: 'HTTP status code to return',
            schema: {
              type: 'integer',
              enum: [400, 401, 403, 404, 500, 502, 503],
            },
          },
        ],
        responses: {
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '404': {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '502': {
            description: 'Bad Gateway',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '503': {
            description: 'Service Unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique user ID', example: 'lx1abc-1' },
          email: { type: 'string', format: 'email', description: 'User email', example: 'user@example.com' },
          name: { type: 'string', description: 'User full name', example: 'John Doe' },
          role: { type: 'string', enum: ['admin', 'user', 'viewer'], description: 'User role' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
        },
        required: ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'],
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique job ID', example: 'lx1def-2' },
          type: { type: 'string', enum: ['export', 'import', 'process'], description: 'Job type' },
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'], description: 'Current job status' },
          progress: { type: 'integer', minimum: 0, maximum: 100, description: 'Progress percentage' },
          result: { type: 'object', additionalProperties: true, description: 'Job result (when completed)' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          completedAt: { type: 'string', format: 'date-time', description: 'Completion timestamp' },
        },
        required: ['id', 'type', 'status', 'progress', 'createdAt'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Bearer token for authentication', example: 'sandbox_lx1ghi-3_abc123' },
          user: { $ref: '#/components/schemas/User' },
          expiresAt: { type: 'string', format: 'date-time', description: 'Token expiration time' },
        },
        required: ['token', 'user', 'expiresAt'],
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message', example: 'Not found' },
          code: { type: 'string', description: 'Error code', example: 'NOT_FOUND' },
          details: { type: 'object', additionalProperties: true, description: 'Additional error details' },
        },
        required: ['error', 'code'],
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Use the token from /auth/login as Bearer token',
      },
    },
  },
};

// Export type for TypeScript
export type SandboxOpenApiSpec = typeof sandboxOpenApiSpec;
