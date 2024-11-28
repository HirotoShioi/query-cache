
# query-cache

`query-cache` is a lightweight library that provides simple yet powerful cache management.  
Inspired by the [`tanstack query`](https://github.com/TanStack/query), it offers a flexible and straightforward way to handle caching.

## Features

- **High-level and intuitive interface**  
  Manage data fetching with just a cache key and a fetch function.

  ```typescript
  const data = await query.cache({ queryKey: ['key'], queryFn: async () => fetchData() });
  ```

- **Zero dependencies and lightweight**  
  Built with no external dependencies, making it highly performant and lightweight.

- **Compatible with both browser and server environments**  
  Designed to work seamlessly in both Node.js and browser contexts.

- **TypeScript support for type safety**  
  Fully typed API to ensure safe and efficient development.

- **Flexible cache management**  
  Easily configure expiration times and stale data behavior.

  ```typescript
  await query.cache({ queryKey: ['key'], queryFn: fetchData, staleTime: 3000 });
  ```

---

## Use Cases

- **Caching API responses**  
  Reduce network load and enable faster data retrieval.
- **Unified data fetching management**  
  Avoid duplicate fetches and streamline data handling.
- **Efficient data storage for browser and server**  
  Ideal for temporary data storage and cache management.

---

## Installation

Install using one of the following commands:

```bash
npm install query-cache
# or
yarn add query-cache
# or
pnpm add query-cache
```

---

## Quick Start

Here’s a basic example of how to use `query-cache`:

### Creating a Simple Cache

```typescript
import { QueryCache } from 'query-cache';

// Create a QueryCache instance
const query = new QueryCache();

// Fetch or retrieve cached data
const data = await query.cache({
  queryKey: ['example-key'], // Cache key
  queryFn: async () => {
    // Your data-fetching logic
    return 'Hello, query-cache!';
  },
});

console.log(data); // 'Hello, query-cache!'
```

### Invalidating and Refetching Cache

You can invalidate cached data and refetch it if needed.

```typescript
const query = new QueryCache();

// Fetch and cache data
await query.cache({
  queryKey: ['invalidate-example'],
  queryFn: async () => 'First Fetch',
});

// Invalidate cache
await query.invalidateCache({
  queryKey: ['invalidate-example'],
  refetch: true, // Refetch after invalidation
});
```

---

## Tests

This project includes comprehensive tests to ensure reliability.

```bash
npm run test
```

---

## Contributing

`query-cache` is open-source, and contributions are welcome! Please follow these guidelines when submitting a pull request:

1. Follow the coding style (Prettier, ESLint).
2. Add necessary test cases.

---

## License

MIT License © Hiroto Shioi
