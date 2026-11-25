
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceRole } from '../generated/prisma/enums.js';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async changeRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    if (role === WorkspaceRole.OWNER) {
      throw new ForbiddenException(
        'Ownership cannot be assigned here',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      if (member.role === WorkspaceRole.OWNER) {
        throw new ForbiddenException(
          'The owner role cannot be changed',
        );
      }

      return tx.workspaceMember.update({
        where: { id: member.id },
        data: { role },
        select: {
          id: true,
          role: true,
          userId: true,
          workspaceId: true,
        },
      });
    });
  }

  async remove(workspaceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      if (member.role === WorkspaceRole.OWNER) {
        throw new ConflictException(
          'The workspace owner cannot be removed',
        );
      }

      await tx.workspaceMember.delete({
        where: { id: member.id },
      });

      return { message: 'Member removed' };
    });
  }
}
