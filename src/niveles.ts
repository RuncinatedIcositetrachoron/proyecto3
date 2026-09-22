//EXPERIMENTACION DE BACK

import Phaser from "phaser";
import { MAX_NOMBRE_NIVEL } from "./camposTexto";

export type Nivel = {
    id: string;
    nombre: string;
    tablero: number[][];
    ultimaModificacion: number;
    portales: number[][];
    links?: number[][];
  };

export function guardarNiveles(niveles: Nivel[]): void {
  localStorage.setItem("nivelesCreados", JSON.stringify(niveles));
}
  
export function obtenerNiveles(): Nivel[] {
  const texto = localStorage.getItem("nivelesCreados");
  if (texto === null) {
    return [];
  }
  const niveles: Nivel[] = JSON.parse(texto);
  for (const nivel of niveles) {
    if (nivel.portales === undefined) {
      nivel.portales = crearPortalesVacios(
        nivel.tablero.length,
        nivel.tablero[0].length,
      );
    }
  }
  niveles.sort((nivelA, nivelB) => {
    return nivelB.ultimaModificacion - nivelA.ultimaModificacion;
  });
  return niveles;
}

export function crearNivel(filas: number, columnas: number): Nivel {
  const niveles = obtenerNiveles();
  const tablero: number[][] = [];

  for (let fila = 0; fila < filas; fila++) {
    const nuevaFila: number[] = [];

    for (let columna = 0; columna < columnas; columna++) {
      nuevaFila.push(1);
    }

    tablero.push(nuevaFila);
  }

  tablero[1][1] = 7;
  tablero[filas - 2][columnas - 2] = 6;

  let nuevaId = 1;

  for (const nivel of niveles) {
    const idNumerica = Number(nivel.id);

    if (idNumerica >= nuevaId) {
      nuevaId = idNumerica + 1;
    }
  }

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

  niveles.push(nivel);
  guardarNiveles(niveles);

  return nivel;
}

  export function eliminarNivel(id: string): void {
    const nivelesLista = obtenerNiveles();
    const nivelesRestantes = nivelesLista.filter((nivel) => {
      return nivel.id !== id;
    });
    guardarNiveles(nivelesRestantes);
  }

  export function obtenerNivel(id: string): Nivel | undefined {
    const niveles = obtenerNiveles();
    return niveles.find((item) => {
      return item.id === id;
    });
  }

  export function actualizarNivel(nivelActualizado: Nivel): void {
    const nivelesLista = obtenerNiveles();
    const indice = nivelesLista.findIndex((item) => {
      return item.id === nivelActualizado.id;
    });
    if (indice === -1) {
      return;
    }
    nivelActualizado.ultimaModificacion = Date.now();
    nivelesLista[indice] = nivelActualizado;
    guardarNiveles(nivelesLista);
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



  export function renombrarNivel(
  id: string,
  nuevoNombre: string,
): void {
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

  const niveles = obtenerNiveles();

  for (const nivel of niveles) {
    if (nivel.id === id) {
      if (nivel.nombre === nombre) {
        return;
      }

      nivel.nombre = nombre;
      guardarNiveles(niveles);
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

export function duplicarNivel(id: string): Nivel | undefined {
  const niveles = obtenerNiveles();

  let original: Nivel | undefined = undefined;
  let nuevaId = 1;

  for (const nivel of niveles) {
    if (nivel.id === id) {
      original = nivel;
    }

    const idNumerica = Number(nivel.id);

    if (idNumerica >= nuevaId) {
      nuevaId = idNumerica + 1;
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

    // Reserva espacio para el numero de copia.
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

  niveles.push(duplicado);
  guardarNiveles(niveles);

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
  
   

