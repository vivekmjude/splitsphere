# SplitSphere Test Suite

This directory contains unit tests for the SplitSphere application. The test suite uses Bun's built-in test runner without additional testing libraries.

## Running Tests

```bash
# Run all tests
bun test

# Run a specific test file
bun test src/tests/utils.test.ts

# Run tests with watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Test Structure

The tests are organized as follows:

- `utils.test.ts`: Tests for utility functions
- `splitCalculator.test.ts`: Tests for expense split calculation logic
- `components/*.test.ts`: Tests for functionality that components rely on

## Component Testing Strategy

For React components:

1. **Functionality Testing**: We test the core functions that components rely on (like formatting functions) directly as pure functions.

2. **Integration Testing**: Not properly set up yet. DOM-based testing would require additional configuration with JSDOM or similar tools.


## Testing Approach

1. **Pure Functions**: Unit tests for utility functions and business logic
2. **Type Safety**: TypeScript ensures type safety across the application
3. **Function over Form**: Test what components do, not how they're implemented

## Test Practices

- Keep tests focused and isolated
- Mock external dependencies when necessary
- Test edge cases and error conditions
- Follow the Arrange-Act-Assert pattern

## Adding New Tests

When adding new functionality, follow these guidelines for writing tests:

1. Create a test file that matches the name of the file being tested (e.g., `myFeature.ts` → `myFeature.test.ts`)
2. Write descriptive test names that explain what is being tested
3. For React components, test the underlying functions rather than the component itself
4. For utility functions, test all edge cases and error conditions 