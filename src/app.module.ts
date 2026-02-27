import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';

import { AuditLogsModule } from './system/audit-logs/audit-logs.module';
import { AuditLogInterceptor } from './system/audit-logs/interceptors/audit-log.interceptor';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { FileModule } from './file/file.module';
import { FilesManagerModule } from './system/files-manager/files-manager.module';
import { HealthModule } from './system/health/health.module';
import { MenuItemsModule } from './system/menu-items/menu-items.module';
import { SettingsnModule } from './system/settings/settings.module';
import { UsersModule } from './users/users.module';
import { UtilsModule } from './common/utils/utils.module';

import { GlosaryModule } from './glosary/glosary.module';
import { ScheduleModule } from '@nestjs/schedule';

import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

// import { ApiConnectionModule } from './api-connection/api-connection.module';

import { UserSiteModule } from './user-site/user-site.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { HorasModule } from './horas/horas.module';
import { ChatModule } from './chat/chat.module';




@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      ssl: process.env.STAGE === 'prod',
      extra: {
        ssl:
          process.env.STAGE === 'prod' ? { rejectUnauthorized: false } : null,
      },
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: process.env.STAGE === 'dev',
      synchronize: true,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      logging: false,
    }),

    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: +process.env.SMTP_PORT,
        secure: false, // Mantener en false para usar STARTTLS
        requireTLS: true, // Asegura el uso de TLS
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      defaults: {
        from: process.env.SMTP_FROM_ADDRESS,
      },
    }),

    ScheduleModule.forRoot(),

    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uploadsPath =
          configService.get<string>('FILES_UPLOADS') || './static/uploads';

        const absoluteUploadsPath = join(process.cwd(), uploadsPath);
        if (!existsSync(absoluteUploadsPath)) {
          mkdirSync(absoluteUploadsPath, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: absoluteUploadsPath,
            filename: (_req, file, cb) => {
              const cleanBase = file.originalname
                .replace(extname(file.originalname), '')
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(0, 80);
              const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              cb(null, `${cleanBase || 'file'}-${unique}${extname(file.originalname)}`);
            },
          }),
        };
      },
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),

    CommonModule,

    //Auth Module
    AuthModule,

    //Files and Glosary
    FileModule,
    GlosaryModule,

    /* System Modules */
    AuditLogsModule,
    FilesManagerModule,
    HealthModule,
    MenuItemsModule,
    SettingsnModule,
   
    /*Utils: Excel importer - Exporter */
    UtilsModule,
    HorasModule,
    ChatModule,
    
    /* Users Module */

    UsersModule,
       
    // ApiConnectionModule,
    
   
    UserSiteModule,
       
    ProyectosModule,
    
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
