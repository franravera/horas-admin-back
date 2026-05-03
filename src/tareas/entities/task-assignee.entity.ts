import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Task } from './task.entity';

@Entity('task_assignees')
@Unique('UQ_task_assignees_task_user', ['taskId', 'userId'])
@Index('IDX_task_assignees_task', ['taskId'])
@Index('IDX_task_assignees_user', ['userId'])
export class TaskAssignee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  task: Task;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
