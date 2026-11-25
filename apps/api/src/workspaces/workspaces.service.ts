
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { WorkspaceRole } from '../generated/prisma/enums.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    return this.prisma.workspace.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findForUser(userId: string) {
    const memberships =
      await this.prisma.workspaceMember.findMany({
        where: { userId },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });

    return memberships.map(({ role, workspace }) => ({
      ...workspace,
      role,
    }));
  }

  async findOne(workspaceId: string, userId: string) {
    const membership =
      await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      ...membership.workspace,
      role: membership.role,
    };
  }

  async rename(workspaceId: string, name: string) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });
  }

  async remove(workspaceId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const membership =
        await tx.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId,
            },
          },
        });

      if (membership?.role !== WorkspaceRole.OWNER) {
        throw new ForbiddenException(
          'Only the workspace owner can delete it',
        );
      }

      await tx.workspace.delete({
        where: { id: workspaceId },
      });

      return { message: 'Workspace deleted' };
    });
  }
}
