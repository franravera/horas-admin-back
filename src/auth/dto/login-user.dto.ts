import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';


export class LoginUserDto {

    @ApiProperty({
        example: 'franrav2@gmail.com',

        nullable: false,
    })
    @IsString()
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'H...', 
        nullable: false,
        minLength: 6,
        maxLength: 50,
        description: 'The password must have a Uppercase, lowercase letter and a number',
    })
    @IsString()
    @MinLength(6)
    @MaxLength(50)
    password: string;

}