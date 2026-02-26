import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { GetUser, Auth } from './decorators';

import { AuditLog } from '../system/audit-logs/decorators/audit-log.decorator';
import { ChangePasswordDto, LoginUserDto, ResetPasswordDto } from './dto/index';
import { User } from '../users/entities/user.entity';
import { ValidRoles } from './interfaces';
import { LoginUserSiteDto } from './dto/login-user-site.dto';
import { UserSite } from 'src/user-site/entities/user-site.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-status')
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Check Status successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }

  @Get('check-status-user')
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Check Status successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  checkAuthStatusUser(@GetUser() user: UserSite) {
    return this.authService.checkAuthStatusUserSite(user);
  }

  @Post('login')
  @AuditLog()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'User was logging successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: 401,
    description: 'Credentials are not valid or User is inactive',
  })
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('login-site')
  @AuditLog()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'User site logged in successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Credentials are not valid or User is inactive' })
  loginUserSite(@Body() loginUserSiteDto: LoginUserSiteDto) {
    return this.authService.loginUserSite(loginUserSiteDto);
  }

  @Post('reset-password')
  @AuditLog()
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Reset Passwor OK' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({
    status: 401,
    description: 'Credentials are not valid or User is inactive',
  })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('valid-roles')
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Roles were returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  getValidRoles() {
    return ValidRoles;
  }






  @Post('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(changePasswordDto);
  }
  
  /* @Get('private')
  @Auth()
  // @Auth( ValidRoles.admin )
  testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUser() user: User,
    @GetUser('email') userEmail: string,
    
    @RawHeaders() rawHeaders: string[],
    @Headers() headers: IncomingHttpHeaders,
  ) {

    return {
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail,
      rawHeaders,
      headers
    }

  } */
}
