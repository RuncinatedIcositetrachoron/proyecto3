import Phaser from "phaser";

import {
  obtenerNiveles,
  obtenerNivel,
  crearNivel,
  eliminarNivel,
  crearBoton,
  renombrarNivel,
  duplicarNivel
} from "./niveles";

import {
  crearCampoTexto,
  filtrarTexto,
  MAX_BUSQUEDA,
  MAX_NOMBRE_NIVEL
} from "./camposTexto";

import { demo } from "./datosDemo";
import { NORMAL, VERDE, ROJO } from "./interfazDemo";

export class LevelsScene extends Phaser.Scene {

  busqueda = "";
  paginaActual = 0;
  nivelesPorPagina = 4;

  objetosLista: Phaser.GameObjects.GameObject[] = [];

  botonAnterior: Phaser.GameObjects.Rectangle | null = null;
  botonSiguiente: Phaser.GameObjects.Rectangle | null = null;
  textoPagina: Phaser.GameObjects.Text | null = null;

  finalizarNombre: ((guardar: boolean) => void) | null = null;

  constructor() {
    super("LevelsScene");
  }

  init() {
    this.busqueda = "";
    this.paginaActual = 0;
    this.objetosLista = [];
    this.botonAnterior = null;
    this.botonSiguiente = null;
    this.textoPagina = null;
    this.finalizarNombre = null;
  }

  boton(
    x: number,
    y: number,
    ancho: number,
    texto: string,
    accion: () => void,
    color = NORMAL
  ) {

    const fondo = crearBoton(
      this,
      x,
      y,
      ancho,
      texto,
      accion
    );

    fondo.removeAllListeners("pointerover");
    fondo.removeAllListeners("pointerout");

    fondo.setFillStyle(color);

    fondo.on("pointerover", () => {
      fondo.setAlpha(0.8);
    });

    fondo.on("pointerout", () => {
      fondo.setAlpha(1);
    });

    return fondo;
  }

  crearTab(
    x: number,
    y: number,
    ancho: number,
    alto: number,
    texto: string,
    color: number,
    colorHover: number,
    activa: boolean,
    accion: () => void
  ) {

    const grafico = this.add.graphics();

    const izquierda = x - ancho / 2;
    const derecha = x + ancho / 2;
    const arriba = y - alto / 2;
    const abajo = y + alto / 2;

    const dibujar = (colorActual: number) => {

      grafico.clear();

      grafico.fillStyle(colorActual);
      grafico.fillRect(
        izquierda,
        arriba,
        ancho,
        alto
      );

      grafico.lineStyle(
        4,
        0x171a2e
      );

      grafico.beginPath();

      grafico.moveTo(
        izquierda,
        abajo
      );

      grafico.lineTo(
        izquierda,
        arriba
      );

      grafico.lineTo(
        derecha,
        arriba
      );

      grafico.lineTo(
        derecha,
        abajo
      );

      grafico.strokePath();
    };

    dibujar(color);

    const zona = this.add.zone(
      x,
      y,
      ancho,
      alto
    );

    zona.setInteractive({
      useHandCursor: true
    });

    const textoTab = this.add.text(
      x,
      y,
      texto,
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#222034"
      }
    );

    textoTab.setOrigin(0.5);

    zona.on("pointerover", () => {

      if (activa === false) {
        dibujar(colorHover);
      }
    });

    zona.on("pointerout", () => {

      if (activa === false) {
        dibujar(color);
      }
    });

    zona.on("pointerdown", () => {

      if (activa === false) {
        accion();
      }
    });
  }

  create() {

    if (demo.usuarioActual === undefined || demo.usuarioActual === null) {
      this.scene.start("usuariosDemo");
      return;
    }

    this.add.text(
      400,
      25,
      "MIS NIVELES",
      {
        fontFamily: "Fuente",
        fontSize: "26px",
        color: "#cbdbfc"
      }
    ).setOrigin(0.5, 0);

    this.crearTab(
      230,
      103,
      340,
      54,
      "Mis niveles",
      0x9ccc65,
      0xb0d782,
      true,
      () => {}
    );

    this.crearTab(
      570,
      108,
      340,
      44,
      "Crear nivel",
      0x73994b,
      0xb0d782,
      false,
      () => {

        this.cerrarNombre(true);

        const nivel = crearNivel(10, 16);

        if (nivel === undefined || nivel === null) {
          return;
        }

        this.scene.start(
          "editor",
          {
            nivelId: nivel.id
          }
        );
      }
    );

    this.add.rectangle(
      400,
      345,
      720,
      430,
      0x171a2e
    ).setStrokeStyle(
      4,
      0x9ccc65
    );

    const campo = crearCampoTexto(
      this,
      60,
      170,
      680,
      "Buscar nivel...",
      MAX_BUSQUEDA,
      (valor) => {

        this.busqueda = valor;
        this.paginaActual = 0;

        this.mostrarNiveles();
      }
    );

    this.busqueda = filtrarTexto(
      this.busqueda,
      MAX_BUSQUEDA
    );

    campo.input.value = this.busqueda;

    campo.input.addEventListener(
      "keydown",
      (evento) => {

        if (evento.isComposing) {
          return;
        }

        if (evento.key === "Enter") {

          evento.preventDefault();

          this.mostrarNiveles();
        }

        if (evento.key === "Escape") {

          evento.preventDefault();

          campo.input.value = "";
          this.busqueda = "";
          this.paginaActual = 0;

          this.mostrarNiveles();
        }
      }
    );

    this.botonAnterior = this.boton(
      150,
      520,
      180,
      "Anterior",
      () => {

        this.cerrarNombre(true);

        if (this.paginaActual > 0) {
          this.paginaActual--;
          this.mostrarNiveles();
        }
      },
      NORMAL
    );

    this.textoPagina = this.add.text(
      400,
      520,
      "",
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#cbdbfc"
      }
    );

    this.textoPagina.setOrigin(0.5);

    this.botonSiguiente = this.boton(
      650,
      520,
      180,
      "Siguiente",
      () => {

        this.cerrarNombre(true);

        this.paginaActual++;

        this.mostrarNiveles();
      },
      NORMAL
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {

        this.cerrarNombre(false);
        this.objetosLista = [];
      }
    );

    this.mostrarNiveles();
  }

  normalizarBusqueda(texto: string) {

    texto = texto.trim();
    texto = texto.toLowerCase();

    return texto;
  }

  botonLista(
    x: number,
    y: number,
    ancho: number,
    texto: string,
    accion: () => void,
    color = NORMAL
  ) {

    const cantidadAnterior = this.children.list.length;

    this.boton(
      x,
      y,
      ancho,
      texto,
      accion,
      color
    );

    for (
      let i = cantidadAnterior;
      i < this.children.list.length;
      i++
    ) {
      this.objetosLista.push(
        this.children.list[i]
      );
    }
  }

  activarBoton(
    boton: Phaser.GameObjects.Rectangle | null,
    activo: boolean
  ) {

    if (boton === null) {
      return;
    }

    if (activo) {

      boton.setInteractive({
        useHandCursor: true
      });

      boton.setFillStyle(NORMAL);
      boton.setAlpha(1);

    } else {

      boton.disableInteractive();
      boton.setFillStyle(NORMAL);
      boton.setAlpha(0.35);
      boton.emit("ocultarTooltip");
    }
  }

  mostrarNiveles() {

    this.cerrarNombre(true);

    for (let i = 0; i < this.objetosLista.length; i++) {

      const objeto = this.objetosLista[i];

      if (objeto.scene) {
        objeto.disableInteractive();
        objeto.destroy();
      }
    }

    this.objetosLista = [];

    let niveles = obtenerNiveles();

    const consulta = this.normalizarBusqueda(
      this.busqueda
    );

    if (consulta !== "") {

      const encontrados = [];

      for (let i = 0; i < niveles.length; i++) {

        const nivel = niveles[i];

        const nombre = this.normalizarBusqueda(
          nivel.nombre
        );

        if (nombre.indexOf(consulta) !== -1) {
          encontrados.push(nivel);
        }
      }

      niveles = encontrados;
    }

    let totalPaginas = Math.ceil(
      niveles.length / this.nivelesPorPagina
    );

    if (totalPaginas === 0) {
      totalPaginas = 1;
    }

    if (this.paginaActual < 0) {
      this.paginaActual = 0;
    }

    if (this.paginaActual >= totalPaginas) {
      this.paginaActual = totalPaginas - 1;
    }

    const inicio =
      this.paginaActual *
      this.nivelesPorPagina;

    let fin =
      inicio +
      this.nivelesPorPagina;

    if (fin > niveles.length) {
      fin = niveles.length;
    }

    let y = 230;

    for (let i = inicio; i < fin; i++) {

      const nivel = niveles[i];

      const nombre = this.add.text(
        80,
        y,
        nivel.nombre,
        {
          fontFamily: "Fuente",
          fontSize: "18px",
          color: "#ffffff"
        }
      );

      nombre.setOrigin(
        0,
        0.5
      );

      nombre.setInteractive({
        useHandCursor: true
      });

      this.ajustarNombreVisible(
        nombre,
        nivel.nombre
      );

      nombre.on(
        "pointerover",
        () => {
          nombre.setColor("#ffd166");
        }
      );

      nombre.on(
        "pointerout",
        () => {
          nombre.setColor("#ffffff");
        }
      );

      nombre.on(
        "pointerdown",
        () => {

          const actual = obtenerNivel(
            nivel.id
          );

          if (actual === undefined || actual === null) {
            return;
          }

          this.editarNombre(
            nivel.id,
            actual.nombre,
            nombre
          );
        }
      );

      this.objetosLista.push(nombre);

      this.botonLista(
        390,
        y,
        90,
        "Editar",
        () => {

          this.cerrarNombre(true);

          this.scene.start(
            "editor",
            {
              nivelId: nivel.id
            }
          );
        },
        NORMAL
      );

      this.botonLista(
        490,
        y,
        90,
        "Test",
        () => {

          this.cerrarNombre(true);

          this.scene.start(
            "game",
            {
              nivelId: nivel.id
            }
          );
        },
        VERDE
      );

      this.botonLista(
        590,
        y,
        90,
        "Duplicar",
        () => {

          this.cerrarNombre(true);

          duplicarNivel(nivel.id);

          this.mostrarNiveles();
        },
        0xb39ddb
      );

      this.botonLista(
        690,
        y,
        90,
        "Eliminar",
        () => {

          this.cerrarNombre(true);

          eliminarNivel(nivel.id);

          this.mostrarNiveles();
        },
        ROJO
      );

      if (i < fin - 1) {

        const linea = this.add.rectangle(
          400,
          y + 34,
          680,
          2,
          0x303653
        );

        this.objetosLista.push(linea);
      }

      y = y + 64;
    }

    if (niveles.length === 0) {

      const mensaje = this.add.text(
        400,
        345,
        "No hay niveles para mostrar.",
        {
          fontFamily: "Fuente",
          fontSize: "16px",
          color: "#cbdbfc"
        }
      );

      mensaje.setOrigin(0.5);

      this.objetosLista.push(mensaje);
    }

    if (this.textoPagina !== null) {

      this.textoPagina.setText(
        "Página " +
        (this.paginaActual + 1) +
        " / " +
        totalPaginas
      );
    }

    this.activarBoton(
      this.botonAnterior,
      this.paginaActual > 0
    );

    this.activarBoton(
      this.botonSiguiente,
      this.paginaActual < totalPaginas - 1
    );
  }

  ajustarNombreVisible(
    texto: Phaser.GameObjects.Text,
    completo: string
  ) {

    texto.setText(completo);

    let visible = completo;

    while (
      texto.width > 250 &&
      visible.length > 0
    ) {

      visible = visible.substring(
        0,
        visible.length - 1
      );

      texto.setText(
        visible + "..."
      );
    }
  }

  cerrarNombre(guardar: boolean) {

    if (this.finalizarNombre !== null) {
      this.finalizarNombre(guardar);
    }
  }

  editarNombre(
    id: string,
    nombreOriginal: string,
    texto: Phaser.GameObjects.Text
  ) {

    this.cerrarNombre(true);

    const input = document.createElement(
      "input"
    );

    input.type = "text";
    input.value = nombreOriginal;
    input.maxLength = MAX_NOMBRE_NIVEL;

    input.style.width = "250px";
    input.style.height = "36px";
    input.style.boxSizing = "border-box";
    input.style.margin = "0";
    input.style.fontFamily = '"Fuente", monospace';
    input.style.fontSize = "16px";
    input.style.lineHeight = "32px";
    input.style.backgroundColor = "#171a2e";
    input.style.color = "#ffffff";
    input.style.border = "2px solid #ffd166";
    input.style.borderRadius = "0";
    input.style.paddingLeft = "8px";
    input.style.paddingRight = "8px";
    input.style.paddingTop = "0";
    input.style.paddingBottom = "0";
    input.style.outline = "none";
    input.style.verticalAlign = "middle";

    const objeto = this.add.dom(
      80,
      texto.y,
      input
    );

    objeto.setOrigin(
      0,
      0.5
    );

    objeto.setDepth(100);

    texto.setVisible(false);

    const finalizar = (
      guardar: boolean
    ) => {

      if (this.finalizarNombre !== finalizar) {
        return;
      }

      this.finalizarNombre = null;

      const escrito = input.value;

      objeto.destroy();

      texto.setVisible(true);
      texto.setColor("#ffffff");

      if (
        guardar === false ||
        escrito === nombreOriginal
      ) {
        return;
      }

      const nuevoNombre = filtrarTexto(
        escrito,
        MAX_NOMBRE_NIVEL
      ).trim();

      if (
        nuevoNombre === "" ||
        nuevoNombre === nombreOriginal
      ) {
        return;
      }

      renombrarNivel(
        id,
        nuevoNombre
      );

      this.mostrarNiveles();
    };

    this.finalizarNombre = finalizar;

    input.addEventListener(
      "pointerdown",
      (evento) => {
        evento.stopPropagation();
      }
    );

    input.addEventListener(
      "keydown",
      (evento) => {

        evento.stopPropagation();

        if (evento.isComposing) {
          return;
        }

        if (evento.key === "Enter") {

          evento.preventDefault();

          finalizar(true);
        }

        if (evento.key === "Escape") {

          evento.preventDefault();

          finalizar(false);
        }
      }
    );

    input.addEventListener(
      "blur",
      () => {
        finalizar(true);
      }
    );

    input.focus();
    input.select();
  }
}
