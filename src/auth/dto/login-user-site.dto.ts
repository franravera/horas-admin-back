import { IsEmail, IsString } from "class-validator";

export class LoginUserSiteDto {
    @IsEmail()
    email: string;
  
    @IsString()
    password: string;
  }