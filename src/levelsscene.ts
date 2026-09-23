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

  ordenInvertido = false;
  busqueda = "";
  paginaActual = 0;
  nivelesPorPagina = 5;

  objetosLista: Phaser.GameObjects.GameObject[] = [];

  botonAnterior: Phaser.GameObjects.Rectangle | null = null;
  botonSiguiente: Phaser.GameObjects.Rectangle | null = null;
  textoPagina: Phaser.GameObjects.Text | null = null;

  finalizarNombre: ((guardar: boolean) => void) | null = null;

  ultimaPublicacion = new Map<string, number>();

  constructor() {
    super("LevelsScene");
  }

  init(data: {
    ordenInvertido?: boolean;
    busqueda?: string;
    pagina?: number;
  } = {}) {

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

    fondo.on(
      "pointerover",
      () => {
        fondo.setAlpha(0.8);
      }
    );

    fondo.on(
      "pointerout",
      () => {
        fondo.setAlpha(1);
      }
    );

    return fondo;
  }

  create() {

    if (!demo.usuarioActual) {
      this.scene.start("usuariosDemo");
      return;
    }

    this.add.text(
      400,
      30,
      "LEVELS",
      {
        fontFamily: "Fuente",
        fontSize: "26px",
        color: "#ffffff"
      }
    ).setOrigin(0.5);

    this.add.rectangle(
      400,
      300,
      680,
      480,
      0x171a2e
    ).setStrokeStyle(
      4,
      0x9ccc65
    );

    const campo = crearCampoTexto(
      this,
      72,
      105,
      499,
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

    this.boton(
      653,
      105,
      140,
      "Crear Nivel",
      () => {

        this.cerrarNombre(true);

        const nivel = crearNivel(10, 16);

        if (!nivel) {
          return;
        }

        this.scene.start(
          "editor",
          {
            nivelId: nivel.id
          }
        );
      },
      VERDE
    );

    this.botonAnterior = this.boton(
      159,
      495,
      170,
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
      495,
      "",
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#ffffff"
      }
    );

    this.textoPagina.setOrigin(0.5);

    this.botonSiguiente = this.boton(
      638,
      495,
      170,
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

    const cantidadAnterior =
      this.children.list.length;

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

    if (!boton) {
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

    for (const objeto of this.objetosLista) {
      objeto.destroy();
    }

    this.objetosLista = [];

    let niveles = obtenerNiveles();

    if (this.ordenInvertido) {
      niveles.reverse();
    }

    const consulta =
      this.normalizarBusqueda(this.busqueda);

    if (consulta !== "") {

      const encontrados = [];

      for (const nivel of niveles) {

        const nombre =
          this.normalizarBusqueda(nivel.nombre);

        if (nombre.includes(consulta)) {
          encontrados.push(nivel);
        }
      }

      niveles = encontrados;
    }

    let totalPaginas =
      Math.ceil(
        niveles.length /
        this.nivelesPorPagina
      );

    if (totalPaginas === 0) {
      totalPaginas = 1;
    }

    if (this.paginaActual < 0) {
      this.paginaActual = 0;
    }

    if (this.paginaActual >= totalPaginas) {
      this.paginaActual =
        totalPaginas - 1;
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

    let y = 172;

    for (let i = inicio; i < fin; i++) {

      const nivel = niveles[i];

      const tarjeta = this.add.rectangle(
        400,
        y,
        656,
        56,
        0x303653
      );

      tarjeta.setStrokeStyle(
        2,
        0x4b5275
      );

      this.objetosLista.push(tarjeta);

      const nombre = this.add.text(
        80,
        y,
        nivel.nombre,
        {
          fontFamily: "Fuente",
          fontSize: "16px",
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

          const actual =
            obtenerNivel(nivel.id);

          if (actual) {

            this.editarNombre(
              nivel.id,
              actual.nombre,
              nombre
            );
          }
        }
      );

      this.objetosLista.push(nombre);

      const usuario =
        demo.usuarioActual;

      let publicacion = undefined;

      if (usuario) {

        for (const actual of demo.niveles) {

          if (
            actual.id === Number(nivel.id) &&
            actual.autorId === usuario.id
          ) {
            publicacion = actual;
            break;
          }
        }
      }

      const clave =
        usuario.id + "-" + nivel.id;

      if (
        publicacion &&
        publicacion.publicado &&
        !this.ultimaPublicacion.has(clave)
      ) {
        this.ultimaPublicacion.set(
          clave,
          nivel.ultimaModificacion
        );
      }

      let textoPublicar = "Publicar";

      if (
        publicacion &&
        publicacion.publicado
      ) {

        const ultima =
          this.ultimaPublicacion.get(clave);

        if (
          ultima !== nivel.ultimaModificacion
        ) {
          textoPublicar = "Actualizar";
        } else {
          textoPublicar = "Despublicar";
        }
      }

      this.botonLista(
        349,
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
        456,
        y,
        90,
        "Eliminar",
        () => {

          this.cerrarNombre(true);

          if (publicacion) {
            publicacion.publicado = false;
          }

          this.ultimaPublicacion.delete(clave);

          eliminarNivel(nivel.id);

          this.mostrarNiveles();
        },
        ROJO
      );

      this.botonLista(
        563,
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

      let colorPublicar = VERDE;

      if (textoPublicar === "Actualizar") {
        colorPublicar = 0xe6c56a;
      }

      if (textoPublicar === "Despublicar") {
        colorPublicar = ROJO;
      }

      this.botonLista(
        670,
        y,
        90,
        textoPublicar,
        () => {

          const usuario =
            demo.usuarioActual;

          if (!usuario) {
            return;
          }

          const ultima =
            this.ultimaPublicacion.get(clave);

          if (!publicacion) {

            demo.niveles.push({
              id: Number(nivel.id),
              nombre: nivel.nombre,
              autorId: usuario.id,
              autor: usuario.nombre,
              publicado: true,
              descargas: 0,
              version: 1
            });

            this.ultimaPublicacion.set(
              clave,
              nivel.ultimaModificacion
            );

            this.mostrarNiveles();

            return;
          }

          if (!publicacion.publicado) {

            if (
              ultima !== undefined &&
              ultima !== nivel.ultimaModificacion
            ) {
              publicacion.version++;
            }

            publicacion.nombre =
              nivel.nombre;

            publicacion.autor =
              usuario.nombre;

            publicacion.publicado = true;

            this.ultimaPublicacion.set(
              clave,
              nivel.ultimaModificacion
            );

            this.mostrarNiveles();

            return;
          }

          if (
            ultima !== nivel.ultimaModificacion
          ) {

            publicacion.nombre =
              nivel.nombre;

            publicacion.autor =
              usuario.nombre;

            publicacion.version++;

            this.ultimaPublicacion.set(
              clave,
              nivel.ultimaModificacion
            );

            this.mostrarNiveles();

            return;
          }

          publicacion.publicado = false;

          this.mostrarNiveles();
        },
        colorPublicar
      );

      y = y + 64;
    }

    if (niveles.length === 0) {

      const mensaje = this.add.text(
        400,
        300,
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

    if (this.textoPagina) {

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
      this.paginaActual <
      totalPaginas - 1
    );
  }

  ajustarNombreVisible(
    texto: Phaser.GameObjects.Text,
    completo: string
  ) {

    texto.setText(completo);

    const caracteres =
      Array.from(completo);

    while (
      texto.width > 212 &&
      caracteres.length > 0
    ) {

      caracteres.pop();

      texto.setText(
        caracteres.join("") + "..."
      );
    }
  }

  cerrarNombre(guardar: boolean) {

    if (this.finalizarNombre) {
      this.finalizarNombre(guardar);
    }
  }

  editarNombre(
    id: string,
    nombreOriginal: string,
    texto: Phaser.GameObjects.Text
  ) {

    this.cerrarNombre(true);

    const input =
      document.createElement("input");

    input.type = "text";
    input.value = nombreOriginal;
    input.maxLength = MAX_NOMBRE_NIVEL;

    input.style.width = "212px";
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

    const objeto =
      this.add.dom(
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

      if (
        this.finalizarNombre !== finalizar
      ) {
        return;
      }

      this.finalizarNombre = null;

      const escrito =
        input.value;

      objeto.destroy();

      texto.setVisible(true);
      texto.setColor("#ffffff");

      if (
        !guardar ||
        escrito === nombreOriginal
      ) {
        return;
      }

      const nuevoNombre =
        filtrarTexto(
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

      const usuario =
        demo.usuarioActual;

      if (usuario) {

        const clave =
          usuario.id + "-" + id;

        for (const publicacion of demo.niveles) {

          if (
            publicacion.id === Number(id) &&
            publicacion.autorId === usuario.id
          ) {

            this.ultimaPublicacion.set(
              clave,
              -1
            );

            break;
          }
        }
      }

      this.mostrarNiveles();
    };

    this.finalizarNombre =
      finalizar;

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

