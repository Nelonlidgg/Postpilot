
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { WorkspaceRole } from '../generated/prisma/enums.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';

import type {
  AuthenticatedRequest,
} from '../auth/types/auth.types.js';

import { WorkspacesService } from './workspaces.service.js';
import { InvitationsService } from './invitations.service.js';
import { MembersService } from './members.service.js';

import { WorkspaceRoleGuard } from './guards/workspace-role.guard.js';
import { WorkspaceRoles } from './workspace-roles.decorator.js';

import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@Controller('workspaces')
@UseGuards(AccessTokenGuard)
export class WorkspacesController {
  constructor(
    private readonly workspaces: WorkspacesService,
    private readonly invitations: InvitationsService,
    private readonly members: MembersService,
  ) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaces.create(
      req.user.sub,
      dto.name,
    );
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.workspaces.findForUser(req.user.sub);
  }

  @Post('invitations/accept')
  acceptInvitation(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitations.accept(
      req.user.sub,
      dto.token,
    );
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  getWorkspace(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.workspaces.findOne(
      workspaceId,
      req.user.sub,
    );
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  rename(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaces.rename(
      workspaceId,
      dto.name,
    );
  }

  @Delete(':workspaceId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.workspaces.remove(
      workspaceId,
      req.user.sub,
    );
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceRoleGuard)
  listMembers(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.members.list(workspaceId);
  }

  @Patch(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  changeMemberRole(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('userId', ParseUUIDPipe)
    userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.changeRole(
      workspaceId,
      userId,
      dto.role,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  removeMember(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('userId', ParseUUIDPipe)
    userId: string,
  ) {
    return this.members.remove(
      workspaceId,
      userId,
    );
  }

  @Post(':workspaceId/invitations')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  invite(
    @Req() req: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.invitations.invite(
      workspaceId,
      req.user.sub,
      dto.email,
      dto.role,
    );
  }

  @Get(':workspaceId/invitations')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  listInvitations(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.invitations.list(workspaceId);
  }

  @Delete(':workspaceId/invitations/:invitationId')
  @UseGuards(WorkspaceRoleGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  cancelInvitation(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('invitationId', ParseUUIDPipe)
    invitationId: string,
  ) {
    return this.invitations.cancel(
      workspaceId,
      invitationId,
    );
  }
}
