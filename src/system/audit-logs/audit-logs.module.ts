import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';

import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AuditLog } from './entities/audit-log.entity';

import { UtilsService } from '../../common/utils/utils.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogInterceptor, UtilsService],
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ AuditLog ]),
  ],
  exports: [
    AuditLogInterceptor,
    AuditLogsService,
    TypeOrmModule,
  ]
})
export class AuditLogsModule {}
