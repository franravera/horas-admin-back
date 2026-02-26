import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { UtilsService } from '../common/utils/utils.service';

import { MenuItem } from '../system/menu-items/entities/menu-item.entity';
import { MenuItemsService } from '../system/menu-items/menu-items.service';
import { AuditLogsService } from 'src/system/audit-logs/audit-logs.service';
import { AuditLogsModule } from 'src/system/audit-logs/audit-logs.module';
import { UsersModule } from 'src/users/users.module';
import { UserSite } from 'src/user-site/entities/user-site.entity';
import { JwtUserSiteStrategy } from './strategies/jwt-user-site.strategy';


@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtUserSiteStrategy,
    MenuItemsService,
    UsersService,
    UtilsService,
    
  ],
  imports: [
    ConfigModule,
    
    TypeOrmModule.forFeature([MenuItem, User, UserSite  ]),
    forwardRef(() => UsersModule), // ✅ Usamos forwardRef para evitar la dependencia circular
    forwardRef(() => AuditLogsModule), // ✅ También aquí

    PassportModule.register({ defaultStrategy: 'jwt' }),
 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          signOptions: {
            expiresIn: '6h',
          },
        };
      },
    }),
  ],
  exports: [TypeOrmModule, JwtStrategy,JwtUserSiteStrategy ,PassportModule, JwtModule],
})
export class AuthModule {}
