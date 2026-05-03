import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ValidRoles } from '../auth/interfaces';
import { ProyectoMiembro } from '../proyectos/entities/proyecto-miembro.entity';
import { Proyecto } from '../proyectos/entities/proyectos.entity';
import { User } from '../users/entities/user.entity';
import { CreateProjectChatMessageDto } from './dto/create-project-chat-message.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskAssignee } from './entities/task-assignee.entity';
import { ProjectChatAttachment } from './entities/project-chat-attachment.entity';
import { ProjectChatMessage } from './entities/project-chat-message.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskComment } from './entities/task-comment.entity';
import {
  TaskNotification,
  TaskNotificationType,
} from './entities/task-notification.entity';
import { Task, TaskPriority, TaskStatus } from './entities/task.entity';

@Injectable()
export class TareasService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepo: Repository<TaskAttachment>,
    @InjectRepository(TaskAssignee)
    private readonly taskAssigneeRepo: Repository<TaskAssignee>,
    @InjectRepository(TaskNotification)
    private readonly notificationRepo: Repository<TaskNotification>,
    @InjectRepository(ProjectChatMessage)
    private readonly projectChatMessageRepo: Repository<ProjectChatMessage>,
    @InjectRepository(ProjectChatAttachment)
    private readonly projectChatAttachmentRepo: Repository<ProjectChatAttachment>,
    @InjectRepository(Proyecto)
    private readonly proyectoRepo: Repository<Proyecto>,
    @InjectRepository(ProyectoMiembro)
    private readonly miembroRepo: Repository<ProyectoMiembro>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeText(value?: string | null) {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private getAppBaseUrl() {
    const raw =
      this.configService.get<string>('APP_BASE_URL') ||
      this.configService.get<string>('HOST_API') ||
      'http://localhost:3000';

    return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeHtml(value: string) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private mapUser(user?: User | null) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      fullName: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
      avatar: user.avatar ?? null,
      role: user.role,
    };
  }

  private mapAttachment(attachment: TaskAttachment) {
    return {
      id: attachment.id,
      taskId: attachment.taskId,
      uploaderId: attachment.uploaderId,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
      uploader: this.mapUser(attachment.uploader),
    };
  }

  private mapProjectChatAttachment(attachment: ProjectChatAttachment) {
    return {
      id: attachment.id,
      messageId: attachment.messageId,
      uploaderId: attachment.uploaderId,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      updatedAt: attachment.updatedAt,
      uploader: this.mapUser(attachment.uploader),
    };
  }

  private mapComment(comment: TaskComment) {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      authorId: comment.authorId,
      author: this.mapUser(comment.author),
    };
  }

  private mapNotification(notification: TaskNotification) {
    return {
      id: notification.id,
      type: 'info' as const,
      scope: 'tareas' as const,
      title: notification.title,
      message: notification.message,
      link: notification.link ?? null,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  private mapTask(
    task: Task,
    comments: TaskComment[] = [],
    attachments: TaskAttachment[] = [],
    assignees: TaskAssignee[] = [],
  ) {
    const mappedAssignees =
      assignees.length > 0
        ? assignees.map((assignee) => this.mapUser(assignee.user)).filter(Boolean)
        : task.assignee
        ? [this.mapUser(task.assignee)].filter(Boolean)
        : [];

    return {
      id: task.id,
      proyectoId: task.proyectoId,
      creatorId: task.creatorId,
      assigneeId: mappedAssignees[0]?.id ?? task.assigneeId ?? null,
      assigneeIds: mappedAssignees.map((assignee) => assignee!.id),
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      sortOrder: task.sortOrder,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      creator: this.mapUser(task.creator),
      assignee: mappedAssignees[0] ?? this.mapUser(task.assignee),
      assignees: mappedAssignees,
      comments: comments.map((comment) => this.mapComment(comment)),
      attachments: attachments.map((attachment) => this.mapAttachment(attachment)),
    };
  }

  private mapProjectChatMessage(
    message: ProjectChatMessage,
    attachments: ProjectChatAttachment[] = [],
  ) {
    return {
      id: message.id,
      proyectoId: message.proyectoId,
      senderId: message.senderId,
      text: message.text,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: this.mapUser(message.sender),
      attachments: attachments.map((attachment) => this.mapProjectChatAttachment(attachment)),
    };
  }

  private async assertProjectAccess(
    proyectoId: string,
    userId: string,
    role: ValidRoles,
  ) {
    const proyecto = await this.proyectoRepo.findOne({
      where: { id: proyectoId, deletedAt: null },
    });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    if (role === ValidRoles.admin) return proyecto;

    const member = await this.miembroRepo.findOne({
      where: { proyectoId, userId, is_active: true },
    });

    if (!member) {
      throw new ForbiddenException('No tenés acceso a este proyecto');
    }

    return proyecto;
  }

  async canJoinProjectChat(proyectoId: string, userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, is_active: true } });
    if (!user) return false;

    if ((user.role || '').toLowerCase() === ValidRoles.admin) return true;

    const member = await this.miembroRepo.findOne({
      where: { proyectoId, userId, is_active: true },
    });

    return !!member;
  }

  private normalizeAssigneeIds(input?: Array<string | null | undefined>) {
    return Array.from(
      new Set(
        (input || [])
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private getIncomingAssigneeIds(dto: { assigneeId?: string | null; assigneeIds?: string[] }) {
    if (dto.assigneeIds !== undefined) {
      return this.normalizeAssigneeIds(dto.assigneeIds);
    }

    if (dto.assigneeId !== undefined) {
      return this.normalizeAssigneeIds(dto.assigneeId ? [dto.assigneeId] : []);
    }

    return undefined;
  }

  private async assertAssignableUsers(proyectoId: string, assigneeIds: string[]) {
    const normalizedIds = this.normalizeAssigneeIds(assigneeIds);
    if (!normalizedIds.length) return [];

    const users = await this.userRepo.find({
      where: normalizedIds.map((id) => ({ id, is_active: true })),
    });

    if (users.length !== normalizedIds.length) {
      throw new BadRequestException('Uno o más responsables no existen o están inactivos');
    }

    const members = await this.miembroRepo.find({
      where: normalizedIds.map((userId) => ({ proyectoId, userId, is_active: true })),
    });

    if (members.length !== normalizedIds.length) {
      throw new BadRequestException(
        'Solo podés asignar la tarea a miembros activos del proyecto',
      );
    }

    return users;
  }

  private async syncTaskAssignees(taskId: string, assigneeIds: string[]) {
    await this.taskAssigneeRepo.delete({ taskId });

    const normalizedIds = this.normalizeAssigneeIds(assigneeIds);
    if (!normalizedIds.length) return [];

    await this.taskAssigneeRepo.save(
      normalizedIds.map((userId) =>
        this.taskAssigneeRepo.create({
          taskId,
          userId,
        }),
      ),
    );

    return this.taskAssigneeRepo.find({
      where: { taskId },
      order: { createdAt: 'ASC' },
    });
  }

  private async getTaskAssigneesMap(taskIds: string[]) {
    const uniqueIds = Array.from(new Set(taskIds.filter(Boolean)));
    const rows = uniqueIds.length
      ? await this.taskAssigneeRepo.find({
          where: uniqueIds.map((taskId) => ({ taskId })),
          order: { createdAt: 'ASC' },
        })
      : [];

    const byTask = new Map<string, TaskAssignee[]>();
    rows.forEach((row) => {
      const list = byTask.get(row.taskId) ?? [];
      list.push(row);
      byTask.set(row.taskId, list);
    });

    return byTask;
  }

  private async getNextSortOrder(proyectoId: string, status: TaskStatus) {
    const row = await this.taskRepo
      .createQueryBuilder('task')
      .select('COALESCE(MAX(task.sortOrder), 0)', 'max')
      .where('task.proyectoId = :proyectoId', { proyectoId })
      .andWhere('task.status = :status', { status })
      .getRawOne<{ max: string }>();

    return Number(row?.max ?? 0) + 1;
  }

  private buildTaskLink(task: Task) {
    return `/tareas?projectId=${task.proyectoId}&taskId=${task.id}`;
  }

  private buildProjectChatLink(proyectoId: string) {
    return `/tareas?projectId=${proyectoId}&chat=1`;
  }

  private async findMentionedUsers(
    proyectoId: string,
    content: string,
    excludeUserId: string,
  ) {
    const members = await this.miembroRepo.find({
      where: { proyectoId, is_active: true },
      relations: ['user'],
    });

    const text = String(content || '');
    const mentioned = new Map<string, User>();
    const firstNameCount = new Map<string, number>();

    members.forEach((member) => {
      const firstName = member.user?.first_name?.trim().toLowerCase();
      if (!firstName) return;
      firstNameCount.set(firstName, (firstNameCount.get(firstName) || 0) + 1);
    });

    members.forEach((member) => {
      const user = member.user;
      if (!user || user.id === excludeUserId) return;

      const aliases = new Set<string>();
      const firstName = `${user.first_name ?? ''}`.trim();
      const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
      if (firstName && (firstNameCount.get(firstName.toLowerCase()) || 0) === 1) {
        aliases.add(firstName);
      }
      if (fullName) aliases.add(fullName);
      if (user.email) aliases.add(user.email);
      if (user.email?.includes('@')) aliases.add(user.email.split('@')[0]);

      for (const alias of aliases) {
        const regex = new RegExp(
          `(^|\\s)@${this.escapeRegex(alias)}(?=$|\\s|[.,;:!?])`,
          'i',
        );
        if (regex.test(text)) {
          mentioned.set(user.id, user);
          break;
        }
      }
    });

    return Array.from(mentioned.values());
  }

  private async createTaskMentionNotifications(
    task: Task,
    comment: TaskComment,
    users: User[],
  ) {
    if (!users.length) return [] as string[];

    const authorName =
      `${comment.author?.first_name ?? ''} ${comment.author?.last_name ?? ''}`.trim() ||
      comment.author?.email ||
      'Un compañero';
    const taskTitle = task.title;
    const taskLink = this.buildTaskLink(task);
    const appBaseUrl = this.getAppBaseUrl();
    const safeAuthorName = this.escapeHtml(authorName);
    const safeTaskTitle = this.escapeHtml(taskTitle);
    const safeCommentContent = this.escapeHtml(comment.content).replace(/\n/g, '<br />');

    for (const user of users) {
      const notification = await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: user.id,
          proyectoId: task.proyectoId,
          taskId: task.id,
          commentId: comment.id,
          type: TaskNotificationType.MENTION,
          title: 'Te mencionaron en una tarea',
          message: `${authorName} te mencionó en "${taskTitle}".`,
          link: taskLink,
        }),
      );

      if (user.email) {
        try {
          await this.mailerService.sendMail({
            from: this.configService.get<string>('SMTP_FROM_ADDRESS'),
            to: user.email,
            subject: `Te mencionaron en una tarea: ${taskTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111827;">
                <h2 style="margin-bottom:8px;">Te mencionaron en una tarea</h2>
                <p><strong>${safeAuthorName}</strong> te mencionó en la tarea <strong>${safeTaskTitle}</strong>.</p>
                <p style="margin:12px 0; padding:12px; background:#f3f4f6; border-radius:8px;">${safeCommentContent}</p>
                <p>
                  <a href="${appBaseUrl}${taskLink}" style="display:inline-block; background:#111827; color:#ffffff; text-decoration:none; padding:10px 14px; border-radius:8px;">
                    Abrir tarea
                  </a>
                </p>
              </div>
            `,
          });
          notification.emailSentAt = new Date();
          await this.notificationRepo.save(notification);
        } catch {
          // evitamos romper el flujo si falla el mail
        }
      }
    }

    return users.map((user) => user.id);
  }

  private async createProjectChatMentionNotifications(
    proyecto: Proyecto,
    message: ProjectChatMessage,
    users: User[],
  ) {
    if (!users.length) return [] as string[];

    const authorName =
      `${message.sender?.first_name ?? ''} ${message.sender?.last_name ?? ''}`.trim() ||
      message.sender?.email ||
      'Un compañero';
    const link = this.buildProjectChatLink(proyecto.id);

    await Promise.all(
      users.map((user) =>
        this.notificationRepo.save(
          this.notificationRepo.create({
            userId: user.id,
            proyectoId: proyecto.id,
            projectChatMessageId: message.id,
            type: TaskNotificationType.PROJECT_CHAT_MENTION,
            title: 'Te mencionaron en el chat del proyecto',
            message: `${authorName} te mencionó en el chat de ${proyecto.nombre}.`,
            link,
          }),
        ),
      ),
    );

    return users.map((user) => user.id);
  }

  async findProjectsForUser(userId: string, role: ValidRoles) {
    const qb = this.proyectoRepo
      .createQueryBuilder('p')
      .where('p.deletedAt IS NULL')
      .orderBy('LOWER(TRIM(p.nombre))', 'ASC')
      .addOrderBy('p.createdAt', 'DESC');

    if (role !== ValidRoles.admin) {
      qb.innerJoin('p.miembros', 'pm', 'pm.is_active = true AND pm.userId = :userId', {
        userId,
      });
    }

    return qb.getMany();
  }

  async getBoard(proyectoId: string, userId: string, role: ValidRoles) {
    const proyecto = await this.assertProjectAccess(proyectoId, userId, role);

    const [members, tasks, comments, attachments] = await Promise.all([
      this.miembroRepo.find({
        where: { proyectoId, is_active: true },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      }),
      this.taskRepo.find({
        where: { proyectoId },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.commentRepo
        .createQueryBuilder('comment')
        .leftJoinAndSelect('comment.task', 'task')
        .leftJoinAndSelect('comment.author', 'author')
        .where('task.proyectoId = :proyectoId', { proyectoId })
        .orderBy('comment.createdAt', 'ASC')
        .getMany(),
      this.attachmentRepo
        .createQueryBuilder('attachment')
        .leftJoinAndSelect('attachment.task', 'task')
        .leftJoinAndSelect('attachment.uploader', 'uploader')
        .where('task.proyectoId = :proyectoId', { proyectoId })
        .orderBy('attachment.createdAt', 'ASC')
        .getMany(),
    ]);

    const commentsByTask = new Map<string, TaskComment[]>();
    comments.forEach((comment) => {
      const list = commentsByTask.get(comment.taskId) ?? [];
      list.push(comment);
      commentsByTask.set(comment.taskId, list);
    });

    const attachmentsByTask = new Map<string, TaskAttachment[]>();
    attachments.forEach((attachment) => {
      const list = attachmentsByTask.get(attachment.taskId) ?? [];
      list.push(attachment);
      attachmentsByTask.set(attachment.taskId, list);
    });

    const assigneesByTask = await this.getTaskAssigneesMap(tasks.map((task) => task.id));

    return {
      project: {
        id: proyecto.id,
        nombre: proyecto.nombre,
        descripcion: proyecto.descripcion ?? null,
        is_active: proyecto.is_active,
      },
      columns: Object.values(TaskStatus),
      members: members
        .filter((member) => member.user)
        .map((member) => ({
          userId: member.userId,
          rol: member.rol,
          user: this.mapUser(member.user),
        })),
      tasks: tasks.map((task) =>
        this.mapTask(
          task,
          commentsByTask.get(task.id) ?? [],
          attachmentsByTask.get(task.id) ?? [],
          assigneesByTask.get(task.id) ?? [],
        ),
      ),
    };
  }

  async listProjectChatMessages(
    proyectoId: string,
    userId: string,
    role: ValidRoles,
    limit = 100,
    before?: string,
  ) {
    await this.assertProjectAccess(proyectoId, userId, role);

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 100));
    const qb = this.projectChatMessageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.proyectoId = :proyectoId', { proyectoId })
      .orderBy('message.createdAt', 'DESC')
      .take(safeLimit);

    if (before) {
      qb.andWhere('message.createdAt < :before', { before });
    }

    const rows = await qb.getMany();
    const ordered = rows.reverse();
    const messageIds = ordered.map((message) => message.id);

    const attachments = messageIds.length
      ? await this.projectChatAttachmentRepo.find({
          where: messageIds.map((messageId) => ({ messageId })),
          order: { createdAt: 'ASC' },
        })
      : [];

    const attachmentsByMessage = new Map<string, ProjectChatAttachment[]>();
    attachments.forEach((attachment) => {
      const list = attachmentsByMessage.get(attachment.messageId) ?? [];
      list.push(attachment);
      attachmentsByMessage.set(attachment.messageId, list);
    });

    const data = ordered.map((message) =>
      this.mapProjectChatMessage(message, attachmentsByMessage.get(message.id) ?? []),
    );

    return { data, total: data.length };
  }

  async createTask(userId: string, role: ValidRoles, dto: CreateTaskDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('La tarea necesita un título');

    await this.assertProjectAccess(dto.proyectoId, userId, role);
    const assigneeIds = this.getIncomingAssigneeIds(dto) ?? [];
    await this.assertAssignableUsers(dto.proyectoId, assigneeIds);

    const status = dto.status ?? TaskStatus.PENDIENTE;
    const task = this.taskRepo.create({
      proyectoId: dto.proyectoId,
      creatorId: userId,
      assigneeId: assigneeIds[0] ?? null,
      title,
      description: dto.description?.trim() || null,
      priority: dto.priority ?? TaskPriority.MEDIA,
      status,
      sortOrder: await this.getNextSortOrder(dto.proyectoId, status),
    });

    const created = await this.taskRepo.save(task);
    const taskAssignees = await this.syncTaskAssignees(created.id, assigneeIds);
    const full = await this.taskRepo.findOne({ where: { id: created.id } });
    if (!full) throw new NotFoundException('No se pudo crear la tarea');
    return this.mapTask(full, [], [], taskAssignees);
  }

  async updateTask(taskId: string, userId: string, role: ValidRoles, dto: UpdateTaskDto) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    await this.assertProjectAccess(task.proyectoId, userId, role);
    const incomingAssigneeIds = this.getIncomingAssigneeIds(dto);
    if (incomingAssigneeIds !== undefined) {
      await this.assertAssignableUsers(task.proyectoId, incomingAssigneeIds);
    }

    if (dto.title !== undefined) {
      const nextTitle = dto.title.trim();
      if (!nextTitle) throw new BadRequestException('La tarea necesita un título');
      task.title = nextTitle;
    }
    if (dto.description !== undefined) task.description = dto.description?.trim() || null;
    if (incomingAssigneeIds !== undefined) task.assigneeId = incomingAssigneeIds[0] ?? null;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined && dto.status !== task.status) {
      task.status = dto.status;
      task.sortOrder = await this.getNextSortOrder(task.proyectoId, dto.status);
    }

    await this.taskRepo.save(task);
    if (incomingAssigneeIds !== undefined) {
      await this.syncTaskAssignees(task.id, incomingAssigneeIds);
    }

    const [full, comments, attachments, assigneesByTask] = await Promise.all([
      this.taskRepo.findOne({ where: { id: task.id } }),
      this.commentRepo.find({ where: { taskId: task.id }, order: { createdAt: 'ASC' } }),
      this.attachmentRepo.find({ where: { taskId: task.id }, order: { createdAt: 'ASC' } }),
      this.getTaskAssigneesMap([task.id]),
    ]);

    if (!full) throw new NotFoundException('Tarea no encontrada luego de actualizar');
    return this.mapTask(full, comments, attachments, assigneesByTask.get(task.id) ?? []);
  }

  async createComment(taskId: string, userId: string, role: ValidRoles, dto: CreateTaskCommentDto) {
    const content = dto.content?.trim();
    if (!content) throw new BadRequestException('El comentario está vacío');

    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    await this.assertProjectAccess(task.proyectoId, userId, role);

    const comment = await this.commentRepo.save(
      this.commentRepo.create({
        taskId,
        authorId: userId,
        content,
      }),
    );

    const full = await this.commentRepo.findOne({ where: { id: comment.id } });
    if (!full) throw new NotFoundException('No se pudo crear el comentario');

    const mentionedUsers = await this.findMentionedUsers(task.proyectoId, content, userId);
    const notifiedUserIds = await this.createTaskMentionNotifications(task, full, mentionedUsers);

    return {
      comment: this.mapComment(full),
      notifiedUserIds,
    };
  }

  async addAttachments(
    taskId: string,
    userId: string,
    role: ValidRoles,
    files: Array<Express.Multer.File>,
  ) {
    if (!files?.length) throw new BadRequestException('No se recibieron archivos');

    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Tarea no encontrada');

    await this.assertProjectAccess(task.proyectoId, userId, role);

    const created = await Promise.all(
      files.map((file) =>
        this.attachmentRepo.save(
          this.attachmentRepo.create({
            taskId,
            uploaderId: userId,
            fileName: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          }),
        ),
      ),
    );

    const full = await this.attachmentRepo.find({
      where: created.map((attachment) => ({ id: attachment.id })),
      order: { createdAt: 'ASC' },
    });

    return full.map((attachment) => this.mapAttachment(attachment));
  }

  async createProjectChatMessage(
    proyectoId: string,
    userId: string,
    role: ValidRoles,
    dto: CreateProjectChatMessageDto,
    files: Array<Express.Multer.File>,
  ) {
    const proyecto = await this.assertProjectAccess(proyectoId, userId, role);
    const text = this.normalizeText(dto?.text);

    if (!text && !files?.length) {
      throw new BadRequestException('El mensaje del chat está vacío');
    }

    const created = await this.projectChatMessageRepo.save(
      this.projectChatMessageRepo.create({
        proyectoId,
        senderId: userId,
        text,
      }),
    );

    if (files?.length) {
      await Promise.all(
        files.map((file) =>
          this.projectChatAttachmentRepo.save(
            this.projectChatAttachmentRepo.create({
              messageId: created.id,
              uploaderId: userId,
              fileName: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
            }),
          ),
        ),
      );
    }

    const [fullMessage, attachments] = await Promise.all([
      this.projectChatMessageRepo.findOne({ where: { id: created.id } }),
      this.projectChatAttachmentRepo.find({
        where: { messageId: created.id },
        order: { createdAt: 'ASC' },
      }),
    ]);

    if (!fullMessage) {
      throw new NotFoundException('No se pudo crear el mensaje del chat');
    }

    const mentionedUsers = text
      ? await this.findMentionedUsers(proyectoId, text, userId)
      : [];
    const notifiedUserIds = await this.createProjectChatMentionNotifications(
      proyecto,
      fullMessage,
      mentionedUsers,
    );

    return {
      message: this.mapProjectChatMessage(fullMessage, attachments),
      notifiedUserIds,
    };
  }

  async getNotifications(userId: string) {
    const rows = await this.notificationRepo.find({
      where: { userId },
      order: { readAt: 'ASC', createdAt: 'DESC' },
      take: 30,
    });

    return {
      total: rows.filter((row) => !row.readAt).length,
      notifications: rows.map((row) => this.mapNotification(row)),
    };
  }

  async markNotificationsRead(userId: string, ids?: string[]) {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update(TaskNotification)
      .set({ readAt: () => 'CURRENT_TIMESTAMP' })
      .where('userId = :userId', { userId })
      .andWhere('readAt IS NULL');

    if (ids?.length) {
      qb.andWhere('id IN (:...ids)', { ids });
    }

    await qb.execute();
    return this.getNotifications(userId);
  }
}
