
import {
  describe,
  it,
  expect,
} from 'vitest';

import {
  generateRefreshToken,
  hashRefreshToken,
} from './token.utils.js';

describe('Token utilities', () => {
  it('should generate a 64-character hexadecimal token', () => {
    const token = generateRefreshToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate different refresh tokens', () => {
    const first = generateRefreshToken();
    const second = generateRefreshToken();

    expect(first).not.toBe(second);
  });

  it('should hash a refresh token consistently', () => {
    const token = generateRefreshToken();

    const firstHash = hashRefreshToken(token);
    const secondHash = hashRefreshToken(token);

    expect(firstHash).toBe(secondHash);
  });

  it('should not return the original token as its hash', () => {
    const token = generateRefreshToken();
    const hash = hashRefreshToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toHaveLength(64);
  });
});
