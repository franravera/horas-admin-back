import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToMany,
    JoinTable,
  } from 'typeorm';
  
  @Entity('user_sites')
  export class UserSite {
    @ApiProperty({
       example: "cd533345-f1f3-48c9-a62e-7dc2da50c8f8",
       uniqueItems: true,
       nullable: false,
     })
     @PrimaryGeneratedColumn("uuid")
     id: string;
  
    @Column('text', { name: 'nombre' })
    nombre: string;
  
    @Column('text', { name: 'apellido' })
    apellido: string;
  
    @Column('text', { name: 'telefono', nullable: true })
    telefono: string;
  
    @Column('text', { name: 'celular', nullable: true })
    celular: string;
  
    @Column('text', { name: 'email', unique: true })
    email: string;
  
    @Column('text', { name: 'direccion', nullable: true })
    direccion: string;
  
    @Column('text', { name: 'provincia', nullable: true })
    provincia: string;
  
    @Column('text', { name: 'localidad', nullable: true })
    localidad: string;
  
    @Column('bool', { name: 'es_propietario', default: false })
    esPropietario: boolean;
  
    @Column('text', { name: 'password' })
    password: string;
  
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
  