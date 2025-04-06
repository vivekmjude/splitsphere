declare module "bun:test" {
  export const test: {
    (name: string, fn: (done?: () => void) => void | Promise<void>): void;
    skip: (
      name: string,
      fn: (done?: () => void) => void | Promise<void>
    ) => void;
    todo: (
      name: string,
      fn?: (done?: () => void) => void | Promise<void>
    ) => void;
  };

  export function describe(name: string, fn: () => void): void;
  export function expect<T>(value: T): {
    toBe(expected: T): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toEqual(expected: any): void;
    not: {
      toBe(expected: T): void;
      toBeDefined(): void;
      toBeUndefined(): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toEqual(expected: any): void;
    };
  };
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function mock<T extends (...args: any[]) => any>(fn: T): T;
}
