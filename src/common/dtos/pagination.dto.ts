import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { SortOrder } from '../interfaces/sortOrder.interface';

export class PaginationDto {
  @ApiProperty({
    default: 20,
    description: 'How many rows do you need',
  })
  @IsOptional()
  @IsPositive()
  @Type(() => Number) // enableImplicitConversions: true
  limit?: number;

  @ApiProperty({
    default: 0,
    description: 'How many rows do you want to skip',
  })
  @IsOptional()
  @Min(0)
  @Type(() => Number) // enableImplicitConversions: true
  offset?: number;

  @ApiProperty({
    description: 'Text to filter',
  })
  @IsOptional()
  @IsString()
  searchInput?: string;

  @ApiProperty({
    description: 'Field to be sorted',
  })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiProperty({
    description: 'Sorting type to be sorted (asc | desc)',
  })
  @IsOptional()
  @IsString()
  sortOrder?: SortOrder;
  
  @ApiPropertyOptional({ example: "1163c155-266d-4632-a374-ab6731313692", description: "ID del edificio para filtrar gastos" })
  @IsOptional() // 🔹 Ahora es opcional
  @IsString()
  edificioId?: string; // 🔹 Se agregó `?` para indicar que puede ser undefined

  @ApiPropertyOptional({ example: "1", description: "numero de mes" })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  month: number; 

  @ApiPropertyOptional({ example: "2025", description: "numero de año" })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  year: number; 
}
