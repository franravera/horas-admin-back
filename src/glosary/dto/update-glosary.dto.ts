import { PartialType } from '@nestjs/swagger';
import { CreateGlosaryDto } from './create-glosary.dto';

export class UpdateGlosaryDto extends PartialType(CreateGlosaryDto) {}
