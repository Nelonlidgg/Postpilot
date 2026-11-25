
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceRole } from '../generated/prisma/enums.js';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(
    workspaceId: string,
    invitedBy: string,
    email: string,
    role: WorkspaceRole,
  ) {
    if (role === WorkspaceRole.OWNER) {
      throw new BadRequestException(
        'The owner role cannot be assigned by invitation',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const invitation = await this.prisma.$transaction(
      async (tx) => {
        const inviter = await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId: invitedBy,
            },
          },
        });

        if (inviter?.role !== WorkspaceRole.OWNER) {
          throw new ForbiddenException(
            'Only the owner can invite members',
          );
        }

        const existing = await tx.workspaceMember.findFirst({
          where: {
            workspaceId,
            user: { email: normalizedEmail },
          },
        });

        if (existing) {
          throw new ConflictException(
            'This user is already a member',
          );
        }

        return tx.workspaceInvitation.upsert({
          where: {
            workspaceId_email: {
              workspaceId,
              email: normalizedEmail,
            },
          },
          create: {
            workspaceId,
            email: normalizedEmail,
            role,
            tokenHash,
            expiresAt: new Date(
              Date.now() + INVITATION_TTL_MS,
            ),
          },
          update: {
            role,
            tokenHash,
            expiresAt: new Date(
              Date.now() + INVITATION_TTL_MS,
            ),
            acceptedAt: null,
          },
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
          },
        });
      },
    );

    return {
      message: 'Invitation created',
      invitation,
      // Development-only mock delivery.
      // Replace with email delivery before deployment.
      invitationToken: token,
    };
  }

  async accept(userId: string, token: string) {
    const tokenHash = hashToken(token);

    return this.prisma.$transaction(async (tx) => {
      const invitation =
        await tx.workspaceInvitation.findUnique({
          where: { tokenHash },
        });

      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.expiresAt <= new Date()
      ) {
        throw new BadRequestException(
          'Invalid or expired invitation',
        );
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user || user.email !== invitation.email) {
        throw new ForbiddenException(
          'This invitation belongs to another email',
        );
      }

      const existing =
        await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: invitation.workspaceId,
              userId,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'You are already a member',
        );
      }

      const consumed =
        await tx.workspaceInvitation.updateMany({
          where: {
            id: invitation.id,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { acceptedAt: new Date() },
        });

      if (consumed.count !== 1) {
        throw new BadRequestException(
          'Invitation is no longer available',
        );
      }

      const membership =
        await tx.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId,
            role: invitation.role,
          },
          select: {
            workspaceId: true,
            role: true,
            joinedAt: true,
          },
        });

      return {
        message: 'Workspace joined successfully',
        membership,
      };
    });
  }

  async list(workspaceId: string) {
    return this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancel(workspaceId: string, invitationId: string) {
    const result =
      await this.prisma.workspaceInvitation.deleteMany({
        where: {
          id: invitationId,
          workspaceId,
          acceptedAt: null,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException('Invitation not found');
    }

    return { message: 'Invitation cancelled' };
  }
}
