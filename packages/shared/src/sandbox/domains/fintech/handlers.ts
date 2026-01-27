/**
 * Fintech Domain - Request Handlers
 *
 * Framework-agnostic request handlers for the Fintech API.
 */

import type { SandboxRequest, SandboxResponse } from '../../data.js';
import {
  getAccounts,
  getAccountById,
  createAccount,
  getTransactions,
  getTransfers,
  getTransferById,
  createTransfer,
  getPayments,
  getPaymentById,
  createPayment,
  cancelPayment,
  getCards,
  getCardById,
  createCard,
  toggleCardFreeze,
} from './data.js';

// Response helpers
function errorResponse(status: number, error: string, code: string): SandboxResponse {
  return { status, body: { error, code } };
}

function successResponse(status: number, body: unknown): SandboxResponse {
  return { status, body };
}

// Route matcher
function matchRoute(path: string, pattern: string): Record<string, string> | null {
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

// Account handlers
function handleListAccounts(req: SandboxRequest): SandboxResponse {
  const accounts = getAccounts(req.sessionId);
  return successResponse(200, { accounts, total: accounts.length });
}

function handleGetAccount(id: string, req: SandboxRequest): SandboxResponse {
  const account = getAccountById(id, req.sessionId);
  if (!account) {
    return errorResponse(404, 'Account not found', 'NOT_FOUND');
  }
  return successResponse(200, account);
}

function handleGetAccountTransactions(id: string, req: SandboxRequest): SandboxResponse {
  const account = getAccountById(id, req.sessionId);
  if (!account) {
    return errorResponse(404, 'Account not found', 'NOT_FOUND');
  }

  const transactions = getTransactions(id, req.sessionId);

  // Pagination
  const query = req.query || {};
  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '20'), 10), 100);
  const start = (page - 1) * limit;
  const paginatedTransactions = transactions.slice(start, start + limit);

  return successResponse(200, {
    transactions: paginatedTransactions,
    total: transactions.length,
    page,
    limit,
    totalPages: Math.ceil(transactions.length / limit),
  });
}

function handleCreateAccount(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    name: string;
    type: 'checking' | 'savings' | 'investment';
    balance: number;
    currency: string;
  }> | undefined;

  if (!body?.name || !body?.type) {
    return errorResponse(400, 'Name and type are required', 'INVALID_INPUT');
  }

  const account = createAccount({
    name: body.name,
    type: body.type,
    balance: body.balance ?? 0,
    currency: body.currency || 'USD',
    status: 'active',
  }, req.sessionId);

  return successResponse(201, account);
}

// Transfer handlers
function handleListTransfers(req: SandboxRequest): SandboxResponse {
  const transfers = getTransfers(req.sessionId);
  return successResponse(200, { transfers, total: transfers.length });
}

function handleGetTransfer(id: string, req: SandboxRequest): SandboxResponse {
  const transfer = getTransferById(id, req.sessionId);
  if (!transfer) {
    return errorResponse(404, 'Transfer not found', 'NOT_FOUND');
  }
  return successResponse(200, transfer);
}

function handleCreateTransfer(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
  }> | undefined;

  if (!body?.fromAccountId || !body?.toAccountId || !body?.amount) {
    return errorResponse(400, 'fromAccountId, toAccountId, and amount are required', 'INVALID_INPUT');
  }

  if (body.amount <= 0) {
    return errorResponse(400, 'Amount must be positive', 'INVALID_AMOUNT');
  }

  const result = createTransfer(
    body.fromAccountId,
    body.toAccountId,
    body.amount,
    body.description || 'Transfer',
    req.sessionId
  );

  if ('error' in result) {
    return errorResponse(400, result.error, 'TRANSFER_FAILED');
  }

  return successResponse(201, result);
}

// Payment handlers
function handleListPayments(req: SandboxRequest): SandboxResponse {
  const payments = getPayments(req.sessionId);
  return successResponse(200, { payments, total: payments.length });
}

function handleGetPayment(id: string, req: SandboxRequest): SandboxResponse {
  const payment = getPaymentById(id, req.sessionId);
  if (!payment) {
    return errorResponse(404, 'Payment not found', 'NOT_FOUND');
  }
  return successResponse(200, payment);
}

function handleCreatePayment(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    accountId: string;
    payee: string;
    amount: number;
    scheduledDate: string;
    recurring: boolean;
  }> | undefined;

  if (!body?.accountId || !body?.payee || !body?.amount || !body?.scheduledDate) {
    return errorResponse(400, 'accountId, payee, amount, and scheduledDate are required', 'INVALID_INPUT');
  }

  const result = createPayment(
    body.accountId,
    body.payee,
    body.amount,
    body.scheduledDate,
    body.recurring ?? false,
    req.sessionId
  );

  if ('error' in result) {
    return errorResponse(400, result.error, 'PAYMENT_FAILED');
  }

  return successResponse(201, result);
}

function handleCancelPayment(id: string, req: SandboxRequest): SandboxResponse {
  const result = cancelPayment(id, req.sessionId);

  if ('error' in result) {
    if (result.error === 'Payment not found') {
      return errorResponse(404, result.error, 'NOT_FOUND');
    }
    return errorResponse(400, result.error, 'CANCEL_FAILED');
  }

  return successResponse(200, result);
}

// Card handlers
function handleListCards(req: SandboxRequest): SandboxResponse {
  const cards = getCards(req.sessionId);
  return successResponse(200, { cards, total: cards.length });
}

function handleGetCard(id: string, req: SandboxRequest): SandboxResponse {
  const card = getCardById(id, req.sessionId);
  if (!card) {
    return errorResponse(404, 'Card not found', 'NOT_FOUND');
  }
  return successResponse(200, card);
}

function handleCreateCard(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    accountId: string;
    type: 'debit' | 'credit' | 'virtual';
    limit: number;
  }> | undefined;

  if (!body?.accountId || !body?.type) {
    return errorResponse(400, 'accountId and type are required', 'INVALID_INPUT');
  }

  const result = createCard({
    accountId: body.accountId,
    type: body.type,
    status: 'active',
    expiryMonth: 12,
    expiryYear: new Date().getFullYear() + 3,
    limit: body.limit,
  }, req.sessionId);

  if ('error' in result) {
    return errorResponse(400, result.error, 'CARD_CREATION_FAILED');
  }

  return successResponse(201, result);
}

function handleToggleCardFreeze(id: string, req: SandboxRequest): SandboxResponse {
  const result = toggleCardFreeze(id, req.sessionId);

  if ('error' in result) {
    if (result.error === 'Card not found') {
      return errorResponse(404, result.error, 'NOT_FOUND');
    }
    return errorResponse(400, result.error, 'FREEZE_FAILED');
  }

  return successResponse(200, result);
}

/**
 * Main handler for Fintech API requests
 */
export function handleFintechRequest(req: SandboxRequest): SandboxResponse {
  const path = req.path.startsWith('/') ? req.path : `/${req.path}`;
  const method = req.method.toUpperCase();

  // Accounts
  if (path === '/accounts' || path === '/') {
    if (method === 'GET') return handleListAccounts(req);
    if (method === 'POST') return handleCreateAccount(req);
  }

  const accountMatch = matchRoute(path, '/accounts/{id}');
  if (accountMatch) {
    if (method === 'GET') return handleGetAccount(accountMatch.id, req);
  }

  const accountTxMatch = matchRoute(path, '/accounts/{id}/transactions');
  if (accountTxMatch && method === 'GET') {
    return handleGetAccountTransactions(accountTxMatch.id, req);
  }

  // Transfers
  if (path === '/transfers') {
    if (method === 'GET') return handleListTransfers(req);
    if (method === 'POST') return handleCreateTransfer(req);
  }

  const transferMatch = matchRoute(path, '/transfers/{id}');
  if (transferMatch && method === 'GET') {
    return handleGetTransfer(transferMatch.id, req);
  }

  // Payments
  if (path === '/payments') {
    if (method === 'GET') return handleListPayments(req);
    if (method === 'POST') return handleCreatePayment(req);
  }

  const paymentMatch = matchRoute(path, '/payments/{id}');
  if (paymentMatch) {
    if (method === 'GET') return handleGetPayment(paymentMatch.id, req);
    if (method === 'DELETE') return handleCancelPayment(paymentMatch.id, req);
  }

  // Cards
  if (path === '/cards') {
    if (method === 'GET') return handleListCards(req);
    if (method === 'POST') return handleCreateCard(req);
  }

  const cardMatch = matchRoute(path, '/cards/{id}');
  if (cardMatch && method === 'GET') {
    return handleGetCard(cardMatch.id, req);
  }

  const cardFreezeMatch = matchRoute(path, '/cards/{id}/freeze');
  if (cardFreezeMatch && method === 'PUT') {
    return handleToggleCardFreeze(cardFreezeMatch.id, req);
  }

  return errorResponse(404, `Route not found: ${method} ${path}`, 'NOT_FOUND');
}
