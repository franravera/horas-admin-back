// import { HttpService } from '@nestjs/axios';
// import { Injectable } from '@nestjs/common';
// import { firstValueFrom } from 'rxjs';
// import { CreateZoneDto } from 'src/zones/dto/create-zone.dto';
// import { ZoneResponse } from './interfaces/zones-response.interface';

// @Injectable()
// export class ApiConnectionService {

//     constructor(private readonly httpService: HttpService) {}

//     async autentication(empresa: string){
//         try{
//             const authResponse = await firstValueFrom(
//                 this.httpService.post(`/token?empresa=${empresa}`, {
//                 Email: 'a',
//                 Clave: 'a',
//                 })
//             );

        
//             const token = authResponse.data.token;
//             return token;

//         }catch(error){
//             console.error(error);
//         }
//     }


//     async getClass<T>(token: Promise<string>,pageIndex: number, url): Promise<T>{
//         try{
//             const resolvedToken = await token;
//             const { data } = await firstValueFrom(
//             this.httpService.get<T>(`${url}?pag=${ pageIndex }&tamaño=100`, {
//                 headers: {
//                     Authorization: `Bearer ${resolvedToken}`, 
//                 },
//             })
//             )
//             return data;
//         }catch(error){
//             console.error(error);
//         }
//     }


// }
