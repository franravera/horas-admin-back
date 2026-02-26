import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UploadedFile,
  BadRequestException,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { ChangeOwnPasswordDto, CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { FilesManagerService } from '../system/files-manager/files-manager.service';
import { File } from '../system/files-manager/entities/file.entity';

import { ApiFile } from '../system/files-manager/decorators/api-file.decorator';
import { AuditLog } from '../system/audit-logs/decorators/audit-log.decorator';
import { Auth } from './../auth/decorators';
import { ValidMymeTypes } from '../system/files-manager/interfaces';
import { ValidRoles } from './../auth/interfaces';

@ApiTags('Auth - Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly configService: ConfigService,
    private readonly filesManagerService: FilesManagerService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @AuditLog()
  @Auth(ValidRoles.admin)
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'The Resource was created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  create(@Body() createDto: CreateUserDto) {
    return this.usersService.create(createDto);
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
    return this.usersService.delete(id);
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
    return this.usersService.findAll(paginationDto);
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
    return this.usersService.findAllNoPagination();
  }

  @Get('by-id/:id')
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
    return this.usersService.findOne(id);
  }

  @Get('me/profile')
  @Auth()
  @ApiBearerAuth()
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.id);
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
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateDto, req.user.id, req.user.role);
  }

  @Put(':id/avatar')
  @AuditLog()
  @Auth()
  @ApiBearerAuth()
  @ApiFile('avatar', [...ValidMymeTypes.image], true)
  @ApiResponse({
    status: 200,
    description: 'The Resource was updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({ status: 415, description: 'Unsupported Media Type' })
  async updateAvatar(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    if (req.user.role !== ValidRoles.admin && req.user.id !== id) {
      throw new ForbiddenException('No podés editar el avatar de otro usuario');
    }

    if (!avatar) throw new BadRequestException('Invalid file upload');
    if (!avatar.filename) {
      throw new BadRequestException('Upload inválido: archivo sin nombre generado');
    }

    // Crea un registro con la nueva imagen subida
    const newFile = new File();
    newFile.fileName = avatar.filename;
    newFile.originalName = avatar.originalname;
    newFile.mimeType = avatar.mimetype;
    newFile.size = avatar.size;
    newFile.storage = this.configService.get('STORAGE_LOCAL');
    // console.log('NEW FILE: ', newFile);
    await this.filesManagerService.create(newFile);

    // Elimina el registro del archivo anterior (si no fuera null)
    const user = await this.usersService.findOne(id);
    if (user.avatar) {
      try {
        const oldFile = await this.filesManagerService.findOneByFileName(
          user.avatar,
        );

        const uploadsPath = this.configService.get<string>('FILES_UPLOADS') || './static/uploads';
        const oldPhysicalPath = join(process.cwd(), uploadsPath, oldFile.fileName);
        if (existsSync(oldPhysicalPath)) {
          unlinkSync(oldPhysicalPath);
        }

        await this.filesManagerService.delete(oldFile.id);
      } catch (_e) {
        // si el registro viejo no existe, seguimos para no bloquear reemplazo
      }
    }

    // Actualiza el nombre del archivo en el usuario
    const updateUserDto: UpdateUserDto = { ...user };
    updateUserDto.avatar = avatar.filename;
    return this.usersService.update(id, updateUserDto, req.user.id, req.user.role);
  }

  @Post('me/change-password')
  @Auth()
  @ApiBearerAuth()
  changeOwnPassword(@Req() req: any, @Body() dto: ChangeOwnPasswordDto) {
    return this.usersService.changeOwnPassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
