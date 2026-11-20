
import type { Request } from 'express';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export interface AuthenticatedRequest
  extends Request {
  user: AccessTokenPayload;
}
