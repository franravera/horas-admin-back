import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { UserSiteService } from './user-site.service';
import { CreateUserSiteDto } from './dto/create-user-site.dto';
import { UpdateUserSiteDto } from './dto/update-user-site.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLog } from '../system/audit-logs/decorators/audit-log.decorator';
import { Auth, GetUser } from 'src/auth/decorators';
import { ValidRoles } from 'src/auth/interfaces';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { RegisterUserSiteDto } from './dto/register-user-site.dto';
import { AuthUserSite } from 'src/auth/decorators/auth-user-site.decorator';
import { UserSite } from './entities/user-site.entity';

@ApiTags('Usuarios-site')
@Controller('user-site')
export class UserSiteController {
  constructor(private readonly userSiteService: UserSiteService) {}

  @Post()
  create(@Body() createUserSiteDto: CreateUserSiteDto) {
    return this.userSiteService.create(createUserSiteDto);
  }

  @Post('registro')
  @ApiResponse({
    status: 200,
    description: 'The Resource was deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  createRegistro(@Body() createUserSiteDto: RegisterUserSiteDto) {
    return this.userSiteService.createRegistro(createUserSiteDto);
  }

  @Delete(':id')
  @AuditLog()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was deleted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.userSiteService.delete(id);
  }

    @Get()
    @Auth(ValidRoles.admin)
    @ApiBearerAuth()
    @ApiResponse({
      status: 200,
      description: 'The Resources were returned successfully',
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized Request' })
    findAll(@Query() paginationDto: PaginationDto) {
      return this.userSiteService.findAll(paginationDto);
    }

    
  
    @Get('/allUsersNoPagination')
    @Auth(ValidRoles.admin)
    @ApiBearerAuth()
    @ApiResponse({
      status: 200,
      description: 'The Resources were returned successfully',
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized Request' })
    findAllNoPagination() {
      return this.userSiteService.findAllNoPagination();
    }
  
    @Get(':id')
    @Auth(ValidRoles.admin)
    @ApiBearerAuth()
    @ApiResponse({
      status: 200,
      description: 'The Resource was returned successfully',
    })
    @ApiResponse({ status: 400, description: 'Bad Request' })
    @ApiResponse({ status: 401, description: 'Unauthorized Request' })
    @ApiResponse({ status: 404, description: 'Resource not found' })
    findOne(@Param('id') id: string) {
      return this.userSiteService.findOne(id);
    }

  @Patch(':id')
  @AuditLog()
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserSiteDto,
  ) {
    return this.userSiteService.update(id, updateDto);
  }

}
