import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { Response } from 'express';
import { FilesManagerService } from '../system/files-manager/files-manager.service';
// import { AwsConfig } from './config';


@ApiTags('File')
@Controller('file')
export class FileController {

  constructor(
    private readonly filesManagerService: FilesManagerService,
    // private readonly awsConfig: AwsConfig
    private readonly configService: ConfigService 
  ) {}


  @Get(':fileName')
  @ApiResponse({ status: 200, description: 'The Resource was returned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  findFile(
    @Res() res: Response,
    @Param('fileName') fileName: string
  ) {

    const path = this.filesManagerService.getStaticFile( fileName );
    res.sendFile( path, { root: '.' } );

  }

}
