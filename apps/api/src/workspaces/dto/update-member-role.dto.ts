
import { IsIn } from 'class-validator';
import { WorkspaceRole } from '../../generated/prisma/enums.js';

export class UpdateMemberRoleDto {
  @IsIn([WorkspaceRole.EDITOR, WorkspaceRole.VIEWER])
  role!: 'EDITOR' | 'VIEWER';
}
