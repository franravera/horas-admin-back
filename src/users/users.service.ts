import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { UtilsService } from '../common/utils/utils.service';
import { ValidRoles } from '../auth/interfaces';

import { AuditLogInfo } from '../system/audit-logs/entities/audit-log-info.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');
  public auditLogInfo = new AuditLogInfo();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly utils: UtilsService,
  ) {}

  async create(createDto: CreateUserDto) {
    try {
      const { password, relatedUserIds, ...userData } = createDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });

      if (relatedUserIds && relatedUserIds.length > 0) {
        user.relatedUsers = await this.userRepository.findBy({
          id: In(relatedUserIds),
        });
      }
      await this.userRepository.save(user);

      // Información para auditar la operación
      this.auditLogInfo.idEntity = user.id;
      this.auditLogInfo.previousEntity = '';
      this.auditLogInfo.currentEntity = user;

      delete user.password;
      return user;
    } catch (error) {
      this.utils.handleDBExceptions(error);
    }
  }

  async delete(id: string) {
    // Información para auditar la operación
    this.auditLogInfo.idEntity = id;
    this.auditLogInfo.previousEntity = await this.findOne(id);
    this.auditLogInfo.currentEntity = '';

    const deleteResponse = await this.userRepository.softDelete(id);
    if (!deleteResponse.affected)
      throw new NotFoundException(`ID: ${id} not found`);
  }

  async findAll(paginationDto: PaginationDto) {
    const {
      limit = 20,
      offset = 0,
      searchInput,
      sortField,
      sortOrder,
    } = paginationDto;

    const usersQuery = await this.userRepository
      .createQueryBuilder('user')
      .take(limit)
      .skip(offset);

    if (searchInput) {
      usersQuery.andWhere(
        `user.last_name ilike :lastName OR user.first_name ilike :firstName OR user.email ilike :mail`,
        {
          lastName: `%${searchInput}%`,
          firstName: `%${searchInput}%`,
          mail: `%${searchInput}%`,
        },
      );
    }
    if (sortField && sortOrder) {
      usersQuery.orderBy(`user.${sortField}`, `${sortOrder}`);
    }

    const users = await usersQuery.getMany();
    const total = await usersQuery.getCount();

    const usersFounded = users.map((user) => ({
      ...user,
    }));

    return { data: usersFounded, totalRows: total };
  }

  async findAllNoPagination() {
    const usersQuery = await this.userRepository.createQueryBuilder('users');
    const users = await usersQuery.getMany();
    const count = await usersQuery.getCount();

    return { data: users, totalRows: count };
  }

  async findOne(id: string) {
    let user: User;

    if (isUUID(id)) user = await this.userRepository.findOneBy({ id });

    if (!user) throw new NotFoundException(`ID: ${id} not found`);

    return user;
  }

  async update(
    id: string,
    updateDto: Partial<UpdateUserDto>,
    requesterId: string = id,
    requesterRole: ValidRoles = ValidRoles.admin,
  ) {
    const isAdmin = requesterRole === ValidRoles.admin;
    if (!isAdmin && requesterId !== id) {
      throw new ForbiddenException('No podés editar otro usuario');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
        throw new NotFoundException(`ID: ${id} not found`);
    }

    // Guardar estado anterior del usuario para la auditoría
    this.auditLogInfo.previousEntity = { ...user };

    const safeDto: any = { ...updateDto };
    delete safeDto.email; // email no editable

    // no-admin: no puede tocar campos sensibles
    if (!isAdmin) {
      delete safeDto.role;
      delete safeDto.is_active;
      delete safeDto.temporary_password;
      delete safeDto.temporary_password_expires_at;
      delete safeDto.relatedUserIds;
    }

    Object.assign(user, safeDto);

    // **Solo hashear si la nueva contraseña no está encriptada**
    if (safeDto.password && !safeDto.password.startsWith('$2')) {
        try {
            user.password = await bcrypt.hash(safeDto.password, 10);
        } catch (hashError) {
            throw new InternalServerErrorException('Error al procesar la contraseña.');
        }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        await queryRunner.manager.save(user);
        await queryRunner.commitTransaction();
        const updatedUser = await this.findOne(id);

        // Información para auditar la operación
        this.auditLogInfo.idEntity = user.id;
        this.auditLogInfo.currentEntity = { ...updatedUser };

        return updatedUser;
    } catch (error) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException('No se pudo actualizar el usuario.');
    } finally {
        await queryRunner.release();
    }
}

  async changeOwnPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect(['user.password'])
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException(`ID: ${userId} not found`);

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('La contraseña actual es incorrecta');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { ok: true };
  }

}
