import {
  Controller,
  Get,
  Post,
  Param,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiFile } from './decorators/api-file.decorator';
import { ApiMultipleFiles } from './decorators/api-multiple-files.decorator';

import { Response } from 'express';
import { FilesManagerService } from './files-manager.service';
// import { AwsConfig } from './config';
import { File } from './entities/file.entity';
import { ValidMymeTypes } from './interfaces';

import { AuditLog } from '../../system/audit-logs/decorators/audit-log.decorator';
import { Auth } from './../../auth/decorators';

@ApiTags('System')
@Controller('system/files-manager')
export class FilesManagerController {
  constructor(
    private readonly filesManagerService: FilesManagerService,
    // private readonly awsConfig: AwsConfig
    private readonly configService: ConfigService,
  ) {}

  @Get(':fileName')
  @Auth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The Resource was returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  findFile(@Res() res: Response, @Param('fileName') fileName: string) {
    const path = this.filesManagerService.getStaticFile(fileName);
    res.sendFile(path, { root: '.' });
  }

  @Post('upload')
  // @AuditLog()
  @Auth()
  @ApiBearerAuth()
  @ApiFile(
    'file',
    [...ValidMymeTypes.image, ...ValidMymeTypes.spreadsheet],
    true,
  )
  @ApiResponse({
    status: 201,
    description: 'The File was uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 415, description: 'Unsupported Media Type' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    // console.log("FILE", file);
    if (!file) throw new BadRequestException('Invalid file upload');

    const newFile = new File();
    newFile.fileName = file.filename;
    newFile.originalName = file.originalname;
    newFile.mimeType = file.mimetype;
    newFile.size = file.size;
    newFile.storage = this.configService.get('STORAGE_LOCAL');

    return this.filesManagerService.create(newFile);
  }

  @Post('upload-multiple')
  // @AuditLog()
  @Auth()
  @ApiBearerAuth()
  @ApiMultipleFiles(
    'files',
    [...ValidMymeTypes.image, ...ValidMymeTypes.document],
    2,
    false,
  )
  @ApiResponse({
    status: 201,
    description: 'The Files were uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized Request' })
  @ApiResponse({ status: 415, description: 'Unsupported Media Type' })
  async uploadMultipleFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    return this.filesManagerService.createMultiple(files);
  }
}
