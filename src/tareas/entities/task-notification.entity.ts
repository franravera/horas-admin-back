import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Proyecto } from '../../proyectos/entities/proyectos.entity';
import { User } from '../../users/entities/user.entity';
import { ProjectChatMessage } from './project-chat-message.entity';
import { TaskComment } from './task-comment.entity';
import { Task } from './task.entity';

export enum TaskNotificationType {
  MENTION = 'MENTION',
  PROJECT_CHAT_MENTION = 'PROJECT_CHAT_MENTION',
}

@Entity('task_notifications')
@Index('IDX_task_notifications_user_readAt', ['userId', 'readAt'])
export class TaskNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column('uuid', { nullable: true })
  proyectoId?: string | null;

  @ManyToOne(() => Proyecto, { nullable: true, onDelete: 'CASCADE' })
  proyecto?: Proyecto | null;

  @Column('uuid', { nullable: true })
  taskId?: string | null;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'CASCADE' })
  task?: Task | null;

  @Column('uuid', { nullable: true })
  commentId?: string | null;

  @ManyToOne(() => TaskComment, { nullable: true, onDelete: 'CASCADE' })
  comment?: TaskComment | null;

  @Column('uuid', { nullable: true })
  projectChatMessageId?: string | null;

  @ManyToOne(() => ProjectChatMessage, { nullable: true, onDelete: 'CASCADE' })
  projectChatMessage?: ProjectChatMessage | null;

  @Column('enum', { enum: TaskNotificationType, default: TaskNotificationType.MENTION })
  type: TaskNotificationType;

  @Column('text')
  title: string;

  @Column('text')
  message: string;

  @Column('text', { nullable: true })
  link?: string | null;

  @Column('timestamp', { nullable: true })
  emailSentAt?: Date | null;

  @Column('timestamp', { nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
