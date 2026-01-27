/**
 * Fintech Domain - OpenAPI Specification
 */

export const fintechOpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DemoScript Fintech API',
    version: '1.0.0',
    description: 'Mock banking/financial API for fintech demos. Includes accounts, transactions, transfers, payments, and cards.',
    contact: {
      name: 'DemoScript',
      url: 'https://demoscript.app/support',
    },
  },
  servers: [
    { url: 'https://demoscript.app/api/v1/fintech', description: 'DemoScript Public API' },
    { url: '/sandbox/fintech', description: 'Local CLI' },
  ],
  tags: [
    { name: 'Accounts', description: 'Bank account operations' },
    { name: 'Transfers', description: 'Money transfers between accounts' },
    { name: 'Payments', description: 'Scheduled payments' },
    { name: 'Cards', description: 'Virtual and physical card management' },
  ],
  paths: {
    '/accounts': {
      get: {
        operationId: 'listAccounts',
        summary: 'List accounts',
        description: 'Get all bank accounts.',
        tags: ['Accounts'],
        responses: {
          '200': {
            description: 'List of accounts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accounts: { type: 'array', items: { $ref: '#/components/schemas/Account' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createAccount',
        summary: 'Create account',
        description: 'Create a new bank account.',
        tags: ['Accounts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AccountInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/accounts/{id}': {
      get: {
        operationId: 'getAccount',
        summary: 'Get account',
        description: 'Get account details including balance.',
        tags: ['Accounts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Account details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Account' } } },
          },
          '404': { description: 'Account not found' },
        },
      },
    },
    '/accounts/{id}/transactions': {
      get: {
        operationId: 'getAccountTransactions',
        summary: 'Get account transactions',
        description: 'Get transaction history for an account.',
        tags: ['Accounts'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'Transaction history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
          '404': { description: 'Account not found' },
        },
      },
    },
    '/transfers': {
      get: {
        operationId: 'listTransfers',
        summary: 'List transfers',
        description: 'Get all transfers.',
        tags: ['Transfers'],
        responses: {
          '200': {
            description: 'List of transfers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transfers: { type: 'array', items: { $ref: '#/components/schemas/Transfer' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createTransfer',
        summary: 'Create transfer',
        description: 'Transfer money between accounts.',
        tags: ['Transfers'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransferInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer completed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Transfer' } } },
          },
          '400': { description: 'Transfer failed (insufficient funds, invalid accounts)' },
        },
      },
    },
    '/transfers/{id}': {
      get: {
        operationId: 'getTransfer',
        summary: 'Get transfer',
        description: 'Get transfer status and details.',
        tags: ['Transfers'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Transfer details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Transfer' } } },
          },
          '404': { description: 'Transfer not found' },
        },
      },
    },
    '/payments': {
      get: {
        operationId: 'listPayments',
        summary: 'List payments',
        description: 'Get all scheduled payments.',
        tags: ['Payments'],
        responses: {
          '200': {
            description: 'List of payments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createPayment',
        summary: 'Schedule payment',
        description: 'Schedule a new payment.',
        tags: ['Payments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaymentInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment scheduled',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/payments/{id}': {
      get: {
        operationId: 'getPayment',
        summary: 'Get payment',
        description: 'Get payment details.',
        tags: ['Payments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Payment details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } },
          },
          '404': { description: 'Payment not found' },
        },
      },
      delete: {
        operationId: 'cancelPayment',
        summary: 'Cancel payment',
        description: 'Cancel a scheduled payment.',
        tags: ['Payments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Payment cancelled',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } },
          },
          '400': { description: 'Cannot cancel this payment' },
          '404': { description: 'Payment not found' },
        },
      },
    },
    '/cards': {
      get: {
        operationId: 'listCards',
        summary: 'List cards',
        description: 'Get all cards.',
        tags: ['Cards'],
        responses: {
          '200': {
            description: 'List of cards',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cards: { type: 'array', items: { $ref: '#/components/schemas/Card' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createCard',
        summary: 'Create card',
        description: 'Create a new virtual or physical card.',
        tags: ['Cards'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CardInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Card created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/cards/{id}': {
      get: {
        operationId: 'getCard',
        summary: 'Get card',
        description: 'Get card details.',
        tags: ['Cards'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Card details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } },
          },
          '404': { description: 'Card not found' },
        },
      },
    },
    '/cards/{id}/freeze': {
      put: {
        operationId: 'toggleCardFreeze',
        summary: 'Freeze/unfreeze card',
        description: 'Toggle card freeze status.',
        tags: ['Cards'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Card status updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Card' } } },
          },
          '400': { description: 'Cannot modify this card' },
          '404': { description: 'Card not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      Account: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['checking', 'savings', 'investment'] },
          balance: { type: 'number', description: 'Current balance' },
          currency: { type: 'string' },
          accountNumber: { type: 'string', description: 'Masked account number' },
          status: { type: 'string', enum: ['active', 'frozen', 'closed'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AccountInput: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', description: 'Account name' },
          type: { type: 'string', enum: ['checking', 'savings', 'investment'] },
          balance: { type: 'number', default: 0 },
          currency: { type: 'string', default: 'USD' },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          accountId: { type: 'string' },
          type: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer', 'payment', 'fee', 'interest'] },
          amount: { type: 'number' },
          currency: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'] },
          reference: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Transfer: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fromAccountId: { type: 'string' },
          toAccountId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
        },
      },
      TransferInput: {
        type: 'object',
        required: ['fromAccountId', 'toAccountId', 'amount'],
        properties: {
          fromAccountId: { type: 'string', description: 'Source account ID' },
          toAccountId: { type: 'string', description: 'Destination account ID' },
          amount: { type: 'number', description: 'Amount to transfer' },
          description: { type: 'string', description: 'Transfer description' },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          accountId: { type: 'string' },
          payee: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date' },
          status: { type: 'string', enum: ['scheduled', 'processing', 'completed', 'cancelled', 'failed'] },
          recurring: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaymentInput: {
        type: 'object',
        required: ['accountId', 'payee', 'amount', 'scheduledDate'],
        properties: {
          accountId: { type: 'string', description: 'Account to pay from' },
          payee: { type: 'string', description: 'Payment recipient' },
          amount: { type: 'number', description: 'Payment amount' },
          scheduledDate: { type: 'string', format: 'date', description: 'Date to execute payment' },
          recurring: { type: 'boolean', default: false },
        },
      },
      Card: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          accountId: { type: 'string' },
          type: { type: 'string', enum: ['debit', 'credit', 'virtual'] },
          lastFour: { type: 'string', description: 'Last 4 digits of card number' },
          expiryMonth: { type: 'integer' },
          expiryYear: { type: 'integer' },
          status: { type: 'string', enum: ['active', 'frozen', 'cancelled'] },
          limit: { type: 'number', description: 'Credit limit (credit cards only)' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CardInput: {
        type: 'object',
        required: ['accountId', 'type'],
        properties: {
          accountId: { type: 'string', description: 'Linked account ID' },
          type: { type: 'string', enum: ['debit', 'credit', 'virtual'] },
          limit: { type: 'number', description: 'Credit limit (for credit cards)' },
        },
      },
    },
  },
};
