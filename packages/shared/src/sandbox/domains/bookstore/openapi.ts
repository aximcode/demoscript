/**
 * Bookstore Domain - OpenAPI Specification
 */

export const bookstoreOpenApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DemoScript Bookstore API',
    version: '1.0.0',
    description: 'Mock bookstore API for e-commerce demos. Includes books, authors, categories, shopping cart, and orders.',
    contact: {
      name: 'DemoScript',
      url: 'https://demoscript.app/support',
    },
  },
  servers: [
    { url: 'https://demoscript.app/api/v1/bookstore', description: 'DemoScript Public API' },
    { url: '/sandbox/bookstore', description: 'Local CLI' },
  ],
  tags: [
    { name: 'Books', description: 'Book catalog operations' },
    { name: 'Authors', description: 'Author information' },
    { name: 'Categories', description: 'Book categories/genres' },
    { name: 'Cart', description: 'Shopping cart operations' },
    { name: 'Orders', description: 'Order management' },
  ],
  paths: {
    '/books': {
      get: {
        operationId: 'listBooks',
        summary: 'List books',
        description: 'Get a paginated list of books with optional filtering.',
        tags: ['Books'],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 }, description: 'Items per page' },
          { name: 'genre', in: 'query', schema: { type: 'string' }, description: 'Filter by genre' },
          { name: 'authorId', in: 'query', schema: { type: 'string' }, description: 'Filter by author ID' },
          { name: 'minPrice', in: 'query', schema: { type: 'number' }, description: 'Minimum price' },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' }, description: 'Maximum price' },
          { name: 'available', in: 'query', schema: { type: 'boolean' }, description: 'Filter by availability' },
        ],
        responses: {
          '200': {
            description: 'List of books',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    books: { type: 'array', items: { $ref: '#/components/schemas/Book' } },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createBook',
        summary: 'Create a book',
        description: 'Add a new book to the catalog.',
        tags: ['Books'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Book created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
          },
          '400': { description: 'Invalid input' },
        },
      },
    },
    '/books/{id}': {
      get: {
        operationId: 'getBook',
        summary: 'Get a book',
        description: 'Get a book by its ID.',
        tags: ['Books'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Book details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
          },
          '404': { description: 'Book not found' },
        },
      },
      put: {
        operationId: 'updateBook',
        summary: 'Update a book',
        description: 'Update book details.',
        tags: ['Books'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BookInput' } } },
        },
        responses: {
          '200': {
            description: 'Book updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } },
          },
          '404': { description: 'Book not found' },
        },
      },
      delete: {
        operationId: 'deleteBook',
        summary: 'Delete a book',
        description: 'Remove a book from the catalog.',
        tags: ['Books'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Book deleted' },
          '404': { description: 'Book not found' },
        },
      },
    },
    '/authors': {
      get: {
        operationId: 'listAuthors',
        summary: 'List authors',
        description: 'Get all authors.',
        tags: ['Authors'],
        responses: {
          '200': {
            description: 'List of authors',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authors: { type: 'array', items: { $ref: '#/components/schemas/Author' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/authors/{id}': {
      get: {
        operationId: 'getAuthor',
        summary: 'Get an author',
        description: 'Get author details with their books.',
        tags: ['Authors'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Author with books',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    author: { $ref: '#/components/schemas/Author' },
                    books: { type: 'array', items: { $ref: '#/components/schemas/Book' } },
                  },
                },
              },
            },
          },
          '404': { description: 'Author not found' },
        },
      },
    },
    '/categories': {
      get: {
        operationId: 'listCategories',
        summary: 'List categories',
        description: 'Get all book categories.',
        tags: ['Categories'],
        responses: {
          '200': {
            description: 'List of categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/cart': {
      get: {
        operationId: 'getCart',
        summary: 'Get cart',
        description: 'Get current shopping cart contents.',
        tags: ['Cart'],
        responses: {
          '200': {
            description: 'Cart contents',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          bookId: { type: 'string' },
                          quantity: { type: 'integer' },
                          addedAt: { type: 'string', format: 'date-time' },
                          book: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              title: { type: 'string' },
                              price: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                    itemCount: { type: 'integer' },
                    total: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'addToCart',
        summary: 'Add to cart',
        description: 'Add a book to the shopping cart.',
        tags: ['Cart'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookId'],
                properties: {
                  bookId: { type: 'string', description: 'Book ID to add' },
                  quantity: { type: 'integer', default: 1, description: 'Quantity to add' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Added to cart' },
          '400': { description: 'Book not available' },
          '404': { description: 'Book not found' },
        },
      },
    },
    '/cart/{bookId}': {
      delete: {
        operationId: 'removeFromCart',
        summary: 'Remove from cart',
        description: 'Remove a book from the shopping cart.',
        tags: ['Cart'],
        parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Removed from cart' },
        },
      },
    },
    '/orders': {
      get: {
        operationId: 'listOrders',
        summary: 'List orders',
        description: 'Get all orders.',
        tags: ['Orders'],
        responses: {
          '200': {
            description: 'List of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: 'createOrder',
        summary: 'Create order',
        description: 'Create an order from the current cart (checkout).',
        tags: ['Orders'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  shippingAddress: { type: 'string', description: 'Shipping address' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          '400': { description: 'Cart is empty or order failed' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        operationId: 'getOrder',
        summary: 'Get order',
        description: 'Get order details by ID.',
        tags: ['Orders'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Order details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          '404': { description: 'Order not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      Book: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Unique identifier' },
          title: { type: 'string', description: 'Book title' },
          authorId: { type: 'string', description: 'Author ID' },
          isbn: { type: 'string', description: 'ISBN number' },
          price: { type: 'number', description: 'Price in USD' },
          genre: { type: 'string', description: 'Book genre' },
          description: { type: 'string', description: 'Book description' },
          available: { type: 'boolean', description: 'Availability status' },
          stock: { type: 'integer', description: 'Stock count' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BookInput: {
        type: 'object',
        required: ['title', 'authorId', 'price'],
        properties: {
          title: { type: 'string', description: 'Book title' },
          authorId: { type: 'string', description: 'Author ID' },
          isbn: { type: 'string', description: 'ISBN number' },
          price: { type: 'number', description: 'Price in USD' },
          genre: { type: 'string', description: 'Book genre' },
          description: { type: 'string', description: 'Book description' },
          available: { type: 'boolean', default: true },
          stock: { type: 'integer', default: 10 },
        },
      },
      Author: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          bio: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          slug: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bookId: { type: 'string' },
                title: { type: 'string' },
                quantity: { type: 'integer' },
                price: { type: 'number' },
              },
            },
          },
          total: { type: 'number' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
          },
          shippingAddress: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
