import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ProyectoRol } from '../entities/proyecto-miembro.entity';

export class AsignarUsuarioDto {
  @ApiProperty({ example: 'uuid-user' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: ProyectoRol, required: false, default: ProyectoRol.DEV })
  @IsOptional()
  @IsEnum(ProyectoRol)
  rol?: ProyectoRol;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}