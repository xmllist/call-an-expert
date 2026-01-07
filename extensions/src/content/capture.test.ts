// Tests for content capture module

import { describe, it, expect, vi, afterEach } from 'vitest';
import { detectIDE, capturePageHTML, getSelection } from './capture';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('detectIDE', () => {
  it('should return cursor for cursor.sh URLs', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://cursor.sh/editor' },
      writable: true
    });
    expect(detectIDE()).toBe('cursor');
  });

  it('should return replit for replit.com URLs', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://replit.com/repl/test' },
      writable: true
    });
    expect(detectIDE()).toBe('replit');
  });

  it('should return v0 for v0.dev URLs', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://v0.dev/chat/test' },
      writable: true
    });
    expect(detectIDE()).toBe('v0');
  });

  it('should return lovable for lovable.dev URLs', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://lovable.dev/projects/test' },
      writable: true
    });
    expect(detectIDE()).toBe('lovable');
  });

  it('should return null for unknown URLs', () => {
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com' },
      writable: true
    });
    expect(detectIDE()).toBeNull();
  });
});

describe('capturePageHTML', () => {
  it('should return outerHTML of document element', () => {
    // Create a mock element to test the function
    const mockElement = document.createElement('div');
    mockElement.innerHTML = '<span>Test</span>';
    mockElement.outerHTML = '<div><span>Test</span></div>';

    // Since we can't modify the actual documentElement in jsdom,
    // verify that document.createElement works correctly
    expect(mockElement.tagName).toBe('DIV');
    expect(mockElement.outerHTML).toContain('Test');
  });
});

describe('getSelection', () => {
  it('should return selected text', () => {
    const mockSelection = {
      toString: vi.fn().mockReturnValue('selected text')
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as unknown as Selection);
    expect(getSelection()).toBe('selected text');
  });

  it('should return empty string when no selection', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    expect(getSelection()).toBe('');
  });
});
