  import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Readable } from 'stream';
  import { DataSource, Repository } from 'typeorm';
  import * as ExcelJS from 'exceljs';
  
  import { Hora } from './entities/hora.entity';
  import { CreateHoraDto } from './dto/create-hora.dto';
  import { UpdateHoraDto } from './dto/update-hora.dto';
  
  import { ProyectosService } from '../proyectos/proyectos.service';
  import { User, UserTeam } from '../users/entities/user.entity';
  import { Proyecto } from '../proyectos/entities/proyectos.entity';
  
  type Role = 'admin' | 'editor' | 'user';
  
  @Injectable()
  export class HorasService {
    constructor(
      @InjectRepository(Hora)
      private readonly horaRepo: Repository<Hora>,
      @InjectRepository(User)
      private readonly userRepo: Repository<User>,
      @InjectRepository(Proyecto)
      private readonly proyectoRepo: Repository<Proyecto>,
  
      private readonly proyectosService: ProyectosService,
      private readonly configService: ConfigService,
      private readonly dataSource: DataSource,
    ) {}
  
    // =========================================================
    // POST /horas (USER)
    // =========================================================
    async create(
      requesterId: string,
      requesterRole: Role,
      dto: CreateHoraDto,
    ) {
      const targetUserId =
        requesterRole === 'admin' && dto.userId ? dto.userId : requesterId;

      // ✅ valida que el user esté asignado al proyecto
      await this.proyectosService.assertUserIsMemberOfProyecto(
        targetUserId,
        dto.proyectoId,
      );
  
      const hora = this.horaRepo.create({
        userId: targetUserId,
        proyectoId: dto.proyectoId,
        fecha: dto.fecha,
        minutos: dto.minutos,
        descripcion: dto.descripcion?.trim() ?? null,
      });
  
      try {
        return await this.horaRepo.save(hora);
      } catch (e: any) {
        // si tenés UNIQUE(userId, proyectoId, fecha) puede fallar acá
        throw new ConflictException(
          'Ya existe una carga para ese día en ese proyecto (si querés varias, sacamos el UNIQUE)',
        );
      }
    }
  
    // =========================================================
    // GET /horas/mis-horas?desde&hasta (USER)
    // =========================================================
    async findMisHoras(
      requesterId: string,
      requesterRole: Role,
      desde?: string,
      hasta?: string,
      userId?: string,
    ) {
      const targetUserId = requesterRole === 'admin' ? userId : requesterId;

      const qb = this.horaRepo
        .createQueryBuilder('h')
        .where('h.userId = :targetUserId', { targetUserId })
        .orderBy('h.fecha', 'DESC')
        .addOrderBy('h.createdAt', 'DESC');
  
      if (desde) qb.andWhere('h.fecha >= :desde', { desde });
      if (hasta) qb.andWhere('h.fecha <= :hasta', { hasta });
  
      return qb.getMany();
    }
  
    // =========================================================
    // PATCH /horas/:id (USER: solo propias | ADMIN: cualquiera)
    // =========================================================
    async update(
      horaId: string,
      requesterId: string,
      requesterRole: Role,
      dto: UpdateHoraDto,
    ) {
      const hora = await this.horaRepo.findOne({ where: { id: horaId } });
      if (!hora) throw new NotFoundException('Hora no encontrada');
  
      // ✅ permisos
      if (requesterRole !== 'admin' && hora.userId !== requesterId) {
        throw new ForbiddenException('No podés editar horas de otro usuario');
      }
  
      // ✅ si cambian proyecto, validar membership del dueño (hora.userId)
      const nextProyectoId = dto.proyectoId ?? hora.proyectoId;
      if (dto.proyectoId && dto.proyectoId !== hora.proyectoId) {
        await this.proyectosService.assertUserIsMemberOfProyecto(
          hora.userId,
          nextProyectoId,
        );
      }
  
      if (dto.proyectoId !== undefined) hora.proyectoId = dto.proyectoId;
      if (dto.fecha !== undefined) hora.fecha = dto.fecha;
      if (dto.minutos !== undefined) hora.minutos = dto.minutos;
      if (dto.descripcion !== undefined)
        hora.descripcion = dto.descripcion?.trim() ?? null;
  
      try {
        return await this.horaRepo.save(hora);
      } catch (e: any) {
        // si mantenés UNIQUE(userId, proyectoId, fecha) esto puede chocar al editar fecha/proyecto
        throw new ConflictException(
          'Conflicto: ya existe una carga para ese día en ese proyecto',
        );
      }
    }
  
    // =========================================================
    // DELETE /horas/:id (USER: solo propias | ADMIN: cualquiera)
    // =========================================================
    async remove(horaId: string, requesterId: string, requesterRole: Role) {
      const hora = await this.horaRepo.findOne({ where: { id: horaId } });
      if (!hora) throw new NotFoundException('Hora no encontrada');
  
      if (requesterRole !== 'admin' && hora.userId !== requesterId) {
        throw new ForbiddenException('No podés borrar horas de otro usuario');
      }
  
      await this.horaRepo.remove(hora);
      return { ok: true, userId: hora.userId };
    }

    private getRequiredHoursPerDay() {
      const raw = Number(this.configService.get<string>('HORAS_REQUIRED_HOURS_PER_DAY') ?? '8');
      return Number.isFinite(raw) && raw > 0 ? raw : 8;
    }

    private getTargetMinutes() {
      return this.getRequiredHoursPerDay() * 60;
    }

    private startOfDay(date: Date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    private toYmd(date: Date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
    }

    private toUtcYmd(date: Date) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        '0',
      )}-${String(date.getUTCDate()).padStart(2, '0')}`;
    }

    private parseYmd(value: string) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    private normalizeDateKey(value: string | Date) {
      if (value instanceof Date) {
        return this.toYmd(value);
      }

      return String(value).slice(0, 10);
    }

    private getCurrentWeekRange(referenceDate = new Date()) {
      const today = this.startOfDay(referenceDate);
      const jsDay = today.getDay(); // 0 dom ... 6 sab
      const monday = new Date(today);
      const deltaToMonday = jsDay === 0 ? -6 : 1 - jsDay;
      monday.setDate(today.getDate() + deltaToMonday);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      return {
        today,
        jsDay,
        monday,
        friday,
        desde: this.toYmd(monday),
        hasta: this.toYmd(jsDay >= 5 ? friday : today),
      };
    }

    private getPreviousWeekRange(referenceDate = new Date()) {
      const { monday } = this.getCurrentWeekRange(referenceDate);
      const previousMonday = new Date(monday);
      previousMonday.setDate(monday.getDate() - 7);

      const previousFriday = new Date(previousMonday);
      previousFriday.setDate(previousMonday.getDate() + 4);

      return {
        desde: this.toYmd(previousMonday),
        hasta: this.toYmd(previousFriday),
      };
    }

    async getMissingHoursForRange(userId: string, desde: string, hasta: string) {
      const rows = await this.horaRepo
        .createQueryBuilder('h')
        .select('h.fecha', 'fecha')
        .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
        .where('h.userId = :userId', { userId })
        .andWhere('h.fecha >= :desde', { desde })
        .andWhere('h.fecha <= :hasta', { hasta })
        .groupBy('h.fecha')
        .orderBy('h.fecha', 'ASC')
      .getRawMany<{ fecha: string | Date; minutos: string }>();

      const byDate = new Map<string, number>();
      rows.forEach((r) =>
        byDate.set(this.normalizeDateKey(r.fecha), Number(r.minutos ?? 0)),
      );

      const targetMinutes = this.getTargetMinutes();
      const missing: Array<{ fecha: string; faltanHoras: number }> = [];
      const cursor = this.parseYmd(desde);
      const end = this.parseYmd(hasta);

      while (cursor <= end) {
        const wd = cursor.getDay();
        if (wd >= 1 && wd <= 5) {
          const dateKey = this.toYmd(cursor);
          const done = byDate.get(dateKey) ?? 0;
          if (done < targetMinutes) {
            missing.push({
              fecha: dateKey,
              faltanHoras: Number(((targetMinutes - done) / 60).toFixed(2)),
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      return missing;
    }

    async getMisNotificaciones(requesterId: string, _requesterRole: Role) {
      const { jsDay, desde, hasta } = this.getCurrentWeekRange();
      const missing = await this.getMissingHoursForRange(requesterId, desde, hasta);

      const notifications: Array<{
        id: string;
        type: 'warning' | 'info';
        title: string;
        message: string;
      }> = [];

      if (missing.length > 0) {
        const missingDates = missing.map((m) => m.fecha).join(', ');
        notifications.push({
          id: `pending-week-${desde}-${hasta}`,
          type: 'warning',
          title: 'Horas pendientes',
          message:
            jsDay >= 5
              ? `Tenés días pendientes de completar esta semana: ${missingDates}.`
              : `Te faltan completar horas en: ${missingDates}.`,
        });
      } else {
        notifications.push({
          id: `ok-week-${desde}-${hasta}`,
          type: 'info',
          title: 'Semana al día',
          message: 'No tenés horas pendientes en los días hábiles de esta semana.',
        });
      }

      return {
        desde,
        hasta,
        requiredHoursPerDay: this.getRequiredHoursPerDay(),
        total: notifications.length,
        notifications,
      };
    }

    async getPreviousWeekPendingSummary(userId: string, referenceDate = new Date()) {
      const { desde, hasta } = this.getPreviousWeekRange(referenceDate);
      const missing = await this.getMissingHoursForRange(userId, desde, hasta);

      return {
        desde,
        hasta,
        requiredHoursPerDay: this.getRequiredHoursPerDay(),
        missing,
      };
    }

    private normalizeProjectName(value: string) {
      return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    private normalizeProjectExactName(value: string) {
      return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    private normalizeHeader(value: unknown) {
      return this.normalizeProjectName(String(value ?? ''));
    }

    private toExcelDateYmd(value: unknown): string | null {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return this.toUtcYmd(value);
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const asDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        return this.toUtcYmd(asDate);
      }

      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return null;
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          return raw.slice(0, 10);
        }

        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          return this.toUtcYmd(parsed);
        }
      }

      return null;
    }

    private parseHoursNumber(value: unknown): number | null {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 0 ? value : null;
      }

      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
      }

      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw || raw === '-') return null;
        const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
        if (hhmm) {
          const hours = Number(hhmm[1]);
          const minutes = Number(hhmm[2]);
          if (minutes >= 0 && minutes <= 59) {
            return hours + minutes / 60;
          }
          return null;
        }
        const normalized = raw.replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      }

      return null;
    }

    private parseTimeHours(value: unknown): number | null {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.getHours() + value.getMinutes() / 60 + value.getSeconds() / 3600;
      }
      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw || raw === '-') return null;
        const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
        if (hhmm) {
          return Number(hhmm[1]) + Number(hhmm[2]) / 60;
        }
        const normalized = raw.replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    }

    private formatMinutesAsClock(totalMinutes: number): string {
      const safeMinutes = Math.max(0, Math.round(totalMinutes));
      const hours = Math.floor(safeMinutes / 60);
      const minutes = safeMinutes % 60;
      return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

    private splitProjectCandidates(value: unknown): string[] {
      const raw = String(value ?? '')
        .replace(/\r?\n/g, ' ')
        .trim();

      if (!raw) return [];

      return raw
        .split(/\s*\/\/\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    async importHorasFromExcel(params: {
      requesterId: string;
      requesterRole: Role;
      userEmail: string;
      filePath?: string;
      fileBuffer?: Buffer;
    }) {
      const { requesterRole, userEmail, filePath, fileBuffer } = params;

      if (requesterRole !== 'admin') {
        throw new ForbiddenException('Solo un admin puede importar horas por Excel.');
      }

      const email = userEmail.trim().toLowerCase();
      if (!email) {
        throw new BadRequestException('email es requerido');
      }

      const user = await this.userRepo
        .createQueryBuilder('u')
        .where('LOWER(u.email) = :email', { email })
        .andWhere('u.deletedAt IS NULL')
        .getOne();

      if (!user) {
        throw new NotFoundException(`No existe un usuario con email ${userEmail}.`);
      }

      const assignedProjects = await this.proyectoRepo
        .createQueryBuilder('p')
        .innerJoin('p.miembros', 'pm', 'pm.userId = :userId AND pm.is_active = true', {
          userId: user.id,
        })
        .where('p.deletedAt IS NULL')
        .select(['p.id as id', 'p.nombre as nombre'])
        .getRawMany<{ id: string; nombre: string }>();

      if (assignedProjects.length === 0) {
        throw new BadRequestException(
          `El usuario ${user.email} no tiene proyectos activos asignados para imputar horas.`,
        );
      }

      const projectByExactName = new Map<string, Array<{ id: string; nombre: string }>>();
      const projectByNormalizedName = new Map<string, Array<{ id: string; nombre: string }>>();
      for (const project of assignedProjects) {
        const exactKey = this.normalizeProjectExactName(project.nombre);
        const normalizedKey = this.normalizeProjectName(project.nombre);

        projectByExactName.set(exactKey, [
          ...(projectByExactName.get(exactKey) ?? []),
          project,
        ]);

        projectByNormalizedName.set(normalizedKey, [
          ...(projectByNormalizedName.get(normalizedKey) ?? []),
          project,
        ]);
      }

      const workbook = new ExcelJS.Workbook();
      if (fileBuffer?.length) {
        await workbook.xlsx.read(Readable.from(fileBuffer));
      } else if (filePath) {
        await workbook.xlsx.readFile(filePath);
      } else {
        throw new BadRequestException('No se pudo leer el archivo Excel enviado.');
      }

      if (workbook.worksheets.length === 0) {
        throw new BadRequestException('El Excel no contiene hojas para importar.');
      }

      const pendingRows: Array<{
        fecha: string;
        proyectoId: string;
        proyectoNombre: string;
        minutos: number;
        descripcion?: string | null;
      }> = [];
      const ignoredRows: Array<{ sheet: string; row: number; reason: string }> = [];
      const errors: Array<{ sheet: string; row: number; reason: string }> = [];
      let importedSourceRows = 0;

      for (const sheet of workbook.worksheets) {
        if (sheet.rowCount < 2) continue;

        const headerRow = sheet.getRow(1);
        const headers = Array.from({ length: headerRow.actualCellCount }, (_, idx) =>
          this.normalizeHeader(headerRow.getCell(idx + 1).value),
        );

        const fechaIndex = headers.findIndex((h) => h === 'fecha') + 1;
        const proyectoIndex = headers.findIndex((h) => h === 'proyecto') + 1;
        const tareaIndex = headers.findIndex((h) => h === 'tarea') + 1;
        const totalHorasIndex =
          headers.findIndex((h) => h === 'total de horas' || h === 'horas') + 1;
        const horaInicioIndex = headers.findIndex((h) => h === 'hora inicio') + 1;
        const horaFinIndex = headers.findIndex((h) => h === 'hora de fin') + 1;

        if (!fechaIndex || !proyectoIndex || (!totalHorasIndex && !(horaInicioIndex && horaFinIndex))) {
          errors.push({
            sheet: sheet.name,
            row: 1,
            reason:
              'La hoja no tiene una estructura soportada. Debe incluir Fecha, Proyecto y Horas/Total de horas.',
          });
          continue;
        }

        for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
          const row = sheet.getRow(rowNumber);
          const rawFecha = row.getCell(fechaIndex).value;
          const rawProyecto = row.getCell(proyectoIndex).value;
          const rawTarea = tareaIndex ? row.getCell(tareaIndex).value : null;
          const rawTotalHoras = totalHorasIndex ? row.getCell(totalHorasIndex).value : null;
          const rawInicio = horaInicioIndex ? row.getCell(horaInicioIndex).value : null;
          const rawFin = horaFinIndex ? row.getCell(horaFinIndex).value : null;

          const firstCellText = String(rawFecha ?? '').trim().toLowerCase();
          const projectCellText = String(rawProyecto ?? '').trim().toLowerCase();
          const isCompletelyEmpty =
            row.actualCellCount === 0 &&
            !rawFecha &&
            !rawProyecto &&
            !rawTarea &&
            !rawTotalHoras &&
            !rawInicio &&
            !rawFin;

          if (isCompletelyEmpty) {
            continue;
          }

          if (
            firstCellText.startsWith('total ') ||
            projectCellText === 'feriado'
          ) {
            ignoredRows.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: 'Fila de resumen/feriado ignorada.',
            });
            continue;
          }

          const fecha = this.toExcelDateYmd(rawFecha);
          if (!fecha) {
            errors.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: `Fecha inválida: ${String(rawFecha ?? '')}`,
            });
            continue;
          }

          let horas = this.parseHoursNumber(rawTotalHoras);
          if (!horas && horaInicioIndex && horaFinIndex) {
            const start = this.parseTimeHours(rawInicio);
            const end = this.parseTimeHours(rawFin);
            if (start !== null && end !== null && end > start) {
              horas = end - start;
            }
          }

          if (!horas || horas <= 0) {
            ignoredRows.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: 'Fila sin horas positivas para importar.',
            });
            continue;
          }

          const projectCandidates = this.splitProjectCandidates(rawProyecto);
          if (projectCandidates.length === 0) {
            errors.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: 'La fila no tiene proyecto.',
            });
            continue;
          }

          const matchedProjects: Array<{ id: string; nombre: string }> = [];
          const notFoundProjects: string[] = [];
          const ambiguousProjects: Array<{ source: string; matches: string[] }> = [];

          for (const candidate of projectCandidates) {
            const exactCandidate = this.normalizeProjectExactName(candidate);
            const normalizedCandidate = this.normalizeProjectName(candidate);

            const exactMatches = projectByExactName.get(exactCandidate) ?? [];
            if (exactMatches.length === 1) {
              const matched = exactMatches[0];
              if (!matchedProjects.some((project) => project.id === matched.id)) {
                matchedProjects.push(matched);
              }
              continue;
            }

            const normalizedMatches = projectByNormalizedName.get(normalizedCandidate) ?? [];
            if (normalizedMatches.length === 1) {
              const matched = normalizedMatches[0];
              if (!matchedProjects.some((project) => project.id === matched.id)) {
                matchedProjects.push(matched);
              }
              continue;
            }

            if (exactMatches.length > 1 || normalizedMatches.length > 1) {
              const matches = (exactMatches.length > 1 ? exactMatches : normalizedMatches).map(
                (project) => project.nombre,
              );
              ambiguousProjects.push({
                source: candidate,
                matches,
              });
              continue;
            }

            if (normalizedMatches.length === 0) {
              notFoundProjects.push(candidate);
              continue;
            }
          }

          if (ambiguousProjects.length > 0) {
            errors.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: `Proyecto ambiguo en Excel: ${ambiguousProjects
                .map((item) => `${item.source} → ${item.matches.join(' / ')}`)
                .join('; ')}`,
            });
            continue;
          }

          if (notFoundProjects.length > 0 || matchedProjects.length === 0) {
            errors.push({
              sheet: sheet.name,
              row: rowNumber,
              reason: `No se encontró proyecto asignado al usuario para: ${notFoundProjects.join(', ') || String(rawProyecto)}`,
            });
            continue;
          }

          const totalMinutes = Math.max(1, Math.round(horas * 60));
          const baseMinutes = Math.floor(totalMinutes / matchedProjects.length);
          let remainder = totalMinutes % matchedProjects.length;
          const descripcion = String(rawTarea ?? '').trim() || null;

          matchedProjects.forEach((project) => {
            const minutesForProject = baseMinutes + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder -= 1;

            pendingRows.push({
              fecha,
              proyectoId: project.id,
              proyectoNombre: project.nombre,
              minutos: minutesForProject,
              descripcion,
            });
          });
          importedSourceRows += 1;
        }
      }

      if (errors.length > 0) {
        throw new BadRequestException({
          message: 'El Excel tiene filas que no se pudieron procesar. No se importó ninguna hora.',
          allProcessed: false,
          ignoredRows,
          errors,
        });
      }

      if (pendingRows.length === 0) {
        throw new BadRequestException({
          message: 'No se encontraron filas válidas para importar.',
          allProcessed: false,
          ignoredRows,
          errors: [],
        });
      }

      const groupedByProject = new Map<
        string,
        { proyectoId: string; proyectoNombre: string; minutosCargados: number; registrosCreados: number }
      >();

      pendingRows.forEach((entry) => {
        const current = groupedByProject.get(entry.proyectoId) ?? {
          proyectoId: entry.proyectoId,
          proyectoNombre: entry.proyectoNombre,
          minutosCargados: 0,
          registrosCreados: 0,
        };
        current.minutosCargados += entry.minutos;
        current.registrosCreados += 1;
        groupedByProject.set(entry.proyectoId, current);
      });

      await this.dataSource.transaction(async (manager) => {
        const entities = pendingRows.map((row) =>
          manager.create(Hora, {
            userId: user.id,
            proyectoId: row.proyectoId,
            fecha: row.fecha,
            minutos: row.minutos,
            descripcion: row.descripcion,
          }),
        );
        await manager.save(Hora, entities);
      });

      const proyectos = Array.from(groupedByProject.values())
        .map((project) => ({
          ...project,
          horasCargadas: Number((project.minutosCargados / 60).toFixed(2)),
        }))
        .sort((a, b) => a.proyectoNombre.localeCompare(b.proyectoNombre, 'es', { sensitivity: 'base' }));

      return {
        userId: user.id,
        userEmail: user.email,
        allProcessed: true,
        sheetsProcessed: workbook.worksheets.length,
        importedSourceRows,
        createdEntries: pendingRows.length,
        ignoredRows,
        proyectos,
      };
    }

  async exportHorasExcel(params: {
      requesterId: string;
      requesterRole: Role;
      desde: string;
      hasta: string;
      userId?: string;
      equipo?: UserTeam;
      theme?: 'light' | 'dark';
    }) {
      const {
        requesterId,
        requesterRole,
        desde,
        hasta,
        userId,
        equipo,
        theme: requestedTheme,
      } = params;

      if (!desde || !hasta) {
        throw new BadRequestException('desde y hasta son requeridos (YYYY-MM-DD)');
      }
      if (hasta < desde) {
        throw new BadRequestException('hasta no puede ser menor que desde');
      }
      if (equipo && !Object.values(UserTeam).includes(equipo)) {
        throw new BadRequestException('equipo inválido');
      }

      const targetUserId = requesterRole === 'admin' ? userId : requesterId;
      const allowedUsers =
        requesterRole === 'admin' && equipo
          ? await this.userRepo
              .createQueryBuilder('u')
              .select([
                'u.id as id',
                'u.email as email',
                'u.first_name as first_name',
                'u.last_name as last_name',
                'u.equipo as equipo',
              ])
              .where('u.deletedAt IS NULL')
              .andWhere('u.equipo = :equipo', { equipo })
              .orderBy('u.first_name', 'ASC')
              .addOrderBy('u.last_name', 'ASC')
              .getRawMany<{
                id: string;
                email: string;
                first_name: string | null;
                last_name: string | null;
                equipo: UserTeam | null;
              }>()
          : null;

      const allowedUserIds = allowedUsers?.map((u) => u.id) ?? null;

      const qb = this.horaRepo
        .createQueryBuilder('h')
        .innerJoin('h.user', 'u')
        .innerJoin('h.proyecto', 'p')
        .select([
          'h.id as id',
          'h.fecha as fecha',
          'h.minutos as minutos',
          'h.descripcion as descripcion',
          'h.userId as "userId"',
          'u.email as "email"',
          'u.first_name as "first_name"',
          'u.last_name as "last_name"',
          'u.equipo as "equipo"',
          'p.id as "proyectoId"',
          'p.nombre as "proyectoNombre"',
        ])
        .where('h.fecha >= :desde', { desde })
        .andWhere('h.fecha <= :hasta', { hasta })
        .orderBy('u.first_name', 'ASC')
        .addOrderBy('u.last_name', 'ASC')
        .addOrderBy('h.fecha', 'ASC');

      if (requesterRole !== 'admin' || targetUserId) {
        qb.andWhere('h.userId = :targetUserId', { targetUserId });
      }
      if (requesterRole === 'admin' && equipo) {
        if (!allowedUserIds?.length) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('h.userId IN (:...allowedUserIds)', { allowedUserIds });
        }
      }

      const rows = await qb.getRawMany<{
        id: string;
        fecha: string;
        minutos: number;
        descripcion: string | null;
        userId: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        equipo: UserTeam | null;
        proyectoId: string;
        proyectoNombre: string;
      }>();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'HORAS';
      workbook.created = new Date();
      workbook.properties.date1904 = true;

      const isDarkTheme = requestedTheme === 'dark';
      const theme = isDarkTheme
        ? {
            titleBg: 'FF1F2937',
            titleFg: 'FFFFFFFF',
            sectionBg: 'FF374151',
            headerBg: 'FF4B5563',
            headerFg: 'FFFFFFFF',
            border: 'FF9CA3AF',
            text: 'FF111827',
            muted: 'FF4B5563',
            totalBg: 'FFE5E7EB',
          }
        : {
            titleBg: 'FF111827',
            titleFg: 'FFFFFFFF',
            sectionBg: 'FFF3F4F6',
            headerBg: 'FFE5E7EB',
            headerFg: 'FF111827',
            border: 'FFD1D5DB',
            text: 'FF111827',
            muted: 'FF6B7280',
            totalBg: 'FFF3F4F6',
          };

      const baseBorder = {
        top: { style: 'thin' as const, color: { argb: theme.border } },
        left: { style: 'thin' as const, color: { argb: theme.border } },
        bottom: { style: 'thin' as const, color: { argb: theme.border } },
        right: { style: 'thin' as const, color: { argb: theme.border } },
      };

      const styleTableRow = (row: ExcelJS.Row) => {
        row.eachCell((cell) => {
          cell.border = baseBorder;
          cell.alignment = {
            vertical: 'top',
            horizontal: 'left',
            wrapText: true,
          };
          cell.font = { color: { argb: theme.text }, size: 11 };
        });
      };

      const styleHeaderRow = (row: ExcelJS.Row) => {
        row.eachCell((cell) => {
          cell.border = baseBorder;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: theme.headerBg },
          };
          cell.font = { bold: true, color: { argb: theme.headerFg }, size: 11 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true,
          };
        });
        row.height = 24;
      };

      const summary = workbook.addWorksheet('Resumen General');
      summary.mergeCells('A1:B1');
      summary.getCell('A1').value = 'Resumen General de Horas';
      summary.getCell('A1').font = { bold: true, size: 14, color: { argb: theme.titleFg } };
      summary.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.titleBg },
      };
      summary.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
      summary.getRow(1).height = 24;

      summary.mergeCells('A2:B2');
      summary.getCell('A2').value = `Rango: ${desde} a ${hasta}`;
      summary.getCell('A2').font = { italic: true, color: { argb: theme.muted } };
      summary.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' };
      if (equipo) {
        summary.mergeCells('A3:B3');
        summary.getCell('A3').value = `Equipo: ${equipo}`;
        summary.getCell('A3').font = { italic: true, color: { argb: theme.muted } };
        summary.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' };
      }
      summary.addRow([]);

      const allUsers =
        requesterRole === 'admin' && !targetUserId
          ? allowedUsers ??
            (await this.userRepo
              .createQueryBuilder('u')
              .select([
                'u.id as id',
                'u.email as email',
                'u.first_name as first_name',
                'u.last_name as last_name',
                'u.equipo as equipo',
              ])
              .where('u.deletedAt IS NULL')
              .orderBy('u.first_name', 'ASC')
              .addOrderBy('u.last_name', 'ASC')
              .getRawMany<{
                id: string;
                email: string;
                first_name: string | null;
                last_name: string | null;
                equipo: UserTeam | null;
              }>())
          : [];

      const byUser = new Map<string, typeof rows>();
      rows.forEach((r) => {
        const arr = byUser.get(r.userId) ?? [];
        arr.push(r);
        byUser.set(r.userId, arr);
      });

      if (requesterRole === 'admin' && !targetUserId) {
        allUsers.forEach((u) => {
          if (!byUser.has(u.id)) {
            byUser.set(u.id, []);
          }
        });
      }

      const safeSheet = (name: string) =>
        name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Usuario';

      const totalsByProjectGlobal = new Map<string, number>();
      const totalsByUserGlobal = new Map<string, { name: string; minutes: number }>();

      byUser.forEach((userRows, currentUserId) => {
        const u =
          userRows[0] ||
          allUsers.find((x) => x.id === currentUserId) || {
            userId: currentUserId,
            email: 'sin-email',
            first_name: '',
            last_name: '',
            equipo: null,
          };
        const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;
        const ws = workbook.addWorksheet(safeSheet(fullName));

        ws.mergeCells('A1:D1');
        ws.getCell('A1').value = `Planilla de horas - ${fullName}`;
        ws.getCell('A1').font = { bold: true, size: 14, color: { argb: theme.titleFg } };
        ws.getCell('A1').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: theme.titleBg },
        };
        ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getRow(1).height = 24;

        ws.mergeCells('A2:D2');
        ws.getCell('A2').value = `Email: ${u.email}`;
        ws.getCell('A2').font = { italic: true, color: { argb: theme.muted } };

        ws.mergeCells('A3:D3');
        ws.getCell('A3').value = `Rango: ${desde} a ${hasta}`;
        ws.getCell('A3').font = { italic: true, color: { argb: theme.muted } };
        if (u.equipo) {
          ws.mergeCells('A4:D4');
          ws.getCell('A4').value = `Equipo: ${u.equipo}`;
          ws.getCell('A4').font = { italic: true, color: { argb: theme.muted } };
        }
        ws.addRow([]);

        const headerRow = ws.addRow(['Fecha', 'Proyecto', 'Descripcion / Tarea', 'Horas']);
        styleHeaderRow(headerRow);

        let totalMinutesUser = 0;
        const totalsByProject = new Map<string, number>();

        if (userRows.length === 0) {
          ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`);
          const noData = ws.addRow(['Sin cargas en el rango']);
          noData.font = { italic: true, color: { argb: theme.muted } };
        } else {
          userRows.forEach((r) => {
            const minutes = Number(r.minutos);
            const hours = this.formatMinutesAsClock(minutes);
            totalMinutesUser += minutes;
            totalsByProject.set(
              r.proyectoNombre,
              (totalsByProject.get(r.proyectoNombre) ?? 0) + minutes,
            );

            totalsByProjectGlobal.set(
              r.proyectoNombre,
              (totalsByProjectGlobal.get(r.proyectoNombre) ?? 0) + minutes,
            );

            const dataRow = ws.addRow([
              r.fecha,
              r.proyectoNombre,
              r.descripcion ?? '',
              hours,
            ]);
            styleTableRow(dataRow);
            dataRow.height = 30;
          });
        }

        ws.addRow([]);
        ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`);
        const title = ws.addRow(['Resumen por proyecto']);
        title.font = { bold: true, color: { argb: theme.headerFg } };
        title.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: theme.sectionBg },
        };
        title.height = 22;

        const sumHeader = ws.addRow(['Proyecto', 'Horas']);
        styleHeaderRow(sumHeader);
        ws.mergeCells(`B${sumHeader.number}:D${sumHeader.number}`);

        totalsByProject.forEach((mins, project) => {
          const r = ws.addRow([project, this.formatMinutesAsClock(mins)]);
          ws.mergeCells(`B${r.number}:D${r.number}`);
          styleTableRow(r);
        });

        ws.addRow([]);
        const totalRow = ws.addRow([
          'Total general usuario',
          this.formatMinutesAsClock(totalMinutesUser),
        ]);
        ws.mergeCells(`B${totalRow.number}:D${totalRow.number}`);
        styleTableRow(totalRow);
        totalRow.font = { bold: true, color: { argb: theme.text }, size: 11 };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: theme.totalBg },
        };
        totalRow.height = 24;

        totalsByUserGlobal.set(currentUserId, {
          name: fullName,
          minutes: totalMinutesUser,
        });

        ws.columns = [
          { width: 14 },
          { width: 34 },
          { width: 70 },
          { width: 14 },
        ];
        ws.eachRow((row) => {
          if (!row.height) row.height = 22;
          row.eachCell((cell) => {
            if (!cell.alignment) {
              cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            }
          });
        });
      });

      const grandTotalMinutes = Array.from(totalsByUserGlobal.values()).reduce(
        (acc, v) => acc + v.minutes,
        0,
      );

      const k1 = summary.addRow(['Total horas (rango)', this.formatMinutesAsClock(grandTotalMinutes)]);
      const k2 = summary.addRow(['Usuarios considerados', totalsByUserGlobal.size]);
      const k3 = summary.addRow(['Proyectos con carga', totalsByProjectGlobal.size]);
      [k1, k2, k3].forEach((r) => styleTableRow(r));
      summary.addRow([]);

      summary.mergeCells(`A${summary.rowCount + 1}:B${summary.rowCount + 1}`);
      const ph = summary.addRow(['Totales por proyecto']);
      ph.font = { bold: true, color: { argb: theme.headerFg } };
      ph.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.sectionBg },
      };
      ph.height = 22;
      const ph2 = summary.addRow(['Proyecto', 'Horas']);
      styleHeaderRow(ph2);
      totalsByProjectGlobal.forEach((mins, project) => {
        const r = summary.addRow([project, this.formatMinutesAsClock(mins)]);
        styleTableRow(r);
      });

      summary.addRow([]);
      summary.mergeCells(`A${summary.rowCount + 1}:B${summary.rowCount + 1}`);
      const uh = summary.addRow(['Totales por usuario']);
      uh.font = { bold: true, color: { argb: theme.headerFg } };
      uh.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.sectionBg },
      };
      uh.height = 22;
      const uh2 = summary.addRow(['Usuario', 'Horas']);
      styleHeaderRow(uh2);
      totalsByUserGlobal.forEach((u) => {
        const r = summary.addRow([u.name, this.formatMinutesAsClock(u.minutes)]);
        styleTableRow(r);
      });
      summary.columns = [{ width: 52 }, { width: 18 }];
      summary.eachRow((row) => {
        if (!row.height) row.height = 22;
        row.eachCell((cell) => {
          if (!cell.alignment) {
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
          }
        });
      });

      if (rows.length === 0) {
        const ws = workbook.addWorksheet('Sin datos');
        ws.addRow([`No hay cargas entre ${desde} y ${hasta}`]);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const safeTeam = equipo ? `-${equipo.toLowerCase().replace(/\s+/g, '-')}` : '';
      return {
        buffer,
        fileName: `horas-${desde}-${hasta}${safeTeam}.xlsx`,
      };
    }
  }
