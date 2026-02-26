import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GlosaryTypes } from './glosary-types.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('glosary')
export class Glosary {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ uniqueItems: true, nullable: false })
  @Column('varchar', { unique: true, nullable: false })
  name: string;

  @ApiProperty({ nullable: true, default: null })
  @Column('uuid', { nullable: true, default: null })
  categoryId: string;

  @ApiProperty({ nullable: true, default: null })
  @Column('uuid', { nullable: true, default: null })
  topicId: string;

  @ApiProperty({ default: true })
  @Column('bool', { default: true })
  isActive: boolean;

  @ApiHideProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiHideProperty()
  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @ApiHideProperty()
  @DeleteDateColumn({ nullable: true })
  deletedAt: Date;

  @ManyToOne(() => GlosaryTypes, (type) => type.glosaries, { eager: true })
  glosaryType: GlosaryTypes;

  @ManyToOne(() => Glosary, (glosary) => glosary.id, { nullable: true })
  category: Glosary;

  @ManyToOne(() => Glosary, (glosary) => glosary.id, { nullable: true })
  topic: Glosary;
}
