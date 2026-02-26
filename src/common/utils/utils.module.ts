import { Module } from '@nestjs/common';

import { UtilsService } from './utils.service';
import { ExcelImporterModule } from './excel-importer/excel-importer.module';

@Module({
  providers: [UtilsService],
  exports: [UtilsService],
  imports: [ExcelImporterModule],
})
export class UtilsModule {}
