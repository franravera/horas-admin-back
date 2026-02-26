import {
    IsString,
    IsOptional,
    IsBoolean,
    IsEmail,
    IsUUID,
    IsArray,
    ArrayNotEmpty,
    IsNotEmpty,
  } from 'class-validator';
  
  export class CreateUserSiteDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;
  
    @IsString()
    @IsNotEmpty()
    apellido: string;
  
    @IsOptional()
    @IsString()
    telefono?: string;
  
    @IsOptional()
    @IsString()
    celular?: string;
  
    @IsEmail()
    @IsNotEmpty()
    email: string;
  
    @IsOptional()
    @IsString()
    direccion?: string;
  
    @IsOptional()
    @IsString()
    provincia?: string;
  
    @IsOptional()
    @IsString()
    localidad?: string;
  
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    departamentos?: string[];
  
    @IsBoolean()
    esPropietario: boolean;
  
    @IsString()
    @IsNotEmpty()
    password: string;
  }
  
