import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  ManyToOne,
} from "typeorm";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";

import { ValidRoles } from "./../../auth/interfaces";
import { AuditLog } from "./../../system/audit-logs/entities/audit-log.entity";

import { Request } from 'express';
import { ProyectoMiembro } from "src/proyectos/entities/proyecto-miembro.entity";
import { Hora } from "src/horas/entities/hora.entity";


@Entity("users")
export class User {
  @ApiProperty({
    example: "cd533345-f1f3-48c9-a62e-7dc2da50c8f8",
    uniqueItems: true,
    nullable: false,
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    uniqueItems: true,
    nullable: false,
  })
  @Column("text", {
    unique: true,
  })
  email: string;

  @ApiProperty({
    minLength: 6,
    maxLength: 50,
    description:
      "The password must have a Uppercase, lowercase letter and a number",
  })
  @Column("text", {
    nullable: false,
    select: true, // ✅ Permite recuperar la contraseña en consultas
  })
  password: string;

  @ApiProperty({ nullable: true })
  @Column("text", { nullable: true })
  first_name: string;

  @ApiProperty({ nullable: true })
  @Column("text", { nullable: true })
  last_name: string;

  @ApiProperty({ nullable: true })
  @Column("text", { nullable: true })
  avatar: string;

  @ApiProperty({ nullable: false })
  @Column("enum", {
    enum: ValidRoles,
    nullable: false,
    default: ValidRoles.user,
  })
  role: ValidRoles;

  @ApiProperty({ nullable: false, default: true })
  @Column("bool", {
    nullable: true,
    default: true,
  })
  is_active: boolean;

  @ApiProperty()
  @Column("timestamp", {
    default: null,
    nullable: true,
  })
  last_login: Date;

  @ApiProperty({ nullable: true, default: null })
  @Column("int", { nullable: true })
  extension: number = null;

  @ApiHideProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiHideProperty()
  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @ApiHideProperty()
  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @ApiHideProperty()
  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @Column('text', { nullable: true, })
  temporary_password?: string;
  
  @Column('timestamp', { nullable: true })
  temporary_password_expires_at?: Date;
  
  @ManyToMany(() => User, (user) => user.id, { nullable: true })
  @JoinTable({
    name: "user_relations",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "related_user_id", referencedColumnName: "id" },
  })
  relatedUsers: User[];

 

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }



@OneToMany(() => ProyectoMiembro, (pm) => pm.user)
proyectoMiembros: ProyectoMiembro[];

@OneToMany(() => Hora, (h) => h.user)
horas: Hora[];
}

export { ValidRoles };
