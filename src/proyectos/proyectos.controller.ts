// crm-base/src/proyectos/proyectos.controller.ts

import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    ParseUUIDPipe,
    Query,
  } from '@nestjs/common';
  import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
  
  import { ProyectosService } from './proyectos.service';
  import { CreateProyectoDto } from './dto/create-proyecto.dto';
  import { AsignarUsuarioDto } from './dto/asignar-usuario.dto';
  
  import { Auth } from '../auth/decorators/auth.decorator';
  import { ValidRoles } from '../auth/interfaces';
  import { PaginationDto } from '../common/dtos/pagination.dto';
  
  @ApiTags('proyectos')
  @ApiBearerAuth()
  @Controller('proyectos')
  export class ProyectosController {
    constructor(private readonly proyectosService: ProyectosService) {}
  
    // =========================================================
    // ✅ USER/ADMIN - Mis proyectos
    // GET /proyectos/mis-proyectos
    // 👉 IMPORTANTE: esta ruta debe ir ANTES de rutas dinámicas
    // =========================================================
    @Get('mis-proyectos')
    @Auth()
    misProyectos(@Req() req: any) {
      const userId = req.user.id;
      return this.proyectosService.findMisProyectos(userId);
    }
  
    // =========================================================
    // ✅ ADMIN - Crear proyecto
    // POST /proyectos
    // =========================================================
    @Post()
    @Auth(ValidRoles.admin)
    create(@Body() dto: CreateProyectoDto) {
      return this.proyectosService.create(dto);
    }
  
    // =========================================================
    // ✅ ADMIN - Listar todos los proyectos
    // GET /proyectos
    // =========================================================
    @Get()
@Auth()
findAll(@Req() req: any) {
  return this.proyectosService.findAll({
    userId: req.user.id,
    role: req.user.role,
  });
}

@Get('paginated')
@Auth()
findAllPaginated(@Req() req: any, @Query() paginationDto: PaginationDto) {
  return this.proyectosService.findAllPaginated({
    userId: req.user.id,
    role: req.user.role,
    pagination: paginationDto,
  });
}
  
    // =========================================================
    // ✅ ADMIN - Obtener detalle de un proyecto
    // GET /proyectos/by-id/:proyectoId
    // =========================================================
    @Get('by-id/:proyectoId')
    @Auth(ValidRoles.admin)
    findOne(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
      return this.proyectosService.findOne(proyectoId);
    }
  
    // =========================================================
    // ✅ ADMIN - Actualizar proyecto
    // PATCH /proyectos/by-id/:proyectoId
    // =========================================================
    @Patch('by-id/:proyectoId')
    @Auth(ValidRoles.admin)
    update(
      @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
      @Body() dto: Partial<CreateProyectoDto>,
    ) {
      return this.proyectosService.update(proyectoId, dto);
    }
  
    // =========================================================
    // ✅ ADMIN - Eliminar proyecto (soft delete)
    // DELETE /proyectos/by-id/:proyectoId
    // =========================================================
    @Delete('by-id/:proyectoId')
    @Auth(ValidRoles.admin)
    remove(@Param('proyectoId', ParseUUIDPipe) proyectoId: string) {
      return this.proyectosService.remove(proyectoId);
    }
  
    // =========================================================
    // ✅ ADMIN - Asignar usuario a proyecto
    // POST /proyectos/:proyectoId/asignar
    // =========================================================
    @Post(':proyectoId/asignar')
    @Auth(ValidRoles.admin)
    asignarUsuario(
      @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
      @Body() dto: AsignarUsuarioDto,
    ) {
      return this.proyectosService.asignarUsuario(proyectoId, dto);
    }
  
    // =========================================================
    // ✅ ADMIN - Listar miembros de un proyecto
    // GET /proyectos/:proyectoId/miembros
    // =========================================================
    @Get(':proyectoId/miembros')
    @Auth(ValidRoles.admin)
    getMiembrosByProyecto(
      @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
    ) {
      return this.proyectosService.getMiembrosByProyecto(proyectoId);
    }
  
    // =========================================================
    // ✅ ADMIN - Desasignar usuario (soft: is_active=false)
    // DELETE /proyectos/:proyectoId/miembros/:userId
    // =========================================================
    @Delete(':proyectoId/miembros/:userId')
    @Auth(ValidRoles.admin)
    desasignarUsuario(
      @Param('proyectoId', ParseUUIDPipe) proyectoId: string,
      @Param('userId', ParseUUIDPipe) userId: string,
    ) {
      return this.proyectosService.desasignarUsuario(proyectoId, userId);
    }


    // =========================================================
// ✅ ADMIN - Dashboard Resumen KPIs
// GET /proyectos/dashboard/resumen?desde&hasta&proyectoId?&userId?
// =========================================================
@Get('dashboard/resumen')
@Auth(ValidRoles.admin)
dashboardResumen(
  @Query('desde') desde: string,
  @Query('hasta') hasta: string,
  @Query('proyectoId') proyectoId?: string,
  @Query('userId') userId?: string,
) {
  return this.proyectosService.getDashboardResumen({
    desde,
    hasta,
    proyectoId,
    userId,
  });
}

// GET /proyectos/dashboard/estado
@Get('dashboard/estado')
@Auth(ValidRoles.admin) // si querés solo admin
getDashboardEstado() {
  return this.proyectosService.getDashboardEstado();
}

// =========================================================
// ✅ DASHBOARD - Analytics por rol
// GET /proyectos/dashboard/analytics?desde&hasta
// admin: global | user/editor: propios datos
// =========================================================
@Get('dashboard/analytics')
@Auth()
getDashboardAnalytics(
  @Req() req: any,
  @Query('desde') desde: string,
  @Query('hasta') hasta: string,
) {
  return this.proyectosService.getDashboardAnalytics({
    requesterId: req.user.id,
    role: req.user.role,
    desde,
    hasta,
  });
}
  }
