import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  method: string;

  @Column('text', { nullable: true })
  resource: string;

  @Column('text', { nullable: true })
  idEntity: string;

  @Column('jsonb', { nullable: true })
  previousEntity: unknown;

  @Column('jsonb', { nullable: true })
  currentEntity: unknown;

  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true, eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}

