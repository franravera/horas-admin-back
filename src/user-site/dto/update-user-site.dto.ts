import { PartialType } from '@nestjs/swagger';
import { CreateUserSiteDto } from './create-user-site.dto';

export class UpdateUserSiteDto extends PartialType(CreateUserSiteDto) {}
