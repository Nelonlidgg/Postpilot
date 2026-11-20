
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

import {
  generateRefreshToken,
  hashRefreshToken,
} from './utils/token.utils.js';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async rotate(refreshToken: string) {
    const tokenHash =
      hashRefreshToken(refreshToken);

    const newRefreshToken =
      generateRefreshToken();

    const newTokenHash =
      hashRefreshToken(newRefreshToken);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const current =
          await tx.session.findUnique({
            where: {
              refreshTokenHash: tokenHash,
            },
            select: {
              id: true,
            },
          });

        const used = current
          ? null
          : await tx.usedRefreshToken.findUnique({
              where: {
                tokenHash,
              },
              select: {
                sessionId: true,
              },
            });

        const sessionId =
          current?.id ?? used?.sessionId;

        if (!sessionId) {
          return null;
        }

        // Serialize refresh operations
        // for this particular session.
        await tx.$queryRaw`
          SELECT id
          FROM sessions
          WHERE id = ${sessionId}::uuid
          FOR UPDATE
        `;

        const session =
          await tx.session.findUnique({
            where: {
              id: sessionId,
            },
          });

        if (
          !session ||
          session.revokedAt ||
          session.expiresAt <= new Date()
        ) {
          return null;
        }

        // A previously used token was presented.
        if (
          session.refreshTokenHash !== tokenHash
        ) {
          await tx.session.update({
            where: {
              id: session.id,
            },
            data: {
              revokedAt: new Date(),
            },
          });

          return null;
        }

        // Remember the previous token.
        await tx.usedRefreshToken.create({
          data: {
            sessionId: session.id,
            tokenHash,
          },
        });

        // Replace the current refresh token.
        await tx.session.update({
          where: {
            id: session.id,
          },
          data: {
            refreshTokenHash: newTokenHash,
          },
        });

        return {
          userId: session.userId,
          sessionId: session.id,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel
            .ReadCommitted,
      },
    );

    if (!result) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
      );
    }

    return {
      ...result,
      refreshToken: newRefreshToken,
    };
  }

  async list(
    userId: string,
    currentSessionId: string,
  ) {
    const sessions =
      await this.prisma.session.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          createdAt: true,
          updatedAt: true,
          expiresAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return sessions.map((session) => ({
      ...session,
      current: session.id === currentSessionId,
    }));
  }

  async revoke(
    userId: string,
    sessionId: string,
  ) {
    const result =
      await this.prisma.session.updateMany({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Active session not found',
      );
    }

    return {
      message: 'Session revoked successfully',
    };
  }
}
