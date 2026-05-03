import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';

@Entity('task_attachments')
@Index('IDX_task_attachments_task_createdAt', ['taskId', 'createdAt'])
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  task: Task;

  @Column('uuid')
  uploaderId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  uploader: User;

  @Column('text')
  fileName: string;

  @Column('text')
  originalName: string;

  @Column('text')
  mimeType: string;

  @Column('int')
  size: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
