

export interface ZoneResponse {
    zonas: {
      id: number;
      codigoZona: string;
      nombreZona: string;
    }[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }