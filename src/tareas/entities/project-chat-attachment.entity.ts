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
import { ProjectChatMessage } from './project-chat-message.entity';

@Entity('project_chat_attachments')
@Index('IDX_project_chat_attachments_message_createdAt', ['messageId', 'createdAt'])
export class ProjectChatAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @ManyToOne(() => ProjectChatMessage, { onDelete: 'CASCADE' })
  message: ProjectChatMessage;

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
