
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

import { WorkspacesController } from './workspaces.controller.js';
import { WorkspacesService } from './workspaces.service.js';
import { InvitationsService } from './invitations.service.js';
import { MembersService } from './members.service.js';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    InvitationsService,
    MembersService,
    WorkspaceRoleGuard,
  ],
})
export class WorkspacesModule {}
