import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FilesManagerService } from '../system/files-manager/files-manager.service';
import { FileController } from './file.controller';

import { File } from '../system/files-manager/entities/file.entity';
import { UtilsService } from '../common/utils/utils.service';

@Module({
  controllers: [FileController],
  providers: [FilesManagerService, UtilsService],
  imports: [
    TypeOrmModule.forFeature([ File ]),
    ConfigModule
  ],
  exports: [
    FilesManagerService,
    TypeOrmModule,
  ]
})
export class FileModule {}


