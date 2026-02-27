import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiPropertyOptional({ example: 'Hola equipo 👋' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @ApiPropertyOptional({ example: 'archivo.jpg' })
  @IsOptional()
  @IsString()
  image?: string;
}
