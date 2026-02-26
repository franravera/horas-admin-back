import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { UtilsService } from '../../common/utils/utils.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger('AuditLogsService');

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly utils: UtilsService,
  ) {}

  async create(createDto: CreateAuditLogDto) {
    try {
      const { ...auditLogData } = createDto;

      const auditLog = this.auditLogRepository.create({
        ...auditLogData,
      });

      await this.auditLogRepository.save(auditLog);

      return { ...auditLog };
    } catch (error) {
      this.utils.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const {
      limit = 20,
      offset = 0,
      searchInput,
      sortField,
      sortOrder,
    } = paginationDto;

    const auditLogsQuery = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect('auditLog.user', 'users');

    if (searchInput) {
      auditLogsQuery.andWhere(
        `auditLog.resource ilike :resource OR auditLog.method ilike :method`,
        {
          resource: `%${searchInput}%`,
          method: `%${searchInput}%`,
        },
      );
    }
    if (sortField && sortOrder) {
      auditLogsQuery.orderBy(`auditLog.${sortField}`, `${sortOrder}`);
    }

    const auditLogsInfo = await auditLogsQuery.getMany();
    const total = await auditLogsQuery.getCount();

    console.log(auditLogsInfo);

    const auditLogsFounded = auditLogsInfo.map((auditLog) => ({
      ...auditLog,
    }));

    return { data: auditLogsFounded, totalRows: total };
  }

  async findOne(id: number) {
    let auditLog: AuditLog;
    auditLog = await this.auditLogRepository.findOneBy({ id });

    if (!auditLog) throw new NotFoundException(`ID: ${id} not found`);

    return auditLog;
  }
}
