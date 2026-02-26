import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Glosary } from './glosary.entity';

@Entity('glosary_types')
export class GlosaryTypes {
  @PrimaryColumn({ nullable: false })
  id: string;

  @Column('text')
  type: string;

  @OneToMany(() => Glosary, (glosary) => glosary.glosaryType, {
    onDelete: 'CASCADE',
  })
  glosaries: Glosary[];
}
