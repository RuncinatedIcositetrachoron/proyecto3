//EXPERIMENTACION DE BACK

export type Nivel = {
    id: string;
    nombre: string;
    tablero: number[][];
    ultimaModificacion: number;
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
    let nuevaId = 1;
    for (const nivel of niveles) {
        const idNumerica = Number(nivel.id);
        if (idNumerica >= nuevaId) {
            nuevaId = idNumerica + 1;
        }
    }
    let numeroNombre = 0;
    while (niveles.some((nivel) => {
      return nivel.nombre === 'Untitled Level ' + numeroNombre.toString();
    })) { numeroNombre++; }
    const nivel: Nivel = {
      id: nuevaId.toString(),
      nombre: 'Untitled Level ' + numeroNombre.toString(),
      tablero: tablero,
      ultimaModificacion: Date.now(),
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
    const fondo = escena.add.rectangle(x, y, ancho, 40, 0x333333);
    fondo.setInteractive({ useHandCursor: true })
    fondo.setStrokeStyle(1, 0xff0000);
    escena.add.text(x, y, texto,
      {
        fontSize: "16px",
        color: "#ffffff",
      },
    ).setOrigin(0.5);
    fondo.on("pointerdown", () => {
      accion();
    });
    return fondo;

  }

  export function renombrarNivel(id: string, nuevoNombre: string): void {
    const niveles = obtenerNiveles();
    const nivel = niveles.find((item) => {
      return item.id === id;
    });
    if (nivel === undefined) {
      return;
    }
    nivel.nombre = nuevoNombre;
    guardarNiveles(niveles);
  }

  export function duplicarNivel(id: string,): Nivel | undefined {
    const niveles = obtenerNiveles();
    const nivelOriginal = niveles.find((item) => {
      return item.id === id;
    });
    if (nivelOriginal === undefined) {
      return undefined;
    }

    let nuevaId = 1;
    for (const nivel of niveles) {
      const idNumerica = Number(nivel.id);
      if (idNumerica >= nuevaId) {
        nuevaId = idNumerica + 1;
      }
    }
    let nombreBase = nivelOriginal.nombre;
    const posicionParentesis = nombreBase.lastIndexOf(" (");
    if (posicionParentesis !== -1 && nombreBase.endsWith(")")) {
      const numeroTexto = nombreBase.substring(posicionParentesis + 2, nombreBase.length - 1);
      const numero = Number(numeroTexto);
      if (!isNaN(numero)) {
        nombreBase = nombreBase.substring(0, posicionParentesis);
      }
    }
    let numeroCopia = 1;
    let nuevoNombre = nombreBase + " (" + numeroCopia + ")";
    while (niveles.some((nivel) => {
        return nivel.nombre === nuevoNombre;
    })) {
      numeroCopia++;
      nuevoNombre = nombreBase + " (" + numeroCopia + ")";
    }
    const nivelDuplicado: Nivel = {
      id: nuevaId.toString(),
      nombre: nuevoNombre,
      tablero: nivelOriginal.tablero,
      ultimaModificacion: Date.now(),
    }
      niveles.push(nivelDuplicado);
      guardarNiveles(niveles);
      return nivelDuplicado;
    };
  
  
   

