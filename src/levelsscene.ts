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

export class LevelsScene extends Phaser.Scene {

  ordenInvertido = false;
  busqueda = "";
  paginaActual = 0;
  nivelesPorPagina = 6;

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

  create() {

    if (!demo.usuarioActual) {
      this.scene.start("usuariosDemo");
      return;
    }

    this.add.text(
      40,
      30,
      "Level Editor",
      {
        fontFamily: "Fuente",
        fontSize: "28px",
        color: "#ffffff"
      }
    );

    crearBoton(
      this,
      120,
      90,
      120,
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
      }
    );

    crearBoton(
      this,
      260,
      90,
      120,
      "Invertir Orden",
      () => {

        this.cerrarNombre(true);

        this.ordenInvertido = !this.ordenInvertido;

        this.mostrarNiveles();
      }
    );

    // BUSQUEDA

    const campo = crearCampoTexto(
      this,
      450,
      90,
      300,
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

    // PAGINACION

    this.botonAnterior = crearBoton(
      this,
      100,
      550,
      100,
      "Anterior",
      () => {

        this.cerrarNombre(true);

        if (this.paginaActual > 0) {
          this.paginaActual--;
          this.mostrarNiveles();
        }
      }
    );

    this.textoPagina = this.add.text(
      300,
      550,
      "",
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#ffffff"
      }
    );

    this.textoPagina.setOrigin(0.5);

    this.botonSiguiente = crearBoton(
      this,
      500,
      550,
      100,
      "Siguiente",
      () => {

        this.cerrarNombre(true);

        this.paginaActual++;

        this.mostrarNiveles();
      }
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

  // BUSQUEDA

  normalizarBusqueda(texto: string) {

    texto = texto.trim();
    texto = texto.toLowerCase();

    return texto;
  }

  // BOTONES DE LA LISTA

  botonLista(
    x: number,
    y: number,
    ancho: number,
    texto: string,
    accion: () => void
  ) {

    const cantidadAnterior =
      this.children.list.length;

    crearBoton(
      this,
      x,
      y,
      ancho,
      texto,
      accion
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

      boton.setFillStyle(0xcbdbfc);

    } else {

      boton.disableInteractive();
      boton.setFillStyle(0x999999);
      boton.emit("ocultarTooltip");
    }
  }

  // LISTA DE NIVELES

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

    let y = 180;

    for (let i = inicio; i < fin; i++) {

      const nivel = niveles[i];

      const nombre = this.add.text(
        40,
        y,
        nivel.nombre,
        {
          fontFamily: "Fuente",
          fontSize: "16px",
          color: "#ffffff"
        }
      );

      nombre.setOrigin(0, 0.5);

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
              nombre,
              y
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

      // EDITAR

      this.botonLista(
        350,
        y,
        80,
        "Editar",
        () => {

          this.cerrarNombre(true);

          this.scene.start(
            "editor",
            {
              nivelId: nivel.id
            }
          );
        }
      );

      // ELIMINAR

      this.botonLista(
        445,
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
        }
      );

      // DUPLICAR

      this.botonLista(
        545,
        y,
        90,
        "Duplicar",
        () => {

          this.cerrarNombre(true);

          duplicarNivel(nivel.id);

          this.mostrarNiveles();
        }
      );

      this.botonLista(
        680,
        y,
        170,
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
        }
      );

      y = y + 60;
    }

    if (niveles.length === 0) {

      const mensaje = this.add.text(
        40,
        180,
        "No hay niveles para mostrar.",
        {
          fontFamily: "Fuente",
          fontSize: "16px",
          color: "#cbdbfc"
        }
      );

      this.objetosLista.push(mensaje);
    }

    if (this.textoPagina) {

      this.textoPagina.setText(
        "Pagina " +
        (this.paginaActual + 1) +
        " de " +
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

  // EDICION DEL NOMBRE

  ajustarNombreVisible(
    texto: Phaser.GameObjects.Text,
    completo: string
  ) {

    texto.setText(completo);

    const caracteres =
      Array.from(completo);

    while (
      texto.width > 270 &&
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
    texto: Phaser.GameObjects.Text,
    y: number
  ) {

    this.cerrarNombre(true);

    const campo = crearCampoTexto(
      this,
      36,
      y,
      270,
      "Nombre del nivel",
      MAX_NOMBRE_NIVEL,
      () => {}
    );

    campo.input.value =
      nombreOriginal;

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
        campo.input.value;

      campo.objeto.destroy();

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

    campo.input.addEventListener(
      "blur",
      () => {
        finalizar(true);
      }
    );

    campo.input.addEventListener(
      "keydown",
      (evento) => {

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

    campo.input.focus();
    campo.input.select();
  }
}