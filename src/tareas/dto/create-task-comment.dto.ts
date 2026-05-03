import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTaskCommentDto {
  @ApiProperty({ example: 'Ojo con el feedback del cliente en el copy.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
