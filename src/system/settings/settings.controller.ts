import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

import { AuditLog } from '../audit-logs/decorators/audit-log.decorator';
import { Auth } from '../../auth/decorators';
import { ValidRoles } from '../../auth/interfaces';

@ApiTags('System')
@Controller('system/settings')
export class SettingsController {

  constructor(private readonly settingsService: SettingsService) {}

  
  @Get()
  // @Auth( ValidRoles.admin )
  // @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'The Resource was returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  // @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  getInfo() {
    return this.settingsService.getInfo();
  }


  @Patch()
  @AuditLog()
  @Auth( ValidRoles.admin )
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Updated OK' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  update( @Body() updateDto: UpdateSettingsDto ) {
    return this.settingsService.update(updateDto);
  }

}
