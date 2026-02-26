// crm-base/src/proyectos/proyectos.service.ts

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { ValidRoles } from '../auth/interfaces';

  import { Proyecto } from './entities/proyectos.entity';
  import { ProyectoMiembro, ProyectoRol } from './entities/proyecto-miembro.entity';
  import { User } from '../users/entities/user.entity';
  
import { CreateProyectoDto } from './dto/create-proyecto.dto';
import { AsignarUsuarioDto } from './dto/asignar-usuario.dto';
import { Hora } from 'src/horas/entities/hora.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
  
  @Injectable()
  export class ProyectosService {
    constructor(
      @InjectRepository(Proyecto)
      private readonly proyectoRepo: Repository<Proyecto>,
  
      @InjectRepository(ProyectoMiembro)
      private readonly miembroRepo: Repository<ProyectoMiembro>,
  
      @InjectRepository(User)
      private readonly userRepo: Repository<User>,


    @InjectRepository(Hora) // ✅
    private readonly horaRepo: Repository<Hora>,
  ) {}
    
  
    // =========================================================
    // ✅ ADMIN - Crear proyecto
    // POST /proyectos
    // =========================================================
    async create(dto: CreateProyectoDto): Promise<Proyecto> {
      const proyecto = this.proyectoRepo.create({
        nombre: dto.nombre?.trim(),
        descripcion: dto.descripcion?.trim() ?? null,
        is_active: dto.is_active ?? true,
      });
  
      return this.proyectoRepo.save(proyecto);
    }
  
    // =========================================================
    // ✅ ADMIN - Listar todos los proyectos
    // GET /proyectos
    // =========================================================
    // async findAll(): Promise<Proyecto[]> {
    //   return this.proyectoRepo.find({
    //     where: { deletedAt: null },
    //     order: { createdAt: 'DESC' },
    //   });
    // }


async findAll(params: { userId: string; role: ValidRoles }) {
  const { userId, role } = params;

  if (!role) throw new BadRequestException('role requerido');
  if (role !== ValidRoles.admin && !userId) {
    throw new BadRequestException('userId requerido');
  }

  const qb = this.proyectoRepo
    .createQueryBuilder('p')
    .leftJoin('p.miembros', 'pm', 'pm.is_active = true')
    .leftJoin('pm.user', 'u')
    .where('p.deletedAt IS NULL')
    .select([
      'p.id',
      'p.nombre',
      'p.descripcion',
      'p.is_active',
      'p.createdAt',

      'pm.id',
      'pm.userId',
      'pm.proyectoId',
      'pm.rol',
      'pm.is_active',
      'pm.createdAt',

      'u.id',
      'u.email',
      'u.first_name',
      'u.last_name',
      'u.role',
      'u.is_active',
    ])
    .orderBy('p.createdAt', 'DESC');

  // ✅ user/editor: solo SUS proyectos, y solo ÉL como miembro (no ve compañeros)
  if (role !== ValidRoles.admin) {
    qb.andWhere('pm.userId = :userId', { userId });
  } else {
    // ✅ admin: ve todos los proyectos + todos los miembros
    qb.addOrderBy('u.first_name', 'ASC').addOrderBy('u.last_name', 'ASC');
  }

  return qb.getMany();
}

async findAllPaginated(params: {
  userId: string;
  role: ValidRoles;
  pagination: PaginationDto;
}) {
  const { userId, role, pagination } = params;
  const { limit = 10, offset = 0, searchInput } = pagination || {};

  if (!role) throw new BadRequestException('role requerido');
  if (role !== ValidRoles.admin && !userId) {
    throw new BadRequestException('userId requerido');
  }

  const dataQb = this.proyectoRepo
    .createQueryBuilder('p')
    .leftJoin('p.miembros', 'pmActive', 'pmActive.is_active = true')
    .where('p.deletedAt IS NULL')
    .select([
      'p.id as id',
      'p.nombre as nombre',
      'p.descripcion as descripcion',
      'p.is_active as is_active',
      'p.createdAt as createdAt',
      'COUNT(DISTINCT pmActive.userId) as "miembrosCount"',
    ])
    .groupBy('p.id')
    .orderBy('p.createdAt', 'DESC')
    .take(limit)
    .skip(offset);

  if (searchInput?.trim()) {
    dataQb.andWhere('(p.nombre ILIKE :q OR p.descripcion ILIKE :q)', {
      q: `%${searchInput.trim()}%`,
    });
  }

  if (role !== ValidRoles.admin) {
    dataQb.andWhere(
      `EXISTS (
        SELECT 1
        FROM proyectos_miembros pmOwn
        WHERE pmOwn."proyectoId" = p.id
          AND pmOwn."userId" = :userId
          AND pmOwn."is_active" = true
      )`,
      { userId },
    );
  }

  const countQb = this.proyectoRepo
    .createQueryBuilder('p')
    .where('p.deletedAt IS NULL')
    .select('COUNT(1)', 'totalRows');

  if (searchInput?.trim()) {
    countQb.andWhere('(p.nombre ILIKE :q OR p.descripcion ILIKE :q)', {
      q: `%${searchInput.trim()}%`,
    });
  }

  if (role !== ValidRoles.admin) {
    countQb.andWhere(
      `EXISTS (
        SELECT 1
        FROM proyectos_miembros pmOwn
        WHERE pmOwn."proyectoId" = p.id
          AND pmOwn."userId" = :userId
          AND pmOwn."is_active" = true
      )`,
      { userId },
    );
  }

  const [rows, countRaw] = await Promise.all([
    dataQb.getRawMany<{
      id: string;
      nombre: string;
      descripcion: string | null;
      is_active: boolean;
      createdAt: string;
      miembrosCount: string;
    }>(),
    countQb.getRawOne<{ totalRows: string }>(),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    is_active: r.is_active,
    createdAt: r.createdAt,
    miembrosCount: Number(r.miembrosCount ?? 0),
  }));

  return {
    data,
    totalRows: Number(countRaw?.totalRows ?? 0),
  };
}
    // =========================================================
    // ✅ ADMIN - Obtener detalle de un proyecto
    // GET /proyectos/:id
    // (útil para pantalla detalle + miembros + horas)
    // =========================================================
    async findOne(proyectoId: string): Promise<Proyecto> {
      const proyecto = await this.proyectoRepo.findOne({
        where: { id: proyectoId, deletedAt: null },
      });
  
      if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
  
      return proyecto;
    }
  
    // =========================================================
    // ✅ ADMIN - Actualizar proyecto
    // PATCH /proyectos/:id
    // (lo dejamos por si querés editar nombre/estado)
    // =========================================================
    async update(
      proyectoId: string,
      dto: Partial<CreateProyectoDto>,
    ): Promise<Proyecto> {
      const proyecto = await this.findOne(proyectoId);
  
      if (dto.nombre !== undefined) proyecto.nombre = dto.nombre.trim();
      if (dto.descripcion !== undefined)
        proyecto.descripcion = dto.descripcion?.trim() ?? null;
      if (dto.is_active !== undefined) proyecto.is_active = dto.is_active;
  
      return this.proyectoRepo.save(proyecto);
    }
  
    // =========================================================
    // ✅ ADMIN - Eliminar proyecto (soft delete)
    // DELETE /proyectos/:id
    // =========================================================
    async remove(proyectoId: string): Promise<{ ok: true }> {
      const proyecto = await this.findOne(proyectoId);
      await this.proyectoRepo.softRemove(proyecto);
      return { ok: true };
    }
  
    // =========================================================
    // ✅ ADMIN - Asignar usuario a proyecto (upsert)
    // POST /proyectos/:proyectoId/asignar
    // =========================================================
    async asignarUsuario(
      proyectoId: string,
      dto: AsignarUsuarioDto,
    ): Promise<ProyectoMiembro> {
      const proyecto = await this.proyectoRepo.findOne({
        where: { id: proyectoId, deletedAt: null },
      });
      if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
  
      const user = await this.userRepo.findOne({ where: { id: dto.userId } });
      if (!user) throw new NotFoundException('Usuario no encontrado');
  
      const existente = await this.miembroRepo.findOne({
        where: { userId: dto.userId, proyectoId },
      });
  
      // ✅ Si ya existía, reactivamos/cambiamos rol
      if (existente) {
        existente.rol = dto.rol ?? existente.rol ?? ProyectoRol.DEV;
        existente.is_active = dto.is_active ?? true;
        return this.miembroRepo.save(existente);
      }
  
      const miembro = this.miembroRepo.create({
        userId: dto.userId,
        proyectoId,
        rol: dto.rol ?? ProyectoRol.DEV,
        is_active: dto.is_active ?? true,
      });
  
      try {
        return await this.miembroRepo.save(miembro);
      } catch (e: any) {
        throw new ConflictException('El usuario ya está asignado a este proyecto');
      }
    }
  
    // =========================================================
    // ✅ ADMIN - Desasignar usuario (soft: is_active=false)
    // DELETE /proyectos/:proyectoId/miembros/:userId
    // =========================================================
    async desasignarUsuario(
      proyectoId: string,
      userId: string,
    ): Promise<{ ok: true }> {
      const miembro = await this.miembroRepo.findOne({
        where: { userId, proyectoId },
      });
  
      if (!miembro)
        throw new NotFoundException('El usuario no está asignado a este proyecto');
  
      miembro.is_active = false;
      await this.miembroRepo.save(miembro);
  
      return { ok: true };
    }
  
    // =========================================================
    // ✅ ADMIN - Listar miembros de un proyecto
    // GET /proyectos/:proyectoId/miembros
    // =========================================================
    async getMiembrosByProyecto(proyectoId: string) {
      // valida proyecto existe
      await this.findOne(proyectoId);
  
      const miembros = await this.miembroRepo
        .createQueryBuilder('pm')
        .innerJoin('pm.user', 'u')
        .select([
          'pm.id as id',
          'pm.userId as userId',
          'pm.proyectoId as proyectoId',
          'pm.rol as rol',
          'pm.is_active as is_active',
          'pm.createdAt as assignedAt',
          'u.email as email',
          'u.first_name as first_name',
          'u.last_name as last_name',
          'u.role as systemRole',
        ])
        .where('pm.proyectoId = :proyectoId', { proyectoId })
        .andWhere('pm.is_active = true')
        .orderBy('u.first_name', 'ASC')
        .addOrderBy('u.last_name', 'ASC')
        .getRawMany();
  
      return miembros;
    }
  
    // =========================================================
    // ✅ USER - Mis proyectos
    // GET /proyectos/mis-proyectos
    // =========================================================
    async findMisProyectos(userId: string) {
      const rows = await this.miembroRepo
        .createQueryBuilder('pm')
        .innerJoin('pm.proyecto', 'p')
        .select([
          'p.id as id',
          'p.nombre as nombre',
          'p.descripcion as descripcion',
          'p.is_active as is_active',
          'pm.rol as rol',
        ])
        .where('pm.userId = :userId', { userId })
        .andWhere('pm.is_active = true')
        .andWhere('p.deletedAt IS NULL')
        .orderBy('p.createdAt', 'DESC')
        .getRawMany();
  
      // Si querés devolver rol también, lo podés dejar en el objeto
      return rows.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        is_active: r.is_active,
        rol: r.rol,
      }));
    }
  
    // =========================================================
    // ✅ Helper para HorasService
    // Verifica si el usuario está asignado al proyecto
    // (lo vamos a usar en POST /horas)
    // =========================================================
    async assertUserIsMemberOfProyecto(
      userId: string,
      proyectoId: string,
    ): Promise<void> {
      const miembro = await this.miembroRepo.findOne({
        where: { userId, proyectoId, is_active: true },
      });
  
      if (!miembro) {
        throw new ForbiddenException(
          'No estás asignado a este proyecto (no podés cargar horas)',
        );
      }
    }
  
    // =========================================================
    // ✅ Helper opcional
    // Devuelve true/false si es miembro
    // =========================================================
    async isUserMemberOfProyecto(userId: string, proyectoId: string): Promise<boolean> {
      const miembro = await this.miembroRepo.findOne({
        where: { userId, proyectoId, is_active: true },
      });
      return !!miembro;
    }
  
    // =========================================================
    // ✅ Helper opcional
    // Reglas básicas de input
    // =========================================================
    validateProyectoId(proyectoId: string) {
      if (!proyectoId) throw new BadRequestException('proyectoId requerido');
    }





      async getDashboardResumen(params: {
    desde: string;
    hasta: string;
    proyectoId?: string;
    userId?: string;
  }) {
    const { desde, hasta, proyectoId, userId } = params;

    if (!desde || !hasta) {
      throw new BadRequestException('desde y hasta son requeridos (YYYY-MM-DD)');
    }

    // Validación UUID simple (para query params)
    const isUuid = (v?: string) =>
      !v || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

    if (!isUuid(proyectoId)) throw new BadRequestException('proyectoId inválido');
    if (!isUuid(userId)) throw new BadRequestException('userId inválido');

    // días en rango inclusive (para promedioHorasPorDia)
    const parseDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
    const d1 = parseDate(desde);
    const d2 = parseDate(hasta);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
      throw new BadRequestException('Formato inválido. Usá YYYY-MM-DD');
    }
    if (d2 < d1) throw new BadRequestException('hasta no puede ser menor que desde');

    const msPerDay = 24 * 60 * 60 * 1000;
    const diasRango = Math.floor((d2.getTime() - d1.getTime()) / msPerDay) + 1;

    // -----------------------------
    // Query base de horas filtradas
    // -----------------------------
    const qb = this.horaRepo
      .createQueryBuilder('h')
      .where('h.fecha >= :desde', { desde })
      .andWhere('h.fecha <= :hasta', { hasta });

    if (proyectoId) qb.andWhere('h.proyectoId = :proyectoId', { proyectoId });
    if (userId) qb.andWhere('h.userId = :userId', { userId });

    // minutosTotales + usuariosActivos + proyectosActivos + diasConCarga
    const raw = await qb
      .select('COALESCE(SUM(h.minutos), 0)', 'minutosTotales')
      .addSelect('COUNT(DISTINCT h.userId)', 'usuariosActivos')
      .addSelect('COUNT(DISTINCT h.proyectoId)', 'proyectosActivos')
      .addSelect('COUNT(DISTINCT h.fecha)', 'diasConCarga')
      .getRawOne<{
        minutosTotales: string;
        usuariosActivos: string;
        proyectosActivos: string;
        diasConCarga: string;
      }>();

    const minutosTotales = Number(raw?.minutosTotales ?? 0);
    const horasTotales = Number((minutosTotales / 60).toFixed(2));
    const usuariosActivos = Number(raw?.usuariosActivos ?? 0);
    const proyectosActivos = Number(raw?.proyectosActivos ?? 0);
    const diasConCarga = Number(raw?.diasConCarga ?? 0);

    const promedioHorasPorDia = Number(((minutosTotales / 60) / diasRango).toFixed(2));
    const promedioPorUsuario =
      usuariosActivos > 0 ? Number(((minutosTotales / 60) / usuariosActivos).toFixed(2)) : 0;

    // -----------------------------------------
    // usuariosSinCarga: base depende del filtro
    // -----------------------------------------
    let totalUsuariosBase = 0;

    if (userId) {
      // si filtrás por userId, la base es 1 (o 0 si no existe)
      const exists = await this.userRepo.exist({ where: { id: userId as any } });
      totalUsuariosBase = exists ? 1 : 0;
    } else if (proyectoId) {
      // si filtrás por proyectoId, base = miembros activos del proyecto
      const rawTotal = await this.miembroRepo
        .createQueryBuilder('pm')
        .select('COUNT(DISTINCT pm.userId)', 'total')
        .where('pm.proyectoId = :proyectoId', { proyectoId })
        .andWhere('pm.is_active = true')
        .getRawOne<{ total: string }>();

      totalUsuariosBase = Number(rawTotal?.total ?? 0);
    } else {
      // sin filtros: base = usuarios activos del sistema
      const rawTotal = await this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(1)', 'total')
        .where('u.deletedAt IS NULL')
        .andWhere('u.is_active = true')
        .getRawOne<{ total: string }>();

      totalUsuariosBase = Number(rawTotal?.total ?? 0);
    }

    const usuariosSinCarga = Math.max(totalUsuariosBase - usuariosActivos, 0);

    return {
      desde,
      hasta,
      proyectoId: proyectoId ?? null,
      userId: userId ?? null,

      minutosTotales,
      horasTotales,

      promedioHorasPorDia,

      usuariosActivos,
      proyectosActivos,
      usuariosSinCarga,

      // opcionales:
      diasConCarga,
      promedioPorUsuario,
    };
  }





  // =========================================================
// ✅ DASHBOARD - Conteos globales
// proyectos activos/inactivos + usuarios activos/inactivos
// GET /proyectos/dashboard/estado
// =========================================================
async getDashboardEstado() {
  // Proyectos (soft delete)
  const proyectosRaw = await this.proyectoRepo
    .createQueryBuilder('p')
    .select([
      `SUM(CASE WHEN p.is_active = true THEN 1 ELSE 0 END) as "proyectosActivos"`,
      `SUM(CASE WHEN p.is_active = false THEN 1 ELSE 0 END) as "proyectosInactivos"`,
    ])
    .where('p.deletedAt IS NULL')
    .getRawOne<{
      proyectosActivos: string;
      proyectosInactivos: string;
    }>();

  // Usuarios (soft delete + is_active)
  const usersRaw = await this.userRepo
    .createQueryBuilder('u')
    .select([
      `SUM(CASE WHEN u.is_active = true THEN 1 ELSE 0 END) as "usuariosActivos"`,
      `SUM(CASE WHEN u.is_active = false THEN 1 ELSE 0 END) as "usuariosInactivos"`,
    ])
    .where('u.deletedAt IS NULL')
    .getRawOne<{
      usuariosActivos: string;
      usuariosInactivos: string;
    }>();

  return {
    proyectosActivos: Number(proyectosRaw?.proyectosActivos ?? 0),
    proyectosInactivos: Number(proyectosRaw?.proyectosInactivos ?? 0),
    usuariosActivos: Number(usersRaw?.usuariosActivos ?? 0),
    usuariosInactivos: Number(usersRaw?.usuariosInactivos ?? 0),
  };
}

async getDashboardAnalytics(params: {
  requesterId: string;
  role: ValidRoles;
  desde: string;
  hasta: string;
}) {
  const { requesterId, role, desde, hasta } = params;

  if (!desde || !hasta) {
    throw new BadRequestException('desde y hasta son requeridos (YYYY-MM-DD)');
  }

  const parseDate = (s: string) => new Date(`${s}T00:00:00.000Z`);
  const d1 = parseDate(desde);
  const d2 = parseDate(hasta);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    throw new BadRequestException('Formato inválido. Usá YYYY-MM-DD');
  }
  if (d2 < d1) throw new BadRequestException('hasta no puede ser menor que desde');

  const isAdmin = role === ValidRoles.admin;

  const baseQb = this.horaRepo
    .createQueryBuilder('h')
    .where('h.fecha >= :desde', { desde })
    .andWhere('h.fecha <= :hasta', { hasta });

  if (!isAdmin) {
    baseQb.andWhere('h.userId = :requesterId', { requesterId });
  }

  const rawKpi = await baseQb
    .clone()
    .select('COALESCE(SUM(h.minutos), 0)', 'minutosTotales')
    .addSelect('COUNT(DISTINCT h.proyectoId)', 'proyectosConCarga')
    .addSelect('COUNT(DISTINCT h.userId)', 'usuariosConCarga')
    .addSelect('COUNT(DISTINCT h.fecha)', 'diasConCarga')
    .getRawOne<{
      minutosTotales: string;
      proyectosConCarga: string;
      usuariosConCarga: string;
      diasConCarga: string;
    }>();

  const minutosTotales = Number(rawKpi?.minutosTotales ?? 0);
  const horasTotales = Number((minutosTotales / 60).toFixed(2));
  const proyectosConCarga = Number(rawKpi?.proyectosConCarga ?? 0);
  const usuariosConCarga = Number(rawKpi?.usuariosConCarga ?? 0);
  const diasConCarga = Number(rawKpi?.diasConCarga ?? 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diasRango = Math.floor((d2.getTime() - d1.getTime()) / msPerDay) + 1;
  const promedioHorasPorDia = Number(((minutosTotales / 60) / diasRango).toFixed(2));

  const horasPorDiaRaw = await baseQb
    .clone()
    .select('h.fecha', 'fecha')
    .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
    .groupBy('h.fecha')
    .orderBy('h.fecha', 'ASC')
    .getRawMany<{ fecha: string; minutos: string }>();

  const horasPorDia = horasPorDiaRaw.map((r) => {
    const minutos = Number(r.minutos ?? 0);
    return {
      fecha: r.fecha,
      minutos,
      horas: Number((minutos / 60).toFixed(2)),
    };
  });

  const horasPorProyectoRaw = await baseQb
    .clone()
    .innerJoin(Proyecto, 'p', 'p.id = h.proyectoId AND p.deletedAt IS NULL')
    .select('h.proyectoId', 'proyectoId')
    .addSelect('p.nombre', 'proyectoNombre')
    .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
    .addSelect('COUNT(DISTINCT h.userId)', 'usuarios')
    .groupBy('h.proyectoId')
    .addGroupBy('p.nombre')
    .orderBy('SUM(h.minutos)', 'DESC')
    .getRawMany<{
      proyectoId: string;
      proyectoNombre: string;
      minutos: string;
      usuarios: string;
    }>();

  const horasPorProyecto = horasPorProyectoRaw.map((r) => {
    const minutos = Number(r.minutos ?? 0);
    return {
      proyectoId: r.proyectoId,
      nombre: r.proyectoNombre,
      minutos,
      horas: Number((minutos / 60).toFixed(2)),
      usuarios: Number(r.usuarios ?? 0),
    };
  });

  let horasPorProyectoUsuarios: Array<{
    proyectoId: string;
    proyectoNombre: string;
    userId: string;
    nombre: string;
    email: string;
    minutos: number;
    horas: number;
  }> = [];

  if (isAdmin) {
    const raw = await baseQb
      .clone()
      .innerJoin(Proyecto, 'p', 'p.id = h.proyectoId AND p.deletedAt IS NULL')
      .innerJoin(User, 'u', 'u.id = h.userId')
      .select('h.proyectoId', 'proyectoId')
      .addSelect('p.nombre', 'proyectoNombre')
      .addSelect('h.userId', 'userId')
      .addSelect("TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))", 'nombre')
      .addSelect('u.email', 'email')
      .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
      .groupBy('h.proyectoId')
      .addGroupBy('p.nombre')
      .addGroupBy('h.userId')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name')
      .addGroupBy('u.email')
      .orderBy('p.nombre', 'ASC')
      .addOrderBy('SUM(h.minutos)', 'DESC')
      .getRawMany<{
        proyectoId: string;
        proyectoNombre: string;
        userId: string;
        nombre: string;
        email: string;
        minutos: string;
      }>();

    horasPorProyectoUsuarios = raw.map((r) => {
      const minutos = Number(r.minutos ?? 0);
      return {
        proyectoId: r.proyectoId,
        proyectoNombre: r.proyectoNombre,
        userId: r.userId,
        nombre: r.nombre || r.email,
        email: r.email,
        minutos,
        horas: Number((minutos / 60).toFixed(2)),
      };
    });
  }

  let horasPorUsuario: Array<{
    userId: string;
    nombre: string;
    email: string;
    minutos: number;
    horas: number;
    proyectos: number;
  }> = [];

  if (isAdmin) {
    const raw = await baseQb
      .clone()
      .innerJoin(User, 'u', 'u.id = h.userId')
      .select('h.userId', 'userId')
      .addSelect("TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, ''))", 'nombre')
      .addSelect('u.email', 'email')
      .addSelect('COALESCE(SUM(h.minutos), 0)', 'minutos')
      .addSelect('COUNT(DISTINCT h.proyectoId)', 'proyectos')
      .groupBy('h.userId')
      .addGroupBy('u.first_name')
      .addGroupBy('u.last_name')
      .addGroupBy('u.email')
      .orderBy('SUM(h.minutos)', 'DESC')
      .getRawMany<{
        userId: string;
        nombre: string;
        email: string;
        minutos: string;
        proyectos: string;
      }>();

    horasPorUsuario = raw.map((r) => {
      const minutos = Number(r.minutos ?? 0);
      return {
        userId: r.userId,
        nombre: r.nombre || r.email,
        email: r.email,
        minutos,
        horas: Number((minutos / 60).toFixed(2)),
        proyectos: Number(r.proyectos ?? 0),
      };
    });
  }

  return {
    scope: isAdmin ? 'admin' : 'user',
    desde,
    hasta,
    kpis: {
      minutosTotales,
      horasTotales,
      promedioHorasPorDia,
      diasConCarga,
      proyectosConCarga,
      usuariosConCarga,
    },
    horasPorDia,
    horasPorProyecto,
    horasPorUsuario,
    horasPorProyectoUsuarios,
  };
}
  }
