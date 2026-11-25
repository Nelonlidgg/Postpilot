
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';

import { PrismaService } from '../../prisma/prisma.service.js';
import { WorkspaceRole } from '../../generated/prisma/enums.js';
import { WORKSPACE_ROLES_KEY } from '../workspace-roles.decorator.js';

import type {
  AuthenticatedRequest,
} from '../../auth/types/auth.types.js';

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const workspaceId = request.params.workspaceId;

    if (
      typeof workspaceId !== 'string' ||
      !isUUID(workspaceId)
    ) {
      throw new BadRequestException(
        'Invalid workspace ID',
      );
    }

    const membership =
      await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: request.user.sub,
          },
        },
        select: {
          role: true,
        },
      });

    if (!membership) {
      throw new NotFoundException(
        'Workspace not found',
      );
    }

    const allowedRoles =
      this.reflector.getAllAndOverride<WorkspaceRole[]>(
        WORKSPACE_ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      allowedRoles &&
      !allowedRoles.includes(membership.role)
    ) {
      throw new ForbiddenException(
        'Insufficient workspace permissions',
      );
    }

    return true;
  }
}
