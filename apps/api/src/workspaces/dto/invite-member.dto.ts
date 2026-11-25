
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum } from 'class-validator';
import { WorkspaceRole } from '../../generated/prisma/enums.js';

export class InviteMemberDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : value,
  )
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
