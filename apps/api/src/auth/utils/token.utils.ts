
import {
  randomBytes,
  createHash,
} from 'node:crypto';

export const ACCESS_TOKEN_TTL = 15 * 60;

export const SESSION_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(
  token: string,
): string {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}
