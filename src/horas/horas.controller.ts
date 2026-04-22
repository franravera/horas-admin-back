  import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    ParseUUIDPipe,
    Res,
    UploadedFile,
    UseInterceptors,
  } from '@nestjs/common';
  import { existsSync, unlinkSync } from 'fs';
  import { extname } from 'path';
  import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
  import { Response } from 'express';
  import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
  import { FileInterceptor } from '@nestjs/platform-express';
  
  import { HorasService } from './horas.service';
  import { CreateHoraDto } from './dto/create-hora.dto';
  import { ImportHorasExcelDto } from './dto/import-horas-excel.dto';
  import { UpdateHoraDto } from './dto/update-hora.dto';
  
  import { Auth } from '../auth/decorators/auth.decorator';
  import { HorasNotificationsGateway } from './horas-notifications.gateway';
  import { ValidRoles } from '../auth/interfaces';
  import { UserTeam } from '../users/entities/user.entity';
  
  @ApiTags('horas')
  @ApiBearerAuth()
  @Controller('horas')
  export class HorasController {
    constructor(
      private readonly horasService: HorasService,
      private readonly horasGateway: HorasNotificationsGateway,
    ) {}
  
    // =========================================================
    // USER - Crear hora
    // POST /horas
    // =========================================================
    @Post()
    @Auth()
    async create(@Req() req: any, @Body() dto: CreateHoraDto) {
      const created = await this.horasService.create(req.user.id, req.user.role, dto);
      await this.horasGateway.emitUserNotifications(created.userId);
      return created;
    }
  
    // =========================================================
    // USER - Mis horas (planilla)
    // GET /horas/mis-horas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
    // =========================================================
    @Get('mis-horas')
    @Auth()
    misHoras(
      @Req() req: any,
      @Query('desde') desde?: string,
      @Query('hasta') hasta?: string,
      @Query('userId') userId?: string,
    ) {
      return this.horasService.findMisHoras(
        req.user.id,
        req.user.role,
        desde,
        hasta,
        userId,
      );
    }

    @Get('mis-notificaciones')
    @Auth()
    misNotificaciones(@Req() req: any) {
      return this.horasService.getMisNotificaciones(req.user.id, req.user.role);
    }

    @Post('import-excel')
    @Auth(ValidRoles.admin)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        required: ['email', 'file'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    })
    @ApiResponse({
      status: 201,
      description:
        'Importa las horas de un Excel para el usuario indicado y devuelve el detalle cargado por proyecto.',
    })
    async importExcel(
      @Req() req: any,
      @Body() dto: ImportHorasExcelDto,
      @UploadedFile() file: Express.Multer.File,
    ) {
      if (!file || (!file.buffer?.length && !file.path)) {
        throw new BadRequestException('Debés adjuntar un archivo Excel válido.');
      }

      const fileExt = extname(file.originalname || '').toLowerCase();
      if (!['.xlsx', '.xls'].includes(fileExt)) {
        throw new BadRequestException('El archivo debe ser un Excel (.xlsx o .xls).');
      }

      try {
        const result = await this.horasService.importHorasFromExcel({
          requesterId: req.user.id,
          requesterRole: req.user.role,
          userEmail: dto.email,
          filePath: file.path,
          fileBuffer: file.buffer,
        });
        await this.horasGateway.emitUserNotifications(result.userId);
        return result;
      } finally {
        if (file.path && existsSync(file.path)) {
          unlinkSync(file.path);
        }
      }
    }

    @Get('export-excel')
    @Auth(ValidRoles.admin)
  async exportExcel(
    @Req() req: any,
    @Res() res: Response,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Query('userId') userId?: string,
    @Query('equipo') equipo?: UserTeam,
    @Query('theme') theme?: 'light' | 'dark',
  ) {
    const { buffer, fileName } = await this.horasService.exportHorasExcel({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      desde,
      hasta,
      userId,
      equipo,
      theme,
    });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    }
  
    // =========================================================
    // USER - Editar hora propia (ADMIN también)
    // PATCH /horas/:id
    // =========================================================
    @Patch(':id')
    @Auth()
    async update(
      @Req() req: any,
      @Param('id', ParseUUIDPipe) id: string,
      @Body() dto: UpdateHoraDto,
    ) {
      const updated = await this.horasService.update(id, req.user.id, req.user.role, dto);
      await this.horasGateway.emitUserNotifications(updated.userId);
      return updated;
    }
  
    // =========================================================
    // USER - Borrar hora propia (ADMIN también)
    // DELETE /horas/:id
    // =========================================================
    @Delete(':id')
    @Auth()
    async remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
      const removed = await this.horasService.remove(id, req.user.id, req.user.role);
      if (removed?.userId) {
        await this.horasGateway.emitUserNotifications(removed.userId);
      }
      return removed;
    }
  }
