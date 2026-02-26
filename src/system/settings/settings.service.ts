import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Settings } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

import { UtilsService } from '../../common/utils/utils.service';

import { AuditLogInfo } from '../audit-logs/entities/audit-log-info.entity';

@Injectable()
export class SettingsService {

  private readonly idEntity = 18;
  private readonly logger = new Logger('SettingsService');
  public auditLogInfo = new AuditLogInfo();

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
    private readonly dataSource: DataSource,
    private readonly utils: UtilsService,
  ) {}


  async getInfo() {
    const id = this.idEntity;
    let settings: Settings;
    settings = await this.settingsRepository.findOneBy({ id });

    if ( !settings ) throw new NotFoundException(`ID: ${ id } not found`);

    delete settings.id;
    delete settings.updatedAt;
    
    return settings;
  }


  async update( updateDto: UpdateSettingsDto ) {
    const id = this.idEntity;
    const { ...toUpdate } = updateDto;

    const settings = await this.settingsRepository.preload({ id, ...toUpdate });
    if ( !settings ) throw new NotFoundException(`ID: ${ id } not found`);

     // Información para auditar la operación
     this.auditLogInfo.idEntity = id;
     this.auditLogInfo.previousEntity = await this.getInfo();
    //  this.auditLogInfo.currentEntity = settings;

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      await queryRunner.manager.save( settings );
      await queryRunner.commitTransaction();
      await queryRunner.release();

      // Información para auditar la operación
      delete settings.id;
      delete settings.updatedAt;
      this.auditLogInfo.currentEntity = settings;
      
      return settings;
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.utils.handleDBExceptions(error);
    }
  }
  
}
