import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({
    description: "ID del usuario",
    example: "cd533345-f1f3-48c9-a62e-7dc2da50c8f8",
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Nueva contraseña",
    minLength: 8,
    example: "NewP@ssw0rd",
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).*$/, {
    message:
      "La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número",
  })
  newPassword: string;
}