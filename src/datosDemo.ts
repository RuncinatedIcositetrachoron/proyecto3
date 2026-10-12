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

const CLAVE_USUARIOS = "LindseysLasersUsuarios";
const CLAVE_SESION = "LindseysLasersSesion";

export function esInvitado(): boolean {
  if (demo.usuarioActual === null) {
    return false;
  }

  return demo.usuarioActual.id === 0;
}

export function guardarSesion(): void {
  if (demo.usuarioActual === null) {
    return;
  }

  if (!esInvitado()) {
    localStorage.setItem(
      CLAVE_USUARIOS,
      JSON.stringify(demo.usuarios)
    );
  }

  localStorage.setItem(
    CLAVE_SESION,
    demo.usuarioActual.id.toString()
  );
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION);
  demo.usuarioActual = null;
}

export function continuarComoInvitado(): void {
  demo.usuarioActual = {
    id: 0,
    nombre: "Invitado",
    contrasena: ""
  };

  guardarSesion();
}

function cargarSesion(): void {
  try {
    const textoUsuarios = localStorage.getItem(CLAVE_USUARIOS);

    if (textoUsuarios !== null) {
      const usuariosGuardados = JSON.parse(textoUsuarios);

      if (!Array.isArray(usuariosGuardados) || usuariosGuardados.length === 0) {
        return;
      }

      for (const usuario of usuariosGuardados) {
        if (
          usuario === null ||
          typeof usuario !== "object" ||
          !Number.isInteger(usuario.id) ||
          usuario.id < 1 ||
          typeof usuario.nombre !== "string" ||
          usuario.nombre.trim() === "" ||
          typeof usuario.contrasena !== "string" ||
          usuario.contrasena === ""
        ) {
          return;
        }
      }

      demo.usuarios = usuariosGuardados;
    }

    const idGuardado = localStorage.getItem(CLAVE_SESION);

    if (idGuardado === null) {
      return;
    }

    if (idGuardado === "0") {
      demo.usuarioActual = {
        id: 0,
        nombre: "Invitado",
        contrasena: ""
      };
      return;
    }

    for (const usuario of demo.usuarios) {
      if (usuario.id.toString() === idGuardado) {
        demo.usuarioActual = usuario;
        return;
      }
    }
  } catch {
    demo.usuarioActual = null;
  }
}

cargarSesion();
