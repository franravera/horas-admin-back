import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Proyecto } from '../../proyectos/entities/proyectos.entity';
import { User } from '../../users/entities/user.entity';
import { TaskAssignee } from './task-assignee.entity';
import { TaskAttachment } from './task-attachment.entity';
import { TaskComment } from './task-comment.entity';

export enum TaskStatus {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  EN_REVISION = 'EN_REVISION',
  HECHO = 'HECHO',
}

export enum TaskPriority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

@Entity('tasks')
@Index('IDX_tasks_proyecto_status', ['proyectoId', 'status'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  proyectoId: string;

  @ManyToOne(() => Proyecto, { onDelete: 'CASCADE' })
  proyecto: Proyecto;

  @Column('uuid')
  creatorId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  creator: User;

  @Column('uuid', { nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  assignee?: User | null;

  @Column('text')
  title: string;

  @Column('text', { nullable: true })
  description?: string | null;

  @Column('enum', { enum: TaskStatus, default: TaskStatus.PENDIENTE })
  status: TaskStatus;

  @Column('enum', { enum: TaskPriority, default: TaskPriority.MEDIA })
  priority: TaskPriority;

  @Column('int', { default: 0 })
  sortOrder: number;

  @OneToMany(() => TaskComment, (comment) => comment.task)
  comments: TaskComment[];

  @OneToMany(() => TaskAttachment, (attachment) => attachment.task)
  attachments: TaskAttachment[];

  @OneToMany(() => TaskAssignee, (assignee) => assignee.task)
  assignees: TaskAssignee[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
