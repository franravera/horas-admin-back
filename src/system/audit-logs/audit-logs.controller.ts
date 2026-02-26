import { Controller, Get, Param, Query} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditLogsService } from './audit-logs.service';
import { PaginationDto } from '../../common/dtos/pagination.dto';

import { Auth } from './../../auth/decorators';
import { ValidRoles } from './../../auth/interfaces';

@ApiTags('System')
@Controller('system/audit-logs')
export class AuditLogsController {

  constructor(private readonly auditLogsService: AuditLogsService) {}


  @Get()
  @Auth( ValidRoles.admin )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resources were returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  findAll( @Query() paginationDto:PaginationDto ) {
    return this.auditLogsService.findAll( paginationDto );
  }


  @Get(':id')
  @Auth( ValidRoles.admin )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resource was returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  findOne( @Param( 'id' ) id: number ) {
    return this.auditLogsService.findOne( id );
  }

}
