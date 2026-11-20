
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../prisma/prisma.service.js';

import type {
  AccessTokenPayload,
  AuthenticatedRequest,
} from '../types/auth.types.js';

import { isUUID } from 'class-validator';

@Injectable()
export class AccessTokenGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const [type, token] =
      request.headers.authorization?.split(' ') ??
      [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Access token required',
      );
    }

    let payload: AccessTokenPayload;

    try {
      payload =
        await this.jwtService.verifyAsync<
          AccessTokenPayload
        >(token);

      if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    !isUUID(payload.sub) ||
    !isUUID(payload.sid)
    ) {
      throw new Error('Invalid token payload');
    }
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired access token',
      );
    }

    const session =
      await this.prisma.session.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
        },
      });

    if (!session) {
      throw new UnauthorizedException(
        'Session is no longer active',
      );
    }

    request.user = payload;

    return true;
  }
}
