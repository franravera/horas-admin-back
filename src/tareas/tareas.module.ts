import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProyectoMiembro } from '../proyectos/entities/proyecto-miembro.entity';
import { Proyecto } from '../proyectos/entities/proyectos.entity';
import { User } from '../users/entities/user.entity';
import { TaskAssignee } from './entities/task-assignee.entity';
import { ProjectChatAttachment } from './entities/project-chat-attachment.entity';
import { ProjectChatMessage } from './entities/project-chat-message.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskNotification } from './entities/task-notification.entity';
import { Task } from './entities/task.entity';
import { TareasController } from './tareas.controller';
import { TareasGateway } from './tareas.gateway';
import { TareasService } from './tareas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskComment,
      TaskAttachment,
      TaskAssignee,
      TaskNotification,
      ProjectChatMessage,
      ProjectChatAttachment,
      Proyecto,
      ProyectoMiembro,
      User,
    ]),
  ],
  controllers: [TareasController],
  providers: [TareasService, TareasGateway],
  exports: [TareasService],
})
export class TareasModule {}
