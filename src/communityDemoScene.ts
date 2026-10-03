import Phaser from "phaser";
import { InterfazDemo, VERDE, ROJO, NORMAL } from "./interfazDemo";
import { demo } from "./datosDemo";
import { obtenerNiveles, crearBoton } from "./niveles";
import { crearCampoTexto, MAX_BUSQUEDA } from "./camposTexto";
import { mostrarConfirmacion } from "./popup";

export class CommunityDemoScene extends InterfazDemo {
  pestana = "Community";
  busqueda = "";
  pagina = 0;

  paginasGuardadas = [0, 0, 0, 0];
  busquedasGuardadas = ["", "", "", ""];

  anchoFilaCreada = 640;
  altoFilaCreada = 52;

  filas: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("communityDemo");
  }

  init(datos: any) {
    this.pestana = "Community";
    this.busqueda = "";
    this.pagina = 0;
    this.filas = [];

    this.paginasGuardadas = [0, 0, 0, 0];
    this.busquedasGuardadas = ["", "", "", ""];

    if (datos) {
      if (datos.pestana === "Creados") {
        this.pestana = "Creados";

        if (typeof datos.busqueda === "string") {
          this.busqueda = datos.busqueda;
        }

        this.guardarPestana();
      }
    }
  }

  indicePestana(nombre: string) {
    if (nombre === "Creados") {
      return 1;
    }

    if (nombre === "Publicados") {
      return 2;
    }

    if (nombre === "Descargados") {
      return 3;
    }

    return 0;
  }

  guardarPestana() {
    const indice = this.indicePestana(this.pestana);

    this.paginasGuardadas[indice] = this.pagina;
    this.busquedasGuardadas[indice] = this.busqueda;
  }

  cambiarPestana(nombre: string) {
    this.guardarPestana();
    this.pestana = nombre;

    const indice = this.indicePestana(nombre);

    this.pagina = this.paginasGuardadas[indice];
    this.busqueda = this.busquedasGuardadas[indice];

    this.dibujar();
  }

  copiarMatriz(matriz: any) {
    const copia: number[][] = [];

    if (Array.isArray(matriz) === false) {
      return copia;
    }

    for (let fila = 0; fila < matriz.length; fila++) {
      const filaCopiada: number[] = [];

      for (let columna = 0; columna < matriz[fila].length; columna++) {
        filaCopiada.push(matriz[fila][columna]);
      }

      copia.push(filaCopiada);
    }

    return copia;
  }

  matricesIguales(primera: any, segunda: any) {
    if (Array.isArray(primera) === false) {
      return false;
    }

    if (Array.isArray(segunda) === false) {
      return false;
    }

    if (primera.length !== segunda.length) {
      return false;
    }

    for (let fila = 0; fila < primera.length; fila++) {
      if (primera[fila].length !== segunda[fila].length) {
        return false;
      }

      for (let columna = 0; columna < primera[fila].length; columna++) {
        if (primera[fila][columna] !== segunda[fila][columna]) {
          return false;
        }
      }
    }

    return true;
  }

  obtenerLinksNivel(nivel: any) {
    if (Array.isArray(nivel.links)) {
      return nivel.links;
    }

    return [];
  }

  buscarPublicacionDeNivel(nivel: any) {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return null;
    }

    for (let i = 0; i < demo.niveles.length; i++) {
      const publicacion: any = demo.niveles[i];

      if (
        publicacion.autorId === usuario.id &&
        publicacion.nivelOriginalId !== undefined &&
        String(publicacion.nivelOriginalId) === String(nivel.id)
      ) {
        return publicacion;
      }
    }

    for (let i = 0; i < demo.niveles.length; i++) {
      const publicacion: any = demo.niveles[i];

      if (
        publicacion.autorId === usuario.id &&
        publicacion.nivelOriginalId === undefined &&
        publicacion.nombre === nivel.nombre
      ) {
        publicacion.nivelOriginalId = nivel.id;
        return publicacion;
      }
    }

    return null;
  }

  publicacionDesactualizada(nivel: any, publicacion: any) {
    if (publicacion === null || publicacion === undefined) {
      return false;
    }

    if (publicacion.nombre !== nivel.nombre) {
      return true;
    }

    if (publicacion.tablero === undefined) {
      return true;
    }

    if (publicacion.portales === undefined) {
      return true;
    }

    if (publicacion.links === undefined) {
      return true;
    }

    if (this.matricesIguales(publicacion.tablero, nivel.tablero) === false) {
      return true;
    }

    if (this.matricesIguales(publicacion.portales, nivel.portales) === false) {
      return true;
    }

    const links = this.obtenerLinksNivel(nivel);

    if (this.matricesIguales(publicacion.links, links) === false) {
      return true;
    }

    return false;
  }

  copiarNivelAPublicacion(nivel: any, publicacion: any) {
    publicacion.nombre = nivel.nombre;
    publicacion.tablero = this.copiarMatriz(nivel.tablero);
    publicacion.portales = this.copiarMatriz(nivel.portales);
    publicacion.links = this.copiarMatriz(this.obtenerLinksNivel(nivel));
  }

  siguienteIdPublicacion() {
    let nuevoId = 1;

    for (let i = 0; i < demo.niveles.length; i++) {
      const publicacion: any = demo.niveles[i];
      const id = Number(publicacion.id);

      if (Number.isNaN(id) === false && id >= nuevoId) {
        nuevoId = id + 1;
      }
    }

    return nuevoId;
  }

  publicarNivel(nivel: any) {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    let publicacion = this.buscarPublicacionDeNivel(nivel);

    if (publicacion === null) {
      const publicaciones: any[] = demo.niveles;

      publicacion = {
        id: this.siguienteIdPublicacion(),
        nivelOriginalId: nivel.id,
        nombre: nivel.nombre,
        autorId: usuario.id,
        autor: usuario.nombre,
        version: 1,
        publicado: true,
        descargas: 0,
        tablero: this.copiarMatriz(nivel.tablero),
        portales: this.copiarMatriz(nivel.portales),
        links: this.copiarMatriz(this.obtenerLinksNivel(nivel))
      };

      publicaciones.push(publicacion);
      return;
    }

    const habiaCambios = this.publicacionDesactualizada(
      nivel,
      publicacion
    );

    if (habiaCambios) {
      this.copiarNivelAPublicacion(nivel, publicacion);

      if (typeof publicacion.version !== "number") {
        publicacion.version = 1;
      } else {
        publicacion.version++;
      }
    }

    publicacion.publicado = true;
  }

  actualizarPublicacion(nivel: any, publicacion: any) {
    if (publicacion === null || publicacion === undefined) {
      return;
    }

    this.copiarNivelAPublicacion(nivel, publicacion);

    if (typeof publicacion.version !== "number") {
      publicacion.version = 1;
    } else {
      publicacion.version++;
    }

    publicacion.publicado = true;
  }

  copiarPublicacionADescarga(publicacion: any, descarga: any) {
    descarga.nombre = publicacion.nombre;
    descarga.autor = publicacion.autor;
    descarga.version = publicacion.version;
    descarga.tablero = this.copiarMatriz(publicacion.tablero);
    descarga.portales = this.copiarMatriz(publicacion.portales);
    descarga.links = this.copiarMatriz(publicacion.links);
    descarga.completado = false;
  }

  estaDescargado(id: number) {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return false;
    }

    for (let i = 0; i < demo.descargas.length; i++) {
      const descarga = demo.descargas[i];

      if (
        descarga.usuarioId === usuario.id &&
        descarga.nivelId === id
      ) {
        return true;
      }
    }

    return false;
  }

  estaPublicado(nivel: any) {
    const publicacion = this.buscarPublicacionDeNivel(nivel);

    if (publicacion === null) {
      return false;
    }

    return publicacion.publicado === true;
  }

  obtenerCreadosOrdenados() {
    const niveles = obtenerNiveles().slice();

    for (let i = 0; i < niveles.length; i++) {
      for (let j = i + 1; j < niveles.length; j++) {
        if (
          niveles[j].ultimaModificacion >
          niveles[i].ultimaModificacion
        ) {
          const temporal = niveles[i];
          niveles[i] = niveles[j];
          niveles[j] = temporal;
        }
      }
    }

    const sinPublicar = [];
    const publicados = [];

    for (let i = 0; i < niveles.length; i++) {
      const nivel = niveles[i];

      if (this.estaPublicado(nivel)) {
        publicados.push(nivel);
      } else {
        sinPublicar.push(nivel);
      }
    }

    return sinPublicar.concat(publicados);
  }

  obtenerDescargadosOrdenados() {
    const pendientes = demo.descargas.slice(0, 0);
    const completados = demo.descargas.slice(0, 0);
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return pendientes;
    }

    for (let i = demo.descargas.length - 1; i >= 0; i--) {
      const descarga = demo.descargas[i];

      if (descarga.usuarioId === usuario.id) {
        if (descarga.completado) {
          completados.push(descarga);
        } else {
          pendientes.push(descarga);
        }
      }
    }

    return pendientes.concat(completados);
  }

  descargarNivel(nivel: any) {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    if (this.estaDescargado(nivel.id)) {
      return;
    }

    this.guardarPestana();

    const descargas: any[] = demo.descargas;

    descargas.push({
      usuarioId: usuario.id,
      nivelId: nivel.id,
      nombre: nivel.nombre,
      autor: nivel.autor,
      version: nivel.version,
      completado: false,
      tablero: this.copiarMatriz(nivel.tablero),
      portales: this.copiarMatriz(nivel.portales),
      links: this.copiarMatriz(nivel.links)
    });

    nivel.descargas++;

    this.pestana = "Descargados";
    this.busqueda = "";
    this.pagina = 0;

    this.dibujar();
  }

  boton(
    x: number,
    y: number,
    ancho: number,
    titulo: string,
    accion: () => void,
    color = NORMAL,
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

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pagina = 0;
      this.paginasGuardadas = [0, 0, 0, 0];
      this.filas = [];
    });

    if (
      demo.usuarioActual === null ||
      demo.usuarioActual === undefined
    ) {
      this.scene.start("usuariosDemo");
      return;
    }

    this.dibujar();
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
      grafico.fillRect(izquierda, arriba, ancho, alto);
      grafico.lineStyle(4, 0x171a2e);

      grafico.beginPath();
      grafico.moveTo(izquierda, abajo);
      grafico.lineTo(izquierda, arriba);
      grafico.lineTo(derecha, arriba);
      grafico.lineTo(derecha, abajo);
      grafico.strokePath();
    };

    dibujar(color);

    const zona = this.add.zone(x, y, ancho, alto);

    zona.setInteractive({
      useHandCursor: true
    });

    const textoTab = this.add.text(x, y, texto, {
      fontFamily: "Fuente",
      fontSize: "16px",
      color: "#222034"
    });

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

  dibujar() {
    for (let i = this.children.list.length - 1; i >= 0; i--) {
      const objeto = this.children.list[i];

      if (objeto.scene) {
        objeto.disableInteractive(true);
        objeto.destroy();
      }
    }

    this.limpiar();
    this.filas = [];

    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    const titulo = this.texto(
      400,
      25,
      "COMMUNITY LEVELS",
      26
    ).setOrigin(0.5, 0);

    const centroTitulo = titulo.y + titulo.displayHeight / 2;

    this.boton(
      100,
      centroTitulo,
      120,
      "Volver",
      () => {
        this.scene.start("menu");
      },
      0xb39ddb
    );

    const pestanas = [
      {
        nombre: "Community",
        color: 0x95add6,
        colorHover: 0xaec1e1,
        colorInactivo: 0x6f87b0
      },
      {
        nombre: "Creados",
        color: 0x9ccc65,
        colorHover: 0xb0d782,
        colorInactivo: 0x73994b
      },
      {
        nombre: "Publicados",
        color: 0xe6c56a,
        colorHover: 0xf0d58b,
        colorInactivo: 0xad934d
      },
      {
        nombre: "Descargados",
        color: 0xb39ddb,
        colorHover: 0xc7b5e7,
        colorInactivo: 0x8573a6
      }
    ];

    let colorActual = 0x95add6;

    for (let i = 0; i < pestanas.length; i++) {
      const pestana = pestanas[i];
      const activa = this.pestana === pestana.nombre;

      let y = 108;
      let alto = 44;
      let color = pestana.colorInactivo;

      if (activa) {
        y = 103;
        alto = 54;
        color = pestana.color;
        colorActual = pestana.color;
      }

      this.crearTab(
        145 + i * 170,
        y,
        170,
        alto,
        pestana.nombre,
        color,
        pestana.colorHover,
        activa,
        () => {
          this.cambiarPestana(pestana.nombre);
        }
      );
    }

    this.add.rectangle(
      400,
      345,
      720,
      430,
      0x171a2e
    ).setStrokeStyle(4, colorActual);

    const campo = crearCampoTexto(
      this,
      60,
      170,
      680,
      "Buscar por ID, autor o nombre",
      MAX_BUSQUEDA,
      (valor) => {
        this.busqueda = valor;
        this.pagina = 0;
        this.dibujarFilas();
      }
    );

    campo.input.value = this.busqueda;

    campo.input.addEventListener("keydown", (evento) => {
      if (evento.isComposing) {
        return;
      }

      if (evento.key === "Enter") {
        evento.preventDefault();
        evento.stopPropagation();
        campo.input.blur();
      }
    });

    this.dibujarFilas();
  }

  dibujarFilas() {
    for (let i = 0; i < this.filas.length; i++) {
      const objeto = this.filas[i];

      if (objeto.scene) {
        objeto.emit("ocultarTooltip");
        objeto.disableInteractive(true);
        objeto.destroy();
      }
    }

    this.filas = [];

    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    const cantidadAntes = this.children.list.length;

    if (this.pestana === "Creados") {
      this.mostrarCreados();
    }

    if (this.pestana === "Community") {
      this.mostrarCommunity();
    }

    if (this.pestana === "Publicados") {
      this.mostrarPublicados();
    }

    if (this.pestana === "Descargados") {
      this.mostrarDescargados();
    }

    for (
      let i = cantidadAntes;
      i < this.children.list.length;
      i++
    ) {
      this.filas.push(this.children.list[i]);
    }
  }

  crearBotonEditor() {
    const fondo = this.add.rectangle(
      400,
      249,
      this.anchoFilaCreada - 2,
      this.altoFilaCreada - 2,
      0x171a2e,
      0
    );

    fondo.setStrokeStyle(2, 0x6f87b0);
    fondo.setInteractive({ useHandCursor: true });

    const texto = this.texto(
      400,
      249,
      "Ir al editor",
      20
    ).setOrigin(0.5);

    texto.setColor("#cbdbfc");

    fondo.on("pointerover", () => {
      fondo.setFillStyle(0x95add6, 0.15);
      fondo.setStrokeStyle(2, 0x95add6);
      texto.setColor("#ffffff");
    });

    fondo.on("pointerout", () => {
      fondo.setFillStyle(0x171a2e, 0);
      fondo.setStrokeStyle(2, 0x6f87b0);
      texto.setColor("#cbdbfc");
    });

    fondo.on("pointerdown", () => {
      this.guardarPestana();

      this.scene.start("LevelsScene", {
        escenaAnterior: "communityDemo",
        busquedaCommunity: this.busqueda
      });
    });
  }

  mostrarCreados() {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    let niveles = this.obtenerCreadosOrdenados();
    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta.length > 0) {
      const filtrados = [];

      for (let i = 0; i < niveles.length; i++) {
        const nivel = niveles[i];
        let coincide = false;

        if (nivel.nombre.toLowerCase().indexOf(consulta) >= 0) {
          coincide = true;
        }

        if (String(nivel.id) === consulta) {
          coincide = true;
        }

        if (coincide) {
          filtrados.push(nivel);
        }
      }

      niveles = filtrados;
    }

    const paginas = Math.ceil((niveles.length + 1) / 4);
    this.corregirPagina(paginas);

    let inicio = this.pagina * 4 - 1;
    let cantidad = 4;
    let primeraY = 249;

    if (this.pagina === 0) {
      this.crearBotonEditor();
      inicio = 0;
      cantidad = 3;
      primeraY = 313;
    }

    const fin = inicio + cantidad;
    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        377,
        "No hay niveles creados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = primeraY + i * 64;

      this.add.rectangle(
        400,
        y,
        this.anchoFilaCreada,
        this.altoFilaCreada,
        0x171a2e
      );

      const nombre = this.texto(
        80,
        y,
        nivel.nombre,
        19
      ).setOrigin(0, 0.5);

      let visible = nivel.nombre;

      while (nombre.width > 300 && visible.length > 0) {
        visible = visible.substring(0, visible.length - 1);
        nombre.setText(visible + "...");
      }

      this.boton(
        475,
        y,
        150,
        "Test",
        () => {
          this.scene.start("game", {
            nivelId: nivel.id
          });
        },
        0xb39ddb
      );

      const publicacion = this.buscarPublicacionDeNivel(nivel);

      if (publicacion === null || publicacion.publicado === false) {
        this.boton(
          640,
          y,
          160,
          "Publicar",
          () => {
            mostrarConfirmacion(
              this,
              "Publicar nivel",
              '"' + nivel.nombre +
                '"\n\nAparecerá en Community y en tus niveles publicados.',
              "Publicar",
              VERDE,
              () => {
                this.publicarNivel(nivel);
                this.cambiarPestana("Publicados");
              }
            );
          },
          VERDE
        );
      } else if (this.publicacionDesactualizada(nivel, publicacion)) {
        this.boton(
          640,
          y,
          160,
          "Actualizar",
          () => {
            mostrarConfirmacion(
              this,
              "Actualizar publicación",
              '"' + nivel.nombre +
                '"\n\nSe publicará la versión nueva del nivel.',
              "Actualizar",
              0xe6c56a,
              () => {
                this.actualizarPublicacion(nivel, publicacion);
                this.dibujarFilas();
              }
            );
          },
          0xe6c56a
        );
      } else {
        this.boton(
          640,
          y,
          160,
          "Publicado",
          () => {},
          NORMAL,
          false
        );
      }
    }

    this.paginacion(paginas);
  }

  mostrarCommunity() {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    let niveles = [];

    for (let i = 0; i < demo.niveles.length; i++) {
      const nivel = demo.niveles[i];

      if (nivel.publicado === true) {
        niveles.push(nivel);
      }
    }

    niveles = this.buscarPublicaciones(niveles);

    for (let i = 0; i < niveles.length; i++) {
      for (let j = i + 1; j < niveles.length; j++) {
        if (niveles[j].descargas > niveles[i].descargas) {
          const temporal = niveles[i];
          niveles[i] = niveles[j];
          niveles[j] = temporal;
        }
      }
    }

    const paginas = this.calcularPaginas(niveles.length);
    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;
    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No hay niveles publicados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(400, y + 7, 680, 80, 0x171a2e);

      this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y,
        "ID " + nivel.id + " - " + nivel.autor,
        14
      ).setColor("#a5b4ce");

      this.texto(
        80,
        y + 23,
        nivel.descargas + " descargas",
        14
      ).setColor("#a5b4ce");

      const descargado = this.estaDescargado(nivel.id);
      let textoBoton = "Descargar";

      if (descargado) {
        textoBoton = "Descargado";
      }

      this.boton(
        630,
        y + 7,
        180,
        textoBoton,
        () => {
          this.descargarNivel(nivel);
        },
        VERDE,
        descargado === false
      );
    }

    this.paginacion(paginas);
  }

  mostrarPublicados() {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    let niveles = [];

    for (let i = 0; i < demo.niveles.length; i++) {
      const nivel = demo.niveles[i];

      if (
        nivel.autorId === usuario.id &&
        nivel.publicado === true
      ) {
        niveles.push(nivel);
      }
    }

    niveles = this.buscarPublicaciones(niveles);

    const paginas = this.calcularPaginas(niveles.length);
    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const visibles = niveles.slice(inicio, inicio + 3);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No tenés niveles publicados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(400, y + 7, 680, 80, 0x171a2e);

      const nombre = this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      let visible = nivel.nombre;

      while (nombre.width > 300 && visible.length > 0) {
        visible = visible.substring(0, visible.length - 1);
        nombre.setText(visible + "...");
      }

      this.texto(
        80,
        y,
        "ID " + nivel.id,
        14
      ).setColor("#a5b4ce");

      this.texto(
        80,
        y + 23,
        nivel.descargas + " descargas",
        14
      ).setColor("#a5b4ce");

      const descargado = this.estaDescargado(nivel.id);
      let textoDescarga = "Descargar";

      if (descargado) {
        textoDescarga = "Descargado";
      }

      this.boton(
        475,
        y + 7,
        150,
        textoDescarga,
        () => {
          this.descargarNivel(nivel);
        },
        VERDE,
        descargado === false
      );

      this.boton(
        640,
        y + 7,
        160,
        "Despublicar",
        () => {
          mostrarConfirmacion(
            this,
            "Despublicar nivel",
            '"' + nivel.nombre +
              '"\n\nDejará de aparecer en Community. Las copias descargadas se conservan.',
            "Despublicar",
            ROJO,
            () => {
              nivel.publicado = false;
              this.cambiarPestana("Creados");
            }
          );
        },
        ROJO
      );
    }

    this.paginacion(paginas);
  }

  mostrarDescargados() {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      return;
    }

    let niveles = this.obtenerDescargadosOrdenados();
    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta.length > 0) {
      const filtrados = [];

      for (let i = 0; i < niveles.length; i++) {
        const nivel = niveles[i];
        let coincide = false;

        if (String(nivel.nivelId) === consulta) {
          coincide = true;
        }

        if (nivel.nombre.toLowerCase().indexOf(consulta) >= 0) {
          coincide = true;
        }

        if (nivel.autor.toLowerCase().indexOf(consulta) >= 0) {
          coincide = true;
        }

        if (coincide) {
          filtrados.push(nivel);
        }
      }

      niveles = filtrados;
    }

    const paginas = this.calcularPaginas(niveles.length);
    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;
    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No tenés niveles descargados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {
      const nivel: any = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(400, y + 7, 680, 80, 0x171a2e);

      this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y,
        "ID " + nivel.nivelId + " · " + nivel.autor,
        14
      ).setColor("#a5b4ce");

      let estado = "Sin completar";

      if (nivel.completado) {
        estado = "Completado";
      }

      this.texto(
        80,
        y + 23,
        estado,
        14
      ).setColor("#a5b4ce");

      let original: any = null;

      for (let j = 0; j < demo.niveles.length; j++) {
        const publicacion: any = demo.niveles[j];

        if (
          publicacion.id === nivel.nivelId &&
          publicacion.publicado === true
        ) {
          original = publicacion;
          break;
        }
      }

      let hayActualizacion = false;

      if (original !== null) {
        if (original.version > nivel.version) {
          hayActualizacion = true;
        }
      }

      let textoBoton = "Jugar";
      let colorBoton = VERDE;

      if (hayActualizacion) {
        textoBoton = "Actualizar";
        colorBoton = 0xe6c56a;
      }

      this.boton(
        475,
        y + 7,
        150,
        textoBoton,
        () => {
          if (hayActualizacion && original !== null) {
            this.copiarPublicacionADescarga(original, nivel);
            this.dibujarFilas();
            return;
          }

          mostrarConfirmacion(
            this,
            "Partida de prueba",
            "¿Querés marcar este nivel como completado?",
            "Completar",
            VERDE,
            () => {
              nivel.completado = true;
              this.dibujar();
            }
          );
        },
        colorBoton
      );

      this.boton(
        640,
        y + 7,
        160,
        "Desinstalar",
        () => {
          mostrarConfirmacion(
            this,
            "Desinstalar nivel",
            '"' + nivel.nombre +
              '"\n\nSe quitará de Descargados junto con su progreso.',
            "Desinstalar",
            ROJO,
            () => {
              for (
                let j = demo.descargas.length - 1;
                j >= 0;
                j--
              ) {
                const descarga = demo.descargas[j];

                if (
                  descarga.usuarioId === usuario.id &&
                  descarga.nivelId === nivel.nivelId
                ) {
                  demo.descargas.splice(j, 1);
                }
              }

              this.dibujarFilas();
            }
          );
        },
        ROJO
      );
    }

    this.paginacion(paginas);
  }

  buscarPublicaciones(niveles: any[]) {
    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta === "") {
      return niveles;
    }

    const resultado = [];

    for (let i = 0; i < niveles.length; i++) {
      const nivel = niveles[i];
      let coincide = false;

      if (String(nivel.id) === consulta) {
        coincide = true;
      }

      if (nivel.nombre.toLowerCase().indexOf(consulta) >= 0) {
        coincide = true;
      }

      if (nivel.autor.toLowerCase().indexOf(consulta) >= 0) {
        coincide = true;
      }

      if (coincide) {
        resultado.push(nivel);
      }
    }

    return resultado;
  }

  calcularPaginas(cantidad: number) {
    let paginas = Math.ceil(cantidad / 3);

    if (paginas === 0) {
      paginas = 1;
    }

    return paginas;
  }

  corregirPagina(paginas: number) {
    if (this.pagina < 0) {
      this.pagina = 0;
    }

    if (this.pagina >= paginas) {
      this.pagina = paginas - 1;
    }

    this.guardarPestana();
  }

  paginacion(paginas: number) {
    this.boton(
      150,
      520,
      180,
      "Anterior",
      () => {
        this.pagina--;
        this.dibujarFilas();
      },
      NORMAL,
      this.pagina > 0
    );

    this.texto(
      400,
      520,
      "Página " + (this.pagina + 1) + " / " + paginas,
      16
    ).setOrigin(0.5);

    this.boton(
      650,
      520,
      180,
      "Siguiente",
      () => {
        this.pagina++;
        this.dibujarFilas();
      },
      NORMAL,
      this.pagina < paginas - 1
    );
  }
}