import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

@Entity('chat_user_states')
export class ChatUserState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column('uuid', { unique: true })
  userId: string;

  @Column('timestamp', { nullable: true, default: null })
  lastReadAt: Date | null;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
