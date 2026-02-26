// src/auth/decorators/auth-user-site.decorator.ts

import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtUserSiteAuthGuard } from '../guards/user-site.guard';

export function AuthUserSite() {
  return applyDecorators(
    UseGuards(JwtUserSiteAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
