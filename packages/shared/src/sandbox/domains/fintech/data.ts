/**
 * Fintech Domain - In-memory data store
 *
 * Mock banking/financial API for fintech demos.
 * Includes accounts, transactions, transfers, payments, and cards.
 */

// Types
export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'investment';
  balance: number;
  currency: string;
  accountNumber: string;
  status: 'active' | 'frozen' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'fee' | 'interest';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  createdAt: string;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface Payment {
  id: string;
  accountId: string;
  payee: string;
  amount: number;
  currency: string;
  scheduledDate: string;
  status: 'scheduled' | 'processing' | 'completed' | 'cancelled' | 'failed';
  recurring: boolean;
  createdAt: string;
}

export interface Card {
  id: string;
  accountId: string;
  type: 'debit' | 'credit' | 'virtual';
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  status: 'active' | 'frozen' | 'cancelled';
  limit?: number;
  createdAt: string;
}

// In-memory data store structure
interface FintechStore {
  accounts: Map<string, Account>;
  transactions: Map<string, Transaction>;
  transfers: Map<string, Transfer>;
  payments: Map<string, Payment>;
  cards: Map<string, Card>;
  idCounter: number;
}

// Session-scoped stores
const sessions = new Map<string, FintechStore>();

// Default shared store
let defaultStore: FintechStore;

// Seed data
const seedAccounts: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Primary Checking', type: 'checking', balance: 5432.10, currency: 'USD', accountNumber: '****1234', status: 'active' },
  { name: 'High-Yield Savings', type: 'savings', balance: 25000.00, currency: 'USD', accountNumber: '****5678', status: 'active' },
  { name: 'Investment Portfolio', type: 'investment', balance: 142350.75, currency: 'USD', accountNumber: '****9012', status: 'active' },
];

const seedTransactionTemplates = [
  { type: 'deposit' as const, amount: 3500.00, description: 'Direct Deposit - Payroll' },
  { type: 'withdrawal' as const, amount: -200.00, description: 'ATM Withdrawal' },
  { type: 'payment' as const, amount: -89.99, description: 'Netflix Subscription' },
  { type: 'payment' as const, amount: -156.42, description: 'Electric Bill Payment' },
  { type: 'transfer' as const, amount: -500.00, description: 'Transfer to Savings' },
  { type: 'deposit' as const, amount: 500.00, description: 'Transfer from Checking' },
  { type: 'payment' as const, amount: -42.50, description: 'Restaurant - The Local Cafe' },
  { type: 'payment' as const, amount: -1200.00, description: 'Rent Payment' },
  { type: 'interest' as const, amount: 12.50, description: 'Monthly Interest' },
  { type: 'fee' as const, amount: -2.50, description: 'ATM Fee' },
  { type: 'deposit' as const, amount: 150.00, description: 'Venmo Transfer' },
  { type: 'payment' as const, amount: -67.89, description: 'Amazon Purchase' },
  { type: 'payment' as const, amount: -15.99, description: 'Spotify Premium' },
  { type: 'deposit' as const, amount: 3500.00, description: 'Direct Deposit - Payroll' },
  { type: 'withdrawal' as const, amount: -100.00, description: 'ATM Withdrawal' },
  { type: 'payment' as const, amount: -234.56, description: 'Insurance Premium' },
  { type: 'payment' as const, amount: -78.00, description: 'Phone Bill' },
  { type: 'transfer' as const, amount: -1000.00, description: 'Transfer to Investment' },
  { type: 'deposit' as const, amount: 1000.00, description: 'Transfer from Checking' },
  { type: 'interest' as const, amount: 125.00, description: 'Dividend Payment' },
];

const seedCards: Omit<Card, 'id' | 'createdAt'>[] = [
  { accountId: '1', type: 'debit', lastFour: '4321', expiryMonth: 12, expiryYear: 2027, status: 'active' },
  { accountId: '1', type: 'virtual', lastFour: '9999', expiryMonth: 6, expiryYear: 2026, status: 'frozen' },
];

// Helper to generate unique IDs
function generateId(store: FintechStore): string {
  return `ft_${Date.now().toString(36)}_${(++store.idCounter).toString(36)}`;
}

// Create a fresh store with seed data
function createFreshStore(): FintechStore {
  const store: FintechStore = {
    accounts: new Map(),
    transactions: new Map(),
    transfers: new Map(),
    payments: new Map(),
    cards: new Map(),
    idCounter: 0,
  };

  const now = new Date();

  // Seed accounts
  for (let i = 0; i < seedAccounts.length; i++) {
    const id = String(i + 1);
    store.accounts.set(id, {
      ...seedAccounts[i],
      id,
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  // Seed transactions (distributed across accounts and time)
  for (let i = 0; i < seedTransactionTemplates.length; i++) {
    const id = String(i + 1);
    const template = seedTransactionTemplates[i];
    const daysAgo = Math.floor(i * 1.5); // Spread over ~30 days
    const accountId = template.type === 'interest' || template.type === 'fee'
      ? (i % 2 === 0 ? '1' : '2')
      : (i % 3 + 1).toString();

    store.transactions.set(id, {
      id,
      accountId,
      type: template.type,
      amount: Math.abs(template.amount),
      currency: 'USD',
      description: template.description,
      status: 'completed',
      createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Seed cards
  for (let i = 0; i < seedCards.length; i++) {
    const id = String(i + 1);
    store.cards.set(id, {
      ...seedCards[i],
      id,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return store;
}

// Initialize default store
defaultStore = createFreshStore();

// Get the appropriate store
export function getStore(sessionId?: string): FintechStore {
  if (sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, createFreshStore());
    }
    return sessions.get(sessionId)!;
  }
  return defaultStore;
}

// Account operations
export function getAccounts(sessionId?: string): Account[] {
  return Array.from(getStore(sessionId).accounts.values());
}

export function getAccountById(id: string, sessionId?: string): Account | undefined {
  return getStore(sessionId).accounts.get(id);
}

export function createAccount(data: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'accountNumber'>, sessionId?: string): Account {
  const store = getStore(sessionId);
  const id = generateId(store);
  const now = new Date().toISOString();
  const account: Account = {
    ...data,
    id,
    accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: now,
    updatedAt: now,
  };
  store.accounts.set(id, account);
  return account;
}

export function updateAccountBalance(id: string, amount: number, sessionId?: string): Account | undefined {
  const store = getStore(sessionId);
  const account = store.accounts.get(id);
  if (!account) return undefined;

  const updated: Account = {
    ...account,
    balance: Math.round((account.balance + amount) * 100) / 100,
    updatedAt: new Date().toISOString(),
  };
  store.accounts.set(id, updated);
  return updated;
}

// Transaction operations
export function getTransactions(accountId?: string, sessionId?: string): Transaction[] {
  let transactions = Array.from(getStore(sessionId).transactions.values());
  if (accountId) {
    transactions = transactions.filter(t => t.accountId === accountId);
  }
  return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransactionById(id: string, sessionId?: string): Transaction | undefined {
  return getStore(sessionId).transactions.get(id);
}

export function createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>, sessionId?: string): Transaction {
  const store = getStore(sessionId);
  const id = generateId(store);
  const transaction: Transaction = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  store.transactions.set(id, transaction);
  return transaction;
}

// Transfer operations
export function getTransfers(sessionId?: string): Transfer[] {
  return Array.from(getStore(sessionId).transfers.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTransferById(id: string, sessionId?: string): Transfer | undefined {
  return getStore(sessionId).transfers.get(id);
}

export function createTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description: string,
  sessionId?: string
): Transfer | { error: string } {
  const store = getStore(sessionId);

  const fromAccount = store.accounts.get(fromAccountId);
  const toAccount = store.accounts.get(toAccountId);

  if (!fromAccount) return { error: 'Source account not found' };
  if (!toAccount) return { error: 'Destination account not found' };
  if (fromAccount.status !== 'active') return { error: 'Source account is not active' };
  if (toAccount.status !== 'active') return { error: 'Destination account is not active' };
  if (fromAccount.balance < amount) return { error: 'Insufficient funds' };

  const id = generateId(store);
  const now = new Date().toISOString();

  const transfer: Transfer = {
    id,
    fromAccountId,
    toAccountId,
    amount,
    currency: 'USD',
    description,
    status: 'completed',
    createdAt: now,
    completedAt: now,
  };

  // Update balances
  updateAccountBalance(fromAccountId, -amount, sessionId);
  updateAccountBalance(toAccountId, amount, sessionId);

  // Create transactions
  createTransaction({
    accountId: fromAccountId,
    type: 'transfer',
    amount,
    currency: 'USD',
    description: `Transfer to ${toAccount.name}`,
    status: 'completed',
    reference: id,
  }, sessionId);

  createTransaction({
    accountId: toAccountId,
    type: 'transfer',
    amount,
    currency: 'USD',
    description: `Transfer from ${fromAccount.name}`,
    status: 'completed',
    reference: id,
  }, sessionId);

  store.transfers.set(id, transfer);
  return transfer;
}

// Payment operations
export function getPayments(sessionId?: string): Payment[] {
  return Array.from(getStore(sessionId).payments.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPaymentById(id: string, sessionId?: string): Payment | undefined {
  return getStore(sessionId).payments.get(id);
}

export function createPayment(
  accountId: string,
  payee: string,
  amount: number,
  scheduledDate: string,
  recurring: boolean = false,
  sessionId?: string
): Payment | { error: string } {
  const store = getStore(sessionId);
  const account = store.accounts.get(accountId);

  if (!account) return { error: 'Account not found' };
  if (account.status !== 'active') return { error: 'Account is not active' };

  const id = generateId(store);
  const payment: Payment = {
    id,
    accountId,
    payee,
    amount,
    currency: 'USD',
    scheduledDate,
    status: 'scheduled',
    recurring,
    createdAt: new Date().toISOString(),
  };

  store.payments.set(id, payment);
  return payment;
}

export function cancelPayment(id: string, sessionId?: string): Payment | { error: string } {
  const store = getStore(sessionId);
  const payment = store.payments.get(id);

  if (!payment) return { error: 'Payment not found' };
  if (payment.status !== 'scheduled') return { error: 'Only scheduled payments can be cancelled' };

  const updated: Payment = { ...payment, status: 'cancelled' };
  store.payments.set(id, updated);
  return updated;
}

// Card operations
export function getCards(sessionId?: string): Card[] {
  return Array.from(getStore(sessionId).cards.values());
}

export function getCardById(id: string, sessionId?: string): Card | undefined {
  return getStore(sessionId).cards.get(id);
}

export function createCard(data: Omit<Card, 'id' | 'createdAt' | 'lastFour'>, sessionId?: string): Card | { error: string } {
  const store = getStore(sessionId);
  const account = store.accounts.get(data.accountId);

  if (!account) return { error: 'Account not found' };

  const id = generateId(store);
  const card: Card = {
    ...data,
    id,
    lastFour: String(Math.floor(1000 + Math.random() * 9000)),
    createdAt: new Date().toISOString(),
  };

  store.cards.set(id, card);
  return card;
}

export function toggleCardFreeze(id: string, sessionId?: string): Card | { error: string } {
  const store = getStore(sessionId);
  const card = store.cards.get(id);

  if (!card) return { error: 'Card not found' };
  if (card.status === 'cancelled') return { error: 'Card has been cancelled' };

  const updated: Card = {
    ...card,
    status: card.status === 'frozen' ? 'active' : 'frozen',
  };
  store.cards.set(id, updated);
  return updated;
}
