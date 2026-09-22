import Phaser from "phaser";
import {
  obtenerNiveles,
  obtenerNivel,
  crearNivel,
  eliminarNivel,
  crearBoton,
  renombrarNivel,
  duplicarNivel,
} from "./niveles";
import {
  crearCampoTexto,
  filtrarTexto,
  MAX_BUSQUEDA,
  MAX_NOMBRE_NIVEL,
} from "./camposTexto";

export class LevelsScene extends Phaser.Scene {
  private ordenInvertido: boolean = false;
  private busqueda: string = "";
  private paginaActual: number = 0;
  private nivelesPorPagina: number = 6;

  private objetosLista: Phaser.GameObjects.GameObject[] = [];
  private botonAnterior: Phaser.GameObjects.Rectangle | null = null;
  private botonSiguiente: Phaser.GameObjects.Rectangle | null = null;
  private textoPagina: Phaser.GameObjects.Text | null = null;

  private temporizadorBusqueda: Phaser.Time.TimerEvent | null = null;

  private finalizarNombre: ((guardar: boolean) => void) | null = null;

  constructor() {
    super("LevelsScene");
  }

  init(data: {
    ordenInvertido?: boolean,
    busqueda?: string,
    pagina?: number,
  } = {}): void {
    if (data.ordenInvertido !== undefined) {
      this.ordenInvertido = data.ordenInvertido;
    } else {
      this.ordenInvertido = false;
    }

    if (data.busqueda !== undefined) {
      this.busqueda = data.busqueda;
    }

    if (data.pagina !== undefined) {
      this.paginaActual = data.pagina;
    } else {
      this.paginaActual = 0;
    }

    this.objetosLista = [];
    this.botonAnterior = null;
    this.botonSiguiente = null;
    this.textoPagina = null;
    this.temporizadorBusqueda = null;
    this.finalizarNombre = null;
  }

  create(): void {
    this.add.text(40, 30, "Level Editor", {
      fontSize: "28px",
      color: "#ffffff",
    });

    crearBoton(this, 120, 90, 120, "Crear Nivel", () => {
      this.cerrarNombre(true);
      const nivel = crearNivel(10, 16);
      this.scene.start("editor", { nivelId: nivel.id });
    });

    crearBoton(this, 260, 90, 120, "Invertir Orden", () => {
      this.cerrarNombre(true);
      this.ordenInvertido = this.ordenInvertido === false;
      this.mostrarNiveles();
    });

    // BUSQUEDA

    const campo = crearCampoTexto(
      this, 450, 90, 300, "Buscar nivel...", MAX_BUSQUEDA,
      (valor) => {
        this.busqueda = valor;
        this.paginaActual = 0;
        this.programarBusqueda();
      },
    );

    this.busqueda = filtrarTexto(this.busqueda, MAX_BUSQUEDA);
    campo.input.value = this.busqueda;

    campo.input.addEventListener("keydown", (evento) => {
      if (evento.isComposing) {
        return;
      }

      if (evento.key === "Enter") {
        evento.preventDefault();
        this.mostrarNiveles();
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        campo.input.value = "";
        this.busqueda = "";
        this.paginaActual = 0;
        this.mostrarNiveles();
      }
    });

    // PAGINACION

    this.botonAnterior = crearBoton(
      this, 100, 550, 100, "Anterior",
      () => {
        this.cerrarNombre(true);

        if (this.paginaActual > 0) {
          this.paginaActual--;
          this.mostrarNiveles();
        }
      },
    );

    this.textoPagina = this.add.text(300, 550, "", {
      fontFamily: "Fuente",
      fontSize: "16px",
      color: "#ffffff",
    });
    this.textoPagina.setOrigin(0.5);

    this.botonSiguiente = crearBoton(
      this, 500, 550, 100, "Siguiente",
      () => {
        this.cerrarNombre(true);
        this.paginaActual++;
        this.mostrarNiveles();
      },
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cancelarBusquedaPendiente();
      this.cerrarNombre(false);
      this.objetosLista = [];
    });

    this.mostrarNiveles();
  }

  // BUSQUEDA

  private cancelarBusquedaPendiente(): void {
    if (this.temporizadorBusqueda !== null) {
      this.temporizadorBusqueda.remove(false);
      this.temporizadorBusqueda = null;
    }
  }

  private programarBusqueda(): void {
    this.cancelarBusquedaPendiente();
    this.temporizadorBusqueda = this.time.delayedCall(0, () => {
      this.temporizadorBusqueda = null;
      this.mostrarNiveles();
    });
  }

  private normalizarBusqueda(texto: string): string {
    texto = texto.trim();
    texto = texto.normalize("NFD");
    texto = texto.replace(/[\u0300-\u036f]/g, "");
    texto = texto.toLowerCase();
    return texto;
  }

  // BOTONES

  private botonLista(
    x: number,
    y: number,
    ancho: number,
    texto: string,
    accion: () => void,
  ): void {
    const cantidadAnterior = this.children.list.length;

    crearBoton(this, x, y, ancho, texto, accion);

    for (let i = cantidadAnterior; i < this.children.list.length; i++) {
      this.objetosLista.push(this.children.list[i]);
    }
  }

  private activarBoton(
    boton: Phaser.GameObjects.Rectangle | null,
    activo: boolean,
  ): void {
    if (boton === null) {
      return;
    }

    if (activo) {
      boton.setInteractive({ useHandCursor: true });
      boton.setFillStyle(0xcbdbfc);
    } else {
      boton.disableInteractive();
      boton.setFillStyle(0x999999);
      boton.emit("ocultarTooltip");
    }
  }

  // LISTA DE NIVELES

  private mostrarNiveles(): void {
    this.cerrarNombre(true);
    this.cancelarBusquedaPendiente();

    for (const objeto of this.objetosLista) {
      objeto.destroy();
    }
    this.objetosLista = [];

    let niveles = obtenerNiveles();

    if (this.ordenInvertido) {
      niveles.reverse();
    }

    const consulta = this.normalizarBusqueda(this.busqueda);

    if (consulta !== "") {
      const coincidencias = [];

      for (const nivel of niveles) {
        const nombreNormalizado = this.normalizarBusqueda(nivel.nombre);

        if (nombreNormalizado.includes(consulta)) {
          coincidencias.push(nivel);
        }
      }

      niveles = coincidencias;
    }

    let totalPaginas = Math.ceil(niveles.length / this.nivelesPorPagina);

    if (totalPaginas === 0) {
      totalPaginas = 1;
    }
    if (this.paginaActual < 0) {
      this.paginaActual = 0;
    }
    if (this.paginaActual >= totalPaginas) {
      this.paginaActual = totalPaginas - 1;
    }

    const inicio = this.paginaActual * this.nivelesPorPagina;
    let fin = inicio + this.nivelesPorPagina;

    if (fin > niveles.length) {
      fin = niveles.length;
    }

    let y = 180;

    for (let i = inicio; i < fin; i++) {
      const nivel = niveles[i];
      const filaY = y;

      const nombre = this.add.text(40, y, nivel.nombre, {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#ffffff",
      });

      nombre.setOrigin(0, 0.5);
      nombre.setInteractive({ useHandCursor: true });
      this.ajustarNombreVisible(nombre, nivel.nombre);

      nombre.on("pointerover", () => {
        nombre.setColor("#ffd166");
      });

      nombre.on("pointerout", () => {
        nombre.setColor("#ffffff");
      });

      nombre.on("pointerdown", () => {
        const actual = obtenerNivel(nivel.id);

        if (actual !== undefined) {
          this.editarNombre(nivel.id, actual.nombre, nombre, filaY);
        }
      });

      this.objetosLista.push(nombre);

      this.botonLista(400, y, 100, "Editar", () => {
        this.cerrarNombre(true);
        this.scene.start("editor", { nivelId: nivel.id });
      });

      this.botonLista(540, y, 110, "Eliminar", () => {
        this.cerrarNombre(true);
        eliminarNivel(nivel.id);
        this.mostrarNiveles();
      });

      this.botonLista(680, y, 110, "Duplicar", () => {
        this.cerrarNombre(true);
        duplicarNivel(nivel.id);
        this.mostrarNiveles();
      });

      y = y + 60;
    }

    if (niveles.length === 0) {
      const mensaje = this.add.text(
        40, 180, "No hay niveles para mostrar.",
        {
          fontFamily: "Fuente",
          fontSize: "16px",
          color: "#cbdbfc",
        },
      );
      this.objetosLista.push(mensaje);
    }

    if (this.textoPagina !== null) {
      this.textoPagina.setText(
        "Pagina " + (this.paginaActual + 1) + " de " + totalPaginas,
      );
    }

    this.activarBoton(this.botonAnterior, this.paginaActual > 0);
    this.activarBoton(
      this.botonSiguiente,
      this.paginaActual < totalPaginas - 1,
    );
  }

  // EDICION DEL NOMBRE

  private ajustarNombreVisible(
    texto: Phaser.GameObjects.Text,
    completo: string,
  ): void {
    texto.setText(completo);
    const caracteres = Array.from(completo);

    while (texto.width > 280 && caracteres.length > 0) {
      caracteres.pop();
      texto.setText(caracteres.join("") + "...");
    }
  }

  private cerrarNombre(guardar: boolean): void {
    if (this.finalizarNombre !== null) {
      this.finalizarNombre(guardar);
    }
  }

  private editarNombre(
    id: string,
    nombreOriginal: string,
    texto: Phaser.GameObjects.Text,
    y: number,
  ): void {
    this.cerrarNombre(true);
    this.cancelarBusquedaPendiente();

    const campo = crearCampoTexto(
      this, 36, y, 288, "Nombre del nivel", MAX_NOMBRE_NIVEL,
      () => {},
    );

    campo.input.value = nombreOriginal;
    texto.setVisible(false);

    const finalizar = (guardar: boolean): void => {
      if (this.finalizarNombre !== finalizar) {
        return;
      }

      this.finalizarNombre = null;

      const escrito = campo.input.value;
      campo.objeto.destroy();

      texto.setVisible(true);
      texto.setColor("#ffffff");

      if (guardar === false || escrito === nombreOriginal) {
        return;
      }

      const nuevoNombre = filtrarTexto(escrito, MAX_NOMBRE_NIVEL).trim();

      if (nuevoNombre === "" || nuevoNombre === nombreOriginal) {
        return;
      }

      renombrarNivel(id, nuevoNombre);
      this.ajustarNombreVisible(texto, nuevoNombre);
      this.programarBusqueda();
    };

    this.finalizarNombre = finalizar;

    campo.input.addEventListener("blur", () => {
      finalizar(true);
    });

    campo.input.addEventListener("keydown", (evento) => {
      if (evento.isComposing) {
        return;
      }

      if (evento.key === "Enter") {
        evento.preventDefault();
        finalizar(true);
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        finalizar(false);
      }
    });

    campo.input.focus();
    campo.input.select();
  }
}