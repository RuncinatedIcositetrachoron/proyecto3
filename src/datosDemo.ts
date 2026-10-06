import type { Nivel } from "./niveles";

export type Usuario = {
  id: number;
  nombre: string;
  contrasena: string;
};

export type NivelDemo = {
  id: number;
  nombre: string;
  autorId: number;
  autor: string;
  publicado: boolean;
  descargas: number;
  version: number;
};

export type DescargaDemo = {
  usuarioId: number;
  nivelId: number;
  nombre: string;
  autor: string;
  version: number;
  completado: boolean;
};

export const demo: {
  usuarios: Usuario[];
  usuarioActual: Usuario | null;
  niveles: NivelDemo[];
  nivelesCreados: Nivel[];
  descargas: DescargaDemo[];
} = {
  usuarios: [{ id: 1, nombre: "demo", contrasena: "1234" }],
  usuarioActual: null,

  niveles: [
    {
      id: 676, nombre: "Mi primer nivel", autorId: 1,
      autor: "demo", publicado: true, descargas: 100, version: 1
    },
    {
      id: 2, nombre: "Laberinto", autorId: 2,
      autor: "Darío", publicado: true, descargas: 42, version: 1
    },
    {
      id: 3, nombre: "Muchas cajas", autorId: 3,
      autor: "Ivo", publicado: true, descargas: 208, version: 1
    },
    {
      id: 4, nombre: "Ataque láser", autorId: 3,
      autor: "Ivo", publicado: true, descargas: 17, version: 1
    },
    {
      id: 5, nombre: "Espejos", autorId: 4,
      autor: "Bruno Fiszelew", publicado: true, descargas: 9, version: 1
    }
  ],
  nivelesCreados: [],
  descargas: []
};
