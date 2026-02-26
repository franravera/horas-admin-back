import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';
import { AuditLogsService } from '../audit-logs.service';
import { AuditLogInfo } from '../entities/audit-log-info.entity';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLogInterceptor');

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldAudit = this.reflector.getAllAndOverride<boolean>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!shouldAudit) return next.handle();

    const req = context.switchToHttp().getRequest();
    const method = req?.method;
    const resource = req?.originalUrl ?? req?.url;
    const user = req?.user;

    return next.handle().pipe(
      tap({
        next: async () => {
          try {
            const logInfo: AuditLogInfo = req?.auditLogInfo ?? {};

            await this.auditLogsService.create({
              method,
              resource,
              idEntity: String(logInfo?.idEntity ?? ''),
              previousEntity: logInfo?.previousEntity ?? null,
              currentEntity: logInfo?.currentEntity ?? null,
              user: user?.id ? { id: user.id } : undefined,
            });
          } catch (error) {
            this.logger.warn(`Audit log skipped: ${error?.message || error}`);
          }
        },
      }),
    );
  }
}
