import { IsOptional, IsString } from 'class-validator';
import { User } from '../../../users/entities/user.entity';

export class CreateAuditLogDto {
  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  idEntity?: string;

  @IsOptional()
  previousEntity?: unknown;

  @IsOptional()
  currentEntity?: unknown;

  @IsOptional()
  user?: Partial<User>;
}
