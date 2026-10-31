import { COLORES, colorTexto, oscurecerColor } from "./colores";

import Phaser from "phaser";
import { spanish } from "./configs";
import { InterfazDemo, VERDE, ROJO, NORMAL } from "./interfazDemo";
import { demo } from "./datosDemo";
import { obtenerNiveles, crearBoton, cargarNivelesServidor } from "./niveles";
import { crearCampoTexto, MAX_BUSQUEDA } from "./camposTexto";
import { mostrarConfirmacion, mostrarAviso } from "./popup";
import {
  leerPublicaciones, leerNivelesUsuario, leerNivelesGuardadosBackend,
  publicarNivelBackend, actualizarPublicacionBackend, despublicarNivelBackend,
  leerNivelPublicadoBackend, descargarNivelBackend, eliminarNivelGuardadoBackend,
  esNivelDelEditorBackend
} from "./api";
import { apiAEditor } from "./parserApi";
import { TransitionScene } from "./transitionScene";

export class CommunityDemoScene extends InterfazDemo {
  textoOpciones: string[][] = [
    ["Could not load levels", "No se pudieron cargar los niveles"],
    ["Name Unavailable", "Nombre no disponible"],
    ["Another published level already has that name.\n\nChoose a different name for your level and try again.", "Ya existe otro nivel publicado con ese nombre.\n\nElegí otro nombre para tu nivel e intentá de nuevo."],
    ["Could not publish the level", "No se pudo publicar el nivel"],
    ["The published level ID has changed.", "Cambió el ID del nivel publicado."],
    ["Could not update the published level", "No se pudo actualizar el nivel publicado"],
    ["Could not hide the level", "No se pudo ocultar el nivel"],
    ["Downloads: unavailable", "Descargas: no disponibles"],
    [" downloads", " descargas"],
    ["Could not download the level", "No se pudo descargar el nivel"],
    ["Could not refresh levels", "No se pudieron actualizar los niveles"],
    ["COMMUNITY LEVELS", "NIVELES DE LA COMUNIDAD"],
    ["Back", "Volver"],
    ["Community", "Comunidad"],
    ["Created", "Creados"],
    ["Published", "Publicados"],
    ["Downloaded", "Descargados"],
    ["Search by ID, author or name", "Buscar por ID, autor o nombre"],
    ["Open Editor", "Abrir editor"],
    ["No created levels.", "No hay niveles creados."],
    ["Test", "Probar"],
    ["Publish", "Publicar"],
    ["Publish Level", "Publicar nivel"],
    ["\"\n\nIt will appear in Community and your published levels.", "\"\n\nAparecerá en Comunidad y en tus niveles publicados."],
    ["Update", "Actualizar"],
    ["Update Published Level", "Actualizar nivel publicado"],
    ["\"\n\nThe new version of the level will be published.", "\"\n\nSe publicará la nueva versión del nivel."],
    ["Published", "Publicado"],
    ["No published levels.", "No hay niveles publicados."],
    ["Download", "Descargar"],
    ["Downloaded", "Descargado"],
    ["You have no published levels.", "No tenés niveles publicados."],
    ["Version ", "Versión "],
    ["Hide", "Ocultar"],
    ["Hide Level", "Ocultar nivel"],
    ["\"\n\nIt will no longer appear in Community. Downloaded copies will be kept.", "\"\n\nDejará de aparecer en Comunidad. Las copias descargadas se conservan."],
    ["You have no downloaded levels.", "No tenés niveles descargados."],
    ["Not completed", "Sin completar"],
    ["Completed", "Completado"],
    ["Play", "Jugar"],
    ["Could not update the download", "No se pudo actualizar la descarga"],
    ["Uninstall", "Desinstalar"],
    ["Uninstall Level", "Desinstalar nivel"],
    ["\"\n\nIt will be removed from Downloaded. You can download it again.", "\"\n\nSe quitará de Descargados. Podés volver a descargarlo."],
    ["Could not uninstall the download", "No se pudo desinstalar la descarga"],
    ["Previous", "Anterior"],
    ["Page ", "Página "],
    ["Next", "Siguiente"]
  ];
  pestana = "Community";
  busqueda = "";
  pagina = 0;
  paginasGuardadas = [0, 0, 0, 0];
  busquedasGuardadas = ["", "", "", ""];
  anchoFilaCreada = 640;
  altoFilaCreada = 52;
  filas: Phaser.GameObjects.GameObject[] = [];
  accionEnCurso = false;

  constructor() { super("communityDemo"); }

  init(datos: any) {
    this.accionEnCurso = false;
    this.pestana = "Community";
    this.busqueda = "";
    this.pagina = 0;
    this.filas = [];
    this.paginasGuardadas = [0, 0, 0, 0];
    this.busquedasGuardadas = ["", "", "", ""];
    if (datos && datos.pestana === "Creados") {
      this.pestana = "Creados";
      if (typeof datos.busqueda === "string") this.busqueda = datos.busqueda;
      this.guardarPestana();
    }
  }

  indicePestana(nombre: string) {
    if (nombre === "Creados") return 1;
    if (nombre === "Publicados") return 2;
    if (nombre === "Descargados") return 3;
    return 0;
  }

  guardarPestana() {
    const i = this.indicePestana(this.pestana);
    this.paginasGuardadas[i] = this.pagina;
    this.busquedasGuardadas[i] = this.busqueda;
  }

  cambiarPestana(nombre: string) {
    this.guardarPestana();
    this.pestana = nombre;
    const i = this.indicePestana(nombre);
    this.pagina = this.paginasGuardadas[i];
    this.busqueda = this.busquedasGuardadas[i];
    this.dibujar();
  }

  copiarMatriz(matriz: any): number[][] {
    if (!Array.isArray(matriz)) return [];
    const copia: number[][] = [];
    for (let i = 0; i < matriz.length; i++) copia.push(matriz[i].slice());
    return copia;
  }

  matricesIguales(a: any, b: any): boolean {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let y = 0; y < a.length; y++) {
      if (!Array.isArray(a[y]) || !Array.isArray(b[y]) || a[y].length !== b[y].length) return false;
      for (let x = 0; x < a[y].length; x++) {
        if (a[y][x] !== b[y][x]) return false;
      }
    }
    return true;
  }

  obtenerLinksNivel(nivel: any): number[][] {
    if (Array.isArray(nivel.links)) return nivel.links;
    return [];
  }

  buscarPublicacionDeNivel(nivel: any): any {
    const usuario = demo.usuarioActual;
    if (!usuario) return null;
    for (let i = 0; i < demo.niveles.length; i++) {
      const publicacion: any = demo.niveles[i];
      if (publicacion.autor === usuario.nombre && publicacion.nivelOriginalId === nivel.id) return publicacion;
    }
    return null;
  }

  publicacionDesactualizada(nivel: any, publicacion: any): boolean {
    if (!publicacion) return false;
    if (nivel.nombre !== publicacion.nombre) return true;
    if (!this.matricesIguales(nivel.tablero, publicacion.tablero)) return true;
    if (!this.matricesIguales(nivel.portales, publicacion.portales)) return true;
    return !this.matricesIguales(this.obtenerLinksNivel(nivel), this.obtenerLinksNivel(publicacion));
  }

  async operar(
    accion: () => Promise<void>,
    titulo = this.textoOpciones[0][spanish]
  ): Promise<boolean> {
    if (this.accionEnCurso) return false;
    this.accionEnCurso = true;
    try {
      await accion();
      return true;
    } catch (error: any) {
      if (this.scene.isActive()) {
        const mensaje = error.message || String(error);
        if (mensaje.indexOf("Ya existe otra publicacion con ese nombre.") !== -1 ||
            mensaje.indexOf("Another published level already has that name.") !== -1) {
          mostrarAviso(
            this,
            this.textoOpciones[1][spanish],
            this.textoOpciones[2][spanish]
          );
        } else {
          window.alert(titulo + "\n\n" + mensaje);
        }
      }
      return false;
    } finally {
      this.accionEnCurso = false;
    }
  }

  async publicarNivel(nivel: any) {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0) return;
    await this.operar(async () => {
      await publicarNivelBackend(usuario.nombre, nivel.nombre, nivel);
      if (demo.usuarioActual !== usuario) return;
      await this.cargarPublicaciones();
      if (this.scene.isActive()) this.cambiarPestana("Publicados");
    }, this.textoOpciones[3][spanish]);
  }

  async actualizarPublicacion(nivel: any, publicacion: any) {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0 || !publicacion || publicacion.autor !== usuario.nombre) return;
    await this.operar(async () => {
      const actual = await leerNivelPublicadoBackend(publicacion.nombre);
      if (actual.id !== publicacion.id) throw new Error(this.textoOpciones[4][spanish]);
      await actualizarPublicacionBackend(usuario.nombre, nivel, actual);
      if (demo.usuarioActual === usuario) await this.cargarPublicaciones();
    }, this.textoOpciones[5][spanish]);
  }

  async despublicarNivel(nivel: any) {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0 || nivel.autor !== usuario.nombre) return;
    await this.operar(async () => {
      await despublicarNivelBackend(nivel.nombre);
      if (demo.usuarioActual !== usuario) return;
      await this.cargarPublicaciones();
      if (this.scene.isActive()) this.cambiarPestana("Creados");
    }, this.textoOpciones[6][spanish]);
  }

  textoDescargas(cantidad: number): string {
    if (cantidad < 0) return this.textoOpciones[7][spanish];
    return cantidad + this.textoOpciones[8][spanish];
  }

  estaDescargado(id: number): boolean {
    const usuario = demo.usuarioActual;
    if (!usuario) return false;
    for (let i = 0; i < demo.descargas.length; i++) {
      if (demo.descargas[i].usuarioId === usuario.id && demo.descargas[i].nivelId === id) return true;
    }
    return false;
  }

  estaPublicado(nivel: any): boolean {
    const publicacion = this.buscarPublicacionDeNivel(nivel);
    return publicacion !== null && publicacion.publicado === true;
  }

  obtenerCreadosOrdenados() {
    const niveles = obtenerNiveles().slice();
    niveles.sort((a, b) => b.ultimaModificacion - a.ultimaModificacion);
    const sinPublicar = [];
    const publicados = [];
    for (let i = 0; i < niveles.length; i++) {
      if (this.estaPublicado(niveles[i])) publicados.push(niveles[i]);
      else sinPublicar.push(niveles[i]);
    }
    return sinPublicar.concat(publicados);
  }

  obtenerDescargadosOrdenados() {
    const pendientes: any[] = [];
    const completados: any[] = [];
    const usuario = demo.usuarioActual;
    if (!usuario) return pendientes;
    for (let i = demo.descargas.length - 1; i >= 0; i--) {
      const nivel = demo.descargas[i];
      if (nivel.usuarioId !== usuario.id) continue;
      if (nivel.completado) completados.push(nivel);
      else pendientes.push(nivel);
    }
    return pendientes.concat(completados);
  }

  async descargarNivel(nivel: any) {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0 || this.estaDescargado(nivel.id)) return;
    await this.operar(async () => {
      await descargarNivelBackend(usuario.nombre, nivel.nombre);
      if (demo.usuarioActual !== usuario) return;
      await this.cargarPublicaciones();
      if (!this.scene.isActive()) return;
      this.guardarPestana();
      this.pestana = "Descargados";
      this.busqueda = "";
      this.pagina = 0;
      this.dibujar();
    }, this.textoOpciones[9][spanish]);
  }

  boton(x: number, y: number, ancho: number, titulo: string, accion: () => void,
        color = NORMAL, habilitado = true) {
    const fondo = crearBoton(this, x, y, ancho, titulo, accion);
    fondo.removeAllListeners("pointerover");
    fondo.removeAllListeners("pointerout");
    fondo.setFillStyle(color);
    if (!habilitado) {
      fondo.disableInteractive(true);
      fondo.removeAllListeners("pointermove");
      fondo.removeAllListeners("pointerdown");
      fondo.removeAllListeners("pointerup");
      fondo.setAlpha(0.35);
      return fondo;
    }
    fondo.on("pointerover", () => fondo.setFillStyle(oscurecerColor(color)));
    fondo.on("pointerout", () => fondo.setFillStyle(color));
    return fondo;
  }

  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pagina = 0;
      this.paginasGuardadas = [0, 0, 0, 0];
      this.filas = [];
    });
    if (!demo.usuarioActual) {
      this.scene.start("usuariosDemo");
      return;
    }
    const alDespertar = () => {
      this.dibujarFilas();
      this.operar(async () => { await this.actualizarNiveles(); }, this.textoOpciones[10][spanish]);
    };
    this.events.on(Phaser.Scenes.Events.WAKE, alDespertar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.WAKE, alDespertar);
    });
    this.dibujar();
    this.operar(async () => {
      await this.actualizarNiveles();
    }, this.textoOpciones[0][spanish]);
  }

  async actualizarNiveles(): Promise<void> {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0) return;

    await Promise.all([
      cargarNivelesServidor(), this.cargarPublicaciones()
    ]);
    if (demo.usuarioActual !== usuario) return;
    if (this.scene.isActive()) this.dibujarFilas();

  }

  crearTab(x: number, y: number, ancho: number, alto: number, texto: string,
           color: number, colorHover: number, activa: boolean, accion: () => void) {
    colorHover = oscurecerColor(color);
    const grafico = this.add.graphics();
    const izquierda = x - ancho / 2;
    const derecha = x + ancho / 2;
    const arriba = y - alto / 2;
    const abajo = y + alto / 2;
    const dibujar = (colorActual: number) => {
      grafico.clear();
      grafico.fillStyle(colorActual);
      grafico.fillRect(izquierda, arriba, ancho, alto);
      grafico.lineStyle(4, COLORES.panel);
      grafico.beginPath();
      grafico.moveTo(izquierda, abajo);
      grafico.lineTo(izquierda, arriba);
      grafico.lineTo(derecha, arriba);
      grafico.lineTo(derecha, abajo);
      grafico.strokePath();
    };
    dibujar(color);
    const zona = this.add.zone(x, y, ancho, alto).setInteractive({ useHandCursor: true });
    this.add.text(x, y, texto, { padding: { top: 6, bottom: 6 }, fontFamily: "Fuente", fontSize: "16px", color: colorTexto(COLORES.fondo) }).setOrigin(0.5);
    zona.on("pointerover", () => { if (!activa) dibujar(colorHover); });
    zona.on("pointerout", () => { if (!activa) dibujar(color); });
    zona.on("pointerdown", () => { if (!activa) accion(); });
  }

  dibujar() {
    for (let i = this.children.list.length - 1; i >= 0; i--) {
      const objeto = this.children.list[i];
      if (objeto.scene) { objeto.disableInteractive(true); objeto.destroy(); }
    }
    this.limpiar();
    this.filas = [];
    if (!demo.usuarioActual) return;
    const titulo = this.texto(400, 25, this.textoOpciones[11][spanish], 26).setOrigin(0.5, 0);
    const centroTitulo = titulo.y + titulo.displayHeight / 2;
    this.boton(100, centroTitulo, 120, this.textoOpciones[12][spanish], () => {
      const transition = this.scene.get("transition") as TransitionScene;
      transition.changeScene(
        this.sys.settings.key,
        "menu",
      );
    }, COLORES.violeta);

    const pestanas = [
      { nombre: "Community", texto: this.textoOpciones[13][spanish], color: COLORES.azul, colorHover: COLORES.azulHover, colorInactivo: COLORES.borde },
      { nombre: "Creados", texto: this.textoOpciones[14][spanish], color: COLORES.verde, colorHover: COLORES.verdeHover, colorInactivo: COLORES.verdeInactivo },
      { nombre: "Publicados", texto: this.textoOpciones[15][spanish], color: COLORES.amarillo, colorHover: COLORES.amarilloHover, colorInactivo: COLORES.amarilloInactivo },
      { nombre: "Descargados", texto: this.textoOpciones[16][spanish], color: COLORES.violeta, colorHover: COLORES.violetaHover, colorInactivo: COLORES.violetaInactivo }
    ];
    let colorActual = COLORES.azul;
    for (let i = 0; i < pestanas.length; i++) {
      const p = pestanas[i];
      const activa = this.pestana === p.nombre;
      let y = 108;
      let alto = 44;
      let color = p.colorInactivo;
      if (activa) { y = 103; alto = 54; color = p.color; colorActual = p.color; }
      this.crearTab(145 + i * 170, y, 170, alto, p.texto, color, p.colorHover,
        activa, () => this.cambiarPestana(p.nombre));
    }
    this.add.rectangle(400, 345, 720, 430, COLORES.panel).setStrokeStyle(4, colorActual);
    const campo = crearCampoTexto(this, 60, 170, 680, this.textoOpciones[17][spanish], MAX_BUSQUEDA, (valor) => {
      this.busqueda = valor;
      this.pagina = 0;
      this.dibujarFilas();
    });
    campo.input.value = this.busqueda;
    campo.input.addEventListener("keydown", (evento) => {
      if (evento.isComposing) return;
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
    if (!demo.usuarioActual) return;
    const cantidadAntes = this.children.list.length;
    if (this.pestana === "Creados") this.mostrarCreados();
    if (this.pestana === "Community") this.mostrarCommunity();
    if (this.pestana === "Publicados") this.mostrarPublicados();
    if (this.pestana === "Descargados") this.mostrarDescargados();
    for (let i = cantidadAntes; i < this.children.list.length; i++) this.filas.push(this.children.list[i]);
  }

  crearBotonEditor() {
    const fondo = this.add.rectangle(400, 249, this.anchoFilaCreada - 2,
      this.altoFilaCreada - 2, COLORES.panel, 0);
    fondo.setStrokeStyle(2, COLORES.borde).setInteractive({ useHandCursor: true });
    const texto = this.texto(400, 249, this.textoOpciones[18][spanish], 20).setOrigin(0.5);
    texto.setColor(colorTexto(COLORES.blanco));
    fondo.on("pointerover", () => {
      fondo.setFillStyle(COLORES.azul, 0.15).setStrokeStyle(2, COLORES.azul);
      texto.setColor(colorTexto(COLORES.blanco));
    });
    fondo.on("pointerout", () => {
      fondo.setFillStyle(COLORES.panel, 0).setStrokeStyle(2, COLORES.borde);
      texto.setColor(colorTexto(COLORES.blanco));
    });
    fondo.on("pointerdown", () => {
      this.guardarPestana();
      this.scene.start("LevelsScene", { escenaAnterior: "communityDemo", busquedaCommunity: this.busqueda });
    });
  }

  mostrarCreados() {
    let niveles = this.obtenerCreadosOrdenados();
    const consulta = this.busqueda.trim().toLowerCase();
    if (consulta !== "") {
      const filtrados = [];
      for (let i = 0; i < niveles.length; i++) {
        if (niveles[i].nombre.toLowerCase().indexOf(consulta) !== -1 || String(niveles[i].id) === consulta) {
          filtrados.push(niveles[i]);
        }
      }
      niveles = filtrados;
    }
    const paginas = Math.max(1, Math.ceil((niveles.length + 1) / 4));
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
    const visibles = niveles.slice(inicio, inicio + cantidad);
    if (visibles.length === 0) this.texto(400, 377, this.textoOpciones[19][spanish]).setOrigin(0.5);
    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = primeraY + i * 64;
      this.add.rectangle(400, y, this.anchoFilaCreada, this.altoFilaCreada, COLORES.panel);
      const nombre = this.texto(80, y, nivel.nombre, 19).setOrigin(0, 0.5);
      let visible = nivel.nombre;
      while (nombre.width > 300 && visible.length > 0) {
        visible = visible.substring(0, visible.length - 1);
        nombre.setText(visible + "...");
      }
      this.boton(475, y, 150, this.textoOpciones[20][spanish], () => {
        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(
          this.sys.settings.key,
            "game",
            {
              nivelId: nivel.id, escenaAnterior: "communityDemo", testeando: true
            }
          );
        this.scene.sleep();
      }, COLORES.violeta);
      const publicacion = this.buscarPublicacionDeNivel(nivel);
      if (publicacion === null || publicacion.publicado === false) {
        this.boton(640, y, 160, this.textoOpciones[21][spanish], () => {
          mostrarConfirmacion(this, this.textoOpciones[22][spanish],
            '"' + nivel.nombre + this.textoOpciones[23][spanish],
            this.textoOpciones[21][spanish], VERDE, () => { this.publicarNivel(nivel); });
        }, VERDE);
      } else if (this.publicacionDesactualizada(nivel, publicacion)) {
        this.boton(640, y, 160, this.textoOpciones[24][spanish], () => {
          mostrarConfirmacion(this, this.textoOpciones[25][spanish],
            '"' + nivel.nombre + this.textoOpciones[26][spanish],
            this.textoOpciones[24][spanish], COLORES.amarillo, () => { this.actualizarPublicacion(nivel, publicacion); });
        }, COLORES.amarillo);
      } else {
        this.boton(640, y, 160, this.textoOpciones[27][spanish], () => {}, NORMAL, false);
      }
    }
    this.paginacion(paginas);
  }

  buscarPublicaciones(niveles: any[]): any[] {
    const consulta = this.busqueda.trim().toLowerCase();
    if (consulta === "") return niveles;
    const resultado = [];
    for (let i = 0; i < niveles.length; i++) {
      const nivel = niveles[i];
      if (String(nivel.id) === consulta || nivel.nombre.toLowerCase().indexOf(consulta) !== -1 ||
          nivel.autor.toLowerCase().indexOf(consulta) !== -1) resultado.push(nivel);
    }
    return resultado;
  }

  mostrarCommunity() {
    const niveles: any[] = [];
    for (let i = 0; i < demo.niveles.length; i++) {
      if (demo.niveles[i].publicado === true) niveles.push(demo.niveles[i]);
    }
    const filtrados = this.buscarPublicaciones(niveles);
    filtrados.sort((a, b) => b.descargas - a.descargas);
    const paginas = this.calcularPaginas(filtrados.length);
    this.corregirPagina(paginas);
    const visibles = filtrados.slice(this.pagina * 3, this.pagina * 3 + 3);
    if (visibles.length === 0) this.texto(400, 345, this.textoOpciones[28][spanish]).setOrigin(0.5);
    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = 238 + i * 100;
      this.add.rectangle(400, y + 7, 680, 80, COLORES.panel);
      this.texto(80, y - 26, nivel.nombre, 19);
      this.texto(80, y, "ID " + nivel.id + " - " + nivel.autor, 14).setColor(colorTexto(COLORES.textoSecundario));
      this.texto(80, y + 23, this.textoDescargas(nivel.descargas), 14).setColor(colorTexto(COLORES.textoSecundario));
      const descargado = this.estaDescargado(nivel.id);
      let textoBoton = this.textoOpciones[29][spanish];
      if (descargado) textoBoton = this.textoOpciones[30][spanish];
      this.boton(630, y + 7, 180, textoBoton, () => { this.descargarNivel(nivel); }, VERDE, !descargado);
    }
    this.paginacion(paginas);
  }

  mostrarPublicados() {
    const usuario = demo.usuarioActual;
    if (!usuario) return;
    const niveles: any[] = [];
    for (let i = 0; i < demo.niveles.length; i++) {
      const nivel = demo.niveles[i];
      if (nivel.autorId === usuario.id && nivel.publicado === true) niveles.push(nivel);
    }
    const filtrados = this.buscarPublicaciones(niveles);
    const paginas = this.calcularPaginas(filtrados.length);
    this.corregirPagina(paginas);
    const visibles = filtrados.slice(this.pagina * 3, this.pagina * 3 + 3);
    if (visibles.length === 0) this.texto(400, 345, this.textoOpciones[31][spanish]).setOrigin(0.5);
    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = 238 + i * 100;
      this.add.rectangle(400, y + 7, 680, 80, COLORES.panel);
      const nombre = this.texto(80, y - 26, nivel.nombre, 19);
      let visible = nivel.nombre;
      while (nombre.width > 300 && visible.length > 0) {
        visible = visible.substring(0, visible.length - 1);
        nombre.setText(visible + "...");
      }
      this.texto(80, y, "ID " + nivel.id, 14).setColor(colorTexto(COLORES.textoSecundario));
      this.texto(80, y + 23, this.textoOpciones[32][spanish] + nivel.version + " - " + this.textoDescargas(nivel.descargas), 14)
        .setColor(colorTexto(COLORES.textoSecundario));
      const descargado = this.estaDescargado(nivel.id);
      let textoBoton = this.textoOpciones[29][spanish];
      if (descargado) textoBoton = this.textoOpciones[30][spanish];
      this.boton(475, y + 7, 150, textoBoton, () => { this.descargarNivel(nivel); }, VERDE, !descargado);
      this.boton(640, y + 7, 160, this.textoOpciones[33][spanish], () => {
        mostrarConfirmacion(this, this.textoOpciones[34][spanish],
          '"' + nivel.nombre + this.textoOpciones[35][spanish],
          this.textoOpciones[33][spanish], ROJO, () => { this.despublicarNivel(nivel); });
      }, ROJO);
    }
    this.paginacion(paginas);
  }

  mostrarDescargados() {
    const usuario = demo.usuarioActual;
    if (!usuario) return;
    let niveles = this.obtenerDescargadosOrdenados();
    const consulta = this.busqueda.trim().toLowerCase();
    if (consulta !== "") {
      const filtrados = [];
      for (let i = 0; i < niveles.length; i++) {
        const nivel = niveles[i];
        if (String(nivel.nivelId) === consulta || nivel.nombre.toLowerCase().indexOf(consulta) !== -1 ||
            nivel.autor.toLowerCase().indexOf(consulta) !== -1) filtrados.push(nivel);
      }
      niveles = filtrados;
    }
    const paginas = this.calcularPaginas(niveles.length);
    this.corregirPagina(paginas);
    const visibles = niveles.slice(this.pagina * 3, this.pagina * 3 + 3);
    if (visibles.length === 0) this.texto(400, 345, this.textoOpciones[36][spanish]).setOrigin(0.5);
    for (let i = 0; i < visibles.length; i++) {
      const nivel = visibles[i];
      const y = 238 + i * 100;
      this.add.rectangle(400, y + 7, 680, 80, COLORES.panel);
      this.texto(80, y - 26, nivel.nombre, 19);
      this.texto(80, y, "ID " + nivel.nivelId + " - " + nivel.autor, 14).setColor(colorTexto(COLORES.textoSecundario));
      let estado = this.textoOpciones[37][spanish];
      if (nivel.completado) estado = this.textoOpciones[38][spanish];
      this.texto(80, y + 23, estado, 14).setColor(colorTexto(COLORES.textoSecundario));
      let original: any = null;
      for (let j = 0; j < demo.niveles.length; j++) {
        const p: any = demo.niveles[j];
        if (p.id === nivel.nivelId && p.publicado === true) { original = p; break; }
      }
      let hayActualizacion = false;
      if (original !== null && (original.version > nivel.version || original.nombre !== nivel.nombre)) {
        hayActualizacion = true;
      }
      let textoBoton = this.textoOpciones[39][spanish];
      let colorBoton = VERDE;
      if (hayActualizacion) { textoBoton = this.textoOpciones[24][spanish]; colorBoton = COLORES.amarillo; }
      this.boton(475, y + 7, 150, textoBoton, () => {
        if (hayActualizacion && original !== null) {
          this.operar(async () => {
            await descargarNivelBackend(usuario.nombre, original.nombre);
            if (demo.usuarioActual === usuario) await this.cargarPublicaciones();
          }, this.textoOpciones[40][spanish]);
          return;
        }
        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(
          this.sys.settings.key,
            "game",
            {
              nivelDescargado: nivel, nivelId: "online:" + nivel.nivelId,
              idGlobal: nivel.nivelId, escenaAnterior: "communityDemo", modoTest: false, testeando: false
            }
          );
        this.scene.sleep();
      }, colorBoton);
      this.boton(640, y + 7, 160, this.textoOpciones[41][spanish], () => {
        mostrarConfirmacion(this, this.textoOpciones[42][spanish],
          '"' + nivel.nombre + this.textoOpciones[43][spanish],
          this.textoOpciones[41][spanish], ROJO, () => {
            this.operar(async () => {
              await eliminarNivelGuardadoBackend(usuario.nombre, nivel.nivelId);
              if (demo.usuarioActual === usuario) await this.cargarPublicaciones();
            }, this.textoOpciones[44][spanish]);
          });
      }, ROJO);
    }
    this.paginacion(paginas);
  }

  calcularPaginas(cantidad: number) { return Math.max(1, Math.ceil(cantidad / 3)); }

  corregirPagina(paginas: number) {
    if (this.pagina < 0) this.pagina = 0;
    if (this.pagina >= paginas) this.pagina = paginas - 1;
    this.guardarPestana();
  }

  paginacion(paginas: number) {
    this.boton(150, 520, 180, this.textoOpciones[45][spanish], () => { this.pagina--; this.dibujarFilas(); }, NORMAL, this.pagina > 0);
    this.texto(400, 520, this.textoOpciones[46][spanish] + (this.pagina + 1) + " / " + paginas, 16).setOrigin(0.5);
    this.boton(650, 520, 180, this.textoOpciones[47][spanish], () => { this.pagina++; this.dibujarFilas(); }, NORMAL,
      this.pagina < paginas - 1);
  }

  async cargarPublicaciones() {
    const usuario = demo.usuarioActual;
    if (!usuario || usuario.id === 0) return;
    const respuestas = await Promise.all([
      leerPublicaciones(), leerNivelesUsuario(usuario.nombre), leerNivelesGuardadosBackend(usuario.nombre)
    ]);
    const recibidas = respuestas[0];
    const propias = respuestas[1];
    const guardadas = respuestas[2];
    if (demo.usuarioActual !== usuario) return;

    for (let i = 0; i < propias.length; i++) {
      let existe = false;
      for (let j = 0; j < recibidas.length; j++) {
        if (recibidas[j].id === propias[i].id) { existe = true; break; }
      }
      if (!existe) recibidas.push(propias[i]);
    }

    const publicaciones: any[] = [];
    for (let i = 0; i < recibidas.length; i++) {
      const nivel = recibidas[i];
      let autorId = -1;
      if (nivel.usuario === usuario.nombre) autorId = usuario.id;
      let descargas = nivel.cantidadDescargas;
      if (typeof descargas !== "number") {
        descargas = -1;
        if (Array.isArray(nivel.descargas)) descargas = nivel.descargas.length;
      }
      const publicacion: any = {
        id: nivel.id, nombre: nivel.nombre, autorId: autorId, autor: nivel.usuario,
        publicado: nivel.publicado, version: nivel.version, descargas: descargas,
        tablero: [], portales: [], links: []
      };
      if (nivel.usuario === usuario.nombre && esNivelDelEditorBackend(nivel)) {
        const datos = apiAEditor(nivel);
        publicacion.nivelOriginalId = datos.id;
        publicacion.tablero = datos.tablero;
        publicacion.portales = datos.portales;
        publicacion.links = this.copiarMatriz(this.obtenerLinksNivel(datos));
      }
      publicaciones.push(publicacion);
    }

    const descargas: any[] = [];
    for (let i = 0; i < guardadas.length; i++) {
      const nivel = guardadas[i];
      if (!esNivelDelEditorBackend(nivel)) continue;
      const datos = apiAEditor(nivel, "online:" + nivel.id);
      let completado = false;
      if (Array.isArray(nivel.usuariosQueCompletaron)) {
        completado = nivel.usuariosQueCompletaron.indexOf(usuario.nombre) !== -1;
      }
      descargas.push({
        usuarioId: usuario.id, nivelId: nivel.id, nombre: nivel.nombre, autor: nivel.usuario,
        version: nivel.version, completado: completado, tablero: datos.tablero,
        portales: datos.portales, links: this.copiarMatriz(this.obtenerLinksNivel(datos))
      });
    }
    demo.niveles = publicaciones;
    demo.descargas = descargas;
    if (this.scene.isActive()) this.dibujarFilas();
  }
}
