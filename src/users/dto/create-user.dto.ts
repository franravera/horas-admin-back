import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ValidRoles } from "src/auth/interfaces";
import { User } from "../entities/user.entity";

export class CreateUserDto {
  @ApiProperty({
    nullable: false,
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    nullable: false,
    minLength: 8,
    maxLength: 20,
    description:
      "The password must have a Uppercase, lowercase letter and a number",
  })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  password: string;

  @ApiProperty({
    nullable: false,
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  first_name: string;

  @ApiProperty({
    nullable: false,
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  last_name: string;

  @IsOptional()
  @ApiHideProperty()
  @IsString()
  avatar: string;

  @ApiProperty({
    enum: ValidRoles,
    nullable: false,
    default: ValidRoles.user,
  })
  @IsString()
  @MinLength(1)
  @IsEnum(ValidRoles)
  role: ValidRoles;

  @ApiProperty({
    required: true,
    default: true,
  })
  @IsBoolean()
  is_active: boolean = true;

  @ApiProperty({ default: null, nullable: true })
  @IsNumber()
  @IsOptional()
  extension: number = null;

  @ApiProperty({ nullable: true, required: false })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID("4", { each: true })
  relatedUserIds: string[];
  
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  temporary_password?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsDate()
  temporary_password_expires_at?: Date;

 








}
