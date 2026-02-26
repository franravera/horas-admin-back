import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

import { AuditLog } from '../../system/audit-logs/decorators/audit-log.decorator';
import { Auth } from './../../auth/decorators';
import { ValidRoles } from './../../auth/interfaces';

@ApiTags('System')
@Controller('system/menu-items')
export class MenuItemsController {
  
  constructor(private readonly menuItemsService: MenuItemsService) {}


  @Post()
  @AuditLog()
  @Auth( ValidRoles.admin )
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'The Resource was created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  create( @Body() createDto: CreateMenuItemDto ) {
    return this.menuItemsService.create(createDto);
  }


  @Delete(':id')
  @AuditLog()
  @Auth( ValidRoles.admin )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resource was deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  delete( @Param('id', ParseUUIDPipe ) id: string ) {
    return this.menuItemsService.delete( id );
  }


  @Get()
  @Auth( ValidRoles.admin, ValidRoles.editor )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resources were returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  findAll( @Query() paginationDto:PaginationDto ) {
    // console.log(paginationDto)
    return this.menuItemsService.findAll( paginationDto );
  }


  @Get(':id')
  @Auth( ValidRoles.admin, ValidRoles.editor )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resource was returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  findOne( @Param('id', ParseUUIDPipe ) id: string ) {
    return this.menuItemsService.findOne( id );
  }


  @Patch(':id')
  @AuditLog()
  @Auth( ValidRoles.admin, ValidRoles.editor )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resource was updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  update(
    @Param('id', ParseUUIDPipe ) id: string, 
    @Body() updateDto: UpdateMenuItemDto,
  ) {
    return this.menuItemsService.update( id, updateDto );
  }
  
}
