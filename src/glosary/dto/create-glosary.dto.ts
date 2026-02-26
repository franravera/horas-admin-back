import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
export class CreateGlosaryDto {
  @ApiProperty({ nullable: false, minLength: 1 })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ nullable: true, required: false, default: null })
  @IsString()
  @IsOptional()
  @IsUUID()
  categoryId: string = null;

  @ApiProperty({ nullable: true, required: false, default: null })
  @IsString()
  @IsOptional()
  @IsUUID()
  topicId: string = null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;

  @ApiProperty()
  @IsString()
  glosaryTypeId: string;
}
