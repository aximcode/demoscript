/**
 * Bookstore Domain - In-memory data store
 *
 * Mock bookstore API for e-commerce demos.
 * Includes books, authors, categories, cart, and orders.
 */

// Types
export interface Book {
  id: string;
  title: string;
  authorId: string;
  isbn: string;
  price: number;
  genre: string;
  description: string;
  available: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Author {
  id: string;
  name: string;
  bio: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export interface CartItem {
  bookId: string;
  quantity: number;
  addedAt: string;
}

export interface Order {
  id: string;
  items: Array<{ bookId: string; title: string; quantity: number; price: number }>;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory data store structure
interface BookstoreStore {
  books: Map<string, Book>;
  authors: Map<string, Author>;
  categories: Map<string, Category>;
  carts: Map<string, CartItem[]>; // userId -> cart items
  orders: Map<string, Order>;
  idCounter: number;
}

// Session-scoped stores
const sessions = new Map<string, BookstoreStore>();

// Default shared store
let defaultStore: BookstoreStore;

// Seed data
const seedAuthors: Omit<Author, 'id' | 'createdAt'>[] = [
  { name: 'David Thomas', bio: 'Co-author of The Pragmatic Programmer, software craftsman and educator.' },
  { name: 'Robert C. Martin', bio: 'Software engineer and author known for promoting clean code practices.' },
  { name: 'Martin Kleppmann', bio: 'Researcher and author specializing in distributed systems.' },
  { name: 'Eric Evans', bio: 'Software design consultant, creator of Domain-Driven Design methodology.' },
  { name: 'Sandi Metz', bio: 'Object-oriented design expert and acclaimed programming author.' },
];

const seedCategories: Omit<Category, 'id'>[] = [
  { name: 'Technology', description: 'Programming, software engineering, and computer science', slug: 'technology' },
  { name: 'Business', description: 'Management, entrepreneurship, and strategy', slug: 'business' },
  { name: 'Science', description: 'Scientific discoveries and research', slug: 'science' },
  { name: 'Self-Help', description: 'Personal development and productivity', slug: 'self-help' },
  { name: 'Fiction', description: 'Novels and creative literature', slug: 'fiction' },
];

const seedBooks: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { title: 'The Pragmatic Programmer', authorId: '1', isbn: '978-0135957059', price: 49.95, genre: 'technology', description: 'Your journey to mastery in software development.', available: true, stock: 25 },
  { title: 'Clean Code', authorId: '2', isbn: '978-0132350884', price: 39.99, genre: 'technology', description: 'A handbook of agile software craftsmanship.', available: true, stock: 30 },
  { title: 'Designing Data-Intensive Applications', authorId: '3', isbn: '978-1449373320', price: 44.99, genre: 'technology', description: 'The big ideas behind reliable, scalable systems.', available: true, stock: 20 },
  { title: 'Domain-Driven Design', authorId: '4', isbn: '978-0321125217', price: 54.99, genre: 'technology', description: 'Tackling complexity in the heart of software.', available: true, stock: 15 },
  { title: 'Practical Object-Oriented Design', authorId: '5', isbn: '978-0134456478', price: 42.99, genre: 'technology', description: 'An agile primer using Ruby.', available: true, stock: 18 },
  { title: 'Clean Architecture', authorId: '2', isbn: '978-0134494166', price: 34.99, genre: 'technology', description: 'A craftsman\'s guide to software structure.', available: true, stock: 22 },
  { title: 'The Clean Coder', authorId: '2', isbn: '978-0137081073', price: 37.99, genre: 'technology', description: 'A code of conduct for professional programmers.', available: true, stock: 12 },
  { title: 'Refactoring', authorId: '3', isbn: '978-0134757599', price: 47.99, genre: 'technology', description: 'Improving the design of existing code.', available: true, stock: 28 },
  { title: '99 Bottles of OOP', authorId: '5', isbn: '978-1944823001', price: 29.95, genre: 'technology', description: 'A practical guide to writing cost-effective, maintainable code.', available: true, stock: 10 },
  { title: 'Programming Pearls', authorId: '1', isbn: '978-0201657883', price: 34.99, genre: 'technology', description: 'Classic wisdom for the practicing programmer.', available: false, stock: 0 },
];

// Helper to generate unique IDs
function generateId(store: BookstoreStore): string {
  return `bk_${Date.now().toString(36)}_${(++store.idCounter).toString(36)}`;
}

// Create a fresh store with seed data
function createFreshStore(): BookstoreStore {
  const store: BookstoreStore = {
    books: new Map(),
    authors: new Map(),
    categories: new Map(),
    carts: new Map(),
    orders: new Map(),
    idCounter: 0,
  };

  const now = new Date().toISOString();

  // Seed authors
  for (let i = 0; i < seedAuthors.length; i++) {
    const id = String(i + 1);
    store.authors.set(id, { ...seedAuthors[i], id, createdAt: now });
  }

  // Seed categories
  for (let i = 0; i < seedCategories.length; i++) {
    const id = String(i + 1);
    store.categories.set(id, { ...seedCategories[i], id });
  }

  // Seed books
  for (let i = 0; i < seedBooks.length; i++) {
    const id = String(i + 1);
    store.books.set(id, { ...seedBooks[i], id, createdAt: now, updatedAt: now });
  }

  return store;
}

// Initialize default store
defaultStore = createFreshStore();

// Get the appropriate store
export function getStore(sessionId?: string): BookstoreStore {
  if (sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, createFreshStore());
    }
    return sessions.get(sessionId)!;
  }
  return defaultStore;
}

// Book operations
export function getBooks(sessionId?: string, filters?: { genre?: string; authorId?: string; minPrice?: number; maxPrice?: number; available?: boolean }): Book[] {
  let books = Array.from(getStore(sessionId).books.values());

  if (filters) {
    if (filters.genre) books = books.filter(b => b.genre === filters.genre);
    if (filters.authorId) books = books.filter(b => b.authorId === filters.authorId);
    if (filters.minPrice !== undefined) books = books.filter(b => b.price >= filters.minPrice!);
    if (filters.maxPrice !== undefined) books = books.filter(b => b.price <= filters.maxPrice!);
    if (filters.available !== undefined) books = books.filter(b => b.available === filters.available);
  }

  return books;
}

export function getBookById(id: string, sessionId?: string): Book | undefined {
  return getStore(sessionId).books.get(id);
}

export function createBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>, sessionId?: string): Book {
  const store = getStore(sessionId);
  const id = generateId(store);
  const now = new Date().toISOString();
  const book: Book = { ...data, id, createdAt: now, updatedAt: now };
  store.books.set(id, book);
  return book;
}

export function updateBook(id: string, data: Partial<Omit<Book, 'id' | 'createdAt'>>, sessionId?: string): Book | undefined {
  const store = getStore(sessionId);
  const book = store.books.get(id);
  if (!book) return undefined;

  const updated: Book = { ...book, ...data, id: book.id, createdAt: book.createdAt, updatedAt: new Date().toISOString() };
  store.books.set(id, updated);
  return updated;
}

export function deleteBook(id: string, sessionId?: string): boolean {
  return getStore(sessionId).books.delete(id);
}

// Author operations
export function getAuthors(sessionId?: string): Author[] {
  return Array.from(getStore(sessionId).authors.values());
}

export function getAuthorById(id: string, sessionId?: string): Author | undefined {
  return getStore(sessionId).authors.get(id);
}

export function getAuthorWithBooks(id: string, sessionId?: string): { author: Author; books: Book[] } | undefined {
  const author = getAuthorById(id, sessionId);
  if (!author) return undefined;
  const books = getBooks(sessionId, { authorId: id });
  return { author, books };
}

// Category operations
export function getCategories(sessionId?: string): Category[] {
  return Array.from(getStore(sessionId).categories.values());
}

export function getCategoryById(id: string, sessionId?: string): Category | undefined {
  return getStore(sessionId).categories.get(id);
}

// Cart operations (uses a user context, default to 'anonymous')
export function getCart(userId: string = 'anonymous', sessionId?: string): CartItem[] {
  return getStore(sessionId).carts.get(userId) || [];
}

export function addToCart(bookId: string, quantity: number = 1, userId: string = 'anonymous', sessionId?: string): CartItem[] {
  const store = getStore(sessionId);
  const cart = store.carts.get(userId) || [];

  const existingItem = cart.find(item => item.bookId === bookId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ bookId, quantity, addedAt: new Date().toISOString() });
  }

  store.carts.set(userId, cart);
  return cart;
}

export function removeFromCart(bookId: string, userId: string = 'anonymous', sessionId?: string): CartItem[] {
  const store = getStore(sessionId);
  const cart = store.carts.get(userId) || [];
  const filtered = cart.filter(item => item.bookId !== bookId);
  store.carts.set(userId, filtered);
  return filtered;
}

export function clearCart(userId: string = 'anonymous', sessionId?: string): void {
  getStore(sessionId).carts.delete(userId);
}

// Order operations
export function getOrders(sessionId?: string): Order[] {
  return Array.from(getStore(sessionId).orders.values());
}

export function getOrderById(id: string, sessionId?: string): Order | undefined {
  return getStore(sessionId).orders.get(id);
}

export function createOrder(cart: CartItem[], shippingAddress: string | undefined, userId: string = 'anonymous', sessionId?: string): Order | { error: string } {
  const store = getStore(sessionId);

  if (cart.length === 0) {
    return { error: 'Cart is empty' };
  }

  const items: Order['items'] = [];
  let total = 0;

  for (const cartItem of cart) {
    const book = store.books.get(cartItem.bookId);
    if (!book) {
      return { error: `Book ${cartItem.bookId} not found` };
    }
    if (!book.available || book.stock < cartItem.quantity) {
      return { error: `Book "${book.title}" is not available in requested quantity` };
    }

    items.push({
      bookId: book.id,
      title: book.title,
      quantity: cartItem.quantity,
      price: book.price,
    });
    total += book.price * cartItem.quantity;

    // Reduce stock
    book.stock -= cartItem.quantity;
    if (book.stock === 0) book.available = false;
  }

  const id = generateId(store);
  const now = new Date().toISOString();
  const order: Order = {
    id,
    items,
    total: Math.round(total * 100) / 100,
    status: 'confirmed',
    shippingAddress,
    createdAt: now,
    updatedAt: now,
  };

  store.orders.set(id, order);

  // Clear the cart after successful order
  clearCart(userId, sessionId);

  return order;
}
