
import Phaser from "phaser";
import { spanish } from "./idioma";
import { crearBoton } from "./niveles";
import { leerNivelesOriginalesBackend, leerProgresoOriginalBackend } from "./api";
import type { NivelBackend } from "./api";
import { TransitionScene } from "./transitionScene";
import { demo, leerProgresoInvitado } from "./datosDemo";

export class LevelselectScene extends Phaser.Scene {
  textoOpciones: string[][] = [
    ["Loading levels...", "Cargando niveles..."],
    ["Could not load official levels.", "No se pudieron cargar los niveles oficiales."],
    ["Could not load progress.", "No se pudo cargar el progreso."],
    ["LEVEL SELECT", "SELECCIÓN DE NIVELES"],
    ["Back", "Volver"],
    ["No official levels available yet.", "Todavía no hay niveles oficiales disponibles."],
    ["Previous", "Anterior"],
    ["Next", "Siguiente"],
    [" levels completed", " niveles completados"]
  ];
  totalNiveles = 0;
  nivelesOficiales: NivelBackend[] = [];
  numeroCarga = 0;
  mensajeNiveles = "";

  columnas = 5;
  nivelesPorPagina = 15;
  tamanoCasilla = 72;
  separacion = 20;

  paginaActual = 0;
  nivelesCompletados = 0;
  progresoOficial: boolean[] = [];
  archivoGuardado = 1;
  usuarioProgreso = "";

  constructor() {
    super("selectscene");
  }

  async create() {
    const cargaActual = ++this.numeroCarga;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.numeroCarga++;
    });

    const usuario = demo.usuarioActual;
    let usuarioProgreso = "";

    if (usuario !== null && usuario !== undefined) {
      usuarioProgreso = usuario.id + ":" + usuario.nombre;
    }

    if (this.usuarioProgreso !== usuarioProgreso) {
      this.progresoOficial = [];
      this.nivelesCompletados = 0;
      this.usuarioProgreso = usuarioProgreso;
    }

    this.nivelesOficiales = [];
    this.totalNiveles = 0;
    this.mensajeNiveles = this.textoOpciones[0][spanish];
    this.dibujar();

    let oficiales: NivelBackend[];

    try {
      oficiales = await leerNivelesOriginalesBackend();

      oficiales.sort(function (a, b) {
        return a.id - b.id;
      });
    } catch (error) {
      if (cargaActual !== this.numeroCarga) {
        return;
      }

      console.error("Could not load official levels:", error);
      this.mensajeNiveles = this.textoOpciones[1][spanish];
      this.dibujar();
      return;
    }

    if (cargaActual !== this.numeroCarga) {
      return;
    }

    let progreso = this.progresoOficial;
    this.mensajeNiveles = "";

    if (
      usuario !== null &&
      usuario !== undefined &&
      usuario.id === 0
    ) {
      progreso = leerProgresoInvitado(this.archivoGuardado);
    }

    if (
      usuario !== null &&
      usuario !== undefined &&
      usuario.id !== 0
    ) {
      try {
        const progresoCargado = await leerProgresoOriginalBackend(
          usuario.nombre,
          this.archivoGuardado
        );

        if (Array.isArray(progresoCargado) === false) {
          throw new Error("The server did not return a progress list.");
        }

        progreso = progresoCargado;
      } catch (error) {
        if (cargaActual !== this.numeroCarga) {
          return;
        }

        console.error("Could not load official progress:", error);
        this.mensajeNiveles = this.textoOpciones[2][spanish];
      }
    }

    if (cargaActual !== this.numeroCarga) {
      return;
    }

    this.nivelesOficiales = oficiales;
    this.totalNiveles = oficiales.length;
    this.progresoOficial = progreso;
    this.nivelesCompletados = this.cantidadCompletados();

    if (this.nivelesCompletados > this.totalNiveles) {
      this.nivelesCompletados = this.totalNiveles;
    }

    const nivelActual = this.siguienteNivel();

    if (nivelActual <= this.totalNiveles) {
      this.paginaActual = Math.floor(
        (nivelActual - 1) / this.nivelesPorPagina
      );
    }

    this.dibujar();
  }

  dibujar() {
    for (let i = this.children.list.length - 1; i >= 0; i--) {
      const objeto = this.children.list[i];

      if (objeto.scene) {
        objeto.disableInteractive();
        objeto.destroy();
      }
    }

    this.cameras.main.setBackgroundColor("#222034");

    const titulo = this.add.text(400, 25, this.textoOpciones[3][spanish], {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "26px",
      color: "#cbdbfc"
    });

    titulo.setOrigin(0.5, 0);

    const centroTitulo = titulo.y + titulo.displayHeight / 2;

    this.boton(
      100,
      centroTitulo,
      120,
      this.textoOpciones[4][spanish],
      () => {
        const transition = this.scene.get("transition") as TransitionScene;

        transition.changeScene(
          this.sys.settings.key,
          "menu"
        );
      },
      0xb39ddb
    );

    if (this.totalNiveles === 0) {
      let mensaje = this.mensajeNiveles;

      if (mensaje === "") {
        mensaje = this.textoOpciones[5][spanish];
      }

      this.add.text(400, 300, mensaje, {
        padding: { top: 6, bottom: 6 },
        fontFamily: "Fuente",
        fontSize: "20px",
        color: "#cbdbfc",
        align: "center",
        wordWrap: { width: 640 }
      }).setOrigin(0.5);

      return;
    }

    if (this.mensajeNiveles !== "") {
      this.add.text(400, 72, this.mensajeNiveles, {
        padding: { top: 6, bottom: 6 },
        fontFamily: "Fuente",
        fontSize: "14px",
        color: "#ffd166",
        align: "center",
        wordWrap: { width: 640 }
      }).setOrigin(0.5, 0);
    }

    const paginas = this.calcularPaginas();

    if (this.paginaActual >= paginas) {
      this.paginaActual = paginas - 1;
    }

    const primerNivel = this.paginaActual * this.nivelesPorPagina + 1;
    let ultimoNivel = primerNivel + this.nivelesPorPagina - 1;

    if (ultimoNivel > this.totalNiveles) {
      ultimoNivel = this.totalNiveles;
    }

    const cantidadVisible = ultimoNivel - primerNivel + 1;
    const filasUsadas = Math.ceil(cantidadVisible / this.columnas);

    const anchoGrilla =
      this.columnas * this.tamanoCasilla +
      (this.columnas - 1) * this.separacion;

    const altoGrilla =
      filasUsadas * this.tamanoCasilla +
      (filasUsadas - 1) * this.separacion;

    const progreso = this.add.text(400, 0, this.textoProgreso(), {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "14px",
      color: "#a5b4ce"
    });

    progreso.setOrigin(0.5, 0);

    const margenArriba = 24;
    const margenAbajo = 28;
    const margenLateral = 32;
    const espacioProgreso = 20;

    const altoPanel =
      margenArriba +
      progreso.displayHeight +
      espacioProgreso +
      altoGrilla +
      margenAbajo;

    let altoGrupo = altoPanel;

    if (paginas > 1) {
      altoGrupo = altoGrupo + 24 + 40;
    }

    const centroGrupoY = 335;
    let arribaPanel = centroGrupoY - altoGrupo / 2;

    if (arribaPanel < 100) {
      arribaPanel = 100;
    }

    const yProgreso = arribaPanel + margenArriba;
    progreso.setPosition(400, yProgreso);

    const arribaGrilla =
      yProgreso + progreso.displayHeight + espacioProgreso;

    const abajoPanel = arribaPanel + altoPanel;

    const panel = this.add.rectangle(
      400,
      (arribaPanel + abajoPanel) / 2,
      anchoGrilla + margenLateral * 2,
      altoPanel,
      0x171a2e
    );

    panel.setStrokeStyle(4, 0xb39ddb);
    panel.setDepth(-1);

    this.dibujarNiveles(
      primerNivel,
      cantidadVisible,
      arribaGrilla
    );

    if (paginas > 1) {
      const margenPaginacion = 24;
      const yPaginacion = abajoPanel + margenPaginacion + 20;

      this.dibujarPaginacion(paginas, yPaginacion);
    }
  }

  dibujarNiveles(
    primerNivel: number,
    cantidad: number,
    arribaGrilla: number
  ) {
    const filas = Math.ceil(cantidad / this.columnas);
    let numeroNivel = primerNivel;

    for (let fila = 0; fila < filas; fila++) {
      let cantidadFila = cantidad - fila * this.columnas;

      if (cantidadFila > this.columnas) {
        cantidadFila = this.columnas;
      }

      const anchoFila =
        cantidadFila * this.tamanoCasilla +
        (cantidadFila - 1) * this.separacion;

      const primerX =
        400 - anchoFila / 2 + this.tamanoCasilla / 2;

      const y =
        arribaGrilla +
        this.tamanoCasilla / 2 +
        fila * (this.tamanoCasilla + this.separacion);

      for (let columna = 0; columna < cantidadFila; columna++) {
        const x =
          primerX +
          columna * (this.tamanoCasilla + this.separacion);

        this.crearNivel(x, y, numeroNivel);
        numeroNivel++;
      }
    }
  }

  crearNivel(x: number, y: number, numeroNivel: number) {
    const completado = this.nivelCompletado(numeroNivel);
    const actual = numeroNivel === this.siguienteNivel();

    let desbloqueado = false;

    if (completado) {
      desbloqueado = true;
    }

    if (actual) {
      desbloqueado = true;
    }

    let colorFondo = 0x4e566b;
    let colorBorde = 0x303653;
    let colorTexto = "#79869e";
    let colorHover = 0x4e566b;

    if (completado) {
      colorFondo = 0x9ccc65;
      colorHover = 0x7eaa4c;
      colorBorde = 0x222034;
      colorTexto = "#222034";
    }

    if (actual) {
      colorFondo = 0xffd166;
      colorHover = 0xd9ad4f;
      colorBorde = 0x222034;
      colorTexto = "#222034";
    }

    this.add.rectangle(
      x + 3,
      y + 3,
      this.tamanoCasilla + 4,
      this.tamanoCasilla + 4,
      0x14121e
    );

    const fondo = this.add.rectangle(
      x,
      y,
      this.tamanoCasilla,
      this.tamanoCasilla,
      colorFondo
    );

    fondo.setStrokeStyle(4, colorBorde);

    this.add.text(x, y, numeroNivel.toString(), {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "22px",
      color: colorTexto
    }).setOrigin(0.5);

    if (desbloqueado === false) {
      return;
    }

    fondo.setInteractive({ useHandCursor: true });

    fondo.on("pointerover", () => {
      fondo.setFillStyle(colorHover);
    });

    fondo.on("pointerout", () => {
      fondo.setFillStyle(colorFondo);
    });

    fondo.on("pointerdown", () => {
      this.abrirNivel(numeroNivel);
    });
  }

  dibujarPaginacion(paginas: number, y: number) {
    this.boton(
      280,
      y,
      150,
      this.textoOpciones[6][spanish],
      () => {
        if (this.paginaActual <= 0) {
          return;
        }

        this.paginaActual--;
        this.dibujar();
      },
      0xb39ddb,
      this.paginaActual > 0
    );

    this.add.text(
      400,
      y,
      (this.paginaActual + 1) + " / " + paginas,
      {
        padding: { top: 6, bottom: 6 },
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#b39ddb"
      }
    ).setOrigin(0.5);

    this.boton(
      520,
      y,
      150,
      this.textoOpciones[7][spanish],
      () => {
        if (this.paginaActual >= paginas - 1) {
          return;
        }

        this.paginaActual++;
        this.dibujar();
      },
      0xb39ddb,
      this.paginaActual < paginas - 1
    );
  }

  completarNivelActual() {
    if (this.nivelesCompletados >= this.totalNiveles) {
      return;
    }

    const nivel =
      this.nivelesOficiales[this.siguienteNivel() - 1];

    this.marcarNivelCompletado(nivel.id);

    const siguiente = this.siguienteNivel();

    if (siguiente <= this.totalNiveles) {
      this.paginaActual = Math.floor(
        (siguiente - 1) / this.nivelesPorPagina
      );
    }

    this.dibujar();
  }

  textoProgreso() {
    return (
      this.nivelesCompletados +
      " / " +
      this.totalNiveles +
      this.textoOpciones[8][spanish]
    );
  }

  calcularPaginas() {
    let paginas = Math.ceil(
      this.totalNiveles / this.nivelesPorPagina
    );

    if (paginas < 1) {
      paginas = 1;
    }

    return paginas;
  }

  nivelCompletado(numeroNivel: number) {
    const nivel = this.nivelesOficiales[numeroNivel - 1];

    if (nivel === undefined) {
      return false;
    }

    let indice = nivel.id;
    const usuario = demo.usuarioActual;

    if (
      usuario !== null &&
      usuario !== undefined &&
      usuario.id !== 0 &&
      this.progresoOficial.length === this.totalNiveles
    ) {
      indice = numeroNivel - 1;
    }

    return this.progresoOficial[indice] === true;
  }

  cantidadCompletados() {
    let cantidad = 0;

    for (let i = 1; i <= this.totalNiveles; i++) {
      if (this.nivelCompletado(i)) {
        cantidad++;
      }
    }

    return cantidad;
  }

  siguienteNivel() {
    for (let i = 1; i <= this.totalNiveles; i++) {
      if (this.nivelCompletado(i) === false) {
        return i;
      }
    }

    return this.totalNiveles + 1;
  }

  boton(
    x: number,
    y: number,
    ancho: number,
    titulo: string,
    accion: () => void,
    color = 0xcbdbfc,
    habilitado = true
  ) {
    const fondo = crearBoton(
      this,
      x,
      y,
      ancho,
      titulo,
      accion
    );

    fondo.removeAllListeners("pointerover");
    fondo.removeAllListeners("pointerout");
    fondo.setFillStyle(color);

    if (habilitado === false) {
      fondo.disableInteractive(true);
      fondo.removeAllListeners("pointermove");
      fondo.removeAllListeners("pointerdown");
      fondo.removeAllListeners("pointerup");
      fondo.setAlpha(0.35);
      return;
    }

    fondo.on("pointerover", () => {
      fondo.setAlpha(0.8);
    });

    fondo.on("pointerout", () => {
      fondo.setAlpha(1);
    });
  }

  marcarNivelCompletado(id: number) {
    for (let i = 0; i < this.nivelesOficiales.length; i++) {
      if (this.nivelesOficiales[i].id === id) {
        let indice = id;
        const usuario = demo.usuarioActual;

        if (
          usuario !== null &&
          usuario !== undefined &&
          usuario.id !== 0 &&
          this.progresoOficial.length === this.totalNiveles
        ) {
          indice = i;
        }

        this.progresoOficial[indice] = true;
        this.nivelesCompletados = this.cantidadCompletados();
        return;
      }
    }
  }

  abrirNivel(numeroNivel: number) {
    const nivel = this.nivelesOficiales[numeroNivel - 1];

    if (nivel === undefined) {
      return;
    }

    const ids: number[] = [];

    for (let i = 0; i < this.nivelesOficiales.length; i++) {
      ids.push(this.nivelesOficiales[i].id);
    }

    const transition = this.scene.get("transition") as TransitionScene;

    transition.changeScene(
      this.sys.settings.key,
      "game",
      {
        level: nivel.id,
        escenaAnterior: "selectscene",
        idsNivelesOficiales: ids
      }
    );
  }
}
