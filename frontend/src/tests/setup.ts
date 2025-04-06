// When ready to test with DOM, we can use this setup file
// To run component tests with DOM support:
// bun test --setup ./src/tests/setup.ts

/**
 * This setup file will initialize a DOM environment for component testing
 * Uncomment the code below and install jsdom with `bun add -d jsdom @types/jsdom`
 */

import { JSDOM } from "jsdom";
import { TextDecoder, TextEncoder } from "util";

// Create custom globals for any missing required objects
global.TextEncoder = TextEncoder;
// @ts-expect-error - Types between Node and DOM implementations differ slightly
global.TextDecoder = TextDecoder;

// Setup JSDOM
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
  resources: "usable",
});

// Set global variables to simulate browser environment
Object.defineProperties(globalThis, {
  window: {
    value: dom.window,
    writable: true,
  },
  document: {
    value: dom.window.document,
    writable: true,
  },
  navigator: {
    value: dom.window.navigator,
    writable: true,
  },
  HTMLElement: {
    value: dom.window.HTMLElement,
    writable: true,
  },
  Element: {
    value: dom.window.Element,
    writable: true,
  },
  Node: {
    value: dom.window.Node,
    writable: true,
  },
  NodeList: {
    value: dom.window.NodeList,
    writable: true,
  },
  Event: {
    value: dom.window.Event,
    writable: true,
  },
  MouseEvent: {
    value: dom.window.MouseEvent,
    writable: true,
  },
});

// Add any missing methods that testing libraries expect
if (!globalThis.window.matchMedia) {
  globalThis.window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Fix requestAnimationFrame
globalThis.window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
