import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSite } from 'src/user-site/entities/user-site.entity';
import { JwtPayload } from '../interfaces';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class JwtUserSiteStrategy extends PassportStrategy(Strategy, 'jwt-user-site') {
  constructor(
    @InjectRepository(UserSite)
    private userSiteRepository: Repository<UserSite>,
    configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae el JWT del encabezado Authorization
      secretOrKey:  configService.get('JWT_SECRET'), // Usa tu clave secreta aquí o cárgala desde un entorno seguro
    });
  }

  async validate(payload: JwtPayload): Promise<UserSite> {
    const userSite = await this.userSiteRepository.findOne({ where: { id: payload.id } });
    if (!userSite) {
      throw new Error('Usuario no encontrado');
    }
    return userSite;
  }
}
