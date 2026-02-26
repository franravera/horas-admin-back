import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';


export class ResetPasswordDto {

    @ApiProperty({
        nullable: false,
    })
    @IsString()
    @IsEmail()
    email: string;

}