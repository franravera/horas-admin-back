import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { SortOrder } from 'src/common/interfaces/sortOrder.interface';

export class GlosaryPaginationDto {
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

  @IsOptional()
  @IsString()
  glosaryTypeId?: string;

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
}
