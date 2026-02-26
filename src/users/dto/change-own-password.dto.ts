import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangeOwnPasswordDto {
  @ApiProperty({ example: 'Actual123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'Nueva1234' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*$/, {
    message:
      'La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número',
  })
  newPassword: string;
}
