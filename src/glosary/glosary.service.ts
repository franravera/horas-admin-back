import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateGlosaryDto } from './dto/create-glosary.dto';
import { UpdateGlosaryDto } from './dto/update-glosary.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Glosary } from './entities/glosary.entity';
import { Repository } from 'typeorm';
import { UtilsService } from 'src/common/utils/utils.service';

import { GlosaryTypes } from './entities/glosary-types.entity';
import { AuditLogInfo } from 'src/system/audit-logs/entities/audit-log-info.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { GlosaryPaginationDto } from './interfaces/glosary-pagination.dto';

@Injectable()
export class GlosaryService {
  public auditLogInfo = new AuditLogInfo();
  constructor(
    @InjectRepository(Glosary)
    private readonly glosaryRepository: Repository<Glosary>,

    @InjectRepository(GlosaryTypes)
    private readonly glosaryTypesRepository: Repository<GlosaryTypes>,

    private readonly utilsService: UtilsService,
  ) {}

  async create(createGlosaryDto: CreateGlosaryDto) {
    try {
      const { glosaryTypeId, categoryId, topicId, ...glosaryData } =
        createGlosaryDto;

      const glosaryType = await this.glosaryTypesRepository.findOneBy({
        id: glosaryTypeId,
      });

      const glosary = await this.glosaryRepository.create({
        ...glosaryData,
      });

      if (categoryId) {
        const category = await this.glosaryRepository.findOneBy({
          id: categoryId,
        });
        glosary.category = category;
      }

      if (topicId) {
        const topic = await this.glosaryRepository.findOneBy({ id: topicId });
        glosary.topic = topic;
      }

      glosary.glosaryType = glosaryType;

      console.log(glosary);

      await this.glosaryRepository.save(glosary);

      // Información para auditar la operación
      this.auditLogInfo.idEntity = glosary.id;
      this.auditLogInfo.previousEntity = '';
      this.auditLogInfo.currentEntity = glosary;

      return glosary;
    } catch (error) {
      this.utilsService.handleDBExceptions(error);
    }
  }

  async findAll(glosaryPaginationDto: GlosaryPaginationDto) {
    const { limit, offset, searchInput, sortField, sortOrder, glosaryTypeId } =
      glosaryPaginationDto;

    const glosaryQuery = await this.glosaryRepository
      .createQueryBuilder('glosary')
      .take(limit)
      .skip(offset)
      .leftJoinAndSelect(
        'glosary.topic',
        'topic',
        'glosary.topicId IS NOT NULL',
      )
      .leftJoinAndSelect(
        'glosary.category',
        'cat',
        'glosary.categoryId IS NOT NULL',
      );

    if (glosaryTypeId) {
      glosaryQuery.andWhere(`glosary.glosaryType like :glosaryType`, {
        glosaryType: glosaryTypeId,
      });
    }

    if (searchInput) {
      glosaryQuery.where(`glosary.name ilike :name`, {
        name: `%${searchInput}%`,
      });
    }
    if (sortField && sortOrder) {
      glosaryQuery.orderBy(`glosary.${sortField}`, `${sortOrder}`);
    }

    const glosaries = await glosaryQuery.getMany();
    const total = await glosaryQuery.getCount();

    const glosariesFounded = glosaries.map((glosary) => ({
      ...glosary,
    }));

    return { data: glosariesFounded, totalRows: total };
  }

  async findOneById(id: string) {
    const founded = await this.glosaryRepository.findOneBy({ id });
    if (!founded) throw new NotFoundException(`ID: ${id} not found`);
    return founded;
  }

  async update(id: string, updateGlosaryDto: UpdateGlosaryDto) {
    try {
      const glosary = await this.glosaryRepository.preload({
        id: id,
        ...updateGlosaryDto,
      });
      if (!glosary) throw new NotFoundException(`ID: ${id} not found`);

      // Información para auditar la operación
      this.auditLogInfo.idEntity = id;
      this.auditLogInfo.previousEntity = await this.findOneById(id);
      this.auditLogInfo.currentEntity = glosary;

      await this.glosaryRepository.save(glosary);
    } catch (error) {
      this.utilsService.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const founded = await this.findOneById(id);
    if (!founded) throw new NotFoundException(`ID: ${id} not found`);

    // Información para auditar la operación
    this.auditLogInfo.idEntity = id;
    this.auditLogInfo.previousEntity = founded;
    this.auditLogInfo.currentEntity = '';

    return await this.glosaryRepository.softDelete(founded.id);
  }
}
