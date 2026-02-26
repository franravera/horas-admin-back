// crm-base/src/proyectos/entities/proyecto-miembro.entity.ts

import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
  } from 'typeorm';
  import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
  
  import { User } from '../../users/entities/user.entity';
  import { Proyecto } from './proyectos.entity';
  
  export enum ProyectoRol {
    DEV = 'DEV',
    PM = 'PM',
    VIEWER = 'VIEWER',
  }
  
  @Entity('proyectos_miembros')
  @Unique('UQ_proyectos_miembros_user_proyecto', ['userId', 'proyectoId'])
  @Index('IDX_proyectos_miembros_user', ['userId'])
  @Index('IDX_proyectos_miembros_proyecto', ['proyectoId'])
  export class ProyectoMiembro {
    @ApiProperty({
      example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
      uniqueItems: true,
      nullable: false,
    })
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ApiProperty({
      example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
      nullable: false,
    })
    @Column('uuid')
    userId: string;
  
    @ApiProperty({
      example: 'cd533345-f1f3-48c9-a62e-7dc2da50c8f8',
      nullable: false,
    })
    @Column('uuid')
    proyectoId: string;
  
    @ApiHideProperty()
    @ManyToOne(() => User, (u: any) => u.proyectoMiembros, {
      onDelete: 'CASCADE',
    })
    user: User;
  
    @ApiHideProperty()
    @ManyToOne(() => Proyecto, (p) => p.miembros, {
      onDelete: 'CASCADE',
    })
    proyecto: Proyecto;
  
    @ApiProperty({
      enum: ProyectoRol,
      default: ProyectoRol.DEV,
      nullable: false,
    })
    @Column('enum', {
      enum: ProyectoRol,
      default: ProyectoRol.DEV,
    })
    rol: ProyectoRol;
  
    @ApiProperty({ default: true })
    @Column('bool', { default: true })
    is_active: boolean;
  
    @ApiHideProperty()
    @CreateDateColumn()
    createdAt: Date;
  }