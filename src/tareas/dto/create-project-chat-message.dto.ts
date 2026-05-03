import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectChatMessageDto {
  @ApiPropertyOptional({ example: 'Che @Franco Matias, revisá este archivo.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;
}
