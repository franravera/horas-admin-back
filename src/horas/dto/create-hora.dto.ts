import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateHoraDto {
  @ApiProperty({ required: false, example: 'uuid-del-usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ example: 'uuid-del-proyecto' })
  @IsUUID()
  @IsNotEmpty()
  proyectoId: string;

  @ApiProperty({ example: '2026-02-14', description: 'YYYY-MM-DD' })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: 480, description: 'Minutos dedicados (8h=480)' })
  @IsInt()
  @Min(1)
  @Max(24 * 60)
  minutos: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
