import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';

import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Settings } from './entities/settings.entity';

import { UtilsService } from '../../common/utils/utils.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, UtilsService],
  imports: [
    TypeOrmModule.forFeature([ Settings ]),
    AuthModule,
  ],
  exports: [
    SettingsService,
    TypeOrmModule,
  ]
})
export class SettingsnModule {}

