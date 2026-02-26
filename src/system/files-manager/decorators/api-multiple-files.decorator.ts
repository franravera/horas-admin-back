import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

export function ApiMultipleFiles(
  fieldName = 'files',
  _allowedMimeTypes: string[] = [],
  maxCount = 10,
  required = true,
) {
  const uploadsPath = process.env.FILES_UPLOADS || './static/uploads';
  const absoluteUploadsPath = join(process.cwd(), uploadsPath);
  if (!existsSync(absoluteUploadsPath)) {
    mkdirSync(absoluteUploadsPath, { recursive: true });
  }

  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(fieldName, maxCount, {
        storage: diskStorage({
          destination: absoluteUploadsPath,
          filename: (_req, file, cb) => {
            const cleanBase = file.originalname
              .replace(extname(file.originalname), '')
              .replace(/[^a-zA-Z0-9_-]/g, '_')
              .slice(0, 80);
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${cleanBase || 'file'}-${unique}${extname(file.originalname)}`);
          },
        }),
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: required ? [fieldName] : [],
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    }),
  );
}
