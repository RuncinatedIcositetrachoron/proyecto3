import Phaser from "phaser";
import { MAX_NOMBRE_NIVEL } from "./camposTexto";
import { demo } from "./datosDemo";
import {
  leerNivelesCreadosBackend,
  guardarNivelCreadoBackend,
  renombrarNivelCreadoBackend,
  eliminarNivelCreadoBackend,
  esNivelDelEditorBackend
} from "./api";
import type { NivelBackend } from "./api";
import { apiAEditor } from "./parserApi";

export type Nivel = {
    id: string;
    idServidor?: number;
    nombre: string;
    tablero: number[][];
    ultimaModificacion: number;
    portales: number[][];
    links?: number[][];
  };

function nombreUsuarioActual(): string {
  if (demo.usuarioActual === null || demo.usuarioActual === undefined) {
    throw new Error("Tenes que iniciar sesion para administrar niveles.");
  }
  return demo.usuarioActual.nombre;
}

function guardarCopia(niveles: Nivel[], usuario: string): void {
  localStorage.setItem("nivelesCreados:" + usuario, JSON.stringify(niveles));
}

function leerCopia(usuario: string): Nivel[] {
  const texto = localStorage.getItem("nivelesCreados:" + usuario);
  if (texto === null) return [];
  const niveles: Nivel[] = JSON.parse(texto);
  niveles.sort((a, b) => { return b.ultimaModificacion - a.ultimaModificacion; });
  return niveles;
}

export function guardarNiveles(niveles: Nivel[]): void {
  guardarCopia(niveles, nombreUsuarioActual());
}

export function obtenerNiveles(): Nivel[] {
  if (demo.usuarioActual === null || demo.usuarioActual === undefined) return [];
  return leerCopia(demo.usuarioActual.nombre);
}

export async function cargarNivelesServidor(): Promise<string> {
  const usuario = nombreUsuarioActual();
  const creados = await leerNivelesCreadosBackend(usuario);
  const niveles: Nivel[] = [];
  for (let i = 0; i < creados.length; i++) {
    const recibido = creados[i];
    if (esNivelDelEditorBackend(recibido) === false) {
      continue;
    }
    const nivel: Nivel = apiAEditor(recibido);
    nivel.idServidor = recibido.id;
    niveles.push(nivel);
  }
  guardarCopia(niveles, usuario);
  return "Niveles cargados del servidor.";
}

function crearIdLocal(niveles: Nivel[]): string {
  let numero = Date.now();
  let ocupado = true;
  while (ocupado) {
    ocupado = false;
    for (let i = 0; i < niveles.length; i++) {
      if (niveles[i].id === String(numero)) {
        ocupado = true;
      }
    }
    if (ocupado) {
      numero++;
    }
  }
  return String(numero);
}

export async function crearNivel(filas: number, columnas: number): Promise<Nivel> {
  const usuario = nombreUsuarioActual();
  const niveles = leerCopia(usuario);
  if (niveles.length >= 60) throw new Error("Podes tener como maximo 60 niveles.");
  const tablero: number[][] = [];

  for (let fila = 0; fila < filas; fila++) {
    const nuevaFila: number[] = [];

    for (let columna = 0; columna < columnas; columna++) {
      nuevaFila.push(1);
    }

    tablero.push(nuevaFila);
  }

  tablero[1][1] = 66; //TILE JUGADOR
  tablero[filas - 2][columnas - 2] = 25; //TILE BANDERA

  const nuevaId = crearIdLocal(niveles);

  let numeroNombre = 0;

  while (niveles.some((nivel) => {
    return nivel.nombre === "Untitled Level " + numeroNombre.toString();
  })) {
    numeroNombre++;
  }

  const nivel: Nivel = {
    id: nuevaId.toString(),
    nombre: "Untitled Level " + numeroNombre.toString(),
    tablero: tablero,
    ultimaModificacion: Date.now(),
    portales: crearPortalesVacios(filas, columnas),
    links: [],
  };

  const guardado = await guardarNivelCreadoBackend(usuario, nivel.nombre, nivel);
  nivel.idServidor = guardado.id;
  niveles.push(nivel);
  guardarCopia(niveles, usuario);

  return nivel;
}

export async function eliminarNivel(id: string): Promise<void> {
  const usuario = nombreUsuarioActual();
  const niveles = leerCopia(usuario);
  const restantes: Nivel[] = [];
  for (let i = 0; i < niveles.length; i++) {
    const nivel = niveles[i];
    if (nivel.id === id) {
      if (nivel.idServidor === undefined) {
        throw new Error("Falta el ID del servidor. Recarga mis niveles.");
      }
      await eliminarNivelCreadoBackend(usuario, nivel.idServidor, nivel.id);
    } else {
      restantes.push(nivel);
    }
  }
  guardarCopia(restantes, usuario);
}

export function obtenerNivel(id: string): Nivel | undefined {
  const niveles = obtenerNiveles();
  for (let i = 0; i < niveles.length; i++) {
    if (niveles[i].id === id) return niveles[i];
  }
  if (demo.usuarioActual !== null && demo.usuarioActual !== undefined) {
    const texto = localStorage.getItem("nivelesGuardados:" + demo.usuarioActual.nombre);
    if (texto !== null) {
      const descargas: NivelBackend[] = JSON.parse(texto);
      for (let i = 0; i < descargas.length; i++) {
        if ("online:" + descargas[i].id === id && esNivelDelEditorBackend(descargas[i])) {
          return apiAEditor(descargas[i], id);
        }
      }
    }
  }
  return undefined;
}

export async function actualizarNivel(nivel: Nivel): Promise<void> {
  const usuario = nombreUsuarioActual();
  const niveles = leerCopia(usuario);
  let indice = -1;
  for (let i = 0; i < niveles.length; i++) {
    if (niveles[i].id === nivel.id) indice = i;
  }
  if (indice === -1) throw new Error("No se encontro el nivel en mis niveles.");
  nivel.ultimaModificacion = Date.now();
  const guardado = await guardarNivelCreadoBackend(usuario, nivel.nombre, nivel);
  nivel.idServidor = guardado.id;
  niveles[indice] = nivel;
  guardarCopia(niveles, usuario);
}

 export function crearBoton(escena: Phaser.Scene, x: number, y: number, ancho: number, texto: string, accion: () => void): Phaser.GameObjects.Rectangle {
  escena.add.rectangle(x + 3, y + 3, ancho + 4, 44, 0x14121e);
  const fondo = escena.add.rectangle(x, y, ancho, 40, 0xcbdbfc);
  fondo.setStrokeStyle(4, 0x222034);
  fondo.setInteractive({ useHandCursor: true });
  escena.add.text(x, y, texto, {
    fontSize: "16px",
    color: "#222034",
    fontFamily: "Fuente",
    resolution: 1
  }).setOrigin(0.5);

  const colorHover = 0x95add6;
  const colorSeleccionado = 0xffd166;
  const colorHoverSeleccionado = 0xd9ad4f;
  let colorAnterior = fondo.fillColor;

  const bordeTooltip = escena.add.rectangle(0, 0, 1, 1, 0x171a2e)
  .setOrigin(0)
  .setStrokeStyle(2, 0xcbdbfc)
  .setDepth(999)
  .setVisible(false);


  const tooltip = escena.add.text(0, 0, "", {
    fontFamily: "Fuente",
    fontSize: "16px",
    color: "#cbdbfc",
    backgroundColor: "#171a2e",
    padding: { left: 8, right: 8, top: 6, bottom: 6 },
    resolution: 1
  }).setDepth(1000).setVisible(false);

  const mostrarTooltip = () => {
    const atajo = fondo.getData("atajo");
    if (fondo.input && fondo.input.enabled && typeof atajo === "string" && atajo.length > 0) {
      tooltip.setText(atajo);
      const limites = fondo.getBounds();
      let tooltipX = limites.centerX - tooltip.width / 2;
      let tooltipY = limites.top - tooltip.height - 8;
      tooltipX = Math.max(8, Math.min(tooltipX, escena.scale.width - tooltip.width - 8));
      if (tooltipY < 8) {
        tooltipY = limites.bottom + 8;
      }
      tooltip.setPosition(Math.round(tooltipX), Math.round(tooltipY));
      bordeTooltip.setSize(tooltip.width + 2, tooltip.height + 2);
      bordeTooltip.setPosition(tooltip.x - 1, tooltip.y - 1);
      bordeTooltip.setVisible(true);
      tooltip.setVisible(true);
    } else {
      tooltip.setVisible(false);
      bordeTooltip.setVisible(false);
    }
  };

  fondo.on("pointerover", () => {
    if (fondo.input && fondo.input.enabled) {
      colorAnterior = fondo.fillColor;
      if (colorAnterior === colorSeleccionado) {
        fondo.setFillStyle(colorHoverSeleccionado);
      } else {
        fondo.setFillStyle(colorHover);
      }
      mostrarTooltip();
    }
  });

  fondo.on("pointermove", mostrarTooltip);

  fondo.on("pointerout", () => {
    if (fondo.fillColor === colorHover || fondo.fillColor === colorHoverSeleccionado) {
      fondo.setFillStyle(colorAnterior);
    }
    tooltip.setVisible(false);
    bordeTooltip.setVisible(false);
  });

  fondo.on("pointerdown", () => {
    tooltip.setVisible(false);
    bordeTooltip.setVisible(false);
    if (fondo.input && fondo.input.enabled) {
      accion();
    }
  });

  fondo.once("destroy", () => {
    tooltip.destroy();
    bordeTooltip.destroy();
  });

  fondo.on("ocultarTooltip", () => {
    tooltip.setVisible(false);
    bordeTooltip.setVisible(false);
  });

  return fondo;
}



  export async function renombrarNivel(
  id: string,
  nuevoNombre: string,
): Promise<void> {
  const usuario = nombreUsuarioActual();
  nuevoNombre = nuevoNombre.trim();

  let nombre = "";
  let cantidad = 0;

  for (const letra of nuevoNombre) {
    if (cantidad >= MAX_NOMBRE_NIVEL) {
      break;
    }

    nombre = nombre + letra;
    cantidad++;
  }

  if (nombre === "") {
    return;
  }

  const niveles = leerCopia(usuario);

  for (const nivel of niveles) {
    if (nivel.id === id) {
      if (nivel.nombre === nombre) {
        return;
      }

      if (nivel.idServidor === undefined) {
        throw new Error("Falta el ID del servidor. Recarga Mis niveles.");
      }
      await renombrarNivelCreadoBackend(usuario, nivel.idServidor, nombre, nivel.id);
      nivel.nombre = nombre;
      nivel.ultimaModificacion = Date.now();
      guardarCopia(niveles, usuario);
      return;
    }
  }
}

function copiarMatriz(matriz: number[][]): number[][] {
  const copia: number[][] = [];

  for (const fila of matriz) {
    const filaCopiada: number[] = [];

    for (const numero of fila) {
      filaCopiada.push(numero);
    }

    copia.push(filaCopiada);
  }

  return copia;
}

export async function duplicarNivel(id: string): Promise<Nivel | undefined> {
  const usuario = nombreUsuarioActual();
  const niveles = leerCopia(usuario);
  if (niveles.length >= 60) throw new Error("Podes tener como maximo 60 niveles.");

  let original: Nivel | undefined = undefined;
  const nuevaId = crearIdLocal(niveles);

  for (const nivel of niveles) {
    if (nivel.id === id) {
      original = nivel;
    }

  }

  if (original === undefined) {
    return undefined;
  }

  let nombreBase = original.nombre;
  const parentesis = nombreBase.lastIndexOf(" (");

  if (parentesis !== -1 && nombreBase.endsWith(")")) {
    const numeroTexto = nombreBase.substring(
      parentesis + 2,
      nombreBase.length - 1,
    );

    const numero = Number(numeroTexto);

    if (Number.isNaN(numero) === false) {
      nombreBase = nombreBase.substring(0, parentesis);
    }
  }

  let numeroCopia = 1;
  let nuevoNombre = "";
  let nombreOcupado = true;

  while (nombreOcupado) {
    const sufijo = " (" + numeroCopia + ")";
    const limiteBase = MAX_NOMBRE_NIVEL - sufijo.length;

    let baseRecortada = "";
    let cantidad = 0;

    for (const letra of nombreBase) {
      if (cantidad >= limiteBase) {
        break;
      }

      baseRecortada = baseRecortada + letra;
      cantidad++;
    }

    baseRecortada = baseRecortada.trimEnd();
    nuevoNombre = baseRecortada + sufijo;

    nombreOcupado = false;

    for (const nivel of niveles) {
      if (nivel.nombre === nuevoNombre) {
        nombreOcupado = true;
        break;
      }
    }

    if (nombreOcupado) {
      numeroCopia++;
    }
  }

  let linksCopiados: number[][] = [];

  if (original.links !== undefined) {
    linksCopiados = copiarMatriz(original.links);
  }

  const duplicado: Nivel = {
    id: nuevaId.toString(),
    nombre: nuevoNombre,
    tablero: copiarMatriz(original.tablero),
    portales: copiarMatriz(original.portales),
    ultimaModificacion: Date.now(),
    links: linksCopiados,
  };

  const guardado = await guardarNivelCreadoBackend(usuario, duplicado.nombre, duplicado);
  duplicado.idServidor = guardado.id;
  niveles.push(duplicado);
  guardarCopia(niveles, usuario);

  return duplicado;
}
  
export function crearPortalesVacios(filas: number, columnas: number): number[][] {
  const portales: number[][] = [];
  for (let fila = 0; fila < filas; fila++) {
    const nuevaFila: number[] = [];
    for (let columna = 0; columna < columnas; columna++) {
      nuevaFila.push(-1);
    }
    portales.push(nuevaFila);
  }
  return portales;
}
  
   

