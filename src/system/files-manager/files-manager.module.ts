import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../auth/auth.module';

import { FilesManagerService } from './files-manager.service';
import { FilesManagerController } from './files-manager.controller';
import { File } from './entities/file.entity';

import { UtilsService } from '../../common/utils/utils.service';

@Module({
  controllers: [FilesManagerController],
  providers: [FilesManagerService, UtilsService],
  imports: [
    TypeOrmModule.forFeature([ File ]),
    AuthModule,
    ConfigModule
  ],
  exports: [
    FilesManagerService,
    TypeOrmModule,
  ]
})
export class FilesManagerModule {}


