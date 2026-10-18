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
      id: 676, nombre: "My First Level", autorId: 1,
      autor: "demo", publicado: true, descargas: 100, version: 1
    },
    {
      id: 2, nombre: "Maze", autorId: 2,
      autor: "Darío", publicado: true, descargas: 42, version: 1
    },
    {
      id: 3, nombre: "Lots of Crates", autorId: 3,
      autor: "Ivo", publicado: true, descargas: 208, version: 1
    },
    {
      id: 4, nombre: "Laser Attack", autorId: 3,
      autor: "Ivo", publicado: true, descargas: 17, version: 1
    },
    {
      id: 5, nombre: "Mirrors", autorId: 4,
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
    JSON.stringify({
      id: demo.usuarioActual.id,
      nombre: demo.usuarioActual.nombre
    })
  );
}

export function cerrarSesion(): void {
  localStorage.removeItem(CLAVE_SESION);
  demo.usuarioActual = null;
}

export function continuarComoInvitado(): void {
  demo.usuarioActual = {
    id: 0,
    nombre: "Guest",
    contrasena: ""
  };

  guardarSesion();
}

function cargarSesion(): void {
  try {
    const textoUsuarios = localStorage.getItem(CLAVE_USUARIOS);

    if (textoUsuarios !== null) {
      const usuariosGuardados = JSON.parse(textoUsuarios);

      if (Array.isArray(usuariosGuardados) && usuariosGuardados.length > 0) {
        let usuariosValidos = true;

        for (const usuario of usuariosGuardados) {
          if (
            usuario === null ||
            typeof usuario !== "object" ||
            !Number.isInteger(usuario.id) ||
            usuario.id < 1 ||
            typeof usuario.nombre !== "string" ||
            usuario.nombre.trim() === "" ||
            typeof usuario.contrasena !== "string"
          ) {
            usuariosValidos = false;
            break;
          }
        }

        if (usuariosValidos) {
          demo.usuarios = usuariosGuardados;
        }
      }
    }
  } catch {}

  try {
    const textoSesion = localStorage.getItem(CLAVE_SESION);

    if (textoSesion === null) {
      return;
    }

    if (textoSesion === "0") {
      continuarComoInvitado();
      return;
    }

    const sesionGuardada = JSON.parse(textoSesion);

    if (
      sesionGuardada === null ||
      typeof sesionGuardada !== "object" ||
      !Number.isInteger(sesionGuardada.id) ||
      sesionGuardada.id < 0 ||
      typeof sesionGuardada.nombre !== "string" ||
      sesionGuardada.nombre.trim() === ""
    ) {
      return;
    }

    let nombre = sesionGuardada.nombre;

    if (sesionGuardada.id === 0) {
      nombre = "Guest";
    }

    demo.usuarioActual = {
      id: sesionGuardada.id,
      nombre: nombre,
      contrasena: ""
    };
  } catch {
    demo.usuarioActual = null;
  }
}

cargarSesion();


// GUEST MODE

const CLAVE_PROGRESO_INVITADO = "LindseysLasersProgresoInvitado";

export function leerProgresoInvitado(archivo: number): boolean[] {
  const progreso: boolean[] = [];

  try {
    const texto = localStorage.getItem(
      CLAVE_PROGRESO_INVITADO + archivo
    );

    if (texto !== null) {
      const guardado = JSON.parse(texto);

      if (Array.isArray(guardado)) {
        for (let i = 0; i < guardado.length; i++) {
          progreso.push(guardado[i] === true);
        }
      }
    }
  } catch {}

  return progreso;
}

export function completarNivelInvitado(
  numero: number,
  archivo: number
): void {
  const progreso = leerProgresoInvitado(archivo);

  for (let i = progreso.length; i <= numero; i++) {
    progreso.push(false);
  }

  progreso[numero] = true;

  localStorage.setItem(
    CLAVE_PROGRESO_INVITADO + archivo,
    JSON.stringify(progreso)
  );
}