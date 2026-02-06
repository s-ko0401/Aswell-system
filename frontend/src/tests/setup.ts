import "@testing-library/jest-dom";
import { vi } from "vitest";

// --- Global Mocks ---

// ResizeObserver mock for Radix UI
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ScrollIntoView mock
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// PointerCapture mock for Radix UI
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
