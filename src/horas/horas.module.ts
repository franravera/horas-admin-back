import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HorasController } from './horas.controller';
import { HorasService } from './horas.service';
import { Hora } from './entities/hora.entity';
import { HorasNotificationsGateway } from './horas-notifications.gateway';
import { Proyecto } from '../proyectos/entities/proyectos.entity';

import { ProyectosModule } from '../proyectos/proyectos.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Hora, User, Proyecto]), ProyectosModule],
  controllers: [HorasController],
  providers: [HorasService, HorasNotificationsGateway],
  exports: [HorasService],
})
export class HorasModule {}
