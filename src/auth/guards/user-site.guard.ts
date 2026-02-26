import { AuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtUserSiteAuthGuard extends AuthGuard('jwt-user-site') {}
