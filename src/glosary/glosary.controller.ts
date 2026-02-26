import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { GlosaryService } from './glosary.service';
import { CreateGlosaryDto } from './dto/create-glosary.dto';
import { UpdateGlosaryDto } from './dto/update-glosary.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLog } from 'src/system/audit-logs/decorators/audit-log.decorator';
import { Auth } from 'src/auth/decorators';
import { GlosaryPaginationDto } from './interfaces/glosary-pagination.dto';

@ApiTags('Glosary')
@Controller('glosary')
export class GlosaryController {
  constructor(private readonly glosaryService: GlosaryService) {}

  @Post()
  @AuditLog()
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'The Resource was created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Unauthorized Request' })
  create(@Body() createGlosaryDto: CreateGlosaryDto) {
    return this.glosaryService.create(createGlosaryDto);
  }

  @Get()
  @ApiResponse({
    status: 200,
    description: 'The Resources were returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  findAll(@Query() paginationGlosaryDto: GlosaryPaginationDto) {
    return this.glosaryService.findAll(paginationGlosaryDto);
  }

  @Get(':id')
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  findOne(@Param('id') id: string) {
    return this.glosaryService.findOneById(id);
  }

  @Patch(':id')
  @Auth()
  @AuditLog()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  update(@Param('id') id: string, @Body() updateGlosaryDto: UpdateGlosaryDto) {
    return this.glosaryService.update(id, updateGlosaryDto);
  }

  @Delete(':id')
  @Auth()
  @AuditLog()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  remove(@Param('id') id: string) {
    return this.glosaryService.remove(id);
  }
}
