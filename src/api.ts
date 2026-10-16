import { editorAApi } from "./parserApi";
import type { ElementoAPI, NivelEditor } from "./parserApi";

const API = "http://localhost:3000";

async function pedir(ruta: string, metodo = "GET", datos?: any): Promise<any> {
  const opciones: RequestInit = { method: metodo };
  if (datos !== undefined) {
    opciones.headers = { "Content-Type": "application/json" };
    opciones.body = JSON.stringify(datos);
  }

  const respuesta = await fetch(API + ruta, opciones);
  const texto = await respuesta.text();
  let resultado: any = null;

  if (texto !== "") {
    try {
      resultado = JSON.parse(texto);
    } catch {
      throw new Error(metodo + " " + ruta + " devolvio HTML o texto en vez de JSON (HTTP " + respuesta.status + ").");
    }
  }

  if (respuesta.ok === false) {
    let mensaje = "Error del servidor";
    if (resultado !== null && typeof resultado.estatus === "string") {
      mensaje = resultado.estatus;
    }
    throw new Error(metodo + " " + ruta + " (HTTP " + respuesta.status + "): " + mensaje);
  }
  return resultado;
}

export type NivelBackend = {
  id: number;
  nombre: string;
  usuario: string;
  publicado: boolean;
  version: number;
  elementos: ElementoAPI[];
  usuariosQueCompletaron: string[];
  descargas: string[];
  cantidadDescargas: number;
};

function downloadProgressKey(usuario: string, nivel: NivelBackend): string {
  return "LindseysLasersProgresoDescarga:" + JSON.stringify([
    usuario, nivel.usuario, nivel.id, nivel.version
  ]);
}

export type ArchivoGuardadoBackend = {
  username: string;
  nivelesCreados: NivelBackend[];
  nivelesGuardados: NivelBackend[];
  nivelesOG1: boolean[];
  nivelesOG2: boolean[];
  nivelesOG3: boolean[];
};

export type PerfilBackend = {
  username: string;
  password: string;
  profileID: number;
};

export type ConfiguracionBackend = {
  theme: string;
  volume: number;
  resolution: string;
  user: string;
};

// USUARIOS Y CONFIGURACION

export async function comprobarBackendActivo(): Promise<boolean> {
  const respuesta = await fetch(API + "/health");
  if (respuesta.ok === false) {
    throw new Error("No se pudo conectar con el backend (HTTP " + respuesta.status + ").");
  }
  return (await respuesta.text()).trim() === "OK";
}

export async function registrarPerfil(nombre: string, contrasena: string): Promise<void> {
  await pedir("/saveProfile", "POST", { username: nombre, password: contrasena });
}

export async function obtenerPerfil(nombre: string): Promise<PerfilBackend> {
  const datos = await pedir("/" + encodeURIComponent(nombre));
  return datos.profileData;
}

export async function autenticarPerfil(nombre: string, contrasena: string): Promise<PerfilBackend> {
  await pedir("/logProfile", "POST", { username: nombre, password: contrasena });
  return await obtenerPerfil(nombre);
}

export async function obtenerConfiguracion(nombre: string): Promise<ConfiguracionBackend> {
  return await pedir("/" + encodeURIComponent(nombre) + "/configs");
}

export async function guardarConfiguracion(
  nombre: string, tema: string, volumen: number, resolucion: string
): Promise<void> {
  await pedir("/" + encodeURIComponent(nombre) + "/saveConfigs", "POST", {
    theme: tema, volume: volumen, resolution: resolucion
  });
}

// PUBLICACIONES Y NIVELES CREADOS

export async function leerPublicaciones(): Promise<NivelBackend[]> {
  return await pedir("/loadLevels");
}

export async function leerPublicacionesUsuarioBackend(usuario: string): Promise<NivelBackend[]> {
  try {
    return await pedir("/loadLevels/" + encodeURIComponent(usuario));
  } catch (error: any) {
    const mensaje = String(error);
    if (mensaje.indexOf("No-se-han-encontrado-niveles-a-nombre-de-ese-usuario") !== -1 ||
        mensaje.indexOf("No-se-ha-encontrado-el-usuario-marcado") !== -1) {
      return [];
    }
    throw error;
  }
}

export async function leerNivelesUsuario(usuario: string): Promise<NivelBackend[]> {
  const datos = await pedir("/" + encodeURIComponent(usuario));
  return datos.createdLevels;
}

export async function leerArchivoGuardadoBackend(usuario: string): Promise<ArchivoGuardadoBackend> {
  return await pedir("/saveFile/" + encodeURIComponent(usuario));
}

export async function leerNivelesCreadosBackend(usuario: string): Promise<NivelBackend[]> {
  const archivo = await leerArchivoGuardadoBackend(usuario);
  return archivo.nivelesCreados;
}

export function esNivelDelEditorBackend(nivel: NivelBackend): boolean {
  if (nivel === null || !Array.isArray(nivel.elementos)) return false;
  for (let i = 0; i < nivel.elementos.length; i++) {
    const elemento = nivel.elementos[i];
    if (elemento !== null && elemento.tipo !== undefined) {
      const propiedad = elemento.tipo.propiedadEspecial;
      if (typeof propiedad === "string" && propiedad.startsWith("community/editor/1:")) {
        return true;
      }
    }
  }
  return false;
}

export async function guardarNivelCreadoBackend(
  usuario: string, nombre: string, nivel?: NivelEditor
): Promise<NivelBackend> {
  if (nivel !== undefined) {
    const datos = editorAApi(nivel, usuario);
    datos.nombre = nombre;
    await pedir("/saveLevel", "POST", datos);
  }

  const creados = await leerNivelesCreadosBackend(usuario);
  for (let i = 0; i < creados.length; i++) {
    if (creados[i].nombre === nombre) return creados[i];
  }
  throw new Error("No se encontro el nivel creado: " + nombre);
}

export async function renombrarNivelCreadoBackend(
  usuario: string, id: number, nombre: string, _idLocal?: string
): Promise<void> {
  await pedir("/level/name/offline/" + id, "PATCH", { username: usuario, nombre: nombre });
}

export async function eliminarNivelCreadoBackend(
  usuario: string, id: number, _idLocal?: string
): Promise<void> {
  await pedir("/level/delete/" + id, "DELETE", { username: usuario });
}

export async function leerNivelPublicadoBackend(nombre: string): Promise<NivelBackend> {
  return await pedir("/loadLevels/level/" + encodeURIComponent(nombre));
}

export async function publicarNivelBackend(
  usuario: string, nombre: string, nivel?: NivelEditor
): Promise<void> {
  await guardarNivelCreadoBackend(usuario, nombre, nivel);
  const publicaciones = await leerNivelesUsuario(usuario);

  for (let i = 0; i < publicaciones.length; i++) {
    if (publicaciones[i].nombre === nombre) {
      if (publicaciones[i].publicado === false) {
        await pedir("/level/show/" + encodeURIComponent(nombre), "PUT");
      }
      return;
    }
  }

  await pedir("/publishLevel/" + encodeURIComponent(usuario), "POST", { nombre: nombre });
}

export async function despublicarNivelBackend(nombre: string): Promise<void> {
  await pedir("/level/hide/" + encodeURIComponent(nombre), "PUT");
}

export async function renombrarPublicacionBackend(id: number, nombre: string): Promise<void> {
  await pedir("/level/name/online/" + id, "PATCH", { nombre: nombre });
}

export async function actualizarPublicacionBackend(
  usuario: string,
  nivel: NivelEditor,
  publicacion: NivelBackend
): Promise<void> {
  if (publicacion.usuario !== usuario) {
    throw new Error("Esta publicacion pertenece a otro usuario.");
  }

  await guardarNivelCreadoBackend(usuario, nivel.nombre, nivel);

  const datos = editorAApi(nivel, usuario, publicacion);
  datos.usuariosQueCompletaron = [];

  if (nivel.nombre !== publicacion.nombre) {
    await renombrarPublicacionBackend(
      publicacion.id,
      nivel.nombre
    );
  }

  await pedir(
    "/level/" + encodeURIComponent(nivel.nombre),
    "PUT",
    datos
  );
}

// DESCARGAS Y PROGRESO DE COMMUNITY

export async function leerNivelesGuardadosBackend(usuario: string): Promise<NivelBackend[]> {
  const archivo = await leerArchivoGuardadoBackend(usuario);
  const guardados = archivo.nivelesGuardados;
  const autores: string[] = [];
  const publicaciones: NivelBackend[] = [];

  for (let i = 0; i < guardados.length; i++) {
    const autor = guardados[i].usuario;

    if (autores.indexOf(autor) === -1) {
      const niveles = await leerNivelesUsuario(autor);
      autores.push(autor);

      for (let j = 0; j < niveles.length; j++) {
        publicaciones.push(niveles[j]);
      }
    }
  }

  for (let i = 0; i < guardados.length; i++) {
    const descarga = guardados[i];

    descarga.usuariosQueCompletaron = [];

    for (let j = 0; j < publicaciones.length; j++) {
      const publicacion = publicaciones[j];

      if (
        publicacion.id === descarga.id &&
        publicacion.usuario === descarga.usuario &&
        publicacion.version === descarga.version &&
        Array.isArray(publicacion.usuariosQueCompletaron) &&
        publicacion.usuariosQueCompletaron.indexOf(usuario) !== -1
      ) {
        descarga.usuariosQueCompletaron.push(usuario);
        break;
      }
    }
    const progresoLocal = localStorage.getItem(
      downloadProgressKey(usuario, descarga)
    );

    if (progresoLocal === "0") descarga.usuariosQueCompletaron = [];

  }

  return guardados;
}

export async function descargarNivelBackend(usuario: string, nombre: string): Promise<NivelBackend> {
  const publicado = await leerNivelPublicadoBackend(nombre);
  const guardados = await leerNivelesGuardadosBackend(usuario);

  let actualizando = false;

  for (let i = 0; i < guardados.length; i++) {
    const anterior = guardados[i];
    if (anterior.id === publicado.id && anterior.usuario === publicado.usuario) {
      if (anterior.version === publicado.version && anterior.nombre === publicado.nombre) {
        return anterior;
      }

      actualizando = true;

      await pedir("/deleteLevelUser/" + encodeURIComponent(anterior.nombre), "DELETE", {
        username: usuario
      });
      break;
    }
  }

  await pedir("/saveLevelUser/" + encodeURIComponent(publicado.nombre), "POST", {
    username: usuario
  });

  const nuevas = await leerNivelesGuardadosBackend(usuario);
  for (let i = 0; i < nuevas.length; i++) {
    if (nuevas[i].id === publicado.id && nuevas[i].usuario === publicado.usuario) {
      if (actualizando) {
        localStorage.setItem(downloadProgressKey(usuario, nuevas[i]), "0");
        nuevas[i].usuariosQueCompletaron = [];
      }

      return nuevas[i];
    }
  }
  throw new Error("El backend no registro la descarga.");
}

export async function eliminarNivelGuardadoBackend(usuario: string, id: number): Promise<void> {
  const guardados = await leerNivelesGuardadosBackend(usuario);
  for (let i = 0; i < guardados.length; i++) {
    if (guardados[i].id === id) {
      await pedir("/deleteLevelUser/" + encodeURIComponent(guardados[i].nombre), "DELETE", {
        username: usuario
      });
      return;
    }
  }
  throw new Error("No se encontro la descarga a desinstalar.");
}

export async function completarNivelDescargadoBackend(usuario: string, id: number): Promise<void> {
  const archivo = await leerArchivoGuardadoBackend(usuario);
  let descarga: NivelBackend | undefined;

  for (let i = 0; i < archivo.nivelesGuardados.length; i++) {
    if (archivo.nivelesGuardados[i].id === id) {
      descarga = archivo.nivelesGuardados[i];
      break;
    }
  }

  if (descarga === undefined) {
    throw new Error("No se encontro el nivel descargado.");
  }

  const publicaciones = await leerNivelesUsuario(descarga.usuario);
  let publicacion: NivelBackend | undefined;

  for (let i = 0; i < publicaciones.length; i++) {
    if (publicaciones[i].id === id && publicaciones[i].usuario === descarga.usuario) {
      publicacion = publicaciones[i];
      break;
    }
  }

  if (publicacion === undefined) {
    throw new Error("No se encontro la publicacion del nivel.");
  }

  if (publicacion.version !== descarga.version) {
    throw new Error(
      "El nivel tiene una nueva version. Actualizalo antes de volver a jugar."
    );
  }

  if (publicacion.usuariosQueCompletaron.indexOf(usuario) !== -1) {
    localStorage.removeItem(downloadProgressKey(usuario, descarga));
    return;
  }

  let errorGuardado: unknown;

  try {
    await pedir("/level/" + encodeURIComponent(publicacion.nombre), "POST", { username: usuario });
  } catch (error) {
    errorGuardado = error;
  }

  const actualizadas = await leerNivelesUsuario(descarga.usuario);

  for (let i = 0; i < actualizadas.length; i++) {
    const actual = actualizadas[i];

    if (
      actual.id === id &&
      actual.usuario === descarga.usuario &&
      actual.version === descarga.version &&
      actual.usuariosQueCompletaron.indexOf(usuario) !== -1
    ) {
      localStorage.removeItem(downloadProgressKey(usuario, descarga));
      return;
    }
  }

  if (errorGuardado !== undefined) {
    throw errorGuardado;
  }

  throw new Error("El servidor no guardo el progreso de la publicacion.");
}

// NIVELES ORIGINALES (OG)

export async function leerNivelesOriginalesBackend(): Promise<NivelBackend[]> {
  return await pedir("/loadLevels/original/all");
}

export async function leerNivelOriginalBackend(numero: number): Promise<NivelBackend> {
  return await pedir("/level/original/" + numero);
}

export async function completarNivelOriginalBackend(
  usuario: string, numero: number, archivo: number
): Promise<void> {
  await pedir("/level/original/" + numero, "POST", {
    username: usuario,
    saveFile: String(archivo)
  });
}

export async function leerProgresoOriginalBackend(
  usuario: string, archivo: number
): Promise<boolean[]> {
  const guardado = await leerArchivoGuardadoBackend(usuario);
  if (archivo === 1) return guardado.nivelesOG1;
  if (archivo === 2) return guardado.nivelesOG2;
  if (archivo === 3) return guardado.nivelesOG3;
  throw new Error("El archivo de guardado debe ser 1, 2 o 3.");
}
