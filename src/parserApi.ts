//TIPADO

export type NivelEditor = {
  id: string;
  nombre: string;
  tablero: number[][];
  ultimaModificacion: number;
  portales: number[][];
  links?: number[][];
};

type PortalAPI = {
  propiedadEspecial: string;
  posicionXPortalB: number;
  posicionYPortalB: number;
};

export type ElementoAPI = {
  tipo: {
    orientacion?: string | null;
    propiedadEspecial: string | null | PortalAPI;
  };
  posicionX: number;
  posicionY: number;
} | null;

export type NivelAPI = {
  elementos: ElementoAPI[];
  usuario: string;
  id: number;
  nombre: string;
  usuariosQueCompletaron: string[];
  version: number;
  publicado: boolean;
};

type Cabecera = {
  filas: number;
  columnas: number;
  idLocal: string;
  ultimaModificacion: number;
  links?: number[][];
};

const MARCA_CABECERA = "community/editor/1:";
const MARCA_CELDA = "community/celda/1:";

function comprobarMatriz(matriz: number[][], filas: number, columnas: number): void {
  if (!Array.isArray(matriz) || matriz.length !== filas) {
    throw new Error("La matriz no tiene la cantidad de filas esperada.");
  }
  for (let y = 0; y < filas; y++) {
    if (!Array.isArray(matriz[y]) || matriz[y].length !== columnas) {
      throw new Error("La matriz debe ser rectangular.");
    }
    for (let x = 0; x < columnas; x++) {
      if (!Number.isInteger(matriz[y][x])) {
        throw new Error("Los numeros de tiles y portales deben ser enteros.");
      }
    }
  }
}

function copiarLinks(links: number[][], filas: number, columnas: number): number[][] {
  if (!Array.isArray(links)) throw new Error("Links invalidos.");
  const copia: number[][] = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (!Array.isArray(link) || link.length !== 4) {
      throw new Error("Cada link debe contener [x1, y1, x2, y2].");
    }
    for (let j = 0; j < 4; j++) {
      if (!Number.isInteger(link[j]) || link[j] < 0) {
        throw new Error("Coordenada de link invalida.");
      }
    }
    if (link[0] >= columnas || link[2] >= columnas || link[1] >= filas || link[3] >= filas) {
      throw new Error("Hay un link fuera del tablero.");
    }
    copia.push([link[0], link[1], link[2], link[3]]);
  }
  return copia;
}

// CONVERSOR EDITOR -> API

export function editorAApi(nivel: NivelEditor, usuario: string, existente?: NivelAPI): NivelAPI {
  if (typeof usuario !== "string" || usuario.trim() === "") {
    throw new Error("Falta el usuario del nivel.");
  }
  if (typeof nivel.nombre !== "string" || nivel.nombre.trim() === "") {
    throw new Error("Falta el nombre del nivel.");
  }
  if (typeof nivel.id !== "string" || !Number.isFinite(nivel.ultimaModificacion)) {
    throw new Error("ID local o fecha invalida.");
  }
  if (!Array.isArray(nivel.tablero) || nivel.tablero.length === 0 ||
      !Array.isArray(nivel.tablero[0]) || nivel.tablero[0].length === 0) {
    throw new Error("El tablero esta vacio.");
  }
  const filas = nivel.tablero.length;
  const columnas = nivel.tablero[0].length;
  comprobarMatriz(nivel.tablero, filas, columnas);
  comprobarMatriz(nivel.portales, filas, columnas);

  const cabecera: Cabecera = {
    filas: filas,
    columnas: columnas,
    idLocal: nivel.id,
    ultimaModificacion: nivel.ultimaModificacion
  };
  if (nivel.links !== undefined) cabecera.links = copiarLinks(nivel.links, filas, columnas);

  const elementos: ElementoAPI[] = [{
    tipo: { propiedadEspecial: MARCA_CABECERA + JSON.stringify(cabecera) },
    posicionX: -1,
    posicionY: -1
  }];
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      elementos.push({
        tipo: {
          orientacion: null,
          propiedadEspecial: MARCA_CELDA + JSON.stringify([nivel.tablero[y][x], nivel.portales[y][x]])
        },
        posicionX: x,
        posicionY: y
      });
    }
  }

  const resultado: NivelAPI = {
    elementos: elementos,
    usuario: usuario,
    id: 0,
    nombre: nivel.nombre,
    usuariosQueCompletaron: [],
    version: 0,
    publicado: false
  };

  if (existente !== undefined) {
    if (existente.usuario !== usuario) throw new Error("El nivel pertenece a otro usuario.");
    resultado.id = existente.id;
    resultado.version = existente.version;
    resultado.publicado = existente.publicado;
    resultado.usuariosQueCompletaron = existente.usuariosQueCompletaron.slice();
  }
  return resultado;
}

//API A EDITOR

export function apiAEditor(nivel: NivelAPI, idLocal?: string): NivelEditor {
  if (!Array.isArray(nivel.elementos) || nivel.elementos.length < 2) {
    throw new Error("No se recibio un nivel del editor.");
  }
  let cabecera: Cabecera | undefined;
  let cantidadCabeceras = 0;
  for (let i = 0; i < nivel.elementos.length; i++) {
    const elemento = nivel.elementos[i];
    if (elemento === null || !elemento.tipo) throw new Error("Elemento incompleto.");
    const propiedad = elemento.tipo.propiedadEspecial;
    if (typeof propiedad === "string" && propiedad.startsWith(MARCA_CABECERA)) {
      cantidadCabeceras++;
      if (elemento.posicionX !== -1 || elemento.posicionY !== -1) {
        throw new Error("Posicion de cabecera invalida.");
      }
      cabecera = JSON.parse(propiedad.substring(MARCA_CABECERA.length));
    }
  }
  if (cabecera === undefined) {
    throw new Error("Falta la cabecera del nivel.");
  }
  if (cabecera === null || cantidadCabeceras !== 1 ||
      !Number.isInteger(cabecera.filas) || !Number.isInteger(cabecera.columnas) ||
      cabecera.filas < 1 || cabecera.columnas < 1 ||
      cabecera.filas * cabecera.columnas !== nivel.elementos.length - 1 ||
      typeof cabecera.idLocal !== "string" || !Number.isFinite(cabecera.ultimaModificacion)) {
    throw new Error("La cabecera o la cantidad de celdas es invalida.");
  }

  const tablero: number[][] = [];
  const portales: number[][] = [];
  const leidas: boolean[][] = [];
  for (let y = 0; y < cabecera.filas; y++) {
    tablero.push([]);
    portales.push([]);
    leidas.push([]);
  }
  for (let i = 0; i < nivel.elementos.length; i++) {
    const elemento = nivel.elementos[i];
    if (elemento === null) throw new Error("Elemento incompleto.");
    const propiedad = elemento.tipo.propiedadEspecial;
    if (typeof propiedad !== "string") throw new Error("Celda de otro formato.");
    if (propiedad.startsWith(MARCA_CABECERA)) continue;
    if (!propiedad.startsWith(MARCA_CELDA)) throw new Error("Celda de otro formato.");
    const x = elemento.posicionX;
    const y = elemento.posicionY;
    if (!Number.isInteger(x) || !Number.isInteger(y) ||
        x < 0 || y < 0 || x >= cabecera.columnas || y >= cabecera.filas) {
      throw new Error("Celda fuera del tablero.");
    }
    if (leidas[y][x] === true) throw new Error("Hay una celda duplicada.");
    const datos: unknown = JSON.parse(propiedad.substring(MARCA_CELDA.length));
    if (!Array.isArray(datos) || datos.length !== 2 ||
        !Number.isInteger(datos[0]) || !Number.isInteger(datos[1])) {
      throw new Error("Los datos de la celda son invalidos.");
    }
    tablero[y][x] = datos[0];
    portales[y][x] = datos[1];
    leidas[y][x] = true;
  }
  const resultado: NivelEditor = {
    id: cabecera.idLocal,
    nombre: nivel.nombre,
    tablero: tablero,
    ultimaModificacion: cabecera.ultimaModificacion,
    portales: portales
  };
  if (idLocal !== undefined) resultado.id = idLocal;
  if (cabecera.links !== undefined) {
    resultado.links = copiarLinks(cabecera.links, cabecera.filas, cabecera.columnas);
  }
  return resultado;
}
