import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { File } from './entities/file.entity';
// import { PaginationDto } from '../../common/dtos/pagination.dto';

import { existsSync } from 'fs';
import { join } from 'path';
import { validate as isUUID } from 'uuid';

import { UtilsService } from '../../common/utils/utils.service';

import { AuditLogInfo } from '../audit-logs/entities/audit-log-info.entity';

@Injectable()
export class FilesManagerService {
  private readonly logger = new Logger('FilesManagerService');
  public auditLogInfo = new AuditLogInfo();

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly utils: UtilsService,
  ) {}

  async create(file: File) {
    try {
      const { ...fileData } = file;

      const fileItem = this.fileRepository.create({
        ...fileData,
      });

      await this.fileRepository.save(fileItem);

      // Información para auditar la operación
      this.auditLogInfo.idEntity = fileItem.id;
      this.auditLogInfo.previousEntity = '';
      this.auditLogInfo.currentEntity = fileItem;

      return { ...fileItem };
    } catch (error) {
      this.utils.handleDBExceptions(error);
    }
  }

  async createMultiple(files: Array<Express.Multer.File>) {
    // console.log("FILES", files);
    if (!files.length) throw new BadRequestException('Invalid files upload');

    const uploadedFiles = [];

    for (const file of files) {
      const newFile = new File();
      newFile.fileName = file.filename;
      newFile.originalName = file.originalname;
      newFile.mimeType = file.mimetype;
      newFile.size = file.size;
      newFile.storage = this.configService.get('STORAGE_LOCAL');

      const savedFile = await this.create(newFile);
      uploadedFiles.push(savedFile);
    }

    return uploadedFiles;
  }

  async delete(id: number) {
    // Información para auditar la operación
    this.auditLogInfo.idEntity = id;
    this.auditLogInfo.previousEntity = await this.findOne(id);
    this.auditLogInfo.currentEntity = '';

    const deleteResponse = await this.fileRepository.softDelete(id);
    if (!deleteResponse.affected)
      throw new NotFoundException(`ID: ${id} not found`);
  }

  async findOne(id: number) {
    let file: File;
    if (id) file = await this.fileRepository.findOneBy({ id });
    if (!file) throw new NotFoundException(`ID: ${id} not found`);
    return file;
  }

  async findOneByFileName(fileName: string) {
    let file: File;
    if (fileName) file = await this.fileRepository.findOneBy({ fileName });
    if (!file) throw new NotFoundException(`File '${fileName}' not found`);
    return file;
  }

  getStaticFile(fileName: string) {
    // const path = join( __dirname, this.configService.get('FILES_UPLOADS'), fileName );
    const path = join(this.configService.get('FILES_UPLOADS'), fileName);
    // console.log(path);
    if (!existsSync(path))
      throw new NotFoundException(`File not found: ${fileName}`);

    return path;
  }
}
