/**
 * Bookstore Domain - Request Handlers
 *
 * Framework-agnostic request handlers for the Bookstore API.
 */

import type { SandboxRequest, SandboxResponse } from '../../data.js';
import {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getAuthors,
  getAuthorById,
  getAuthorWithBooks,
  getCategories,
  getCategoryById,
  getCart,
  addToCart,
  removeFromCart,
  getOrders,
  getOrderById,
  createOrder,
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

// Book handlers
function handleListBooks(req: SandboxRequest): SandboxResponse {
  const query = req.query || {};
  const sessionId = req.sessionId;

  const filters = {
    genre: query.genre as string | undefined,
    authorId: query.authorId as string | undefined,
    minPrice: query.minPrice ? parseFloat(String(query.minPrice)) : undefined,
    maxPrice: query.maxPrice ? parseFloat(String(query.maxPrice)) : undefined,
    available: query.available !== undefined ? query.available === 'true' : undefined,
  };

  const books = getBooks(sessionId, filters);

  // Pagination
  const page = parseInt(String(query.page || '1'), 10);
  const limit = Math.min(parseInt(String(query.limit || '10'), 10), 100);
  const start = (page - 1) * limit;
  const paginatedBooks = books.slice(start, start + limit);

  return successResponse(200, {
    books: paginatedBooks,
    total: books.length,
    page,
    limit,
    totalPages: Math.ceil(books.length / limit),
  });
}

function handleCreateBook(req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    title: string;
    authorId: string;
    isbn: string;
    price: number;
    genre: string;
    description: string;
    available: boolean;
    stock: number;
  }> | undefined;

  if (!body?.title || !body?.authorId || !body?.price) {
    return errorResponse(400, 'Title, authorId, and price are required', 'INVALID_INPUT');
  }

  const book = createBook({
    title: body.title,
    authorId: body.authorId,
    isbn: body.isbn || '',
    price: body.price,
    genre: body.genre || 'uncategorized',
    description: body.description || '',
    available: body.available !== false,
    stock: body.stock ?? 10,
  }, req.sessionId);

  return successResponse(201, book);
}

function handleGetBook(id: string, sessionId?: string): SandboxResponse {
  const book = getBookById(id, sessionId);
  if (!book) {
    return errorResponse(404, 'Book not found', 'NOT_FOUND');
  }
  return successResponse(200, book);
}

function handleUpdateBook(id: string, req: SandboxRequest): SandboxResponse {
  const body = req.body as Partial<{
    title: string;
    authorId: string;
    isbn: string;
    price: number;
    genre: string;
    description: string;
    available: boolean;
    stock: number;
  }> | undefined;

  if (!body || Object.keys(body).length === 0) {
    return errorResponse(400, 'No update fields provided', 'INVALID_INPUT');
  }

  const book = updateBook(id, body, req.sessionId);
  if (!book) {
    return errorResponse(404, 'Book not found', 'NOT_FOUND');
  }

  return successResponse(200, book);
}

function handleDeleteBook(id: string, sessionId?: string): SandboxResponse {
  const deleted = deleteBook(id, sessionId);
  if (!deleted) {
    return errorResponse(404, 'Book not found', 'NOT_FOUND');
  }
  return successResponse(200, { success: true, message: 'Book deleted' });
}

// Author handlers
function handleListAuthors(req: SandboxRequest): SandboxResponse {
  const authors = getAuthors(req.sessionId);
  return successResponse(200, { authors, total: authors.length });
}

function handleGetAuthor(id: string, sessionId?: string): SandboxResponse {
  const result = getAuthorWithBooks(id, sessionId);
  if (!result) {
    return errorResponse(404, 'Author not found', 'NOT_FOUND');
  }
  return successResponse(200, result);
}

// Category handlers
function handleListCategories(req: SandboxRequest): SandboxResponse {
  const categories = getCategories(req.sessionId);
  return successResponse(200, { categories, total: categories.length });
}

function handleGetCategory(id: string, sessionId?: string): SandboxResponse {
  const category = getCategoryById(id, sessionId);
  if (!category) {
    return errorResponse(404, 'Category not found', 'NOT_FOUND');
  }
  return successResponse(200, category);
}

// Cart handlers
function handleGetCart(req: SandboxRequest): SandboxResponse {
  const cart = getCart('anonymous', req.sessionId);
  const sessionId = req.sessionId;

  // Enrich cart items with book details
  const items = cart.map(item => {
    const book = getBookById(item.bookId, sessionId);
    return {
      ...item,
      book: book ? { id: book.id, title: book.title, price: book.price } : null,
    };
  });

  const total = items.reduce((sum, item) => {
    return sum + (item.book?.price || 0) * item.quantity;
  }, 0);

  return successResponse(200, {
    items,
    itemCount: items.length,
    total: Math.round(total * 100) / 100,
  });
}

function handleAddToCart(req: SandboxRequest): SandboxResponse {
  const body = req.body as { bookId?: string; quantity?: number } | undefined;

  if (!body?.bookId) {
    return errorResponse(400, 'bookId is required', 'INVALID_INPUT');
  }

  // Verify book exists
  const book = getBookById(body.bookId, req.sessionId);
  if (!book) {
    return errorResponse(404, 'Book not found', 'NOT_FOUND');
  }

  if (!book.available) {
    return errorResponse(400, 'Book is not available', 'OUT_OF_STOCK');
  }

  const cart = addToCart(body.bookId, body.quantity || 1, 'anonymous', req.sessionId);
  return successResponse(200, { message: 'Added to cart', itemCount: cart.length });
}

function handleRemoveFromCart(bookId: string, req: SandboxRequest): SandboxResponse {
  const cart = removeFromCart(bookId, 'anonymous', req.sessionId);
  return successResponse(200, { message: 'Removed from cart', itemCount: cart.length });
}

// Order handlers
function handleListOrders(req: SandboxRequest): SandboxResponse {
  const orders = getOrders(req.sessionId);
  return successResponse(200, { orders, total: orders.length });
}

function handleGetOrder(id: string, sessionId?: string): SandboxResponse {
  const order = getOrderById(id, sessionId);
  if (!order) {
    return errorResponse(404, 'Order not found', 'NOT_FOUND');
  }
  return successResponse(200, order);
}

function handleCreateOrder(req: SandboxRequest): SandboxResponse {
  const body = req.body as { shippingAddress?: string } | undefined;
  const cart = getCart('anonymous', req.sessionId);

  if (cart.length === 0) {
    return errorResponse(400, 'Cart is empty', 'EMPTY_CART');
  }

  const result = createOrder(cart, body?.shippingAddress, 'anonymous', req.sessionId);

  if ('error' in result) {
    return errorResponse(400, result.error, 'ORDER_FAILED');
  }

  return successResponse(201, result);
}

/**
 * Main handler for Bookstore API requests
 */
export function handleBookstoreRequest(req: SandboxRequest): SandboxResponse {
  const path = req.path.startsWith('/') ? req.path : `/${req.path}`;
  const method = req.method.toUpperCase();
  const sessionId = req.sessionId;

  // Books
  if (path === '/books' || path === '/') {
    if (method === 'GET') return handleListBooks(req);
    if (method === 'POST') return handleCreateBook(req);
  }

  const bookMatch = matchRoute(path, '/books/{id}');
  if (bookMatch) {
    if (method === 'GET') return handleGetBook(bookMatch.id, sessionId);
    if (method === 'PUT') return handleUpdateBook(bookMatch.id, req);
    if (method === 'DELETE') return handleDeleteBook(bookMatch.id, sessionId);
  }

  // Authors
  if (path === '/authors') {
    if (method === 'GET') return handleListAuthors(req);
  }

  const authorMatch = matchRoute(path, '/authors/{id}');
  if (authorMatch && method === 'GET') {
    return handleGetAuthor(authorMatch.id, sessionId);
  }

  // Categories
  if (path === '/categories') {
    if (method === 'GET') return handleListCategories(req);
  }

  const categoryMatch = matchRoute(path, '/categories/{id}');
  if (categoryMatch && method === 'GET') {
    return handleGetCategory(categoryMatch.id, sessionId);
  }

  // Cart
  if (path === '/cart') {
    if (method === 'GET') return handleGetCart(req);
    if (method === 'POST') return handleAddToCart(req);
  }

  const cartMatch = matchRoute(path, '/cart/{bookId}');
  if (cartMatch && method === 'DELETE') {
    return handleRemoveFromCart(cartMatch.bookId, req);
  }

  // Orders
  if (path === '/orders') {
    if (method === 'GET') return handleListOrders(req);
    if (method === 'POST') return handleCreateOrder(req);
  }

  const orderMatch = matchRoute(path, '/orders/{id}');
  if (orderMatch && method === 'GET') {
    return handleGetOrder(orderMatch.id, sessionId);
  }

  return errorResponse(404, `Route not found: ${method} ${path}`, 'NOT_FOUND');
}
