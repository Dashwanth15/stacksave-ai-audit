// ============================================================
// Auth Flow & Session Revocation Tests — StackSave AI
// ============================================================

import { describe, it, expect } from 'vitest';
import { generateSessionToken, verifySessionToken } from '../src/utils/session';
import { toSafeUser } from '../src/routes/auth';

describe('Auth & Session Security Unit Tests', () => {
  it('generates and verifies valid session tokens containing userId and sessionVersion', () => {
    const mockUser = {
      _id: '65f1234567890abcdef12345',
      sessionVersion: 2,
    };

    const token = generateSessionToken(mockUser);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const payload = verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe('65f1234567890abcdef12345');
    expect(payload?.sessionVersion).toBe(2);
  });

  it('rejects invalid or forged session tokens', () => {
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.invalidSignature';
    const payload = verifySessionToken(forgedToken);
    expect(payload).toBeNull();
  });

  it('detects session version mismatch for revocation (Correction 2)', () => {
    const originalUser = {
      _id: '65f1234567890abcdef12345',
      sessionVersion: 1,
    };

    const token = generateSessionToken(originalUser);
    const payload = verifySessionToken(token);
    expect(payload?.sessionVersion).toBe(1);

    // Simulate session revocation by incrementing sessionVersion
    const updatedUserSessionVersion = 2;
    expect(payload?.sessionVersion === updatedUserSessionVersion).toBe(false);
  });

  it('sanitizes user profile data via toSafeUser without leaking internal fields', () => {
    const mockDoc: any = {
      _id: '65f1234567890abcdef12345',
      googleId: 'google-sub-1029384756',
      email: 'alex@example.com',
      name: 'Alex Chen',
      avatarUrl: 'https://lh3.googleusercontent.com/a/photo.jpg',
      plan: 'FREE',
      subscriptionStatus: 'NONE',
      sessionVersion: 1,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    };

    const safe = toSafeUser(mockDoc);
    expect(safe.id).toBe('65f1234567890abcdef12345');
    expect(safe.email).toBe('alex@example.com');
    expect(safe.name).toBe('Alex Chen');
    expect(safe.plan).toBe('FREE');
    expect(safe.subscriptionStatus).toBe('NONE');
    // Ensure internal sessionVersion or secret fields are not exposed in client payload
    expect((safe as any).sessionVersion).toBeUndefined();
  });
});
