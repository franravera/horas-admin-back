import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
  } from 'typeorm';
  import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
  
  import { User } from '../../users/entities/user.entity';
  import { Proyecto } from '../../proyectos/entities/proyectos.entity';
  
  @Entity('horas')
  @Index('IDX_horas_proyecto_fecha', ['proyectoId', 'fecha'])
  @Index('IDX_horas_user_fecha', ['userId', 'fecha'])
  @Index('IDX_horas_proyecto_user_fecha', ['proyectoId', 'userId', 'fecha'])

  export class Hora {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ApiProperty()
    @Column('uuid')
    userId: string;
  
    @ApiProperty()
    @Column('uuid')
    proyectoId: string;
  
    @ApiHideProperty()
    @ManyToOne(() => User, (u: any) => u.horas, { onDelete: 'CASCADE' })
    user: User;
  
    @ApiHideProperty()
    @ManyToOne(() => Proyecto, (p) => p.horas, { onDelete: 'CASCADE' })
    proyecto: Proyecto;
  
    // yyyy-mm-dd
    @ApiProperty({ example: '2026-02-14' })
    @Column({ type: 'date' })
    fecha: string;
  
    @ApiProperty({ example: 480, description: 'Minutos dedicados (8h = 480)' })
    @Column('int')
    minutos: number;
  
    @ApiProperty({ required: false, nullable: true })
    @Column('text', { nullable: true })
    descripcion?: string | null;
  
    @ApiHideProperty()
    @CreateDateColumn()
    createdAt: Date;
  
    @ApiHideProperty()
    @UpdateDateColumn({ nullable: true })
    updatedAt: Date;
  }