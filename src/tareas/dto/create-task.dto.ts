import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { TaskPriority, TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'uuid-del-proyecto' })
  @IsUUID()
  proyectoId: string;

  @ApiProperty({ example: 'Preparar propuesta comercial' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'uuid-del-asignado' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsOptional()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIA })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.PENDIENTE })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
