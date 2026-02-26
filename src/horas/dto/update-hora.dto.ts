import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateHoraDto {
  @ApiProperty({ required: false, example: 'uuid-del-proyecto' })
  @IsOptional()
  @IsUUID()
  proyectoId?: string;

  @ApiProperty({ required: false, example: '2026-02-14', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @ApiProperty({ required: false, example: 480, description: 'Minutos dedicados (8h=480)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  minutos?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}