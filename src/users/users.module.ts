import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';

import { FilesManagerService } from '../system/files-manager/files-manager.service';
import { File } from '../system/files-manager/entities/file.entity';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../users/entities/user.entity';

import { UtilsService } from '../common/utils/utils.service';
import { AuditLogsService } from 'src/system/audit-logs/audit-logs.service';
import { AuditLogsModule } from 'src/system/audit-logs/audit-logs.module';

@Module({
  controllers: [UsersController],
  providers: [UsersService, FilesManagerService, UtilsService, ],
  imports: [
    TypeOrmModule.forFeature([ User, File ]),

    ConfigModule,
   
    forwardRef(() => AuthModule), // ✅ Evita el ciclo de dependencias
    forwardRef(() => AuditLogsModule), // ✅ Importar correctamente el módulo de auditoría

  ],
  
  exports: [
    UsersService,
    TypeOrmModule
  ]
})
export class UsersModule {}

