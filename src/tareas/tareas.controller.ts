import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators';
import { ApiMultipleFiles } from '../system/files-manager/decorators/api-multiple-files.decorator';
import { ValidMymeTypes } from '../system/files-manager/interfaces';
import { CreateProjectChatMessageDto } from './dto/create-project-chat-message.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TareasGateway } from './tareas.gateway';
import { TareasService } from './tareas.service';

@ApiTags('tareas')
@ApiBearerAuth()
@Controller('tareas')
@Auth()
export class TareasController {
  constructor(
    private readonly tareasService: TareasService,
    private readonly tareasGateway: TareasGateway,
  ) {}

  @Get('proyectos')
  findProjects(@Req() req: any) {
    return this.tareasService.findProjectsForUser(req.user.id, req.user.role);
  }

  @Get('notificaciones')
  getNotifications(@Req() req: any) {
    return this.tareasService.getNotifications(req.user.id);
  }

  @Post('notificaciones/read')
  async markNotificationsRead(@Req() req: any, @Body() body: { ids?: string[] }) {
    const data = await this.tareasService.markNotificationsRead(req.user.id, body?.ids);
    await this.tareasGateway.emitUserNotifications(req.user.id);
    return data;
  }

  @Get('proyectos/:proyectoId/tablero')
  getBoard(@Req() req: any, @Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
    return this.tareasService.getBoard(proyectoId, req.user.id, req.user.role);
  }

  @Get('proyectos/:proyectoId/chat/mensajes')
  listProjectChatMessages(
    @Req() req: any,
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.tareasService.listProjectChatMessages(
      proyectoId,
      req.user.id,
      req.user.role,
      Number(limit) || 100,
      before,
    );
  }

  @Post('proyectos/:proyectoId/chat/mensajes')
  @ApiMultipleFiles(
    'files',
    [...ValidMymeTypes.image, ...ValidMymeTypes.document, ...ValidMymeTypes.spreadsheet],
    10,
    true,
  )
  async createProjectChatMessage(
    @Req() req: any,
    @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    @Body() dto: CreateProjectChatMessageDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    const result = await this.tareasService.createProjectChatMessage(
      proyectoId,
      req.user.id,
      req.user.role,
      dto,
      files || [],
    );

    await this.tareasGateway.emitProjectChatMessage(proyectoId, result.message);
    await Promise.all(
      result.notifiedUserIds.map((userId) => this.tareasGateway.emitUserNotifications(userId)),
    );

    return result.message;
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTaskDto) {
    return this.tareasService.createTask(req.user.id, req.user.role, dto);
  }

  @Patch(':taskId')
  update(
    @Req() req: any,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tareasService.updateTask(taskId, req.user.id, req.user.role, dto);
  }

  @Post(':taskId/comentarios')
  async createComment(
    @Req() req: any,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskCommentDto,
  ) {
    const result = await this.tareasService.createComment(taskId, req.user.id, req.user.role, dto);
    await Promise.all(
      result.notifiedUserIds.map((userId) => this.tareasGateway.emitUserNotifications(userId)),
    );
    return result.comment;
  }

  @Post(':taskId/adjuntos')
  @ApiMultipleFiles(
    'files',
    [...ValidMymeTypes.image, ...ValidMymeTypes.document, ...ValidMymeTypes.spreadsheet],
    8,
    true,
  )
  uploadAttachments(
    @Req() req: any,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.tareasService.addAttachments(taskId, req.user.id, req.user.role, files);
  }
}
