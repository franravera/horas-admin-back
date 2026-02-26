import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import * as ExcelJS from 'exceljs';
  
  import { Hora } from './entities/hora.entity';
  import { CreateHoraDto } from './dto/create-hora.dto';
  import { UpdateHoraDto } from './dto/update-hora.dto';
  
  import { ProyectosService } from '../proyectos/proyectos.service';
  import { User } from '../users/entities/user.entity';
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

    async getMisNotificaciones(requesterId: string, _requesterRole: Role) {
      const today = new Date();
      const jsDay = today.getDay(); // 0 dom ... 6 sab
      const monday = new Date(today);
      const deltaToMonday = jsDay === 0 ? -6 : 1 - jsDay;
      monday.setDate(today.getDate() + deltaToMonday);

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const toYmd = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;

      const desde = toYmd(monday);
      const hasta = toYmd(jsDay >= 5 ? friday : today);

      const rows = await this.horaRepo
        .createQueryBuilder('h')
        .select('h.fecha', 'fecha')
        .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
        .where('h.userId = :userId', { userId: requesterId })
        .andWhere('h.fecha >= :desde', { desde })
        .andWhere('h.fecha <= :hasta', { hasta })
        .groupBy('h.fecha')
        .orderBy('h.fecha', 'ASC')
        .getRawMany<{ fecha: string; minutos: string }>();

      const byDate = new Map<string, number>();
      rows.forEach((r) => byDate.set(r.fecha, Number(r.minutos ?? 0)));

      const targetMinutes = 9 * 60;
      const missing: Array<{ fecha: string; faltanHoras: number }> = [];

      const cursor = new Date(monday);
      const end = new Date(hasta + 'T00:00:00.000Z');
      while (cursor <= end) {
        const wd = cursor.getDay();
        if (wd >= 1 && wd <= 5) {
          const dateKey = toYmd(cursor);
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
        total: notifications.length,
        notifications,
      };
    }

  async exportHorasExcel(params: {
      requesterId: string;
      requesterRole: Role;
      desde: string;
      hasta: string;
      userId?: string;
      theme?: 'light' | 'dark';
    }) {
      const { requesterId, requesterRole, desde, hasta, userId, theme: requestedTheme } = params;

      if (!desde || !hasta) {
        throw new BadRequestException('desde y hasta son requeridos (YYYY-MM-DD)');
      }
      if (hasta < desde) {
        throw new BadRequestException('hasta no puede ser menor que desde');
      }

      const targetUserId = requesterRole === 'admin' ? userId : requesterId;

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

      const rows = await qb.getRawMany<{
        id: string;
        fecha: string;
        minutos: number;
        descripcion: string | null;
        userId: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
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
      summary.addRow([]);

      const allUsers =
        requesterRole === 'admin' && !targetUserId
          ? await this.userRepo
              .createQueryBuilder('u')
              .select(['u.id as id', 'u.email as email', 'u.first_name as first_name', 'u.last_name as last_name'])
              .where('u.deletedAt IS NULL')
              .orderBy('u.first_name', 'ASC')
              .addOrderBy('u.last_name', 'ASC')
              .getRawMany<{ id: string; email: string; first_name: string | null; last_name: string | null }>()
          : [];

      const allProjects =
        requesterRole === 'admin' && !targetUserId
          ? await this.proyectoRepo
              .createQueryBuilder('p')
              .select(['p.id as id', 'p.nombre as nombre'])
              .where('p.deletedAt IS NULL')
              .orderBy('p.nombre', 'ASC')
              .getRawMany<{ id: string; nombre: string }>()
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
            const hours = Number((Number(r.minutos) / 60).toFixed(2));
            totalMinutesUser += Number(r.minutos);
            totalsByProject.set(
              r.proyectoNombre,
              (totalsByProject.get(r.proyectoNombre) ?? 0) + Number(r.minutos),
            );

            totalsByProjectGlobal.set(
              r.proyectoNombre,
              (totalsByProjectGlobal.get(r.proyectoNombre) ?? 0) + Number(r.minutos),
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
          const r = ws.addRow([project, Number((mins / 60).toFixed(2))]);
          ws.mergeCells(`B${r.number}:D${r.number}`);
          styleTableRow(r);
        });

        ws.addRow([]);
        const totalRow = ws.addRow([
          'Total general usuario',
          Number((totalMinutesUser / 60).toFixed(2)),
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

      if (requesterRole === 'admin' && !targetUserId) {
        allProjects.forEach((p) => {
          if (!totalsByProjectGlobal.has(p.nombre)) {
            totalsByProjectGlobal.set(p.nombre, 0);
          }
        });
      }

      const k1 = summary.addRow(['Total horas (rango)', Number((grandTotalMinutes / 60).toFixed(2))]);
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
        const r = summary.addRow([project, Number((mins / 60).toFixed(2))]);
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
        const r = summary.addRow([u.name, Number((u.minutes / 60).toFixed(2))]);
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
      return {
        buffer,
        fileName: `horas-${desde}-${hasta}.xlsx`,
      };
    }
  }
