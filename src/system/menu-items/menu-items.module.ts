import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';

import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { MenuItem } from './entities/menu-item.entity';

import { UtilsService } from '../../common/utils/utils.service';

@Module({
  controllers: [MenuItemsController],
  providers: [MenuItemsService, UtilsService],
  imports: [
    TypeOrmModule.forFeature([ MenuItem ]),
    AuthModule,
  ],
  exports: [
    MenuItemsService,
    TypeOrmModule,
  ]
})
export class MenuItemsModule {}
