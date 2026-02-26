import {
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import generator from 'generate-password-ts';

import { ChangePasswordDto, LoginUserDto, ResetPasswordDto } from './dto';
import { MenuItemsService } from '../system/menu-items/menu-items.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

import { Mailer } from '../common/entities/mailer.entity';
import { AuditLogInfo } from '../system/audit-logs/entities/audit-log-info.entity';
import { join } from 'path';
import { UserSite } from 'src/user-site/entities/user-site.entity';
import { LoginUserSiteDto } from './dto/login-user-site.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');
  public auditLogInfo: AuditLogInfo | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSite)
    private readonly userSiteRepository: Repository<UserSite>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly menuItemsService: MenuItemsService,
    private readonly configService: ConfigService,
  ) {}

  // **1. Validar estado de autenticación**
  async checkAuthStatus(user: User) {
    // Limpia los campos que no quiero que se muestren en la respuesta
    delete user.password;
    delete user.is_active;
    delete user.createdAt;
    delete user.updatedAt;
    delete user.deletedAt;

    // Obtiene los Items del Menú según el Role del usuario
    const menuItems = await this.menuItemsService.findByRole(user.role);

    return {
      ...user,
      access_token: this.getJwtToken({ id: user.id }),
      menuItems,
    };
  }

  checkAuthStatusUserSite(user: UserSite) {
    const payload = { id: user.id }; // o el payload que vos quieras
    const token = this.jwtService.sign(payload);
  
    return {
      user,
      token,
    };
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  // **2. Generar contraseña temporal**
  async generateTemporaryPassword(userId: string): Promise<string> {
    const temporaryPassword = generator.generate({
        length: 8,
        numbers: true,
        symbols: false,
        excludeSimilarCharacters: true,
        strict: true,
    });

    const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    console.log('🛠 Generando contraseña temporal...');
    console.log(`🔑 Contraseña temporal generada: ${temporaryPassword}`);
    console.log(`🔒 Hash almacenado: ${hashedTemporaryPassword}`);

    await this.usersService.update(userId, {
        temporary_password: hashedTemporaryPassword,
        temporary_password_expires_at: expiresAt,
    });

   


    this.logger.debug(`Contraseña temporal almacenada en la base de datos para el usuario ${userId}`);

    return temporaryPassword;
  }

  // **3. Validar contraseña temporal**
  async validateTemporaryPassword(userId: string, password: string): Promise<boolean> {
    const user = await this.usersService.findOne(userId);

    console.log('Usuario recuperado:', user);

    if (!user.temporary_password) {
        console.log('❌ No hay contraseña temporal definida.');
        return false;
    }

    if (!user.temporary_password_expires_at) {
        console.log('❌ No hay fecha de expiración definida.');
        return false;
    }

    if (new Date(user.temporary_password_expires_at) < new Date()) {
        console.log('❌ La contraseña temporal ha expirado.');
        return false;
    }

    console.log('🔑 Comparando contraseña temporal ingresada con la almacenada...');
    const isMatch = await bcrypt.compare(password, user.temporary_password);

    console.log(`✅ Comparación de contraseñas: ${isMatch ? 'Coincide' : 'No coincide'}`);

    return isMatch;
}

  // **4. Login**
  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;

    // Recuperar al usuario junto con sus contraseñas
    const user = await this.userRepository
        .createQueryBuilder('user')
        .addSelect(['user.password', 'user.temporary_password'])
        .where('user.email = :email', { email })
        .getOne();

    if (!user) {
        this.logger.debug('❌ Usuario no encontrado.');
        throw new UnauthorizedException('Usuario no encontrado');
    }

    this.logger.debug(`✅ Usuario recuperado: ${JSON.stringify(user)}`);

    if (!user.is_active) {
        this.logger.debug('❌ El usuario está inactivo.');
        throw new UnauthorizedException('El usuario está inactivo.');
    }

    // Validar contraseña regular (permanente)
    if (user.password) {
      console.log(`🔑 Contraseña ingresada: ${password}`);
      console.log(`🔒 Hash almacenado en BD: ${user.password}`);
  
      const isPasswordMatch = bcrypt.compareSync(password, user.password);
  
      console.log(`✅ Resultado de la comparación: ${isPasswordMatch ? 'Coincide' : 'No coincide'}`);
  
      if (isPasswordMatch) {
          this.logger.debug('🔓 Inicio de sesión exitoso con contraseña permanente.');
  
          // Registro de auditoría
          if (!this.auditLogInfo) {
              this.auditLogInfo = new AuditLogInfo();
          }
  
          this.auditLogInfo.idEntity = user.id;
          this.auditLogInfo.previousEntity = { ...user };
          this.auditLogInfo.currentEntity = { ...user, password: null };
  
          return this.checkAuthStatus(user);
      }
  }
    // Validar contraseña temporal
    const isTemporaryPasswordMatch = await this.validateTemporaryPassword(user.id, password);
    
    if (isTemporaryPasswordMatch) {
        this.logger.debug('🔑 Inicio de sesión exitoso con contraseña temporal.');

        // Registro de auditoría para contraseña temporal
        if (!this.auditLogInfo) {
            this.auditLogInfo = new AuditLogInfo();
        }

        this.auditLogInfo.idEntity = user.id;
        this.auditLogInfo.previousEntity = { ...user };
        this.auditLogInfo.currentEntity = { ...user, password: null };

        return {
            status: 'TEMPORARY_PASSWORD',
            message: 'Debes cambiar tu contraseña temporal.',
            userId: user.id,
        };
    }

    this.logger.debug('❌ Credenciales inválidas.');
    throw new UnauthorizedException('Credenciales inválidas');
}


async loginUserSite(loginUserSiteDto: LoginUserSiteDto) {
  const { email, password } = loginUserSiteDto;

  // Buscás el user del sitio (acá dependerá si tenés otra tabla o el mismo repositorio)
  const user = await this.userSiteRepository
    .createQueryBuilder('userSite')
    .addSelect(['userSite.password']) // importante seleccionar el hash
    .where('userSite.email = :email', { email })
    .getOne();

  if (!user) {
    throw new UnauthorizedException('Usuario no encontrado');
  }

  // if (!user.is_active) {
  //   throw new UnauthorizedException('Usuario inactivo');
  // }

  const isPasswordMatch = bcrypt.compareSync(password, user.password);

  if (!isPasswordMatch) {
    throw new UnauthorizedException('Credenciales inválidas');
  }

   // Registro de auditoría
   if (!this.auditLogInfo) {
    this.auditLogInfo = new AuditLogInfo();
}

  this.auditLogInfo.idEntity = user.id;
  this.auditLogInfo.previousEntity = { ...user };
  this.auditLogInfo.currentEntity = { ...user, password: null };
  // Si todo OK, retornás el JWT
  return this.checkAuthStatusUserSite(user);
}

  // **5. Reset Password**
  async resetPassword(resetPasswordUserDto: ResetPasswordDto) {
    const { email } = resetPasswordUserDto;

    const user = await this.userRepository.findOne({
      select: ['id', 'email', 'is_active'],
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (!user.is_active) throw new UnauthorizedException('El usuario está inactivo.');

    const temporaryPassword = await this.generateTemporaryPassword(user.id); // Generar contraseña temporal

    this.auditLogInfo = new AuditLogInfo();
    this.auditLogInfo.idEntity = user.id;
    this.auditLogInfo.previousEntity = { ...user };
    this.auditLogInfo.currentEntity = { ...user, password: null };

    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1);

    // Generar contenido del correo
    const htmlText = `
      Has solicitado un reinicio de contraseña. Usa la siguiente contraseña temporal para iniciar sesión. 
      <br /><br />
      <strong>
      <span style="color: rgb(88,228,156);">Email:</span> 
      <span style="color: rgb(88,228,156); font-weight: bold;">${email}</span>
  </strong><br />
      <strong>Contraseña temporal:</strong> <span style="color: rgb(255, 0, 0);">${temporaryPassword}</span><br />      <strong>La contraseña temporal expira:</strong> ${expirationTime.toLocaleString()}<br /><br />
      Por favor si pasó este tiempo limite, vuelve a solicitarla.
    `;
    const templatesPath = this.configService.get('FILES_TEMPLATES');

    const filePath = join(process.cwd(), templatesPath, 'mail.html');

    console.log('Ruta del archivo de plantilla:', filePath);
    const htmlContent = readFileSync(filePath, 'utf-8').replace('{{mailContent}}', htmlText);

    await this.mailerService.sendMail({
      from: this.configService.get('SMTP_FROM_ADDRESS'),
      to: email,
      subject: 'Reseteo de Contraseña Temporal',
      html: htmlContent,
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'Contraseña temporal enviada al correo.',
    };
  }

  // **6. Change Password**
  async changePassword(changePasswordDto: ChangePasswordDto) {
    const { userId, newPassword } = changePasswordDto;

    console.log(`🛠 Cambiando contraseña para el usuario: ${userId}`);

    const user = await this.usersService.findOne(userId);
    if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.temporary_password || !user.temporary_password_expires_at) {
        throw new UnauthorizedException('No hay contraseña temporal activa para este usuario');
    }

    if (new Date(user.temporary_password_expires_at) < new Date()) {
        throw new UnauthorizedException('La contraseña temporal ha expirado');
    }

    // 🔍 Verificar si la contraseña ingresada se está procesando correctamente
    console.log(`🛠 Nueva contraseña ingresada: ${newPassword}`);

    // Generar el hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`🔒 Hash generado para la nueva contraseña: ${hashedPassword}`);

    // Actualizar la base de datos con la nueva contraseña
    await this.usersService.update(userId, {
        password: hashedPassword,
        temporary_password: null,
        temporary_password_expires_at: null,
    });

    // Recuperar usuario de nuevo para verificar el hash almacenado
    const userAfterUpdate = await this.usersService.findOne(userId);
    console.log(`📌 Hash almacenado en BD después de actualizar: ${userAfterUpdate.password}`);

    console.log(`✅ Contraseña permanente almacenada correctamente en la base de datos`);

    return {
        statusCode: HttpStatus.OK,
        message: 'Contraseña actualizada correctamente.',
    };
}
}