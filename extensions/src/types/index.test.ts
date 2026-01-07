// Tests for shared types

import { describe, it, expect } from 'vitest';
import type { CodeContext, Expert, Session, SessionStatus } from './index';

describe('Type definitions', () => {
  describe('CodeContext', () => {
    it('should accept valid context object', () => {
      const context: CodeContext = {
        success: true,
        ide: 'cursor',
        html: '<div>test</div>',
        selection: 'selected code',
        url: 'https://cursor.sh/editor',
        timestamp: Date.now()
      };
      expect(context.success).toBe(true);
      expect(context.ide).toBe('cursor');
    });

    it('should accept null IDE', () => {
      const context: CodeContext = {
        success: false
      };
      expect(context.success).toBe(false);
      expect(context.ide).toBeUndefined();
    });

    it('should accept fileTree as Record', () => {
      const context: CodeContext = {
        success: true,
        ide: 'cursor',
        fileTree: { source: 'dom', elementCount: 2 }
      };
      expect(context.fileTree).toEqual({ source: 'dom', elementCount: 2 });
    });
  });

  describe('Expert', () => {
    it('should create valid expert object', () => {
      const expert: Expert = {
        id: '1',
        name: 'Alex Chen',
        avatar: 'https://example.com/avatar.png',
        skills: ['React', 'TypeScript'],
        rate: 7500, // $75/hr in cents
        rating: 4.9,
        available: true
      };
      expect(expert.id).toBe('1');
      expect(expert.rate).toBe(7500);
    });
  });

  describe('SessionStatus', () => {
    it('should accept valid status values', () => {
      const statuses: SessionStatus[] = [
        'pending',
        'matched',
        'in_progress',
        'completed',
        'cancelled',
        'disputed'
      ];
      expect(statuses).toHaveLength(6);
    });
  });
});
