import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ImportHorasExcelDto {
  @ApiProperty({
    example: 'usuario@empresa.com',
    description: 'Email del usuario al que se le imputarán las horas del Excel',
  })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
