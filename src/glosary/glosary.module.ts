import { Module } from '@nestjs/common';
import { GlosaryService } from './glosary.service';
import { GlosaryController } from './glosary.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Glosary } from './entities/glosary.entity';
import { GlosaryTypes } from './entities/glosary-types.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UtilsService } from 'src/common/utils/utils.service';

@Module({
  controllers: [GlosaryController],
  providers: [GlosaryService, UtilsService],
  imports: [TypeOrmModule.forFeature([Glosary, GlosaryTypes]), AuthModule],
  exports: [TypeOrmModule],
})
export class GlosaryModule {}
