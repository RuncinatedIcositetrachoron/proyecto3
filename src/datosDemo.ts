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
  descargas: DescargaDemo[];
} = {
  usuarios: [{ id: 1, nombre: 'demo', contrasena: '1234' }],
  usuarioActual: null,
  niveles: [
    { id: 1, nombre: 'Mi primer nivel', autorId: 1,
      autor: 'demo', publicado: false, descargas: 0, version: 1 },
    { id: 2, nombre: 'Laberinto azul', autorId: 2,
      autor: 'Luna', publicado: true, descargas: 42, version: 1 },
    { id: 3, nombre: 'Cajas cruzadas', autorId: 3,
      autor: 'Nico', publicado: true, descargas: 28, version: 1 },
    { id: 4, nombre: 'Puertas secretas', autorId: 2,
      autor: 'Luna', publicado: true, descargas: 17, version: 1 },
    { id: 5, nombre: 'Paso estrecho', autorId: 4,
      autor: 'Sol', publicado: true, descargas: 9, version: 1 },
  ],
  descargas: [],
};

export function agregarEjemplo(usuario: Usuario): void {
  const id = Math.max(0, ...demo.niveles.map(n => n.id)) + 1;
  demo.niveles.push({
    id, nombre: 'Mi primer nivel', autorId: usuario.id,
    autor: usuario.nombre, publicado: false,
    descargas: 0, version: 1,
  });
}
