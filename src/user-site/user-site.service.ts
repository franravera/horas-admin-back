import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserSiteDto } from './dto/create-user-site.dto';
import { UpdateUserSiteDto } from './dto/update-user-site.dto';
import { UserSite } from './entities/user-site.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UtilsService } from 'src/common/utils/utils.service';
import { AuditLogInfo } from 'src/system/audit-logs/entities/audit-log-info.entity';

import * as bcrypt from 'bcrypt';
import { isUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { RegisterUserSiteDto } from './dto/register-user-site.dto';

@Injectable()
export class UserSiteService {

    private readonly logger = new Logger('UsersService');
    public auditLogInfo = new AuditLogInfo();
  
    constructor(
      @InjectRepository(UserSite)
      private readonly userRepository: Repository<UserSite>,

      private readonly dataSource: DataSource,
      private readonly utils: UtilsService,
    ) {}

  async create(createDto: CreateUserSiteDto) {
 try {
      const { password, departamentos, ...userData } = createDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });

    
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

  async createRegistro(createDto: RegisterUserSiteDto){

      const { password, codigo, ...userSiteData } = createDto;


        const user = this.userRepository.create({
          ...userSiteData,
          password: bcrypt.hashSync(password, 10),
  
        });

        
        await this.userRepository.save(user);
  
        // Información para auditar la operación
        this.auditLogInfo.idEntity = user.id;
        this.auditLogInfo.previousEntity = '';
        this.auditLogInfo.currentEntity = user;
  
        delete user.password;
        return user;
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
          `user.lastName ilike :lastName OR user.firstName ilike :firstName OR user.email ilike :mail`,
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
      let user: UserSite;
  
      if (isUUID(id)) user = await this.userRepository.findOneBy({ id });
  
      if (!user) throw new NotFoundException(`ID: ${id} not found`);
  
      return user;
    }

  async update(id: string, updateDto: Partial<UpdateUserSiteDto>) {
      console.log(`🛠 Intentando actualizar usuario con ID: ${id}`);
      console.log('📌 Datos de actualización recibidos antes de guardar:', updateDto);
  
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
          throw new NotFoundException(`ID: ${id} not found`);
      }
  
      // Guardar estado anterior del usuario para la auditoría
      this.auditLogInfo.previousEntity = { ...user };
  
      // Actualizar solo los campos proporcionados
      Object.assign(user, updateDto);

      
  
      // **Solo hashear si la nueva contraseña no está encriptada**
      if (updateDto.password && !updateDto.password.startsWith('$2b$10$')) {
          try {
              user.password = await bcrypt.hash(updateDto.password, 10);
              console.log(`🔒 Hash de la contraseña generado correctamente.`);
          } catch (hashError) {
              console.error('❌ Error al generar el hash de la contraseña:', hashError);
              throw new InternalServerErrorException('Error al procesar la contraseña.');
          }
      }
  
      console.log(`🔒 Hash de la contraseña ANTES de guardar: ${user.password}`);
  
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
  
      try {
          await queryRunner.manager.save(user);
          await queryRunner.commitTransaction();
          console.log('✅ Usuario actualizado correctamente:', user);
  
          // Recuperamos el usuario para verificar si el hash es el mismo después de guardar
          const updatedUser = await this.findOne(id);
          console.log(`📌 Hash de la contraseña DESPUÉS de guardar: ${updatedUser.password}`);
  
          // Información para auditar la operación
          this.auditLogInfo.idEntity = user.id;
          this.auditLogInfo.currentEntity = { ...updatedUser };
  
          return updatedUser;
      } catch (error) {
          await queryRunner.rollbackTransaction();
          console.error('❌ Error al actualizar usuario:', error);
          throw new InternalServerErrorException('No se pudo actualizar el usuario.');
      } finally {
          await queryRunner.release();
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

  
}
