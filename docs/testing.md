# Testing Guide

This document provides an overview of how to create and run tests in the Dokra application.

## Overview

Dokra uses [Vitest](https://vitest.dev/) as the test framework with `@nuxt/test-utils` for Nuxt-specific testing utilities. The testing setup is organized into multiple projects for different test types:

- **Unit tests**: Fast, isolated tests that run in Node.js
- **E2E tests**: End-to-end tests for integration testing
- **Nuxt tests**: Tests that require the Nuxt runtime environment

## Test Directory Structure

```
test/
├── unit/           # Unit tests (Node environment)
│   └── *.test.ts
├── e2e/            # End-to-end tests (Node environment)
│   └── *.test.ts
└── nuxt/           # Nuxt runtime tests (Nuxt environment)
    └── *.test.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run all tests once (CI mode)
pnpm test:run

# Run all tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test:unit

# Run only e2e tests
pnpm test:e2e

# Run only Nuxt tests
pnpm test:nuxt

# Run tests in watch mode
pnpm vitest --watch

# Run specific test file
pnpm vitest run test/unit/files.test.ts
```

## Writing Tests

### Unit Tests

Unit tests are placed in `test/unit/` and run in a Node environment. They're ideal for testing utility functions, services, and business logic.

```typescript
// test/unit/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../server/utils/my-module';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing with Mocks

Use `vi.fn()` to create mock functions:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MyService', () => {
  let mockDependency: { method: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDependency = {
      method: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call dependency', async () => {
    mockDependency.method.mockResolvedValue('result');
    
    // ... use the mock
    
    expect(mockDependency.method).toHaveBeenCalledWith('arg');
  });
});
```

### Testing Async Functions

```typescript
describe('async operations', () => {
  it('should handle async success', async () => {
    const result = await asyncFunction();
    expect(result).toBeDefined();
  });

  it('should handle async errors', async () => {
    await expect(failingAsyncFunction()).rejects.toThrow('Error message');
  });
});
```

### Testing Error Cases

```typescript
import { StorageError } from '../../server/utils/storage';

describe('error handling', () => {
  it('should throw specific error type', () => {
    expect(() => functionThatThrows()).toThrow(StorageError);
  });

  it('should have correct error properties', () => {
    try {
      functionThatThrows();
    } catch (error) {
      expect(error).toBeInstanceOf(StorageError);
      expect((error as StorageError).code).toBe('ERROR_CODE');
      expect((error as StorageError).statusCode).toBe(400);
    }
  });
});
```

### Nuxt Environment Tests

Tests in `test/nuxt/` have access to Nuxt runtime features:

```typescript
// test/nuxt/components.test.ts
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, it, expect } from 'vitest';
import MyComponent from '~/components/MyComponent.vue';

describe('MyComponent', () => {
  it('renders correctly', async () => {
    const component = await mountSuspended(MyComponent);
    expect(component.text()).toContain('Expected text');
  });
});
```

### Mocking Nuxt Imports

```typescript
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

mockNuxtImport('useMyComposable', () => {
  return () => ({
    value: 'mocked value',
  });
});
```

### Mocking API Endpoints

```typescript
import { registerEndpoint } from '@nuxt/test-utils/runtime';

registerEndpoint('/api/test/', () => ({
  data: 'mocked response',
}));

// For specific HTTP methods
registerEndpoint('/api/test/', {
  method: 'POST',
  handler: () => ({ success: true }),
});
```

## Best Practices

1. **Keep unit tests fast**: Unit tests should be quick and not depend on external services.

2. **Mock external dependencies**: Use `vi.fn()` to mock databases, APIs, and external services.

3. **Test edge cases**: Include tests for error conditions, empty inputs, and boundary values.

4. **Use descriptive test names**: Test names should clearly describe what is being tested.

5. **Organize tests logically**: Group related tests using `describe` blocks.

6. **Clean up after tests**: Use `afterEach` to reset mocks and clean up test state.

7. **Test one thing per test**: Each `it` block should test a single behavior.

## Example: Testing File Operations

See `test/unit/files.test.ts` for a comprehensive example of testing:

- Storage utility functions (`sanitizeFileName`, `generateR2Key`, `validateFileUpload`)
- Database utilities (`generateId`, `getCurrentTimestamp`)
- Authentication helpers (`requireAuth`, `requireAdmin`)
- R2 bucket operations with mocks (`uploadFile`, `downloadFile`, `deleteFile`)
- URL generation and expiration (`generateFileUrl`, `isUrlExpired`)

## Debugging Tests

```bash
# Run tests with verbose output
pnpm vitest --reporter verbose

# Run tests with console output
pnpm vitest --no-file-parallelism
```

## CI Integration

Tests are automatically run on every push and pull request via GitHub Actions. The CI pipeline is configured in `.github/workflows/ci.yml` and includes:

- Type checking with `nuxi typecheck`
- Unit tests (`pnpm test:unit`)
- E2E tests (`pnpm test:e2e`)
- Code coverage reporting

For local CI mode:

```bash
pnpm test:coverage
```

This will run all tests once and generate coverage reports in:
- `coverage/` - HTML report (open `coverage/index.html` in browser)
- Console output shows text summary

### Coverage Configuration

Coverage is configured in `vitest.config.ts` using the v8 provider. The following paths are included:
- `server/**/*.ts` - Backend utilities and API handlers
- `app/**/*.ts` - Frontend utilities and composables
- `app/**/*.vue` - Vue components

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Nuxt Testing Documentation](https://nuxt.com/docs/getting-started/testing)
- [@vue/test-utils Documentation](https://test-utils.vuejs.org/)

