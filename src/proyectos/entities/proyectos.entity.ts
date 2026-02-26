import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { ProyectoMiembro } from './proyecto-miembro.entity';
import { Hora } from '../../horas/entities/hora.entity';

@Entity('proyectos')
export class Proyecto {
  @ApiProperty({ example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'CRM WhatsApp' })
  @Column('text')
  @Index('IDX_proyectos_nombre')
  nombre: string;

  @ApiProperty({ required: false, nullable: true })
  @Column('text', { nullable: true })
  descripcion?: string | null;

  @ApiProperty({ default: true })
  @Column('bool', { default: true })
  is_active: boolean;

  @ApiHideProperty()
  @OneToMany(() => ProyectoMiembro, (pm) => pm.proyecto)
  miembros: ProyectoMiembro[];

  @ApiHideProperty()
  @OneToMany(() => Hora, (h) => h.proyecto)
  horas: Hora[];

  @ApiHideProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiHideProperty()
  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @ApiHideProperty()
  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;
}