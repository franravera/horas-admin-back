import { forwardRef, Module } from '@nestjs/common';
import { UserSiteService } from './user-site.service';
import { UserSiteController } from './user-site.controller';
import { UserSite } from './entities/user-site.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { UtilsService } from 'src/common/utils/utils.service';
import { AuditLogsModule } from 'src/system/audit-logs/audit-logs.module';

@Module({
  controllers: [UserSiteController],
  providers: [UserSiteService, UtilsService],
   imports:[
      TypeOrmModule.forFeature([ UserSite ]),
      AuthModule,
       forwardRef(() => AuditLogsModule), // ✅ Importar correctamente el módulo de auditoría
    ],
    exports: [
      TypeOrmModule,
    ],
})
export class UserSiteModule {}
