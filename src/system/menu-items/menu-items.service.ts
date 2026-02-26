import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArrayContains, DataSource, Repository, Not } from 'typeorm';

import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { UtilsService } from '../../common/utils/utils.service';

import { AuditLogInfo } from '../audit-logs/entities/audit-log-info.entity';

@Injectable()
export class MenuItemsService {
  private readonly logger = new Logger('MenuItemsService');
  public auditLogInfo = new AuditLogInfo();

  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly dataSource: DataSource,
    private readonly utils: UtilsService,
  ) {}

  async create(createDto: CreateMenuItemDto) {
    try {
      const { ...menuItemData } = createDto;

      const menuItem = this.menuItemRepository.create({
        ...menuItemData,
      });

      await this.menuItemRepository.save(menuItem);
      await this.sequencePriorities(menuItem.id, menuItem.priority);

      // Información para auditar la operación
      this.auditLogInfo.idEntity = menuItem.id;
      this.auditLogInfo.previousEntity = '';
      this.auditLogInfo.currentEntity = menuItem;

      return { ...menuItem };
    } catch (error) {
      this.utils.handleDBExceptions(error);
    }
  }

  async delete(id: string) {
    // Información para auditar la operación
    this.auditLogInfo.idEntity = id;
    this.auditLogInfo.previousEntity = await this.findOne(id);
    this.auditLogInfo.currentEntity = '';

    const deleteResponse = await this.menuItemRepository.softDelete(id);
    if (!deleteResponse.affected)
      throw new NotFoundException(`ID: ${id} not found`);

    await this.sequencePriorities(id, null);
  }

  async findAll(paginationDto: PaginationDto) {
    const {
      limit = 20,
      offset = 0,
      searchInput,
      sortField,
      sortOrder,
    } = paginationDto;

    const menuItemsQuery = await this.menuItemRepository
      .createQueryBuilder('menuItems')
      .take(limit)
      .skip(offset);

    if (searchInput) {
      menuItemsQuery.andWhere(`menuItems.label ilike :label`, {
        label: `%${searchInput}%`,
      });
    }
    if (sortField && sortOrder) {
      menuItemsQuery.orderBy(`menuItems.${sortField}`, `${sortOrder}`);
    }

    const menuItems = await menuItemsQuery.getMany();
    const total = await menuItemsQuery.getCount();

    const menuItemsFounded = menuItems.map((menuItem) => ({
      ...menuItem,
    }));

    return { data: menuItemsFounded, totalRows: total };
  }

  async findByRole(role: string, isActive: boolean = true) {
    const menuItems = await this.menuItemRepository.find({
      select: {
        // id: true,
        label: true,
        icon: true,
        routerLink: true,
      },
      where: { roles: ArrayContains([role]), isActive },
      order: { priority: 'ASC', label: 'ASC' },
    });

    return menuItems;
  }

  async findOne(id: string) {
    let menuItem: MenuItem;

    if (isUUID(id)) {
      menuItem = await this.menuItemRepository.findOneBy({ id });
    }

    if (!menuItem) throw new NotFoundException(`ID: ${id} not found`);

    return menuItem;
  }

  private async sequencePriorities(
    idToIgnore: string,
    currentPriority: number = null,
  ) {
    let counter = 1;

    const itemsToUpdate = await this.menuItemRepository.find({
      where: { id: Not(idToIgnore) },
      order: { priority: 'ASC' },
    });

    // Asigna nuevas prioridades
    for (let i = 0; i < itemsToUpdate.length; i++) {
      if (counter == currentPriority) counter++;
      itemsToUpdate[i].priority = counter;
      counter++;
    }

    // Guarda las nuevas prioridades en una sola transacción
    await this.menuItemRepository.save(itemsToUpdate);
  }

  async update(id: string, updateDto: UpdateMenuItemDto) {
    const { ...toUpdate } = updateDto;

    const menuItem = await this.menuItemRepository.preload({ id, ...toUpdate });
    if (!menuItem) throw new NotFoundException(`ID: ${id} not found`);

    // Información para auditar la operación
    this.auditLogInfo.idEntity = id;
    this.auditLogInfo.previousEntity = await this.findOne(id);
    this.auditLogInfo.currentEntity = menuItem;

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(menuItem);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      await this.sequencePriorities(id, menuItem.priority);

      return this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      console.log(error);
      // this.utils.handleDBExceptions(error);
    }
  }
}
