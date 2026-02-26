import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';

import { Proyecto } from './entities/proyectos.entity';
import { ProyectoMiembro } from './entities/proyecto-miembro.entity';
import { User } from '../users/entities/user.entity';

import { AuthModule } from '../auth/auth.module';
import { Hora } from '../horas/entities/hora.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Proyecto, ProyectoMiembro, User, Hora]),
    AuthModule,
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}