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
import { ProjectChatAttachment } from './project-chat-attachment.entity';

@Entity('project_chat_messages')
@Index('IDX_project_chat_messages_project_createdAt', ['proyectoId', 'createdAt'])
export class ProjectChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  proyectoId: string;

  @ManyToOne(() => Proyecto, { onDelete: 'CASCADE' })
  proyecto: Proyecto;

  @Column('uuid')
  senderId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  sender: User;

  @Column('text', { nullable: true })
  text: string | null;

  @OneToMany(() => ProjectChatAttachment, (attachment) => attachment.message)
  attachments: ProjectChatAttachment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
