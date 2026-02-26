// import { Module } from '@nestjs/common';
// import { ApiConnectionService } from './api-connection.service';
// import { HttpModule } from '@nestjs/axios';

// @Module({
//   imports: [
//     HttpModule.register({
//       baseURL: 'http://servicios.buhlad.local:7200/api',  // URL base de tu API externa
//       timeout: 15000,                      // Configura el tiempo de espera
//       maxRedirects: 5,                    // Configura el número máximo de redirecciones
//     }),
//   ],
//   providers: [ApiConnectionService],
//   exports: [ApiConnectionService],
// })
// export class ApiConnectionModule {}
