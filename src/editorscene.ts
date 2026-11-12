import { COLORES, colorTexto, oscurecerColor } from "./colores";
import Phaser from "phaser";
import { spanish } from "./configs";
import { cargarPortales, crearAnimacionesPortales, configurarPortal, direccionPortalEditor, esParedExteriorPortal } from "./portales";
import { obtenerNivel, actualizarNivel, crearBoton } from "./niveles";
import { convertirNivel } from "./parser";
import { mostrarConfirmacion } from "./popup";
import { TransitionScene } from "./transitionScene";

interface EstadoEditor {
  tablero: number[][];
  portales: number[][];
  links: number[][];
}

interface RotacionSeleccion extends EstadoEditor {
  x: number;
  y: number;
  centro: { x: number; y: number };
}

type TransformacionSeleccion = "horario" | "antihorario" | "voltear" | "voltearVertical";

export class EditorScene extends Phaser.Scene {
  textoOpciones: string[][] = [
    ["Level Editor", "Editor de niveles"],
    ["Untitled Level", "Nivel sin título"],
    ["Save", "Guardar"],
    ["Back", "Volver"],
    ["Test", "Probar"],
    ["You have unsaved changes.\nLeave without saving?", "Tenés cambios sin guardar.\n¿Salir sin guardar?"],
    ["The door must occupy the first and second rows.\nLeaving will discard your unsaved changes.", "La puerta debe ocupar la primera y la segunda fila.\nSi salís, se perderán los cambios sin guardar."],
    ["The player or exit is missing.\nLeaving will discard your unsaved changes.", "Falta el jugador o la salida.\nSi salís, se perderán los cambios sin guardar."],
    ["Unsaved Changes", "Cambios sin guardar"],
    ["Leave Without Saving", "Salir sin guardar"],
    ["Could not save the level.\n\n", "No se pudo guardar el nivel.\n\n"],
    ["The door must occupy rows 1 and 2", "La puerta debe ocupar las filas 1 y 2"],
    ["Player or exit missing", "Falta el jugador o la salida"],
    ["Unsaved changes", "Cambios sin guardar"],
    ["Level saved", "Nivel guardado"],
    ["Select", "Seleccionar"],
    ["Deselect", "Deseleccionar"],
    ["Copy", "Copiar"],
    ["Paste", "Pegar"],
    ["Delete", "Borrar"],
    ["Portal", "Portal"],
    ["Link", "Vincular"],
    ["Undo", "Deshacer"],
    ["Redo", "Rehacer"],
    ["Mirror", "Espejo"],
    ["Emitter", "Emisor"],
    ["Receiver", "Receptor"],
    ["Crate", "Caja"],
    ["Pressure plate", "Placa de presión"],
    ["Interior wall", "Pared interior"],
    ["Top wall", "Pared superior"],
    ["Bottom wall", "Pared inferior"],
    ["Right wall", "Pared derecha"],
    ["Left wall", "Pared izquierda"],
    ["Ceiling", "Techo"],
    ["Top left corner", "Esquina superior izquierda"],
    ["Top right corner", "Esquina superior derecha"],
    ["Bottom right corner", "Esquina inferior derecha"],
    ["Bottom left corner", "Esquina inferior izquierda"],
    ["Single machine", "Máquina simple"],
    ["Double machine", "Máquina doble"],
    ["Triple machine", "Máquina triple"],
    ["Player", "Jugador"],
    ["Exit", "Salida"],
    ["Unknown tile", "Casilla desconocida"],
    ["\nRight-click to see variants", "\nClic derecho para ver variantes"],
    ["Rotate", "Rotar"],
    ["Flip", "Voltear"]
  ];
  init(data: { nivelId?: string } = {}): void {
    if (data.nivelId !== undefined) {
      this.nivelId = data.nivelId;
    } else {
      this.nivelId = null;
    }

    this.estadoGuardado = null;
    this.popupSalida = null;
    this.bloquearMouseHastaSoltar = false;
    this.puedeGuardarAnterior = false;
    this.nivelValidoAnterior = false;

    this.bordeTooltipTile = null;

    this.undoHistory = [];
    this.redoHistory = [];
    this.links = [];
    this.textoLink = null;
    this.ayudaLink = null;
    this.bordeTooltipLink = null;
    this.botonesInterfaz = [];
    this.imagenesProfundidad = [];
    this.spritesPortales = [];
    this.hoverPortal = null;
    this.botonTest = null;
    this.textoEstado = null;
    this.textoTile = null;
    this.zonaTooltipTile = null;
    this.objetosSubHotbar = [];
    this.subHotbarAbierta = -1;

    this.haySeleccion = false;
    this.seleccionando = false;
    this.arrastrandoSeleccion = false;
    this.posibleArrastreSeleccion = false;
    this.arrastreOffsetX = 0;
    this.arrastreOffsetY = 0;
    this.transformacionesArrastre = [];
    this.centroSeleccion = null;
    this.centroAntesArrastre = null;
    this.controlesSeleccion = null;
    this.botonesTransformacion = [];
    this.controlSeleccionPulsado = null;
    this.punteroArrastre = null;
    this.portapapelesArrastre = null;
    this.portapapelesPortalesArrastre = null;

    this.tilesOcultasVistaPegado = [];
    this.portalesOcultosVistaPegado = [];
    this.placasOcultasVistaPegado = [];
    this.tileOcultaHover = null;
    this.portalOcultoHover = null;

    this.linkInicioX = -1;
    this.linkInicioY = -1;
    this.linkSeArrastro = false;
    this.reiniciarClickLink();
    this.mouseX = -1;
    this.mouseY = -1;

    this.capaRelievePortales = null;
    this.capaRelievePortalesPegado = null;
  }

  constructor() {
    super("editor");
  }

  private nivelId: string | null = null;

  private columns: number = 15;
  private rows: number = 9;
  private cellsize: number = 32;
  private tileGraphicSize: number = 16;
  private tileScale: number = this.cellsize / this.tileGraphicSize;
  private board_offset_x: number = 40;
  private board_offset_y: number = 128;
  private board_width: number = this.columns * this.cellsize;
  private board_height: number = this.rows * this.cellsize;

  private margenPanel: number = 24;
  private margenTablero: number = 16;
  private separacionPaneles: number = 24;
  private arribaPaneles: number = 88;
  private anchoPanelHerramientas: number = 220;
  private altoPanelHotbar: number = 68;
  private separacionHotbar: number = 12;
  private anchoPanelTablero: number = 0;
  private yHotbar: number = 0;

  private estadoGuardado: EstadoEditor | null = null;
  private popupSalida: Phaser.GameObjects.GameObject | null = null;
  private bloquearMouseHastaSoltar: boolean = false;
  private puedeGuardarAnterior: boolean = false;
  private nivelValidoAnterior: boolean = false;

  private arrastrandoSeleccion: boolean = false;
  private posibleArrastreSeleccion: boolean = false;
  private arrastreInicioX: number = -1;
  private arrastreInicioY: number = -1;
  private arrastreOffsetX: number = 0;
  private arrastreOffsetY: number = 0;
  private transformacionesArrastre: TransformacionSeleccion[] = [];
  private centroSeleccion: { x: number; y: number } | null = null;
  private centroAntesArrastre: { x: number; y: number } | null = null;
  private controlesSeleccion: Phaser.GameObjects.Container | null = null;
  private botonesTransformacion: Phaser.GameObjects.Rectangle[] = [];
  private controlSeleccionPulsado: number | null = null;
  private punteroArrastre: number | null = null;

  private tileInvisible: number = 1;
  private sinHerramienta: number = -1;
  private selectTool: number = 100;
  private pasteTool: number = 101;
  private linkTool: number = 103;
  private tilesSinPortal: number[] = [2, 5, 6, 7, 8];
  private tileJugador: number = 66;
  private tileBandera: number = 68;
  private tileSalidaArriba: number = 69;
  private formaSalida: number[][] = [
    [0, 0, this.tileBandera],
    [0, -1, this.tileSalidaArriba]
  ];
  private tilePlaca: number = 2;
  private tilePlacaConObjeto: number = 1000;
  private colorLinkEmisor: number = COLORES.amarillo;
  private colorLinkPortales: number = COLORES.verde;
  private colorLinkPlaca: number = COLORES.violeta;

  private formasPared = [
    [
      [0, 0, 33],
      [1, 0, 34]
    ],
    [
      [0, 0, 45],
      [-1, 0, 44],
      [0, -1, 47],
      [0, 1, 43],
      [-1, -1, 46],
    ]
  ];

  private hoverGrupo: Phaser.GameObjects.Image[] = [];
  private ocultasGrupo: Phaser.Tilemaps.Tile[] = [];

  private relieves = [
    [37, 38],
    [39, 40],
    [33, 35],
    [34, 36],
    [41, 42],
    [50, 50],
    [51, 52],
    [53, 54],
    [55, 56],
    [64, 65],
    [66, 67],
    [46, 48],
    [47, 49],
  ];

  private links: number[][] = [];
  private textoLink: Phaser.GameObjects.Text | null = null;
  private ayudaLink: Phaser.GameObjects.Text | null = null;
  private bordeTooltipLink: Phaser.GameObjects.Rectangle | null = null;
  private linkInicioX: number = -1;
  private linkInicioY: number = -1;
  private linkSeArrastro: boolean = false;
  private ultimoClickLinkX: number = -1;
  private ultimoClickLinkY: number = -1;
  private tiempoUltimoClickLink: number = 0;
  private graficosLinks!: Phaser.GameObjects.Graphics;
  private graficosNotLinks!: Phaser.GameObjects.Graphics;
  private graficosLinkTemporal!: Phaser.GameObjects.Graphics;
  private botonLink!: Phaser.GameObjects.Rectangle;

  private portalTool: number = 102;
  private portalArriba = 50;
  private portalAbajo = 51;
  private portalIzquierda = 53;
  private portalDerecha = 55;

  private undoHistory: EstadoEditor[] = [];
  private redoHistory: EstadoEditor[] = [];

  private lastState: EstadoEditor = {
    tablero: [],
    portales: [],
    links: []
  };

  private botonSeleccionar!: Phaser.GameObjects.Rectangle;
  private botonDeseleccionar!: Phaser.GameObjects.Rectangle;
  private botonPegar!: Phaser.GameObjects.Rectangle;
  private botonBorrar!: Phaser.GameObjects.Rectangle;
  private botonCopiar!: Phaser.GameObjects.Rectangle;
  private botonRedo!: Phaser.GameObjects.Rectangle;
  private botonUndo!: Phaser.GameObjects.Rectangle;
  private botonPortal!: Phaser.GameObjects.Rectangle;
  private botonGuardar!: Phaser.GameObjects.Rectangle;
  private botonVolver!: Phaser.GameObjects.Rectangle;

  private botonesInterfaz: Phaser.GameObjects.Rectangle[] = [];
  private botonTest: Phaser.GameObjects.Rectangle | null = null;
  private textoEstado: Phaser.GameObjects.Text | null = null;
  private textoTile: Phaser.GameObjects.Text | null = null;
  private bordeTooltipTile: Phaser.GameObjects.Rectangle | null = null;
  private zonaTooltipTile: Phaser.GameObjects.Rectangle | null = null;
  private imagenesProfundidad: Phaser.GameObjects.Image[][] = [];
  private spritesPortales: Phaser.GameObjects.Sprite[][] = [];
  private hoverPortal: Phaser.GameObjects.Sprite | null = null;

  private imagenesHotbar: Phaser.GameObjects.Image[] = [];
  private objetosSubHotbar: Phaser.GameObjects.GameObject[] = [];
  private subHotbarAbierta: number = -1;

  //CUSTOMIZAR HOTBAR

  private tilesHotbar = [37, 3, 11, 27, 41, 66, 2, 17, 21];

  private variantesTiles = [
    [3, 4, 5, 6],
    [11, 14, 12, 13],
    [27, 30, 28, 29],
    [41, 200, 201],
    [66, 68],
    [17, 18, 20, 19, 16, 39],
    [21, 22, 23, 24]
  ];

  private casillasHotbar: Phaser.GameObjects.Rectangle[] = [];

  private seleccionCopiada: number[][] = [];
  private portapapelesArrastre: number[][] | null = null;
  private portalesCopiados: number[][] = [];
  private portapapelesPortalesArrastre: number[][] | null = null;
  private vistaPegado!: Phaser.GameObjects.Rectangle;
  private tilesOcultasVistaPegado: Phaser.Tilemaps.Tile[] = [];
  private portalesOcultosVistaPegado: Phaser.Tilemaps.Tile[] = [];
  private placasOcultasVistaPegado: Phaser.Tilemaps.Tile[] = [];

  private mouseX: number = -1;
  private mouseY: number = -1;
  private hoverCell!: Phaser.GameObjects.Rectangle;
  private hoverTile!: Phaser.GameObjects.Image;
  private tileOcultaHover: Phaser.Tilemaps.Tile | null = null;
  private portalOcultoHover: Phaser.Tilemaps.Tile | null = null;

  private haySeleccion: boolean = false;
  private seleccionando: boolean = false;
  private seleccionInicioX: number = -1;
  private seleccionInicioY: number = -1;
  private rectanguloSeleccion!: Phaser.GameObjects.Rectangle;

  private seleccionIzquierda: number = -1;
  private seleccionDerecha: number = -1;
  private seleccionArriba: number = -1;
  private seleccionAbajo: number = -1;

  private mapa!: Phaser.Tilemaps.Tilemap;
  private tablero!: Phaser.Tilemaps.TilemapLayer;
  private capaPlacas!: Phaser.Tilemaps.TilemapLayer;
  private capaVistaPlacasPegado!: Phaser.Tilemaps.TilemapLayer;
  private capaPortales!: Phaser.Tilemaps.TilemapLayer;
  private capaVistaPegado!: Phaser.Tilemaps.TilemapLayer;
  private capaVistaPortalesPegado!: Phaser.Tilemaps.TilemapLayer;
  private capaRelieve: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePegado: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePortales: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePortalesPegado: Phaser.Tilemaps.TilemapLayer | null = null;

  private herramienta: number = 1;

  preload(): void {
    cargarPortales(this);
    this.load.spritesheet("iconosTransformacion", "./assets/iconos-transformacion.png", { frameWidth: 20, frameHeight: 20 });
    this.load.spritesheet("editorTiles", "./tileset.png", {
      frameWidth: this.tileGraphicSize,
      frameHeight: this.tileGraphicSize
    });
  }

  create(): void {
    crearAnimacionesPortales(this);
    this.textures.get("iconosTransformacion").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.cameras.main.setBackgroundColor(colorTexto(COLORES.fondo));
    this.columns = 17;
    this.rows = 11;

    if (this.nivelId !== null) {
      const nivel = obtenerNivel(this.nivelId);

      if (
        nivel !== undefined &&
        nivel.tablero.length > 0 &&
        nivel.tablero[0].length > 0
      ) {
        this.rows = nivel.tablero.length;
        this.columns = nivel.tablero[0].length;
      }
    }

    this.crearFondoTablero();

    this.textoEstado = this.add.text(24, 22, this.textoOpciones[0][spanish], {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "14px",
      color: colorTexto(COLORES.blanco)
    });

    let nombre = this.textoOpciones[1][spanish];

    if (this.nivelId !== null) {
      const nivel = obtenerNivel(this.nivelId);

      if (nivel !== undefined) {
        nombre = nivel.nombre;
      }
    }

    const nombreNivel = this.add.text(24, 46, nombre, {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "18px",
      color: colorTexto(COLORES.blanco),
    });

    let nombreVisible = nombre;

    while (nombreNivel.width > 344 && nombreVisible.length > 0) {
      nombreVisible = nombreVisible.substring(
        0,
        nombreVisible.length - 1
      );

      nombreNivel.setText(nombreVisible + "...");
    }

    if (this.input.mouse !== null) {
      this.input.mouse.disableContextMenu();
    }

    this.hoverCell = this.add.rectangle(
      this.board_offset_x + this.cellsize / 2,
      this.board_offset_y + this.cellsize / 2,
      this.cellsize - 2,
      this.cellsize - 2,
      COLORES.negro,
      0.12
    );

    this.hoverCell.setStrokeStyle(2, COLORES.borde, 0.65);
    this.hoverCell.setVisible(false);
    this.hoverCell.setDepth(6);

    this.hoverTile = this.add.image(0, 0, "editorTiles", 0);
    this.hoverTile.setDisplaySize(this.cellsize, this.cellsize);
    this.hoverTile.setAlpha(0.6);
    this.hoverTile.setDepth(5);
    this.hoverTile.setVisible(false);

    const anchoBoton = 112;
    const separacionBotones = 16;
    const margenBotones = 24;
    const yBotones = 44;

    const xGuardar =
      this.scale.width - margenBotones - anchoBoton / 2;

    const xTest = xGuardar - anchoBoton - separacionBotones;
    const xVolver = xTest - anchoBoton - separacionBotones;

    this.botonGuardar = crearBoton(
      this,
      xGuardar,
      yBotones,
      anchoBoton,
      this.textoOpciones[2][spanish],
      () => {
        this.guardarNivelActual();
      }
    );

    this.botonVolver = crearBoton(
      this,
      xVolver,
      yBotones,
      anchoBoton,
      this.textoOpciones[3][spanish],
      () => {
        this.solicitarSalida();
      }
    );

    this.botonTest = crearBoton(
      this,
      xTest,
      yBotones,
      anchoBoton,
      this.textoOpciones[4][spanish],
      () => {
        this.testearNivel();
      }
    );

    this.botonTest.setData("atajo", "Ctrl/Cmd + Enter");
    this.botonGuardar.setData("atajo", "Ctrl/Cmd + S");

    this.input.on("pointermove", (mouse: Phaser.Input.Pointer) => {
      if (this.popupSalida !== null || this.bloquearMouseHastaSoltar || this.controlSeleccionPulsado === mouse.id) {
        return;
      }
      if (this.punteroArrastre !== null && this.punteroArrastre !== mouse.id) {
        return;
      }

      this.actualizarInterfaz();
      this.actualizarHotbar();
      this.updateHoveredCell(mouse.worldX, mouse.worldY);

      if (this.clickEnHotbar) {
        return;
      }

      if (
        this.herramienta === this.linkTool &&
        this.linkInicioX !== -1
      ) {
        if (this.mouseX !== this.linkInicioX || this.mouseY !== this.linkInicioY) {
          this.linkSeArrastro = true;
        }
        this.actualizarVistaLink();
      }

      if (
        this.posibleArrastreSeleccion &&
        mouse.leftButtonDown() &&
        this.mouseX !== -1 &&
        this.mouseY !== -1 &&
        (
          this.mouseX !== this.arrastreInicioX ||
          this.mouseY !== this.arrastreInicioY
        )
      ) {
        this.posibleArrastreSeleccion = false;
        this.arrastrandoSeleccion = true;
        this.seleccionando = false;
        this.portapapelesArrastre = this.seleccionCopiada;
        this.portapapelesPortalesArrastre = this.portalesCopiados;
        this.centroAntesArrastre = this.centroSeleccion;
        this.haySeleccion = false;
        this.transformacionesArrastre = [];
        this.rectanguloSeleccion.setVisible(false);
        this.copiarSeleccion();
        this.actualizarInterfaz();
      }

      if (
        this.herramienta === this.pasteTool ||
        this.arrastrandoSeleccion
      ) {
        this.actualizarVistaPegado();
      }

      if (mouse.leftButtonDown()) {
        this.usarHerramienta();
      }

      if (
        this.herramienta === this.selectTool &&
        this.seleccionando
      ) {
        this.actualizarSeleccion();
        return;
      }
    });

    this.input.on("pointerup", (mouse: Phaser.Input.Pointer) => {
      if (this.controlSeleccionPulsado === mouse.id) {
        this.controlSeleccionPulsado = null;
        return;
      }
      if (this.punteroArrastre !== null && this.punteroArrastre !== mouse.id) {
        return;
      }
      if (this.popupSalida !== null) {
        return;
      }

      if (this.bloquearMouseHastaSoltar) {
        this.bloquearMouseHastaSoltar = false;
        return;
      }

      if (this.clickEnHotbar) {
        this.clickEnHotbar = false;
        return;
      }

      this.updateHoveredCell(mouse.worldX, mouse.worldY);

      if (this.herramienta === this.linkTool) {
        if (mouse.button !== 0) {
          return;
        }
        this.terminarLink();
        this.saveIfChanged();
        this.actualizarInterfaz();
        return;
      }

      this.saveIfChanged();
      this.actualizarInterfaz();
      this.actualizarHotbar();

      if (this.arrastrandoSeleccion) {
        if (this.puedePegarSeleccion()) {
          const altoSeleccion = this.seleccionCopiada.length;
          const anchoSeleccion = this.seleccionCopiada[0].length;

          const { x: inicioX, y: inicioY } = this.obtenerInicioPegado();
          const centro = this.centroSeleccion;
          const links = this.obtenerLinksTransformados(inicioX, inicioY, this.transformacionesArrastre, true);

          this.borrarSeleccion();
          this.pegarSeleccion(true);
          this.links.push(...links);
          this.actualizarLinks();

          this.ubicarSeleccion(
            inicioX,
            inicioY,
            anchoSeleccion,
            altoSeleccion,
            centro
          );

          this.saveIfChanged();
        } else {
          this.centroSeleccion = this.centroAntesArrastre;
        }

        if (this.portapapelesArrastre !== null) {
          this.seleccionCopiada = this.portapapelesArrastre;
          this.portapapelesArrastre = null;
        }

        if (this.portapapelesPortalesArrastre !== null) {
          this.portalesCopiados = this.portapapelesPortalesArrastre;
          this.portapapelesPortalesArrastre = null;
        }

        this.arrastrandoSeleccion = false;
        this.posibleArrastreSeleccion = false;
        this.arrastreInicioX = -1;
        this.arrastreInicioY = -1;
        this.arrastreOffsetX = 0;
        this.arrastreOffsetY = 0;
        this.transformacionesArrastre = [];
        this.centroAntesArrastre = null;
        this.punteroArrastre = null;

        this.vistaPegado.setVisible(false);
        this.capaVistaPegado.setVisible(false);
        this.capaVistaPlacasPegado.setVisible(false);
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();

        this.haySeleccion = true;
        this.rectanguloSeleccion.setVisible(true);
        this.actualizarInterfaz();
        return;
      }

      if (this.posibleArrastreSeleccion) {
        const columna = this.arrastreInicioX;
        const fila = this.arrastreInicioY;

        this.posibleArrastreSeleccion = false;
        this.arrastreInicioX = -1;
        this.arrastreInicioY = -1;
        this.punteroArrastre = null;

        this.quitarSeleccion();
        this.ubicarSeleccion(columna, fila, 1, 1);
        return;
      }

      if (this.seleccionando) {
        this.actualizarSeleccion();
        this.seleccionando = false;

        if (this.seleccionCompleta() === false) {
          this.quitarSeleccion();
          return;
        }

        this.haySeleccion = true;
        this.actualizarInterfaz();
      }
    });

    this.mapa = this.make.tilemap({
      width: this.columns,
      height: this.rows,
      tileWidth: this.tileGraphicSize,
      tileHeight: this.tileGraphicSize
    });

    const conjuntoTiles = this.mapa.addTilesetImage(
      "gameTiles",
      "editorTiles",
      this.tileGraphicSize,
      this.tileGraphicSize,
      0,
      0,
      1
    );

    if (conjuntoTiles === null) {
      return;
    }

    const capaPiso = this.mapa.createBlankLayer(
      "piso",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y
    );

    if (capaPiso === null) {
      return;
    }

    capaPiso.fill(15);
    capaPiso.setScale(this.tileScale);
    capaPiso.setDepth(0);

    const capaCreada = this.mapa.createBlankLayer(
      "objetos",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y
    );

    if (capaCreada === null) {
      return;
    }

    this.tablero = capaCreada;

    const capaPlacasCreada = this.mapa.createBlankLayer(
      "placas", conjuntoTiles, this.board_offset_x, this.board_offset_y
    );

    if (capaPlacasCreada === null) {
      return;
    }

    this.capaPlacas = capaPlacasCreada;
    this.capaPlacas.setScale(this.tileScale);

    const capaPortalesCreada = this.mapa.createBlankLayer(
      "portales",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y
    );

    if (capaPortalesCreada === null) {
      return;
    }

    this.capaPortales = capaPortalesCreada;

    const capaVistaPegadoCreada = this.mapa.createBlankLayer(
      "vistaTilesPegado",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y
    );

    if (capaVistaPegadoCreada === null) {
      return;
    }

    this.capaVistaPegado = capaVistaPegadoCreada;
    this.capaVistaPegado.setAlpha(0.6);
    this.capaVistaPegado.setVisible(false);

    const capaVistaPlacasCreada = this.mapa.createBlankLayer(
      "vistaPlacasPegado", conjuntoTiles, this.board_offset_x, this.board_offset_y
    );

    if (capaVistaPlacasCreada === null) {
      return;
    }

    this.capaVistaPlacasPegado = capaVistaPlacasCreada;
    this.capaVistaPlacasPegado.setScale(this.tileScale);
    this.capaVistaPlacasPegado.setAlpha(0.6);
    this.capaVistaPlacasPegado.setVisible(false);

    const capaVistaPortalesPegadoCreada = this.mapa.createBlankLayer(
      "vistaPortalesPegado",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y
    );

    if (capaVistaPortalesPegadoCreada === null) {
      return;
    }

    this.capaVistaPortalesPegado = capaVistaPortalesPegadoCreada;
    this.capaVistaPortalesPegado.setAlpha(0.6);
    this.capaVistaPortalesPegado.setVisible(false);

    const relieveCreado = this.mapa.createBlankLayer(
      "relieves",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y - this.cellsize
    );

    if (relieveCreado === null) {
      return;
    }

    this.capaRelieve = relieveCreado;
    this.capaRelieve.setScale(this.tileScale);
    this.capaRelieve.setDepth(1.5);

    const relievePegadoCreado = this.mapa.createBlankLayer(
      "relievesPegado",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y - this.cellsize
    );

    if (relievePegadoCreado === null) {
      return;
    }

    this.capaRelievePegado = relievePegadoCreado;
    this.capaRelievePegado.setScale(this.tileScale);
    this.capaRelievePegado.setDepth(3.5);
    this.capaRelievePegado.setAlpha(0.6);
    this.capaRelievePegado.setVisible(false);

    this.capaRelievePortales = this.mapa.createBlankLayer(
      "relievePortales",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y - this.cellsize
    );

    if (this.capaRelievePortales === null) {
      return;
    }

    this.capaRelievePortales.setScale(this.tileScale);
    this.capaRelievePortales.setDepth(2.5);

    this.capaRelievePortalesPegado = this.mapa.createBlankLayer(
      "relievePortalesPegado",
      conjuntoTiles,
      this.board_offset_x,
      this.board_offset_y - this.cellsize
    );

    if (this.capaRelievePortalesPegado === null) {
      return;
    }

    this.capaRelievePortalesPegado.setScale(this.tileScale);
    this.capaRelievePortalesPegado.setDepth(4.5);
    this.capaRelievePortalesPegado.setAlpha(0.6);
    this.capaRelievePortalesPegado.setVisible(false);

    this.graficosLinks = this.add.graphics();
    this.graficosLinks.setDepth(7);
    this.graficosNotLinks = this.add.graphics().setDepth(11);

    this.graficosLinkTemporal = this.add.graphics();
    this.graficosLinkTemporal.setDepth(8);
    this.bordeTooltipLink = this.add.rectangle(0, 0, 1, 1, COLORES.panel);
    this.bordeTooltipLink.setOrigin(0, 0).setStrokeStyle(2, COLORES.normal).setDepth(1000).setVisible(false);
    this.textoLink = this.add.text(0, 0, "", {
      fontFamily: "Fuente", fontSize: "12px", color: colorTexto(COLORES.amarillo)
    }).setDepth(1001).setVisible(false);
    this.ayudaLink = this.add.text(0, 0, "", {
      fontFamily: "Fuente", fontSize: "12px", color: colorTexto(COLORES.blanco)
    }).setDepth(1001).setVisible(false);

    this.restaurarTilesVistaPegado();

    this.tablero.setScale(this.tileScale);
    this.capaPortales.setScale(this.tileScale);
    this.capaVistaPegado.setScale(this.tileScale);
    this.capaVistaPlacasPegado.setScale(this.tileScale);
    this.capaVistaPortalesPegado.setScale(this.tileScale);

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        this.mapa.putTileAt(
          this.tileInvisible,
          columna,
          fila,
          true,
          this.tablero
        );
      }
    }

    if (this.nivelId !== null) {
      const nivel = obtenerNivel(this.nivelId);

      if (nivel !== undefined) {
        this.restoreBoardState(nivel.tablero);

        if (nivel.portales !== undefined) {
          this.restorePortalState(nivel.portales);
        }

        this.links = [];

        if (nivel.links !== undefined) {
          for (let i = 0; i < nivel.links.length; i++) {
            const link = nivel.links[i];

            if (link.length >= 4) {
              this.links.push([link[0], link[1], link[2], link[3], link[4] ?? 0]);
            }
          }
        }

        this.actualizarLinks();
        this.estadoGuardado = this.getEditorState();
      }
    }

    this.tablero.setDepth(1);
    this.capaPortales.setDepth(2);
    this.capaVistaPegado.setDepth(3);
    this.capaVistaPortalesPegado.setDepth(4);

    this.input.on("pointerupoutside", () => {
      this.bloquearMouseHastaSoltar = false;
      this.clickEnHotbar = false;
      this.controlSeleccionPulsado = null;
    });

    this.input.on("pointerdown", (mouse: Phaser.Input.Pointer) => {
      if (this.popupSalida !== null || this.bloquearMouseHastaSoltar) {
        return;
      }
      if (this.punteroArrastre !== null && this.punteroArrastre !== mouse.id) {
        return;
      }

      this.cerrarSubHotbar();
      this.clickEnHotbar = false;

      if (mouse.button === 2 && this.herramienta === this.linkTool) {
        this.reiniciarClickLink();
        const indice = this.buscarLinkEnPunto(mouse.worldX, mouse.worldY, true);

        if (indice !== -1) {
          this.alternarNotLink(indice);
        }

        return;
      }

      if (mouse.button !== 0) {
        return;
      }

      this.clickEnHotbar = false;
      this.updateHoveredCell(mouse.worldX, mouse.worldY);

      if (this.mouseX === -1 || this.mouseY === -1) {
        return;
      }

      if (this.herramienta === this.linkTool) {
        this.quitarSeleccion();
        const indice = this.buscarLinkEnPunto(mouse.worldX, mouse.worldY);
        if (indice !== -1) {
          this.borrarLink(indice);
          return;
        }
        this.iniciarLink(mouse);
        return;
      }

      if (this.herramienta === this.portalTool) {
        this.quitarSeleccion();
        this.usarPortal(mouse.worldX, mouse.worldY);
        return;
      }

      if (this.mouseX === -1 || this.mouseY === -1) {
        return;
      }

      if (
        this.herramienta === this.selectTool &&
        this.mouseDentroSeleccion()
      ) {
        this.posibleArrastreSeleccion = true;
        this.arrastreInicioX = this.mouseX;
        this.arrastreInicioY = this.mouseY;
        this.arrastreOffsetX = this.mouseX - this.seleccionIzquierda;
        this.arrastreOffsetY = this.mouseY - this.seleccionArriba;
        this.punteroArrastre = mouse.id;
        this.seleccionando = false;
        return;
      }

      if (this.herramienta === this.pasteTool) {
        this.pegarSeleccion();
        return;
      }

      if (this.herramienta === this.selectTool) {
        this.posibleArrastreSeleccion = false;
        this.arrastreInicioX = -1;
        this.arrastreInicioY = -1;

        this.quitarSeleccion();
        this.iniciarSeleccion();
        return;
      }

      this.quitarSeleccion();
      this.usarHerramienta();
    });

    this.rectanguloSeleccion = this.add.rectangle(
      0,
      0,
      1,
      1,
      COLORES.verde,
      0.25
    );

    this.rectanguloSeleccion.setOrigin(0, 0);
    this.rectanguloSeleccion.setStrokeStyle(2, COLORES.verdeHover, 1);
    this.rectanguloSeleccion.setDepth(6);
    this.rectanguloSeleccion.setVisible(false);

    const alTeclado = (evento: KeyboardEvent) => {
      if (this.popupSalida !== null) {
        if (evento.key === "Escape") {
          evento.preventDefault();
        }

        return;
      }

      const tecla = evento.key.toLowerCase();
      const control = evento.ctrlKey || evento.metaKey;

      if (!control && !evento.altKey && (tecla === "r" || tecla === "f")) {
        evento.preventDefault();
        if (!evento.repeat) {
          const transformacion = tecla === "f" ? (evento.shiftKey ? "voltearVertical" : "voltear") :
            (evento.shiftKey ? "antihorario" : "horario");
          this.rotarSeleccion(transformacion);
        }
        return;
      }

      if (control && evento.altKey === false && tecla === "s") {
        evento.preventDefault();

        if (evento.repeat === false) {
          this.guardarNivelActual();
        }

        return;
      }

      if (
        control && evento.altKey === false &&
        (tecla === "enter")
      ) {
        evento.preventDefault();

        if (evento.repeat === false) {
          this.testearNivel();
        }

        return;
      }

      if (control === false && evento.altKey === false) {
        for (let i = 0; i < this.tilesHotbar.length; i++) {
          const atajo = String(i + 1);

          if (tecla === atajo) {
            evento.preventDefault();

            if (evento.repeat === false) {
              this.seleccionarHotbar(i);
            }

            return;
          }
        }

        if (tecla === "q" || tecla === "e") {
          evento.preventDefault();

          if (evento.repeat === false) {
            let direccion = 1;

            if (tecla === "q") {
              direccion = -1;
            }

            this.cambiarVarianteHotbar(direccion);
          }

          return;
        }
      }

      if (control && tecla === "c") {
        evento.preventDefault();

        if (this.haySeleccion) {
          this.copiarSeleccion();
        }
      }

      if (control && tecla === "v") {
        evento.preventDefault();

        if (this.seleccionCopiada.length === 0) {
          return;
        }

        if (this.herramienta === this.pasteTool) {
          this.herramienta = this.sinHerramienta;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        } else {
          this.herramienta = this.pasteTool;
          this.actualizarVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (control === false && evento.altKey === false && tecla === "s") {
        if (this.herramienta === this.selectTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.selectTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (tecla === "delete" || tecla === "backspace") {
        evento.preventDefault();

        if (evento.repeat === false) {
          this.borrarOGoma();
        }

        return;
      }

      if (tecla === "escape") {
        if (this.haySeleccion) {
          this.quitarSeleccion();
        }
      }

      if (control === false && evento.altKey === false && tecla === "l") {
        this.herramienta = this.linkTool;
        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (control === false && evento.altKey === false && tecla === "p") {
        this.herramienta = this.portalTool;
        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (control && tecla === "z" && evento.shiftKey === false) {
        evento.preventDefault();
        this.undo();
      }

      if (
        (control && tecla === "y") ||
        (control && evento.shiftKey && tecla === "z")
      ) {
        evento.preventDefault();
        this.redo();
      }
    };

    this.input.keyboard?.on("keydown", alTeclado);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", alTeclado);
      this.popupSalida = null;
    });

    this.vistaPegado = this.add.rectangle(0, 0, 1, 1);
    this.vistaPegado.setOrigin(0);
    this.vistaPegado.setFillStyle(COLORES.blanco, 0.25);
    this.vistaPegado.setStrokeStyle(2, COLORES.blanco);
    this.vistaPegado.setVisible(false);

    this.capaVistaPegado.setVisible(false);
    this.capaVistaPlacasPegado.setVisible(false);
    this.capaVistaPortalesPegado.setVisible(false);
    this.restaurarTilesVistaPegado();

    this.vistaPegado.setDepth(10);

    if (this.estadoGuardado === null) {
      this.estadoGuardado = this.getEditorState();
    }

    this.crearInterfaz();
    this.crearTexturasParedes();
    this.crearHotbar();
    this.crearControlesSeleccion();

    this.textoTile = this.add.text(0, 0, "", {
      fontFamily: "Fuente",
      fontSize: "14px",
      color: colorTexto(COLORES.blanco),
      backgroundColor: colorTexto(COLORES.panel),
      padding: { x: 10, y: 8 },
      align: "center",
    });

    this.textoTile.setOrigin(0, 0);
    this.textoTile.setDepth(1000);
    this.textoTile.setVisible(false);
    this.bordeTooltipTile = this.add.rectangle(
      0, 0, 1, 1, COLORES.panel
    );

    this.bordeTooltipTile.setOrigin(0, 0);
    this.bordeTooltipTile.setStrokeStyle(2, COLORES.normal);
    this.bordeTooltipTile.setDepth(999);
    this.bordeTooltipTile.setVisible(false);

    this.events.on(Phaser.Scenes.Events.SLEEP, this.ocultarTooltipTile, this);
    this.input.on("gameout", this.ocultarTooltipTile, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.SLEEP, this.ocultarTooltipTile, this);
      this.input.off("gameout", this.ocultarTooltipTile, this);
    });

    this.crearFondoPanel([
      this.botonSeleccionar,
      this.botonDeseleccionar,
      this.botonPortal,
      this.botonLink,
      this.botonCopiar,
      this.botonPegar,
      this.botonBorrar,
      this.botonUndo,
      this.botonRedo
    ]);

    this.clickEnHotbar = false;

    for (let i = 0; i < this.casillasHotbar.length; i++) {
      this.configurarZonaHotbar(
        this.casillasHotbar[i],
        () => this.herramienta === this.tilesHotbar[i]
      );
    }

    this.configurarZonaHotbar(this.botonBorrar);

    this.herramienta = this.sinHerramienta;
    this.actualizarInterfaz();
    this.actualizarHotbar();

    this.lastState = this.getEditorState();

    this.actualizarRelieves();
    this.actualizarProfundidad();
  }

  private updateHoveredCell(
    pointerX: number,
    pointerY: number
  ): void {
    const localX = pointerX - this.board_offset_x;
    const localY = pointerY - this.board_offset_y;

    const inside_board =
      localX >= 0 &&
      localX < this.board_width &&
      localY >= 0 &&
      localY < this.board_height;

    if (!inside_board) {
      this.mouseX = -1;
      this.mouseY = -1;
      this.restaurarTileHover();
      this.hoverCell.setVisible(false);
      this.hoverTile.setVisible(false);
      return;
    }

    this.mouseX = Math.floor(localX / this.cellsize);
    this.mouseY = Math.floor(localY / this.cellsize);

    const cell_center_x =
      this.board_offset_x +
      this.mouseX * this.cellsize +
      this.cellsize / 2;

    const cell_center_y =
      this.board_offset_y +
      this.mouseY * this.cellsize +
      this.cellsize / 2;

    this.hoverCell.setPosition(cell_center_x, cell_center_y);
    this.hoverCell.setVisible(true);
    this.actualizarHoverTile();
  }

  private obtenerFormaTile(tile: number): number[][] | undefined {
    if (tile === this.tileBandera) {
      return this.formaSalida;
    }

    return this.formasPared[tile - 200];
  }

  private puedeColocarSalida(columna: number, fila: number): boolean {
    if (fila !== 1 || columna <= 0 || columna >= this.columns - 1) {
      return false;
    }

    const tile = this.tablero.getTileAt(columna, fila);
    const arriba = this.tablero.getTileAt(columna, fila - 1);

    if (tile === null || arriba === null) {
      return false;
    }

    const baseLibre = tile.index === this.tileInvisible ||
      tile.index === 17 || tile.index === 39 || tile.index === 64 ||
      tile.index === this.tileBandera;

    const espacioSuperior = arriba.index === this.tileInvisible ||
      arriba.index === 16 || arriba.index === 39 || arriba.index === 64 ||
      arriba.index === this.tileSalidaArriba;

    return baseLibre && espacioSuperior;
  }

  usarHerramienta() {
    if (
      this.mouseX === -1 ||
      this.mouseY === -1 ||
      this.herramienta === this.selectTool ||
      this.herramienta === this.pasteTool ||
      this.herramienta === this.sinHerramienta ||
      this.herramienta === this.portalTool ||
      this.herramienta === this.linkTool
    ) {
      return;
    }

    if (
      this.herramienta === this.tileBandera &&
      !this.puedeColocarSalida(this.mouseX, this.mouseY)
    ) {
      return;
    }

    let forma = this.obtenerFormaTile(this.herramienta);

    if (forma === undefined) {
      let tile = this.herramienta;

      if (tile === 0) {
        tile = this.tileInvisible;
      }

      forma = [[0, 0, tile]];
    }

    const casillas = [];

    for (let i = 0; i < forma.length; i++) {
      const x = this.mouseX + forma[i][0];
      const y = this.mouseY + forma[i][1];

      if (
        x < 0 || y < 0 ||
        x >= this.columns || y >= this.rows
      ) {
        return;
      }

      if (y === 0 && this.obtenerRelieve(forma[i][2]) !== -1) {
        return;
      }

      casillas.push([x, y]);
    }

    this.restaurarTileHover();

    if (this.herramienta === this.tilePlaca) {
      const tileActual = this.tablero.getTileAt(this.mouseX, this.mouseY);
      let admitePlaca = false;
      if (tileActual !== null) {
        admitePlaca = tileActual.index === this.tileInvisible ||
          this.esTileSobrePlaca(tileActual.index);
      }
      if (!admitePlaca) {
        this.borrarGrupoEn(this.mouseX, this.mouseY);
      }
      this.borrarPortalEn(this.mouseX, this.mouseY);
      this.capaPlacas.putTileAt(this.tilePlaca, this.mouseX, this.mouseY);
      this.actualizarHoverTile();
      return;
    }

    for (let i = 0; i < casillas.length; i++) {
      const x = casillas[i][0];
      const y = casillas[i][1];
      let conservarPlaca = this.esTileSobrePlaca(forma[i][2]);
      if (this.herramienta === 0) {
        const actual = this.tablero.getTileAt(x, y);
        conservarPlaca = actual !== null &&
          actual.index !== this.tileInvisible &&
          this.hayPlacaEn(x, y);
      }
      this.borrarGrupoEn(x, y, conservarPlaca);
    }

    if (this.herramienta === this.tileJugador) {
      this.borrarTileUnico(this.tileJugador);
    }

    if (this.herramienta === this.tileBandera) {
      this.borrarTileUnico(this.tileBandera);
    }

    for (let i = 0; i < casillas.length; i++) {
      this.tablero.putTileAt(
        forma[i][2],
        casillas[i][0],
        casillas[i][1]
      );
    }

    for (let i = 0; i < casillas.length; i++) {
      this.actualizarParedesConexas(casillas[i][0], casillas[i][1]);
    }

    this.actualizarHoverTile();
  }

  private iniciarSeleccion(): void {
    if (this.mouseX === -1 || this.mouseY === -1) {
      return;
    }

    this.seleccionInicioX = this.mouseX;
    this.seleccionInicioY = this.mouseY;
    this.seleccionando = true;

    this.actualizarInterfaz();
    this.actualizarSeleccion();
    this.rectanguloSeleccion.setVisible(true);
  }

  actualizarSeleccion() {
    if (this.mouseX === -1 || this.mouseY === -1) {
      return;
    }

    this.haySeleccion = false;

    this.seleccionIzquierda = Math.min(
      this.seleccionInicioX,
      this.mouseX
    );

    this.seleccionDerecha = Math.max(
      this.seleccionInicioX,
      this.mouseX
    );

    this.seleccionArriba = Math.min(
      this.seleccionInicioY,
      this.mouseY
    );

    this.seleccionAbajo = Math.max(
      this.seleccionInicioY,
      this.mouseY
    );

    const x =
      this.board_offset_x + this.seleccionIzquierda * this.cellsize;

    const y =
      this.board_offset_y + this.seleccionArriba * this.cellsize;

    const ancho =
      (this.seleccionDerecha - this.seleccionIzquierda + 1) *
      this.cellsize;

    const alto =
      (this.seleccionAbajo - this.seleccionArriba + 1) *
      this.cellsize;

    this.rectanguloSeleccion.setPosition(x, y);
    this.rectanguloSeleccion.setSize(ancho, alto);
    this.rectanguloSeleccion.setVisible(true);

    if (this.seleccionCompleta()) {
      this.rectanguloSeleccion.setFillStyle(COLORES.verde, 0.25);
      this.rectanguloSeleccion.setStrokeStyle(2, COLORES.verdeHover);
    } else {
      this.rectanguloSeleccion.setFillStyle(COLORES.rojo, 0.25);
      this.rectanguloSeleccion.setStrokeStyle(2, COLORES.rojo);
    }

    this.actualizarInterfaz();
  }

  private borrarSeleccion(quitar: boolean = true): void {
    if (
      this.seleccionIzquierda === -1 ||
      this.seleccionDerecha === -1 ||
      this.seleccionAbajo === -1 ||
      this.seleccionArriba === -1
    ) {
      return;
    }

    for (
      let fila = this.seleccionArriba;
      fila <= this.seleccionAbajo;
      fila++
    ) {
      for (
        let columna = this.seleccionIzquierda;
        columna <= this.seleccionDerecha;
        columna++
      ) {
        this.mapa.putTileAt(
          this.tileInvisible,
          columna,
          fila,
          true,
          this.tablero
        );

        this.mapa.removeTileAt(
          columna,
          fila,
          true,
          true,
          this.capaPortales
        );

        this.capaPlacas.removeTileAt(columna, fila);
        this.borrarLinksEn(columna, fila);
        this.actualizarParedesConexas(columna, fila);
      }
    }

    if (quitar) {
      this.quitarSeleccion();
    }
  }

  private quitarSeleccion(): void {
    this.seleccionando = false;
    this.haySeleccion = false;
    this.centroSeleccion = null;

    this.rectanguloSeleccion.setVisible(false);

    this.seleccionInicioX = -1;
    this.seleccionInicioY = -1;
    this.seleccionIzquierda = -1;
    this.seleccionDerecha = -1;
    this.seleccionArriba = -1;
    this.seleccionAbajo = -1;

    this.actualizarInterfaz();
  }

  private copiarSeleccion(): void {
    const contenido = this.obtenerContenidoSeleccion();

    if (contenido.length === 0) {
      return;
    }

    this.seleccionCopiada = contenido;
    this.portalesCopiados = this.obtenerPortalesSeleccion();

    this.actualizarVistaPegado();
    this.actualizarInterfaz();
  }

  private obtenerInicioPegado(): { x: number; y: number } {
    const offsetX = this.arrastrandoSeleccion ? this.arrastreOffsetX : Math.floor((this.seleccionCopiada[0].length - 1) / 2);
    const offsetY = this.arrastrandoSeleccion ? this.arrastreOffsetY : Math.floor((this.seleccionCopiada.length - 1) / 2);
    return { x: this.mouseX - offsetX, y: this.mouseY - offsetY };
  }

  private transformarPunto(x: number, y: number, ancho: number, alto: number, transformacion: TransformacionSeleccion): { x: number; y: number } {
    if (transformacion === "voltear") {
      return { x: ancho - 1 - x, y };
    }
    if (transformacion === "voltearVertical") {
      return { x, y: alto - 1 - y };
    }
    return transformacion === "horario" ? { x: alto - 1 - y, y: x } : { x: y, y: ancho - 1 - x };
  }

  private puedeUbicarRotacion(rotacion: EstadoEditor, inicioX: number, inicioY: number): boolean {
    const alto = rotacion.tablero.length, ancho = rotacion.tablero[0].length;
    if (inicioX < 0 || inicioY < 0 || inicioX + ancho > this.columns || inicioY + alto > this.rows) {
      return false;
    }
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const columna = inicioX + x, fila = inicioY + y;
        const objeto = this.objetoDeTileCodificado(rotacion.tablero[y][x]);
        const portal = rotacion.portales[y][x];
        if (fila === 0 && (this.obtenerRelieve(objeto) !== -1 ||
            (this.obtenerRelieve(portal) !== -1 && !esParedExteriorPortal(objeto)))) {
          return false;
        }
        if (objeto === this.tileBandera && (fila !== 1 || columna <= 0 || columna >= this.columns - 1)) {
          return false;
        }
        const dentro = columna >= this.seleccionIzquierda && columna <= this.seleccionDerecha &&
          fila >= this.seleccionArriba && fila <= this.seleccionAbajo;
        if (!dentro && (![-1, 0, this.tileInvisible].includes(this.obtenerTileCodificado(columna, fila)) || this.hayPortalEn(columna, fila))) {
          return false;
        }
      }
    }
    return true;
  }

  private rotarTile(tile: number, transformacion: TransformacionSeleccion): number | null {
    const objeto = this.objetoDeTileCodificado(tile);
    const orientaciones = [
      [3, 4, 5, 6],
      [11, 14, 12, 13],
      [27, 30, 28, 29],
      [17, 18, 20, 19],
      [21, 22, 23, 24]
    ];
    let rotado: number | null = null;
    for (const variantes of orientaciones) {
      const indice = variantes.indexOf(objeto);
      if (indice !== -1) {
        let siguiente = (indice + (transformacion === "horario" ? 1 : 3)) % 4;
        if (transformacion === "voltear" || transformacion === "voltearVertical") {
          siguiente = ((objeto >= 3 && objeto <= 6) || (objeto >= 21 && objeto <= 24) ? 5 - indice : 4 - indice) % 4;
          if (transformacion === "voltearVertical") {
            siguiente = (siguiente + 2) % 4;
          }
        }
        rotado = variantes[siguiente];
        break;
      }
    }
    if ([-1, 0, this.tileInvisible, 16, 37, 39, 41, this.tileJugador].includes(objeto)) {
      rotado = objeto;
    } else if (objeto === 64) {
      rotado = 39;
    }
    if (transformacion === "voltear" && (objeto === this.tileBandera || objeto === this.tileSalidaArriba)) {
      rotado = objeto;
    }
    if (rotado === null) {
      return null;
    }
    if (this.tienePlacaCodificada(tile)) {
      return rotado === this.tileInvisible ? this.tilePlaca : this.tilePlacaConObjeto + rotado;
    }
    return rotado;
  }

  private obtenerLinksTransformados(inicioX: number, inicioY: number, transformaciones: TransformacionSeleccion[], soloSeleccion: boolean = false): number[][] {
    const resultado: number[][] = [];
    for (const link of this.copiarLinks()) {
      let seleccionado = false;
      for (let extremo = 0; extremo < 4; extremo += 2) {
        let x = link[extremo] - this.seleccionIzquierda;
        let y = link[extremo + 1] - this.seleccionArriba;
        let ancho = this.seleccionDerecha - this.seleccionIzquierda + 1;
        let alto = this.seleccionAbajo - this.seleccionArriba + 1;
        if (x < 0 || x >= ancho || y < 0 || y >= alto) {
          continue;
        }
        seleccionado = true;
        for (const transformacion of transformaciones) {
          const punto = this.transformarPunto(x, y, ancho, alto, transformacion);
          x = punto.x;
          y = punto.y;
          if (transformacion === "horario" || transformacion === "antihorario") {
            [ancho, alto] = [alto, ancho];
          }
        }
        link[extremo] = inicioX + x;
        link[extremo + 1] = inicioY + y;
      }
      if (!soloSeleccion || seleccionado) {
        resultado.push(link);
      }
    }
    return resultado;
  }

  private obtenerRotacionSeleccion(transformacion: TransformacionSeleccion = "horario"): RotacionSeleccion | null {
    if ((!this.haySeleccion && !this.arrastrandoSeleccion) || this.seleccionando ||
        this.posibleArrastreSeleccion || this.bloquearMouseHastaSoltar ||
        this.herramienta !== this.selectTool || !this.seleccionCompleta() ||
        (this.arrastrandoSeleccion && (this.mouseX === -1 || this.mouseY === -1))) {
      return null;
    }
    const contenido = this.arrastrandoSeleccion ? this.seleccionCopiada : this.obtenerContenidoSeleccion();
    const portales = this.arrastrandoSeleccion ? this.portalesCopiados : this.obtenerPortalesSeleccion();
    if (contenido.length === 0 || contenido[0].length === 0) {
      return null;
    }
    const ancho = contenido[0].length, alto = contenido.length;
    const esVolteo = transformacion === "voltear" || transformacion === "voltearVertical";
    const nuevoAncho = esVolteo ? ancho : alto;
    const nuevoAlto = esVolteo ? alto : ancho;
    const centro = this.centroSeleccion ?? { x: ancho / 2, y: alto / 2 };
    const inicio = this.arrastrandoSeleccion ? this.obtenerInicioPegado() : { x: this.seleccionIzquierda, y: this.seleccionArriba };
    const centroX = inicio.x + centro.x, centroY = inicio.y + centro.y;
    const baseX = esVolteo ? inicio.x : Math.floor(centroX - nuevoAncho / 2 + 0.5);
    const baseY = esVolteo ? inicio.y : Math.floor(centroY - nuevoAlto / 2 + 0.5);
    const rotacion: RotacionSeleccion = {
      x: baseX, y: baseY, centro: { x: centroX - baseX, y: centroY - baseY },
      tablero: Array.from({ length: nuevoAlto }, () => Array(nuevoAncho).fill(this.tileInvisible)),
      portales: Array.from({ length: nuevoAlto }, () => Array(nuevoAncho).fill(-1)), links: []
    };
    const orientacionesPortal = [this.portalArriba, this.portalDerecha, this.portalAbajo, this.portalIzquierda];
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const tile = this.rotarTile(contenido[y][x], transformacion);
        if (tile === null) {
          return null;
        }
        const objeto = this.objetoDeTileCodificado(tile);
        const portal = portales[y][x];
        let portalRotado = -1;
        if (portal !== -1) {
          const indice = orientacionesPortal.indexOf(portal);
          if (indice === -1 || objeto <= this.tileInvisible || this.tilesSinPortal.includes(objeto) || this.tienePlacaCodificada(tile)) {
            return null;
          }
          const siguiente = esVolteo ? ((transformacion === "voltear" ? 4 : 6) - indice) % 4 :
            (indice + (transformacion === "horario" ? 1 : 3)) % 4;
          portalRotado = this.orientarPortalEnTile(objeto, orientacionesPortal[siguiente]);
          if (portalRotado === -1) {
            return null;
          }
        }
        const punto = this.transformarPunto(x, y, ancho, alto, transformacion);
        rotacion.tablero[punto.y][punto.x] = tile;
        rotacion.portales[punto.y][punto.x] = portalRotado;
      }
    }
    if (!this.puedeUbicarRotacion(rotacion, baseX, baseY)) {
      return null;
    }
    if (!this.arrastrandoSeleccion) {
      rotacion.links = this.obtenerLinksTransformados(baseX, baseY, [transformacion]);
    }
    return rotacion;
  }

  private crearControlesSeleccion(): void {
    const controles = this.add.container(0, 0).setDepth(20).setVisible(false);
    this.controlesSeleccion = controles;
    const transformaciones: TransformacionSeleccion[][] = [["horario", "antihorario"], ["voltear", "voltearVertical"]];
    const atajos = ["R", "F"];
    const bordeTooltip = this.add.rectangle(0, 0, 1, 1, COLORES.panel)
      .setOrigin(0).setStrokeStyle(2, COLORES.normal).setVisible(false);
    const tooltip = this.add.text(0, 0, "", {
      fontFamily: "Fuente", fontSize: "16px", color: colorTexto(COLORES.blanco),
      backgroundColor: colorTexto(COLORES.panel), padding: { left: 8, right: 8, top: 6, bottom: 6 }, resolution: 1
    }).setVisible(false);
    const ocultarTooltip = () => {
      tooltip.setVisible(false);
      bordeTooltip.setVisible(false);
    };
    controles.setData("tooltip", tooltip);
    controles.setData("ocultarTooltip", ocultarTooltip);
    for (let i = 0; i < transformaciones.length; i++) {
      const boton = this.add.rectangle(14, 14 + i * 32, 28, 28, COLORES.panel);
      boton.setStrokeStyle(2, COLORES.normal).setInteractive({ useHandCursor: true });
      const icono = this.add.image(14, 14 + i * 32, "iconosTransformacion", i);
      boton.setData("icono", icono);
      boton.on("pointerover", () => {
        boton.setData("hover", true);
        tooltip.setText(this.textoOpciones[46 + i][spanish] + " (" + atajos[i] + ")");
        const x = Math.max(8, Math.min(controles.x + 14 - tooltip.width / 2, this.scale.width - tooltip.width - 8));
        const arriba = controles.y + i * 32;
        const y = arriba - tooltip.height - 8 < 8 ? arriba + 36 : arriba - tooltip.height - 8;
        tooltip.setPosition(Math.round(x - controles.x), Math.round(y - controles.y));
        bordeTooltip.setSize(tooltip.width + 2, tooltip.height + 2).setPosition(tooltip.x - 1, tooltip.y - 1).setVisible(true);
        tooltip.setVisible(true);
      });
      boton.on("pointerout", () => {
        boton.setData("hover", false);
        ocultarTooltip();
      });
      boton.on("pointerdown", (mouse: Phaser.Input.Pointer, _x: number, _y: number, evento: Phaser.Types.Input.EventData) => {
        evento.stopPropagation();
        if (mouse.button !== 0 && mouse.button !== 2) {
          return;
        }
        this.controlSeleccionPulsado = mouse.id;
        ocultarTooltip();
        this.rotarSeleccion(transformaciones[i][mouse.button === 2 ? 1 : 0]);
      });
      boton.on("pointerup", (mouse: Phaser.Input.Pointer, _x: number, _y: number, evento: Phaser.Types.Input.EventData) => {
        if (this.controlSeleccionPulsado === mouse.id) {
          evento.stopPropagation();
          this.controlSeleccionPulsado = null;
        }
      });
      this.botonesTransformacion.push(boton);
      controles.add([boton, icono]);
    }
    controles.add([bordeTooltip, tooltip]);
  }

  private actualizarControlesSeleccion(): void {
    if (this.controlesSeleccion === null) {
      return;
    }
    const visible = this.haySeleccion && !this.arrastrandoSeleccion && !this.seleccionando &&
      this.herramienta === this.selectTool && this.popupSalida === null && !this.bloquearMouseHastaSoltar;
    this.controlesSeleccion.setVisible(visible);
    if (!visible) {
      this.controlesSeleccion.getData("ocultarTooltip")();
      for (const boton of this.botonesTransformacion) {
        boton.setData("hover", false);
        boton.disableInteractive();
      }
      return;
    }
    const inicio = this.arrastrandoSeleccion ? this.obtenerInicioPegado() : { x: this.seleccionIzquierda, y: this.seleccionArriba };
    const ancho = this.arrastrandoSeleccion ? this.seleccionCopiada[0].length : this.seleccionDerecha - inicio.x + 1;
    const izquierda = this.board_offset_x + inicio.x * this.cellsize;
    const arriba = this.board_offset_y + inicio.y * this.cellsize;
    const derecha = izquierda + ancho * this.cellsize;
    const limiteDerecho = this.scale.width - this.margenPanel - this.anchoPanelHerramientas - 6;
    let x = derecha + 6;
    if (x + 28 > limiteDerecho) {
      x = izquierda - 34;
    }
    this.controlesSeleccion.setPosition(Math.round(Math.max(4, x)), Math.round(Math.max(4, Math.min(arriba, this.scale.height - 64))));
    const transformaciones: TransformacionSeleccion[][] = [["horario", "antihorario"], ["voltear", "voltearVertical"]];
    for (let i = 0; i < this.botonesTransformacion.length; i++) {
      const boton = this.botonesTransformacion[i];
      const habilitado = transformaciones[i].some(transformacion => this.obtenerRotacionSeleccion(transformacion) !== null);
      const hover = habilitado && boton.getData("hover");
      boton.setFillStyle(hover ? 0x41425b : COLORES.panel);
      boton.setStrokeStyle(2, habilitado ? COLORES.normal : COLORES.borde);
      boton.getData("icono").setAlpha(habilitado ? 1 : 0.4);
      if (habilitado) {
        boton.setInteractive({ useHandCursor: true });
      } else {
        boton.disableInteractive();
        if (boton.getData("hover")) {
          boton.setData("hover", false);
          this.controlesSeleccion.getData("ocultarTooltip")();
        }
      }
    }
    const mouse = this.input.activePointer;
    if (this.botonesTransformacion.some(boton => boton.getBounds().contains(mouse.worldX, mouse.worldY))) {
      this.restaurarTileHover();
      this.hoverCell.setVisible(false);
      this.hoverTile.setVisible(false);
    }
  }

  //ROTAR
  private rotarSeleccion(transformacion: TransformacionSeleccion = "horario"): void {
    const rotacion = this.obtenerRotacionSeleccion(transformacion);
    if (rotacion === null) {
      return;
    }
    if (this.arrastrandoSeleccion) {
      this.arrastreOffsetX = this.mouseX - rotacion.x;
      this.arrastreOffsetY = this.mouseY - rotacion.y;
      this.centroSeleccion = rotacion.centro;
      this.seleccionCopiada = rotacion.tablero;
      this.portalesCopiados = rotacion.portales;
      this.transformacionesArrastre.push(transformacion);
      this.actualizarVistaPegado();
      this.actualizarControlesSeleccion();
      this.actualizarRelieves();
      this.actualizarProfundidad();
      return;
    }
    const inicioX = rotacion.x;
    const inicioY = rotacion.y;
    const alto = rotacion.tablero.length;
    const ancho = rotacion.tablero[0].length;
    this.restaurarTileHover();
    this.restaurarTilesVistaPegado();
    this.saveIfChanged();
    this.borrarSeleccion(false);
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        this.colocarTileCodificado(rotacion.tablero[y][x], inicioX + x, inicioY + y);
        if (rotacion.portales[y][x] !== -1) {
          this.capaPortales.putTileAt(rotacion.portales[y][x], inicioX + x, inicioY + y);
        }
      }
    }
    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        this.actualizarParedesConexas(inicioX + x, inicioY + y);
      }
    }
    this.links = rotacion.links;
    this.actualizarLinks();
    this.ubicarSeleccion(inicioX, inicioY, ancho, alto, rotacion.centro);
    this.saveIfChanged();
    this.actualizarRelieves();
    this.actualizarProfundidad();
    this.actualizarControlesSeleccion();
  }

  private pegarSeleccion(posicionValidada: boolean = false) {
    const pegando =
      this.herramienta === this.pasteTool ||
      this.arrastrandoSeleccion;

    if (
      pegando === false ||
      (posicionValidada === false && this.puedePegarSeleccion() === false)
    ) {
      return;
    }

    const alto = this.seleccionCopiada.length;
    const ancho = this.seleccionCopiada[0].length;

    const { x: inicioX, y: inicioY } = this.obtenerInicioPegado();

    this.restaurarTileHover();
    this.restaurarTilesVistaPegado();

    for (let fila = 0; fila < alto; fila++) {
      for (let columna = 0; columna < ancho; columna++) {
        const tile = this.seleccionCopiada[fila][columna];
        const objeto = this.objetoDeTileCodificado(tile);
        const conservarPlaca = this.esTileSobrePlaca(objeto) &&
          !this.tienePlacaCodificada(tile);
        this.borrarGrupoEn(
          inicioX + columna,
          inicioY + fila,
          conservarPlaca
        );

        if (objeto === this.tileJugador) {
          this.borrarTileUnico(this.tileJugador);
        }

        if (objeto === this.tileBandera) {
          this.borrarTileUnico(this.tileBandera);
        }
      }
    }

    for (let fila = 0; fila < alto; fila++) {
      for (let columna = 0; columna < ancho; columna++) {
        const x = inicioX + columna;
        const y = inicioY + fila;
        const tile = this.seleccionCopiada[fila][columna];
        const objeto = this.objetoDeTileCodificado(tile);
        const portal = this.orientarPortalEnTile(objeto, this.portalesCopiados[fila][columna]);

        this.colocarTileCodificado(tile, x, y);

        if (portal >= 0 && !this.hayPlacaEn(x, y)) {
          this.capaPortales.putTileAt(portal, x, y);
        }
      }
    }

    for (let fila = 0; fila < alto; fila++) {
      for (let columna = 0; columna < ancho; columna++) {
        this.actualizarParedesConexas(inicioX + columna, inicioY + fila);
      }
    }
  }

  private actualizarVistaPegado(): void {
    if (
      (
        !this.arrastrandoSeleccion &&
        this.herramienta !== this.pasteTool
      ) ||
      this.seleccionCopiada.length === 0 ||
      this.mouseX === -1 ||
      this.mouseY === -1
    ) {
      this.vistaPegado.setVisible(false);
      this.capaVistaPegado.setVisible(false);
      this.capaVistaPlacasPegado.setVisible(false);
      this.capaVistaPortalesPegado.setVisible(false);
      this.restaurarTilesVistaPegado();
      return;
    }

    const altoSeleccion = this.seleccionCopiada.length;
    const anchoSeleccion = this.seleccionCopiada[0].length;

    const { x: inicioX, y: inicioY } = this.obtenerInicioPegado();

    this.ocultarTilesDebajoVistaPegado(inicioX, inicioY);
    this.actualizarTilesVistaPegado(inicioX, inicioY);

    const posicionX =
      this.board_offset_x + inicioX * this.cellsize;

    const posicionY =
      this.board_offset_y + inicioY * this.cellsize;

    this.vistaPegado.setPosition(posicionX, posicionY);

    const entraEnTablero =
      inicioX + anchoSeleccion <= this.columns &&
      inicioY + altoSeleccion <= this.rows &&
      inicioX >= 0 &&
      inicioY >= 0 &&
      this.puedePegarSeleccion();

    const izquierdaVisible = Math.max(inicioX, 0);
    const arribaVisible = Math.max(inicioY, 0);

    const derechaVisible = Math.min(
      inicioX + anchoSeleccion,
      this.columns
    );

    const abajoVisible = Math.min(
      inicioY + altoSeleccion,
      this.rows
    );

    const anchoVisible = derechaVisible - izquierdaVisible;
    const altoVisible = abajoVisible - arribaVisible;

    if (anchoVisible <= 0 || altoVisible <= 0) {
      this.vistaPegado.setVisible(false);
      this.capaVistaPegado.setVisible(false);
      this.capaVistaPlacasPegado.setVisible(false);
      this.capaVistaPortalesPegado.setVisible(false);
      this.restaurarTilesVistaPegado();
      return;
    }

    const posX =
      this.board_offset_x + izquierdaVisible * this.cellsize;

    const posY =
      this.board_offset_y + arribaVisible * this.cellsize;

    this.vistaPegado.setPosition(posX, posY);

    this.vistaPegado.setSize(
      anchoVisible * this.cellsize,
      altoVisible * this.cellsize
    );

    if (entraEnTablero) {
      this.vistaPegado.setFillStyle(COLORES.blanco, 0.25);
      this.vistaPegado.setStrokeStyle(2, COLORES.blanco);
    } else {
      this.vistaPegado.setFillStyle(COLORES.rojo, 0.25);
      this.vistaPegado.setStrokeStyle(2, COLORES.rojo);
    }

    this.vistaPegado.setVisible(true);
  }

  private mouseDentroSeleccion(): boolean {
    if (
      this.mouseX === -1 ||
      this.mouseY === -1 ||
      this.seleccionIzquierda === -1 ||
      this.seleccionDerecha === -1 ||
      this.seleccionArriba === -1 ||
      this.seleccionAbajo === -1
    ) {
      return false;
    }

    return (
      this.mouseX >= this.seleccionIzquierda &&
      this.mouseX <= this.seleccionDerecha &&
      this.mouseY >= this.seleccionArriba &&
      this.mouseY <= this.seleccionAbajo
    );
  }

  private ubicarSeleccion(
    inicioX: number,
    inicioY: number,
    ancho: number,
    alto: number,
    centro: { x: number; y: number } | null = null
  ): void {
    this.seleccionando = false;
    this.centroSeleccion = centro;
    this.seleccionInicioX = inicioX;
    this.seleccionInicioY = inicioY;

    this.seleccionIzquierda = inicioX;
    this.seleccionDerecha = inicioX + ancho - 1;
    this.seleccionArriba = inicioY;
    this.seleccionAbajo = inicioY + alto - 1;

    if (this.seleccionCompleta() === false) {
      this.quitarSeleccion();
      return;
    }

    this.haySeleccion = true;

    this.rectanguloSeleccion.setFillStyle(COLORES.verde, 0.25);
    this.rectanguloSeleccion.setStrokeStyle(2, COLORES.verdeHover);

    this.rectanguloSeleccion.setPosition(
      this.board_offset_x + inicioX * this.cellsize,
      this.board_offset_y + inicioY * this.cellsize
    );

    this.rectanguloSeleccion.setSize(
      ancho * this.cellsize,
      alto * this.cellsize
    );

    this.rectanguloSeleccion.setVisible(true);

    this.haySeleccion = true;
    this.actualizarInterfaz();
  }

  private puedePegarSeleccion(): boolean {
    if (
      this.seleccionCopiada.length === 0 ||
      this.mouseX === -1 ||
      this.mouseY === -1
    ) {
      return false;
    }

    const altoSeleccion = this.seleccionCopiada.length;
    const anchoSeleccion = this.seleccionCopiada[0].length;

    if (anchoSeleccion === 0 || altoSeleccion === 0) {
      return false;
    }

    const { x: inicioX, y: inicioY } = this.obtenerInicioPegado();

    if (
      inicioX < 0 || inicioY < 0 ||
      inicioX + anchoSeleccion > this.columns ||
      inicioY + altoSeleccion > this.rows
    ) {
      return false;
    }

    for (let fila = 0; fila < altoSeleccion; fila++) {
      for (let columna = 0; columna < anchoSeleccion; columna++) {
        const tile = this.objetoDeTileCodificado(this.seleccionCopiada[fila][columna]);

        const portal = this.portalesCopiados[fila][columna];

        if (
          inicioY + fila === 0 &&
          (this.obtenerRelieve(tile) !== -1 ||
            (this.obtenerRelieve(portal) !== -1 && !esParedExteriorPortal(tile)))
        ) {
          return false;
        }

        if (tile === this.tileBandera) {
          if (
            fila === 0 ||
            this.seleccionCopiada[fila - 1][columna] !== this.tileSalidaArriba ||
            !this.puedeColocarSalida(inicioX + columna, inicioY + fila)
          ) {
            return false;
          }
        }

        if (tile === this.tileSalidaArriba) {
          if (
            fila + 1 >= altoSeleccion ||
            this.seleccionCopiada[fila + 1][columna] !== this.tileBandera
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private esTileSobrePlaca(tile: number): boolean {
    if (tile === this.tileJugador || tile === 37) {
      return true;
    }
    if (tile >= 3 && tile <= 6) {
      return true;
    }
    if (tile >= 11 && tile <= 14) {
      return true;
    }
    return tile >= 27 && tile <= 30;
  }

  private tienePlacaCodificada(tile: number): boolean {
    return tile === this.tilePlaca ||
      (tile >= this.tilePlacaConObjeto && tile < 2000);
  }

  private objetoDeTileCodificado(tile: number): number {
    if (tile === this.tilePlaca) {
      return this.tileInvisible;
    }
    if (tile >= this.tilePlacaConObjeto && tile < 2000) {
      return tile - this.tilePlacaConObjeto;
    }
    return tile;
  }

  private obtenerTileCodificado(columna: number, fila: number): number {
    const tile = this.tablero.getTileAt(columna, fila);
    let objeto = this.tileInvisible;
    if (tile !== null) {
      objeto = tile.index;
    }

    if (!this.hayPlacaEn(columna, fila)) {
      return objeto;
    }

    if (objeto === this.tileInvisible || objeto === -1) {
      return this.tilePlaca;
    }

    return this.tilePlacaConObjeto + objeto;
  }

  private colocarTileCodificado(tile: number, x: number, y: number): void {
    const objeto = this.objetoDeTileCodificado(tile);
    this.tablero.putTileAt(objeto, x, y);
    if (this.tienePlacaCodificada(tile)) {
      this.capaPlacas.putTileAt(this.tilePlaca, x, y);
    }
  }

  private getBoardState(): number[][] {
    const state: number[][] = [];

    for (let y = 0; y < this.rows; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.columns; x++) {
        row.push(this.obtenerTileCodificado(x, y));
      }
      state.push(row);
    }

    return state;
  }

  private restoreBoardState(state: number[][]): void {
    this.capaPlacas.fill(-1);

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        this.colocarTileCodificado(state[y][x], x, y);
      }
    }
  }

  private statesAreEqual(
    firstState: EstadoEditor,
    secondState: EstadoEditor
  ): boolean {
    return (
      this.matricesAreEqual(
        firstState.tablero,
        secondState.tablero
      ) &&
      this.matricesAreEqual(
        firstState.portales,
        secondState.portales
      ) &&
      this.matricesAreEqual(
        firstState.links,
        secondState.links
      )
    );
  }

  private saveIfChanged(): void {
    const currentState = this.getEditorState();

    if (this.statesAreEqual(this.lastState, currentState)) {
      return;
    }

    this.undoHistory.push(this.lastState);
    this.redoHistory = [];
    this.lastState = currentState;

    if (this.undoHistory.length > 100) {
      this.undoHistory.shift();
    }

    this.actualizarInterfaz();
  }

  private undo(): void {
    const previousState = this.undoHistory.pop();

    if (previousState === undefined) {
      return;
    }

    this.redoHistory.push(this.getEditorState());
    this.restoreEditorState(previousState);
    this.lastState = previousState;
    this.quitarSeleccion();
  }

  private redo(): void {
    const nextState = this.redoHistory.pop();

    if (nextState === undefined) {
      return;
    }

    this.undoHistory.push(this.getEditorState());
    this.restoreEditorState(nextState);
    this.lastState = nextState;
    this.quitarSeleccion();
  }

  private obtenerContenidoSeleccion(): number[][] {
    if (
      this.seleccionIzquierda === -1 ||
      this.seleccionDerecha === -1 ||
      this.seleccionArriba === -1 ||
      this.seleccionAbajo === -1
    ) {
      return [];
    }

    const contenido: number[][] = [];

    for (
      let fila = this.seleccionArriba;
      fila <= this.seleccionAbajo;
      fila++
    ) {
      const filaCopiada: number[] = [];

      for (
        let columna = this.seleccionIzquierda;
        columna <= this.seleccionDerecha;
        columna++
      ) {
        filaCopiada.push(this.obtenerTileCodificado(columna, fila));
      }

      contenido.push(filaCopiada);
    }

    return contenido;
  }

  update(): void {
    this.actualizarControlesSeleccion();
    if (this.popupSalida !== null) {
      this.ocultarTooltipLink();
      if (this.popupSalida.scene !== undefined) {
        return;
      }

      this.popupSalida = null;
      this.actualizarInterfaz();
    }

    this.actualizarLinks();

    const valido = this.nivelValido();
    const puedeGuardar = valido && this.hayCambiosSinGuardar();

    if (
      valido !== this.nivelValidoAnterior ||
      puedeGuardar !== this.puedeGuardarAnterior
    ) {
      this.actualizarInterfaz();
    }

    if (
      this.herramienta !== this.selectTool &&
      this.rectanguloSeleccion.visible
    ) {
      this.quitarSeleccion();
    }

    if (
      this.herramienta !== this.pasteTool &&
      this.arrastrandoSeleccion === false &&
      this.vistaPegado.visible
    ) {
      this.vistaPegado.setVisible(false);
      this.capaVistaPegado.setVisible(false);
      this.capaVistaPlacasPegado.setVisible(false);
      this.capaVistaPortalesPegado.setVisible(false);
      this.restaurarTilesVistaPegado();
    }

    this.actualizarRelieves();
    this.actualizarProfundidad();

    if (
      this.herramienta !== this.linkTool &&
      this.linkInicioX !== -1
    ) {
      this.cancelarLinkTemporal();
    }

    this.actualizarVistaLink();
    this.actualizarTooltipLink();
  }

  private hayCambiosSinGuardar(): boolean {
    if (this.estadoGuardado === null) {
      return false;
    }

    return this.statesAreEqual(
      this.estadoGuardado,
      this.getEditorState()
    ) === false;
  }

  private solicitarSalida(): void {
    if (this.popupSalida !== null) {
      return;
    }

    if (this.hayCambiosSinGuardar() === false) {
      const transition = this.scene.get("transition") as TransitionScene;

      transition.changeScene(
        this.sys.settings.key,
        "LevelsScene"
      );
      return;
    }

    this.cerrarSubHotbar();
    this.cancelarLinkTemporal();
    this.restaurarTileHover();

    this.hoverTile.setVisible(false);
    this.hoverCell.setVisible(false);
    this.vistaPegado.setVisible(false);
    this.capaVistaPegado.setVisible(false);
    this.capaVistaPlacasPegado.setVisible(false);
    this.capaVistaPortalesPegado.setVisible(false);

    this.restaurarTilesVistaPegado();
    this.actualizarRelieves();
    this.actualizarProfundidad();

    for (let i = 0; i < this.children.list.length; i++) {
      this.children.list[i].emit("ocultarTooltip");
    }

    let mensaje =
      this.textoOpciones[5][spanish];

    if (this.nivelValido() === false) {
      if (
        this.existeTile(this.tileJugador) &&
        this.existeTile(this.tileBandera)
      ) {
        mensaje = this.textoOpciones[6][spanish];
      } else {
        mensaje = this.textoOpciones[7][spanish];
      }
    }

    const cantidadAnterior = this.children.list.length;

    mostrarConfirmacion(
      this,
      this.textoOpciones[8][spanish],
      mensaje,
      this.textoOpciones[9][spanish],
      COLORES.rojo,
      () => {
        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(
          this.sys.settings.key,
          "LevelsScene"
        );
      }
    );

    this.popupSalida = this.children.list[cantidadAnterior];

    this.popupSalida.once("destroy", () => {
      this.bloquearMouseHastaSoltar = this.input.activePointer.isDown;
    });
  }

  private async guardarNivelActual(): Promise<void> {
    if (
      this.nivelValido() === false ||
      this.hayCambiosSinGuardar() === false
    ) {
      return;
    }

    if (this.nivelId === null) {
      return;
    }

    const nivel = obtenerNivel(this.nivelId);

    if (nivel === undefined) {
      return;
    }

    nivel.tablero = this.getBoardState();
    nivel.portales = this.getPortalState();
    nivel.links = this.copiarLinks();

    const estadoEnviado = this.getEditorState();

    try {
      await actualizarNivel(nivel);
      this.estadoGuardado = estadoEnviado;
    } catch (error) {
      if (this.scene.isActive()) {
        window.alert(this.textoOpciones[10][spanish] + String(error));
      }
    }

    if (this.scene.isActive()) {
      this.actualizarInterfaz();
    }
  }

  private actualizarInterfaz(): void {
    if (this.popupSalida !== null) {
      return;
    }

    const colorNormal = COLORES.normal;
    const colorSeleccionado = COLORES.amarillo;
    const colorDesactivado = COLORES.desactivado;

    if (this.herramienta === this.selectTool) {
      this.botonSeleccionar.setFillStyle(colorSeleccionado);
    } else {
      this.botonSeleccionar.setFillStyle(colorNormal);
    }

    if (
      this.seleccionCopiada.length === 0 ||
      this.arrastrandoSeleccion
    ) {
      this.botonPegar.disableInteractive();
      this.botonPegar.setFillStyle(colorDesactivado);
      this.botonPegar.setAlpha(1);
    } else {
      this.botonPegar.setInteractive({ useHandCursor: true });
      this.botonPegar.setAlpha(1);

      if (this.herramienta === this.pasteTool) {
        this.botonPegar.setFillStyle(colorSeleccionado);
      } else {
        this.botonPegar.setFillStyle(colorNormal);
      }

      this.actualizarHoverTile();
    }

    this.botonBorrar.setInteractive({ useHandCursor: true });
    this.botonBorrar.setAlpha(1);

    if (this.haySeleccion) {
      this.botonDeseleccionar.setInteractive({ useHandCursor: true });
      this.botonDeseleccionar.setFillStyle(colorNormal);
      this.botonDeseleccionar.setAlpha(1);
      this.botonCopiar.setInteractive({ useHandCursor: true });

      this.botonBorrar.setFillStyle(COLORES.rojo);
      this.botonCopiar.setFillStyle(colorNormal);

      this.botonCopiar.setAlpha(1);
    } else {
      this.botonDeseleccionar.disableInteractive();
      this.botonDeseleccionar.setFillStyle(colorDesactivado);
      this.botonDeseleccionar.setAlpha(1);
      this.botonCopiar.disableInteractive();

      if (this.herramienta === 0) {
        this.botonBorrar.setFillStyle(colorSeleccionado);
      } else {
        this.botonBorrar.setFillStyle(colorNormal);
      }

      this.botonCopiar.setFillStyle(colorDesactivado);
      this.botonCopiar.setAlpha(1);
    }

    if (this.undoHistory.length === 0) {
      this.botonUndo.disableInteractive();
      this.botonUndo.setFillStyle(colorDesactivado);
      this.botonUndo.setAlpha(1);
    } else {
      this.botonUndo.setInteractive({ useHandCursor: true });
      this.botonUndo.setFillStyle(colorNormal);
      this.botonUndo.setAlpha(1);
    }

    if (this.redoHistory.length === 0) {
      this.botonRedo.disableInteractive();
      this.botonRedo.setFillStyle(colorDesactivado);
      this.botonRedo.setAlpha(1);
    } else {
      this.botonRedo.setInteractive({ useHandCursor: true });
      this.botonRedo.setFillStyle(colorNormal);
      this.botonRedo.setAlpha(1);
    }

    if (this.herramienta === this.linkTool) {
      this.botonLink.setFillStyle(colorSeleccionado);
    } else {
      this.botonLink.setFillStyle(colorNormal);
    }

    if (this.herramienta === this.portalTool) {
      this.botonPortal.setFillStyle(colorSeleccionado);
    } else {
      this.botonPortal.setFillStyle(colorNormal);
    }

    const valido = this.nivelValido();
    const puedeGuardar = valido && this.hayCambiosSinGuardar();

    this.nivelValidoAnterior = valido;
    this.puedeGuardarAnterior = puedeGuardar;

    if (puedeGuardar) {
      this.botonGuardar.setInteractive({ useHandCursor: true });
      this.botonGuardar.setFillStyle(COLORES.verde);
    } else {
      this.botonGuardar.disableInteractive();
      this.botonGuardar.setFillStyle(colorDesactivado);
    }

    this.botonVolver.setInteractive({ useHandCursor: true });
    this.botonVolver.setFillStyle(COLORES.naranja);

    if (this.botonTest !== null) {
      if (valido) {
        this.botonTest.setInteractive({ useHandCursor: true });
        this.botonTest.setFillStyle(COLORES.violeta);
      } else {
        this.botonTest.disableInteractive();
        this.botonTest.setFillStyle(colorDesactivado);
      }
    }

    if (this.textoEstado !== null) {
      if (valido === false) {
        if (
          this.existeTile(this.tileJugador) &&
          this.existeTile(this.tileBandera)
        ) {
          this.textoEstado.setText(this.textoOpciones[11][spanish]);
        } else {
          this.textoEstado.setText(this.textoOpciones[12][spanish]);
        }
        this.textoEstado.setColor(colorTexto(COLORES.naranja));
      } else if (this.hayCambiosSinGuardar()) {
        this.textoEstado.setText(this.textoOpciones[13][spanish]);
        this.textoEstado.setColor(colorTexto(COLORES.amarillo));
      } else {
        this.textoEstado.setText(this.textoOpciones[14][spanish]);
        this.textoEstado.setColor(colorTexto(COLORES.verde));
      }
    }

    this.botonGuardar.setAlpha(1);
    this.botonVolver.setAlpha(1);

    for (let i = 0; i < this.botonesInterfaz.length; i++) {
      const boton = this.botonesInterfaz[i];

      if (boton.input && boton.input.enabled) {
        if (boton.getData("hoverInterfaz") === true) {
          boton.setFillStyle(oscurecerColor(boton.fillColor));
        }
      } else {
        boton.setData("hoverInterfaz", false);
        boton.emit("ocultarTooltip");
      }
    }
  }

  private crearInterfaz(): void {
    const altoBoton = 40;
    const cantidadFilas = 9;
    const derecha = this.scale.width - this.margenPanel;
    const izquierda = derecha - this.anchoPanelHerramientas;
    const x = (izquierda + derecha) / 2;
    const ancho = this.anchoPanelHerramientas - this.margenPanel * 2;
    const arriba = this.arribaPaneles + this.margenPanel;
    const abajo = this.scale.height - this.margenPanel * 2;
    const separacion = (abajo - arriba - altoBoton) / (cantidadFilas - 1);
    let y = arriba + altoBoton / 2;

    this.botonSeleccionar = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[15][spanish],
      () => {
        if (this.herramienta === this.selectTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.selectTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonDeseleccionar = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[16][spanish],
      () => this.quitarSeleccion()
    );

    y += separacion;

    this.botonCopiar = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[17][spanish],
      () => {
        this.copiarSeleccion();
        this.actualizarInterfaz();
      }
    );

    y += separacion;

    this.botonPegar = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[18][spanish],
      () => {
        if (this.herramienta === this.pasteTool) {
          this.herramienta = this.sinHerramienta;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        } else {
          this.herramienta = this.pasteTool;
          this.actualizarVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonBorrar = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[19][spanish],
      () => this.borrarOGoma()
    );

    y += separacion;

    this.botonPortal = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[20][spanish],
      () => {
        if (this.herramienta === this.portalTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.portalTool;
          this.cancelarLinkTemporal();
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
          this.quitarSeleccion();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonLink = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[21][spanish],
      () => {
        if (this.herramienta === this.linkTool) {
          this.herramienta = this.sinHerramienta;
          this.cancelarLinkTemporal();
        } else {
          this.herramienta = this.linkTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
          this.quitarSeleccion();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonUndo = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[22][spanish],
      () => this.undo()
    );

    y += separacion;

    this.botonRedo = crearBoton(
      this,
      x,
      y,
      ancho,
      this.textoOpciones[23][spanish],
      () => this.redo()
    );

    this.botonSeleccionar.setData("atajo", "S");
    this.botonDeseleccionar.setData("atajo", "Esc");
    this.botonPortal.setData("atajo", "P");
    this.botonLink.setData("atajo", "L");
    this.botonCopiar.setData("atajo", "Ctrl/Cmd + C");
    this.botonPegar.setData("atajo", "Ctrl/Cmd + V");
    this.botonBorrar.setData("atajo", "Delete / Backspace");
    this.botonUndo.setData("atajo", "Ctrl/Cmd + Z");
    this.botonRedo.setData("atajo", "Ctrl/Cmd + Y");

    this.botonesInterfaz = [
      this.botonSeleccionar,
      this.botonDeseleccionar,
      this.botonPortal,
      this.botonLink,
      this.botonCopiar,
      this.botonPegar,
      this.botonBorrar,
      this.botonUndo,
      this.botonRedo,
      this.botonGuardar,
      this.botonVolver
    ];

    if (this.botonTest !== null) {
      this.botonesInterfaz.push(this.botonTest);
    }

    for (let i = 0; i < this.botonesInterfaz.length; i++) {
      const boton = this.botonesInterfaz[i];

      boton.setData("hoverInterfaz", false);

      boton.on("pointerover", () => {
        boton.setData("hoverInterfaz", true);
        this.actualizarInterfaz();
      });

      boton.on("pointerout", () => {
        boton.setData("hoverInterfaz", false);
        this.actualizarInterfaz();
      });
    }

    this.actualizarInterfaz();
  }

  private crearHotbar(): void {
    this.casillasHotbar = [];
    this.imagenesHotbar = [];

    const tamaño = 40;
    const espacio = 12;
    const separacion = tamaño + espacio;
    const anchoHotbar = this.tilesHotbar.length * separacion - espacio;
    const y = this.yHotbar;
    const centroX = this.board_offset_x + this.board_width / 2;

    let x = centroX - anchoHotbar / 2 + tamaño / 2;

    for (let i = 0; i < this.tilesHotbar.length; i++) {
      const casillaX = x;

      this.add.rectangle(
        casillaX + 3,
        y + 3,
        tamaño + 4,
        44,
        COLORES.sombra
      );

      const casilla = this.add.rectangle(
        casillaX,
        y,
        tamaño,
        tamaño,
        COLORES.casilla
      );

      casilla.setStrokeStyle(4, COLORES.fondo);
      casilla.setInteractive({ useHandCursor: true });

      const grafico = this.obtenerGraficoTile(
        this.tilesHotbar[i]
      );

      const imagen = this.add.image(
        casillaX,
        y,
        "editorTiles",
        0
      );

      if (grafico !== null) {
        imagen.setTexture(grafico.textura, grafico.frame);
        this.ajustarIconoHotbar(imagen);
      }

      casilla.setData("atajo", String(i + 1));
      this.configurarTooltipTile(casilla, () => this.tilesHotbar[i], true);

      const variantes = this.obtenerVariantes(this.tilesHotbar[i]);

      if (variantes !== null && variantes.length > 1) {
        const marca = this.add.triangle(
          casillaX + tamaño / 2 - 5,
          y - tamaño / 2 + 5,
          0, 0,
          7, 0,
          7, 7,
          COLORES.amarillo
        );

        marca.setDepth(12);
      }

      casilla.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.popupSalida !== null || this.bloquearMouseHastaSoltar) {
          return;
        }

        if (pointer.button === 2) {
          this.abrirSubHotbar(i, casillaX, y);
          return;
        }

        if (pointer.button !== 0) {
          return;
        }

        this.cerrarSubHotbar();

        const tileActual = this.tilesHotbar[i];

        if (this.herramienta === tileActual) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = tileActual;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPlacasPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
        this.actualizarHoverTile();
      });

      this.casillasHotbar.push(casilla);
      this.imagenesHotbar.push(imagen);

      x += separacion;
    }

  }

  private borrarOGoma(): void {
    if (this.haySeleccion) {
      this.borrarSeleccion();
      this.saveIfChanged();
    } else if (this.herramienta === 0) {
      this.herramienta = this.sinHerramienta;
    } else {
      this.herramienta = 0;
      this.vistaPegado.setVisible(false);
      this.capaVistaPegado.setVisible(false);
      this.capaVistaPlacasPegado.setVisible(false);
      this.capaVistaPortalesPegado.setVisible(false);
      this.restaurarTilesVistaPegado();
    }

    this.cerrarSubHotbar();
    this.actualizarInterfaz();
    this.actualizarHotbar();
    this.actualizarHoverTile();
  }

  private seleccionarHotbar(indice: number): void {
    if (
      indice < 0 || indice >= this.tilesHotbar.length ||
      this.popupSalida !== null || this.bloquearMouseHastaSoltar ||
      this.arrastrandoSeleccion || this.seleccionando
    ) {
      return;
    }

    this.herramienta = this.tilesHotbar[indice];

    this.cerrarSubHotbar();
    this.cancelarLinkTemporal();
    this.quitarSeleccion();
    this.vistaPegado.setVisible(false);
    this.capaVistaPegado.setVisible(false);
    this.capaVistaPlacasPegado.setVisible(false);
    this.capaVistaPortalesPegado.setVisible(false);
    this.restaurarTilesVistaPegado();
    this.actualizarInterfaz();
    this.actualizarHotbar();
    this.actualizarHoverTile();
  }

  private cambiarVarianteHotbar(direccion: number): void {
    if (
      this.popupSalida !== null || this.bloquearMouseHastaSoltar ||
      this.arrastrandoSeleccion || this.seleccionando
    ) {
      return;
    }

    for (let i = 0; i < this.tilesHotbar.length; i++) {
      if (this.tilesHotbar[i] !== this.herramienta) {
        continue;
      }

      const variantes = this.obtenerVariantes(this.herramienta);

      if (variantes === null || variantes.length < 2) {
        return;
      }

      for (let j = 0; j < variantes.length; j++) {
        if (variantes[j] !== this.herramienta) {
          continue;
        }

        let siguiente = j + direccion;

        if (siguiente < 0) {
          siguiente = variantes.length - 1;
        }

        if (siguiente >= variantes.length) {
          siguiente = 0;
        }

        this.tilesHotbar[i] = variantes[siguiente];
        this.actualizarImagenHotbar(i);
        this.seleccionarHotbar(i);
        return;
      }
    }
  }

  private actualizarHotbar(): void {
    for (let i = 0; i < this.casillasHotbar.length; i++) {
      this.pintarCasillaHotbar(
        this.casillasHotbar[i],
        this.herramienta === this.tilesHotbar[i]
      );
    }

  }

  private orientarPortalEnTile(tile: number, portal: number): number {
    if (portal === -1) return -1;
    if (tile === 17) return this.portalAbajo;
    if (tile === 20) return this.portalArriba;
    if (tile === 18) return this.portalIzquierda;
    if (tile === 19) return this.portalDerecha;
    if (tile >= 21 && tile <= 24) return -1;
    return portal;
  }

  private obtenerPortal(
    pointerX: number,
    pointerY: number
  ): number {
    const tile = this.tablero.getTileAt(this.mouseX, this.mouseY);
    if (tile !== null && esParedExteriorPortal(tile.index)) {
      return this.orientarPortalEnTile(tile.index, this.portalArriba);
    }

    const izquierda =
      this.board_offset_x + this.mouseX * this.cellsize;

    const arriba =
      this.board_offset_y + this.mouseY * this.cellsize;

    const x = pointerX - izquierda;
    const y = pointerY - arriba;

    const distanciaArriba = y;
    const distanciaDerecha = this.cellsize - x;
    const distanciaAbajo = this.cellsize - y;
    const distanciaIzquierda = x;

    const menor = Math.min(
      distanciaArriba,
      distanciaDerecha,
      distanciaAbajo,
      distanciaIzquierda
    );

    if (menor === distanciaArriba) {
      return this.portalArriba;
    }

    if (menor === distanciaDerecha) {
      return this.portalDerecha;
    }

    if (menor === distanciaAbajo) {
      return this.portalAbajo;
    }

    return this.portalIzquierda;
  }

  private buscarParejaPortal(x: number, y: number): number[] | undefined {

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];

      if (
        !this.hayPortalEn(link[0], link[1]) ||
        !this.hayPortalEn(link[2], link[3])
      ) {
        continue;
      }

      if (
        link[0] === x &&
        link[1] === y
      ) {
        return [link[2], link[3]];
      }

      if (
        link[2] === x &&
        link[3] === y
      ) {
        return [link[0], link[1]];
      }
    }

    return undefined;
  }

  private existeLink(x1: number, y1: number, x2: number, y2: number): boolean {

    return this.links.some(link =>
      (
        link[0] === x1 &&
        link[1] === y1 &&
        link[2] === x2 &&
        link[3] === y2
      ) ||
      (
        link[0] === x2 &&
        link[1] === y2 &&
        link[2] === x1 &&
        link[3] === y1
      )
    );
  }

  private alternarNotLink(indice: number): void {
    const link = this.links[indice];
    if (!link || !this.esLinkDePlaca(link)) {
      return;
    }
    this.saveIfChanged();
    const nuevoValor = link[4] === 1 ? 0 : 1;
    link[4] = nuevoValor;
    let placaX = link[0], placaY = link[1];
    let destinoX = link[2], destinoY = link[3];
    if (!this.esLinkDeEmisor(link) && this.hayPortalEn(placaX, placaY)) {
      [placaX, placaY, destinoX, destinoY] = [destinoX, destinoY, placaX, placaY];
    }
    const pareja = this.hayPortalEn(destinoX, destinoY) ? this.buscarParejaPortal(destinoX, destinoY) : undefined;
    if (pareja) {
      for (const otro of this.links) {
        if ((otro[0] === placaX && otro[1] === placaY && otro[2] === pareja[0] && otro[3] === pareja[1]) ||
            (otro[2] === placaX && otro[3] === placaY && otro[0] === pareja[0] && otro[1] === pareja[1])) {
          otro[4] = nuevoValor;
        }
      }
    }
    this.dibujarLinks();
    this.saveIfChanged();
    this.actualizarInterfaz();
  }

  private usarPortal(
    pointerX: number,
    pointerY: number
  ): void {
    if (this.mouseX === -1 || this.mouseY === -1) {
      return;
    }

    const portal = this.obtenerPortal(pointerX, pointerY);

    if (
      !this.puedeColocarPortal(
        this.mouseX,
        this.mouseY,
        portal
      )
    ) {
      return;
    }

    const portalActual = this.mapa.getTileAt(
      this.mouseX,
      this.mouseY,
      false,
      this.capaPortales
    );

    if (portalActual !== null && portalActual.index === portal) {
      this.mapa.removeTileAt(
        this.mouseX,
        this.mouseY,
        true,
        true,
        this.capaPortales
      );
    } else {
      this.mapa.putTileAt(
        portal,
        this.mouseX,
        this.mouseY,
        true,
        this.capaPortales
      );
    }

    this.actualizarLinks();
  }

  private puedeColocarPortal(
    columna: number,
    fila: number,
    portal: number
  ): boolean {
    const tile = this.mapa.getTileAt(
      columna,
      fila,
      false,
      this.tablero
    );

    if (tile === null) {
      return false;
    }

    if (this.hayPlacaEn(columna, fila)) {
      return false;
    }

    if (portal === -1 || this.orientarPortalEnTile(tile.index, portal) !== portal) {
      return false;
    }

    if (fila === 0 && !esParedExteriorPortal(tile.index)) {
      return false;
    }

    if (
      tile.index === this.tileInvisible ||
      tile.index === this.tileBandera ||
      tile.index === this.tileSalidaArriba
    ) {
      return false;
    }

    for (let i = 0; i < this.tilesSinPortal.length; i++) {
      if (tile.index === this.tilesSinPortal[i]) {
        return false;
      }
    }

    return true;
  }

  private obtenerPortalesSeleccion(): number[][] {
    if (
      this.seleccionIzquierda === -1 ||
      this.seleccionDerecha === -1 ||
      this.seleccionArriba === -1 ||
      this.seleccionAbajo === -1
    ) {
      return [];
    }

    const contenido: number[][] = [];

    for (
      let fila = this.seleccionArriba;
      fila <= this.seleccionAbajo;
      fila++
    ) {
      const filaCopiada: number[] = [];

      for (
        let columna = this.seleccionIzquierda;
        columna <= this.seleccionDerecha;
        columna++
      ) {
        const portal = this.mapa.getTileAt(
          columna,
          fila,
          false,
          this.capaPortales
        );

        if (portal === null) {
          filaCopiada.push(-1);
        } else {
          filaCopiada.push(portal.index);
        }
      }

      contenido.push(filaCopiada);
    }

    return contenido;
  }

  private actualizarTilesVistaPegado(
    inicioX: number,
    inicioY: number
  ): void {
    this.capaVistaPegado.fill(-1);
    this.capaVistaPlacasPegado.fill(-1);
    this.capaVistaPortalesPegado.fill(-1);

    for (let fila = 0; fila < this.seleccionCopiada.length; fila++) {
      for (
        let columna = 0;
        columna < this.seleccionCopiada[fila].length;
        columna++
      ) {
        const x = inicioX + columna;
        const y = inicioY + fila;

        if (
          x < 0 ||
          y < 0 ||
          x >= this.columns ||
          y >= this.rows
        ) {
          continue;
        }

        const tileEncontrada = this.seleccionCopiada[fila][columna];
        const objeto = this.objetoDeTileCodificado(tileEncontrada);
        if (objeto !== this.tileInvisible) {
          this.capaVistaPegado.putTileAt(objeto, x, y);
        }
        if (this.tienePlacaCodificada(tileEncontrada)) {
          this.capaVistaPlacasPegado.putTileAt(this.tilePlaca, x, y);
        }

        const portalEncontrado = this.orientarPortalEnTile(objeto, this.portalesCopiados[fila][columna]);

        if (portalEncontrado !== -1 && !this.tienePlacaCodificada(tileEncontrada)) {
          this.capaVistaPortalesPegado.putTileAt(
            portalEncontrado,
            x,
            y
          );
        }
      }
    }

    this.capaVistaPegado.setVisible(true);
    this.capaVistaPlacasPegado.setVisible(true);
    this.capaVistaPortalesPegado.setVisible(true);
  }

  private restaurarTilesVistaPegado(): void {
    for (const tile of this.tilesOcultasVistaPegado) {
      tile.visible = true;
    }

    for (const portal of this.portalesOcultosVistaPegado) {
      portal.visible = true;
    }

    for (const placa of this.placasOcultasVistaPegado) {
      placa.visible = true;
    }

    this.tilesOcultasVistaPegado = [];
    this.portalesOcultosVistaPegado = [];
    this.placasOcultasVistaPegado = [];
  }

  ocultarTilesDebajoVistaPegado(
    inicioX: number,
    inicioY: number
  ) {
    this.restaurarTilesVistaPegado();

    if (this.arrastrandoSeleccion) {
      for (
        let y = this.seleccionArriba;
        y <= this.seleccionAbajo;
        y++
      ) {
        for (
          let x = this.seleccionIzquierda;
          x <= this.seleccionDerecha;
          x++
        ) {
          this.ocultarGrupo(x, y, this.tilesOcultasVistaPegado);
        }
      }
    }

    for (let fila = 0; fila < this.seleccionCopiada.length; fila++) {
      for (
        let columna = 0;
        columna < this.seleccionCopiada[fila].length;
        columna++
      ) {
        this.ocultarGrupo(
          inicioX + columna,
          inicioY + fila,
          this.tilesOcultasVistaPegado
        );
      }
    }
  }

  private getPortalState(): number[][] {
    const state: number[][] = [];

    for (let fila = 0; fila < this.rows; fila++) {
      const savedRow: number[] = [];

      for (let columna = 0; columna < this.columns; columna++) {
        const portal = this.mapa.getTileAt(
          columna,
          fila,
          false,
          this.capaPortales
        );

        if (portal === null) {
          savedRow.push(-1);
        } else {
          savedRow.push(portal.index);
        }
      }

      state.push(savedRow);
    }

    return state;
  }

  private getEditorState(): EstadoEditor {
    return {
      tablero: this.getBoardState(),
      portales: this.getPortalState(),
      links: this.copiarLinks()
    };
  }

  private restorePortalState(state: number[][]): void {
    this.capaPortales.fill(-1);

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        if (state[fila] === undefined) {
          continue;
        }

        let portal = state[fila][columna];

        if (portal !== undefined && portal !== -1) {
          const tile = this.tablero.getTileAt(columna, fila);
          if (tile !== null) portal = this.orientarPortalEnTile(tile.index, portal);
          if (portal === -1) continue;

          this.capaPortales.putTileAt(
            portal,
            columna,
            fila,
            true
          );
        }
      }
    }
  }

  private restoreEditorState(state: EstadoEditor): void {
    this.restoreBoardState(state.tablero);
    this.restorePortalState(state.portales);

    this.links = [];

    for (let i = 0; i < state.links.length; i++) {
      const link = state.links[i];

      if (link.length >= 4) {
        this.links.push([link[0], link[1], link[2], link[3], link[4] ?? 0]);
      }
    }

    this.actualizarLinks();
    this.dibujarLinks();
  }

  private matricesAreEqual(
    firstState: number[][],
    secondState: number[][]
  ): boolean {
    if (firstState.length !== secondState.length) {
      return false;
    }

    for (let fila = 0; fila < firstState.length; fila++) {
      if (firstState[fila].length !== secondState[fila].length) {
        return false;
      }

      for (
        let columna = 0;
        columna < firstState[fila].length;
        columna++
      ) {
        if (
          firstState[fila][columna] !==
          secondState[fila][columna]
        ) {
          return false;
        }
      }
    }

    return true;
  }

  private centroCasilla(
    columna: number,
    fila: number
  ): { x: number; y: number } {
    return {
      x:
        this.board_offset_x +
        columna * this.cellsize +
        this.cellsize / 2,
      y:
        this.board_offset_y +
        fila * this.cellsize +
        this.cellsize / 2
    };
  }

  private hayPortalEn(columna: number, fila: number): boolean {
    if (
      columna < 0 || fila < 0 ||
      columna >= this.columns || fila >= this.rows
    ) {
      return false;
    }

    const portal = this.mapa.getTileAt(
      columna, fila, false, this.capaPortales
    );

    return portal !== null && (
      portal.index === this.portalArriba ||
      portal.index === this.portalAbajo ||
      portal.index === this.portalIzquierda ||
      portal.index === this.portalDerecha
    );
  }

  private hayPlacaEn(columna: number, fila: number): boolean {
    if (
      columna < 0 || fila < 0 ||
      columna >= this.columns || fila >= this.rows
    ) {
      return false;
    }
    const placa = this.capaPlacas.getTileAt(columna, fila);
    return placa !== null && placa.index === this.tilePlaca;
  }
  
  private hayReceptorEn(columna: number, fila: number): boolean {
    if (
      columna < 0 || fila < 0 ||
      columna >= this.columns || fila >= this.rows
    ) {
      return false;
    }
    const tile = this.tablero.getTileAt(columna, fila);
    return tile!== null && tile.index >= 27 && tile.index <= 30;
  }

  private hayEmisorEn(columna: number, fila: number): boolean {
    if (
      columna < 0 || fila < 0 ||
      columna >= this.columns || fila >= this.rows
    ) {
      return false;
    }
    const tile = this.tablero.getTileAt(columna, fila);
    return tile !== null && tile.index >= 11 && tile.index <= 14;
  }

  private hayActivadorEn(x: number, y: number): boolean {
    return (
        this.hayPlacaEn(x, y) ||
        this.hayReceptorEn(x, y)
    );
}

  private esParDePortales(link: number[]): boolean {
    return link.length >= 4 &&
      this.hayPortalEn(link[0], link[1]) &&
      this.hayPortalEn(link[2], link[3]);
  }

  private esLinkDeEmisor(link: number[]): boolean {
    return link.length >= 4 &&
      this.hayActivadorEn(link[0], link[1]) &&
      this.hayEmisorEn(link[2], link[3]);
  }

  private esLinkDePlaca(link: number[]): boolean {
    if (this.esLinkDeEmisor(link)) {
      return true;
    }
    if (link.length < 4 || this.esParDePortales(link)) {
      return false;
    }
    return (
      this.hayActivadorEn(link[0], link[1]) &&
      this.hayPortalEn(link[2], link[3])
    ) || (
        this.hayPortalEn(link[0], link[1]) &&
        this.hayActivadorEn(link[2], link[3])
      );
  }

  private buscarLinkDePortal(columna: number, fila: number): number {
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (!this.esParDePortales(link)) {
        continue;
      }
      if (
        (link[0] === columna && link[1] === fila) ||
        (link[2] === columna && link[3] === fila)
      ) {
        return i;
      }
    }
    return -1;
  }

  private puedeCrearLink(
    x1: number, y1: number, x2: number, y2: number
  ): boolean {
    if (x1 === x2 && y1 === y2) {
      return false;
    }

    const portalInicio = this.hayPortalEn(x1, y1);
    const portalFinal = this.hayPortalEn(x2, y2);
    const placaInicio = this.hayActivadorEn(x1, y1);
    const placaFinal = this.hayActivadorEn(x2, y2);

    if (placaInicio && this.hayEmisorEn(x2, y2)) {
      return true;
    }
    if (placaFinal && this.hayEmisorEn(x1, y1)) {
      return true;
    }

    if (portalInicio && portalFinal) {
      const linkInicio = this.buscarLinkDePortal(x1, y1);
      const linkFinal = this.buscarLinkDePortal(x2, y2);
      if (linkInicio !== -1 || linkFinal !== -1) {
        return linkInicio !== -1 && linkInicio === linkFinal;
      }
      return this.links.filter(link => this.esParDePortales(link)).length < 5;
    }

    if (placaInicio && portalFinal) {
      return this.buscarLinkDePortal(x2, y2) !== -1;
    }
    if (portalInicio && placaFinal) {
      return this.buscarLinkDePortal(x1, y1) !== -1;
    }
    return false;
  }

  private dibujarLineaPunteada(
    graficos: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia === 0) {
      return;
    }

    const direccionX = dx / distancia;
    const direccionY = dy / distancia;
    const largoLinea = 7;
    const espacio = 5;

    graficos.lineStyle(2, color, 1);

    for (
      let distanciaActual = 0;
      distanciaActual < distancia;
      distanciaActual += largoLinea + espacio
    ) {
      const final = Math.min(
        distanciaActual + largoLinea,
        distancia
      );

      graficos.lineBetween(
        x1 + direccionX * distanciaActual,
        y1 + direccionY * distanciaActual,
        x1 + direccionX * final,
        y1 + direccionY * final
      );
    }
  }

  private posicionNotLink(link: number[]): { x: number; y: number } {
    const inicio = this.centroCasilla(link[0], link[1]);
    const final = this.centroCasilla(link[2], link[3]);
    return { x: (inicio.x + final.x) / 2, y: (inicio.y + final.y) / 2 };
  }

  private dibujarLinks(): void {
    this.graficosLinks.clear();
    this.graficosNotLinks.clear();
    let linksVista = this.links;
    if (this.arrastrandoSeleccion && this.mouseX !== -1 && this.mouseY !== -1) {
      const inicio = this.obtenerInicioPegado();
      linksVista = this.obtenerLinksTransformados(inicio.x, inicio.y, this.transformacionesArrastre);
    }
    const mouse = this.input.activePointer;
    const resaltado = this.herramienta === this.linkTool && this.popupSalida === null
      ? this.buscarLinkEnPunto(mouse.worldX, mouse.worldY) : -1;
    for (let i = 0; i < this.links.length; i++) {
      const original = this.links[i];
      const link = linksVista[i];
      const inicio = this.centroCasilla(link[0], link[1]);
      const final = this.centroCasilla(link[2], link[3]);
      const control = this.esLinkDePlaca(original);
      const color = this.esLinkDeEmisor(original) ? this.colorLinkEmisor : control ? this.colorLinkPlaca : this.colorLinkPortales;
      if (i === resaltado) {
        this.graficosLinks.lineStyle(5, color, 0.4);
        this.graficosLinks.lineBetween(inicio.x, inicio.y, final.x, final.y);
      }
      this.dibujarLink(this.graficosLinks, inicio.x, inicio.y, final.x, final.y, color);
      if (original[4] === 1 && control) {
        const posicion = this.posicionNotLink(link);
        this.graficosNotLinks.fillStyle(COLORES.negro, 1);
        this.graficosNotLinks.fillRect(Math.round(posicion.x) - 6, Math.round(posicion.y) - 6, 12, 12);
        this.graficosNotLinks.lineStyle(2, color, 1);
        this.graficosNotLinks.strokeRect(Math.round(posicion.x) - 6, Math.round(posicion.y) - 6, 12, 12);
      }
    }
  }

  private ocultarTooltipLink(): void {
    this.textoLink?.setVisible(false);
    this.ayudaLink?.setVisible(false);
    this.bordeTooltipLink?.setVisible(false);
  }

  private actualizarTooltipLink(): void {
    if (this.textoLink === null || this.ayudaLink === null || this.bordeTooltipLink === null) {
      return;
    }
    const mouse = this.input.activePointer;
    const indice = this.herramienta === this.linkTool && this.popupSalida === null && this.linkInicioX === -1
      ? this.buscarLinkEnPunto(mouse.worldX, mouse.worldY) : -1;
    if (indice === -1 || !this.esLinkDePlaca(this.links[indice])) {
      this.ocultarTooltipLink();
      return;
    }
    const link = this.links[indice];
    const titulo = link[4] === 1
      ? ["Inverted signal", "Señal invertida"] : ["Normal signal", "Señal normal"];
    const invertir = ["Right-click: change signal", "Clic derecho: cambiar señal"];
    this.textoLink.setText(titulo[spanish]);
    this.ayudaLink.setText(invertir[spanish]);
    const ancho = Math.max(this.textoLink.width, this.ayudaLink.width) + 16;
    const alto = this.textoLink.height + this.ayudaLink.height + 16;
    const x = Math.max(4, Math.min(mouse.worldX + 12, this.scale.width - ancho - 4));
    const y = Math.max(4, Math.min(mouse.worldY + 12, this.scale.height - alto - 4));
    this.bordeTooltipLink.setPosition(Math.round(x), Math.round(y)).setSize(ancho, alto).setVisible(true);
    this.textoLink.setPosition(Math.round(x + 8), Math.round(y + 6)).setVisible(true);
    this.ayudaLink.setPosition(Math.round(x + 8), Math.round(y + 10 + this.textoLink.height)).setVisible(true);
  }

  private iniciarLink(_mouse: Phaser.Input.Pointer): void {
    if (
      !this.hayPortalEn(this.mouseX, this.mouseY) &&
      !this.hayPlacaEn(this.mouseX, this.mouseY) &&
      !this.hayReceptorEn(this.mouseX, this.mouseY) &&
      !this.hayEmisorEn(this.mouseX, this.mouseY)
    ) {
      this.reiniciarClickLink();
      return;
    }

    this.linkInicioX = this.mouseX;
    this.linkInicioY = this.mouseY;
    this.linkSeArrastro = false;

    this.actualizarVistaLink();
  }

  private actualizarVistaLink(): void {
    this.graficosLinkTemporal.clear();

    if (
      this.herramienta !== this.linkTool ||
      this.popupSalida !== null ||
      this.mouseX === -1 ||
      this.mouseY === -1
    ) {
      return;
    }
    if (this.linkInicioX === -1 && this.buscarLinkEnPunto(this.input.activePointer.worldX, this.input.activePointer.worldY) !== -1) {
      this.hoverCell.setVisible(false);
      this.hoverTile.setVisible(false);
      return;
    }

    const final = this.centroCasilla(this.mouseX, this.mouseY);
    let color = COLORES.rojo;

    if (this.linkInicioX === -1 || this.linkInicioY === -1) {
      if (this.hayPortalEn(this.mouseX, this.mouseY)) {
        color = this.colorLinkPortales;
      }

      if (this.hayActivadorEn(this.mouseX, this.mouseY)) {
        color = this.colorLinkPlaca;
      } else if (this.hayEmisorEn(this.mouseX, this.mouseY)) {
        color = this.colorLinkEmisor;
      }
    } else {
      const inicio = this.centroCasilla(
        this.linkInicioX, this.linkInicioY
      );

      if (
        this.puedeCrearLink(
          this.linkInicioX,
          this.linkInicioY,
          this.mouseX,
          this.mouseY
        )
      ) {
        if (
          (this.hayActivadorEn(this.linkInicioX, this.linkInicioY) &&
            this.hayEmisorEn(this.mouseX, this.mouseY)) ||
          (this.hayActivadorEn(this.mouseX, this.mouseY) &&
            this.hayEmisorEn(this.linkInicioX, this.linkInicioY))
        ) {
          color = this.colorLinkEmisor;
        } else if (
          this.hayActivadorEn(this.linkInicioX, this.linkInicioY) ||
          this.hayActivadorEn(this.mouseX, this.mouseY)
        ) {
          color = this.colorLinkPlaca;
        } else {
          color = this.colorLinkPortales;
        }
      }

      this.dibujarLineaPunteada(
        this.graficosLinkTemporal,
        inicio.x,
        inicio.y,
        final.x,
        final.y,
        color
      );

      this.dibujarCuadradoLink(
        this.graficosLinkTemporal,
        inicio.x,
        inicio.y,
        color
      );
    }

    this.dibujarCuadradoLink(
      this.graficosLinkTemporal,
      final.x,
      final.y,
      color
    );
  }

  private dibujarCuadradoLink(
    graficos: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    graficos.fillStyle(color, 1);
    graficos.fillRect(x - 6, y - 6, 12, 12);
    graficos.lineStyle(2, COLORES.fondo, 1);
    graficos.strokeRect(x - 6, y - 6, 12, 12);
  }

  private cancelarLinkTemporal(): void {
    this.linkInicioX = -1;
    this.linkInicioY = -1;
    this.linkSeArrastro = false;
    this.graficosLinkTemporal.clear();
  }

  private reiniciarClickLink(): void {
    this.ultimoClickLinkX = -1;
    this.ultimoClickLinkY = -1;
    this.tiempoUltimoClickLink = 0;
  }

  private borrarLinksDelExtremo(x: number, y: number): void {
    this.saveIfChanged();
    this.cancelarLinkTemporal();
    this.reiniciarClickLink();
    this.links = this.links.filter(link => !((link[0] === x && link[1] === y) || (link[2] === x && link[3] === y)));
    this.actualizarLinks();
    this.saveIfChanged();
    this.actualizarInterfaz();
    this.ocultarTooltipLink();
  }

  private borrarLink(indice: number): void {
    const link = this.links[indice];
    if (!link) {
      return;
    }
    this.saveIfChanged();
    this.cancelarLinkTemporal();
    this.reiniciarClickLink();
    let pareja: number[] | undefined;
    if (this.esLinkDePlaca(link) && !this.esLinkDeEmisor(link)) {
      pareja = this.buscarParejaPortal(link[2], link[3]);
    }
    this.links = this.links.filter((otro, i) => {
      if (i === indice) {
        return false;
      }
      return !pareja || otro[0] !== link[0] || otro[1] !== link[1] ||
        !((otro[2] === link[2] && otro[3] === link[3]) || (otro[2] === pareja[0] && otro[3] === pareja[1]));
    });
    this.actualizarLinks();
    this.saveIfChanged();
    this.actualizarInterfaz();
    this.ocultarTooltipLink();
  }

  private terminarLink(): void {
    if (this.linkInicioX === -1 || this.linkInicioY === -1) {
      return;
    }
    const inicioX = this.linkInicioX, inicioY = this.linkInicioY;
    if (this.mouseX === inicioX && this.mouseY === inicioY) {
      const arrastrado = this.linkSeArrastro;
      this.cancelarLinkTemporal();
      if (arrastrado) {
        this.reiniciarClickLink();
        return;
      }
      const ahora = this.time.now;
      if (this.ultimoClickLinkX === inicioX && this.ultimoClickLinkY === inicioY && ahora - this.tiempoUltimoClickLink < 300) {
        this.borrarLinksDelExtremo(inicioX, inicioY);
      } else {
        this.ultimoClickLinkX = inicioX;
        this.ultimoClickLinkY = inicioY;
        this.tiempoUltimoClickLink = ahora;
      }
      return;
    }
    this.reiniciarClickLink();
    if (
      this.mouseX !== -1 && this.mouseY !== -1 &&
      this.puedeCrearLink(inicioX, inicioY, this.mouseX, this.mouseY)
    ) {
      const placaInicio = this.hayActivadorEn(inicioX, inicioY);
      const placaFinal = this.hayActivadorEn(this.mouseX, this.mouseY);

      if (!placaInicio && !placaFinal &&
        this.hayPortalEn(inicioX, inicioY) &&
        this.hayPortalEn(this.mouseX, this.mouseY)) {
        const linkInicio = this.buscarLinkDePortal(inicioX, inicioY);
        const linkFinal = this.buscarLinkDePortal(this.mouseX, this.mouseY);

        if (linkInicio !== -1 && linkFinal !== -1 && linkInicio !== linkFinal) {
          const mayor = Math.max(linkInicio, linkFinal);
          const menor = Math.min(linkInicio, linkFinal);
          this.links.splice(mayor, 1);
          this.links.splice(menor, 1);
        } else if (linkInicio !== -1) {
          this.links.splice(linkInicio, 1);
        } else if (linkFinal !== -1) {
          this.links.splice(linkFinal, 1);
        }
        if (!this.existeLink(inicioX, inicioY, this.mouseX, this.mouseY)) {
          this.links.push([inicioX, inicioY, this.mouseX, this.mouseY, 0]);
        }
      } else {
        let placaX = inicioX, placaY = inicioY;
        let destinoX = this.mouseX, destinoY = this.mouseY;
        if (!this.hayActivadorEn(placaX, placaY) || (!this.hayEmisorEn(destinoX, destinoY) && !this.hayPortalEn(destinoX, destinoY))) {
          [placaX, placaY, destinoX, destinoY] = [destinoX, destinoY, placaX, placaY];
        }
        if (!this.existeLink(placaX, placaY, destinoX, destinoY)) {
          this.links.push([placaX, placaY, destinoX, destinoY, 0]);
        }
      }
    }
    this.cancelarLinkTemporal();
    this.actualizarLinks();
  }

  private actualizarLinks(): void {
    const pares: number[][] = [];
    const controles: number[][] = [];
    for (const link of this.links) {
      if (!this.esParDePortales(link) || pares.length >= 5 || (link[0] === link[2] && link[1] === link[3])) {
        continue;
      }
      if (pares.some(par => (par[0] === link[0] && par[1] === link[1]) || (par[2] === link[0] && par[3] === link[1]) ||
          (par[0] === link[2] && par[1] === link[3]) || (par[2] === link[2] && par[3] === link[3]))) {
        continue;
      }
      pares.push([link[0], link[1], link[2], link[3], 0]);
    }
    const agregar = (placaX: number, placaY: number, destinoX: number, destinoY: number, not: number) => {
      if (!controles.some(link => link[0] === placaX && link[1] === placaY && link[2] === destinoX && link[3] === destinoY)) {
        controles.push([placaX, placaY, destinoX, destinoY, not]);
      }
    };
    for (const link of this.links) {
      if (link.length < 4 || this.esParDePortales(link) || (link[0] === link[2] && link[1] === link[3])) {
        continue;
      }
      let placaX = link[0], placaY = link[1];
      let destinoX = link[2], destinoY = link[3];
      if (!this.hayActivadorEn(placaX, placaY) || (!this.hayEmisorEn(destinoX, destinoY) && !this.hayPortalEn(destinoX, destinoY))) {
        [placaX, placaY, destinoX, destinoY] = [destinoX, destinoY, placaX, placaY];
      }
      if (!this.hayActivadorEn(placaX, placaY)) {
        continue;
      }
      const not = link[4] === 1 ? 1 : 0;
      if (this.hayEmisorEn(destinoX, destinoY)) {
        agregar(placaX, placaY, destinoX, destinoY, not);
      } else {
        const par = pares.find(par => (par[0] === destinoX && par[1] === destinoY) || (par[2] === destinoX && par[3] === destinoY));
        if (par) {
          agregar(placaX, placaY, par[0], par[1], not);
          agregar(placaX, placaY, par[2], par[3], not);
        }
      }
    }
    this.links = [...pares, ...controles];
    this.dibujarLinks();
  }

  private dibujarLink(
    graficos: Phaser.GameObjects.Graphics,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number
  ): void {
    this.dibujarLineaPunteada(
      graficos,
      x1,
      y1,
      x2,
      y2,
      color
    );

    this.dibujarCuadradoLink(graficos, x1, y1, color);
    this.dibujarCuadradoLink(graficos, x2, y2, color);
  }

  private copiarLinks(): number[][] {
    const copia: number[][] = [];

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (link.length >= 4) {
        copia.push([link[0], link[1], link[2], link[3], link[4] ?? 0]);
      }
    }

    return copia;
  }

  private buscarExtremoLink(x: number, y: number): boolean {
    for (const link of this.links) {
      for (let extremo = 0; extremo < 4; extremo += 2) {
        const centro = this.centroCasilla(link[extremo], link[extremo + 1]);
        if (Math.abs(x - centro.x) <= 8 && Math.abs(y - centro.y) <= 8) {
          return true;
        }
      }
    }
    return false;
  }

  private buscarLinkEnPunto(x: number, y: number, soloControl: boolean = false): number {
    if (this.buscarExtremoLink(x, y)) {
      return -1;
    }
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (link[4] !== 1 || !this.esLinkDePlaca(link)) {
        continue;
      }
      const posicion = this.posicionNotLink(link);
      if (Math.abs(x - posicion.x) <= 6 && Math.abs(y - posicion.y) <= 6) {
        return i;
      }
    }
    let indice = -1;
    let mejorDistancia = 7;
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (soloControl && !this.esLinkDePlaca(link)) {
        continue;
      }
      const inicio = this.centroCasilla(link[0], link[1]);
      const final = this.centroCasilla(link[2], link[3]);
      const dx = final.x - inicio.x, dy = final.y - inicio.y;
      const largo2 = dx * dx + dy * dy;
      if (largo2 === 0) {
        continue;
      }
      const t = ((x - inicio.x) * dx + (y - inicio.y) * dy) / largo2;
      if (t <= 0 || t >= 1) {
        continue;
      }
      const distancia = Math.hypot(x - inicio.x - t * dx, y - inicio.y - t * dy);
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        indice = i;
      }
    }
    return indice;
  }

  private actualizarHoverTile() {
    this.restaurarTileHover();
    this.hoverTile.setVisible(false);
    this.hoverTile.clearTint();
    this.hoverCell.setFillStyle(COLORES.negro, 0.12);
    this.hoverCell.setStrokeStyle(2, COLORES.borde, 0.65);

    if (
      this.hoverCell.visible === false ||
      this.mouseX === -1 ||
      this.mouseY === -1
    ) {
      return;
    }

    if (this.herramienta === this.portalTool) {
      const mouse = this.input.activePointer;

      const portal = this.obtenerPortal(
        mouse.worldX,
        mouse.worldY
      );

      const puedeColocar = this.puedeColocarPortal(
        this.mouseX,
        this.mouseY,
        portal
      );

      if (puedeColocar === false) {
        this.hoverCell.setFillStyle(COLORES.rojo, 0.25);
        this.hoverCell.setStrokeStyle(2, COLORES.rojo, 0.6);
      }

      const tile = this.tablero.getTileAt(this.mouseX, this.mouseY);
      let normal = false;
      if (tile !== null) normal = esParedExteriorPortal(tile.index);

      if (this.hoverPortal === null) {
        this.hoverPortal = this.add.sprite(0, 0, "portal-normal-green", 0);
      }

      configurarPortal(
        this.hoverPortal,
        this.grupoPortalEn(this.mouseX, this.mouseY),
        direccionPortalEditor(portal),
        normal
      );
      this.hoverPortal.setScale(this.tileScale);
      this.hoverPortal.setPosition(
        this.board_offset_x + (this.mouseX + 1) * this.cellsize,
        this.board_offset_y + (this.mouseY + 1) * this.cellsize
      );
      this.hoverPortal.setDepth(this.profundidadFila(this.mouseY, 9));
      this.hoverPortal.setAlpha(0.6);
      this.hoverPortal.clearTint();
      this.hoverPortal.setVisible(true);
      this.recortarPortalEditor(this.hoverPortal);

      if (puedeColocar === false) {
        this.hoverPortal.setTint(COLORES.rojo);
      }

      return;
    }

    if (this.herramienta === 0) {
      this.ocultarGrupo(this.mouseX, this.mouseY);
      return;
    }

    let colocandoTiles = false;

    for (let i = 0; i < this.tilesHotbar.length; i++) {
      if (this.tilesHotbar[i] === this.herramienta) {
        colocandoTiles = true;
        break;
      }
    }

    if (colocandoTiles === false) {
      return;
    }

    let forma = this.obtenerFormaTile(this.herramienta);

    if (forma === undefined) {
      forma = [[0, 0, this.herramienta]];
    }

    let entra = true;

    for (let i = 0; i < forma.length; i++) {
      const x = this.mouseX + forma[i][0];
      const y = this.mouseY + forma[i][1];

      if (
        x < 0 ||
        y < 0 ||
        x >= this.columns ||
        y >= this.rows
      ) {
        entra = false;
      }

      if (y === 0 && this.obtenerRelieve(forma[i][2]) !== -1) {
        entra = false;
      }
    }

    if (
      this.herramienta === this.tileBandera &&
      !this.puedeColocarSalida(this.mouseX, this.mouseY)
    ) {
      entra = false;
    }

    if (entra === false) {
      this.hoverCell.setFillStyle(COLORES.rojo, 0.25);
      this.hoverCell.setStrokeStyle(2, COLORES.rojo, 0.6);
    }

    for (let i = 0; i < forma.length; i++) {
      const x = this.mouseX + forma[i][0];
      const y = this.mouseY + forma[i][1];

      if (x < 0 || x >= this.columns || y < 0 || y > this.rows) {
        continue;
      }

      const px = this.board_offset_x + (x + 0.5) * this.cellsize;
      const py = this.board_offset_y + (y + 0.5) * this.cellsize;

      if (y < this.rows) {
        if (this.herramienta !== this.tilePlaca) {
          this.ocultarGrupo(x, y);
        }

        const imagen = this.add.image(
          px,
          py,
          "editorTiles",
          forma[i][2] - 1
        );

        imagen.setDisplaySize(this.cellsize, this.cellsize);
        imagen.setAlpha(0.6);
        if (this.herramienta === this.tilePlaca) {
          imagen.setDepth(this.profundidadFila(y, 0));
        } else {
          imagen.setDepth(this.profundidadFila(y, 8));
        }

        if (entra === false) {
          imagen.setTint(COLORES.rojo);
        }

        this.hoverGrupo.push(imagen);
      }

      const indiceRelieve = this.obtenerRelieve(forma[i][2]);

      if (indiceRelieve !== -1 && y > 0) {
        const imagenRelieve = this.add.image(
          px,
          py - this.cellsize,
          "editorTiles",
          indiceRelieve - 1
        );

        imagenRelieve.setDisplaySize(this.cellsize, this.cellsize);
        imagenRelieve.setAlpha(0.6);
        imagenRelieve.setDepth(this.profundidadFila(y, 9));

        if (entra === false) {
          imagenRelieve.setTint(COLORES.rojo);
        }

        this.hoverGrupo.push(imagenRelieve);
      }
    }
  }

  private restaurarTileHover() {
    if (this.hoverPortal !== null) {
      this.hoverPortal.setVisible(false);
    }

    for (let i = 0; i < this.hoverGrupo.length; i++) {
      this.hoverGrupo[i].destroy();
    }

    this.hoverGrupo = [];

    for (let i = 0; i < this.ocultasGrupo.length; i++) {
      this.ocultasGrupo[i].visible = true;
    }

    this.ocultasGrupo = [];

    if (this.tileOcultaHover) {
      this.tileOcultaHover.visible = true;
      this.tileOcultaHover = null;
    }

    if (this.portalOcultoHover) {
      this.portalOcultoHover.visible = true;
      this.portalOcultoHover = null;
    }
  }

  private borrarLinksEn(
    columna: number, fila: number, conservarPlaca: boolean = false
  ): void {
    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      const esInicio = link[0] === columna && link[1] === fila;
      const esFinal = link[2] === columna && link[3] === fila;
      if (!esInicio && !esFinal) {
        continue;
      }

      if (conservarPlaca && this.hayPlacaEn(columna, fila) &&
        this.esLinkDePlaca(link)) {
        const placaInicio = esInicio && this.hayPlacaEn(link[0], link[1]);
        const placaFinal = esFinal && !this.esLinkDeEmisor(link) &&
          this.hayPortalEn(link[0], link[1]) &&
          this.hayPlacaEn(link[2], link[3]);
        if (placaInicio || placaFinal) {
          continue;
        }
      }
      this.links.splice(i, 1);
    }
    this.dibujarLinks();
  }

  private borrarPortalEn(columna: number, fila: number): void {
    const portal = this.mapa.getTileAt(
      columna, fila, false, this.capaPortales
    );

    if (portal === null) {
      return;
    }

    this.mapa.removeTileAt(
      columna, fila, true, true, this.capaPortales
    );

    this.borrarLinksEn(columna, fila);
  }

  private borrarTileUnico(tileBuscada: number): void {
    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const tile = this.mapa.getTileAt(
          columna,
          fila,
          false,
          this.tablero
        );

        if (tile !== null && tile.index === tileBuscada) {
          if (tileBuscada === this.tileBandera) {
            const izquierdaArriba = this.tablero.getTileAt(columna - 1, 0);
            const derechaArriba = this.tablero.getTileAt(columna + 1, 0);
            const izquierdaAbajo = this.tablero.getTileAt(columna - 1, 1);
            const derechaAbajo = this.tablero.getTileAt(columna + 1, 1);

            let fondoArriba = this.tileInvisible;
            let fondoAbajo = this.tileInvisible;

            if (
              (izquierdaArriba !== null && izquierdaArriba.index === 16) ||
              (derechaArriba !== null && derechaArriba.index === 16)
            ) {
              fondoArriba = 16;
            } else if (
              (izquierdaArriba !== null && (izquierdaArriba.index === 39 || izquierdaArriba.index === 64)) ||
              (derechaArriba !== null && (derechaArriba.index === 39 || derechaArriba.index === 64))
            ) {
              fondoArriba = 39;
            }

            if (
              (izquierdaAbajo !== null && izquierdaAbajo.index === 17) ||
              (derechaAbajo !== null && derechaAbajo.index === 17)
            ) {
              fondoAbajo = 17;
            } else if (
              (izquierdaAbajo !== null && (izquierdaAbajo.index === 39 || izquierdaAbajo.index === 64)) ||
              (derechaAbajo !== null && (derechaAbajo.index === 39 || derechaAbajo.index === 64))
            ) {
              fondoAbajo = 39;
            }

            this.borrarGrupoEn(columna, fila);

            if (fila === 1) {
              this.tablero.putTileAt(fondoArriba, columna, 0);
              this.tablero.putTileAt(fondoAbajo, columna, 1);
              this.actualizarParedesConexas(columna, 0);
              this.actualizarParedesConexas(columna, 1);
            }

            continue;
          }

          this.mapa.putTileAt(
            this.tileInvisible,
            columna,
            fila,
            true,
            this.tablero
          );

          this.actualizarParedesConexas(columna, fila);
        }
      }
    }
  }

  private existeTile(tileBuscada: number): boolean {
    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const tile = this.mapa.getTileAt(
          columna,
          fila,
          false,
          this.tablero
        );

        if (tile !== null && tile.index === tileBuscada) {
          return true;
        }
      }
    }

    return false;
  }

  private nivelValido(): boolean {
    if (!this.existeTile(this.tileJugador)) {
      return false;
    }

    if (!this.existeTile(this.tileBandera)) {
      return false;
    }

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const tile = this.tablero.getTileAt(columna, fila);

        if (tile !== null && tile.index === this.tileBandera) {
          if (fila !== 1 || columna <= 0 || columna >= this.columns - 1) {
            return false;
          }

          const arriba = this.tablero.getTileAt(columna, fila - 1);

          if (arriba === null || arriba.index !== this.tileSalidaArriba) {
            return false;
          }
        }

        if (tile !== null && tile.index === this.tileSalidaArriba) {
          const abajo = this.tablero.getTileAt(columna, fila + 1);

          if (fila !== 0 || abajo === null || abajo.index !== this.tileBandera) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private obtenerVariantes(tile: number): number[] | null {
    for (let i = 0; i < this.variantesTiles.length; i++) {
      if (this.variantesTiles[i].includes(tile)) {
        return this.variantesTiles[i];
      }
    }

    return null;
  }

  private obtenerGraficoTile(tile = 0) {
    const nombre = "icono-hotbar-" + tile;

    if (this.textures.exists(nombre)) {
      return { textura: nombre, frame: 0 };
    }

    let forma = this.obtenerFormaTile(tile);

    if (forma === undefined) {
      forma = [[0, 0, tile]];
    }

    const partes: number[][] = [];

    for (let i = 0; i < forma.length; i++) {
      const columna = forma[i][0];
      const fila = forma[i][1];
      const indice = forma[i][2];

      if (indice !== this.portalArriba) {
        partes.push([columna, fila, indice]);
      }

      const relieve = this.obtenerRelieve(indice);

      if (relieve !== -1) {
        partes.push([columna, fila - 1, relieve]);
      }
    }

    if (partes.length === 0) {
      return { textura: "editorTiles", frame: tile - 1 };
    }

    let izquierda = partes[0][0];
    let derecha = partes[0][0];
    let arriba = partes[0][1];
    let abajo = partes[0][1];

    for (let i = 1; i < partes.length; i++) {
      const columna = partes[i][0];
      const fila = partes[i][1];

      izquierda = Math.min(izquierda, columna);
      derecha = Math.max(derecha, columna);
      arriba = Math.min(arriba, fila);
      abajo = Math.max(abajo, fila);
    }

    const lado = this.tileGraphicSize;
    const ancho = (derecha - izquierda + 1) * lado;
    const alto = (abajo - arriba + 1) * lado;

    const textura = this.textures.createCanvas(nombre, ancho, alto);

    if (textura === null) {
      return { textura: "editorTiles", frame: tile - 1 };
    }

    for (let i = 0; i < partes.length; i++) {
      const columna = partes[i][0];
      const fila = partes[i][1];
      const indice = partes[i][2];

      const x = (columna - izquierda) * lado;
      const y = (fila - arriba) * lado;

      textura.drawFrame("editorTiles", indice - 1, x, y, false);
    }

    const contexto = textura.getContext();
    const pixeles = contexto.getImageData(0, 0, ancho, alto).data;

    let minX = ancho;
    let minY = alto;
    let maxX = -1;
    let maxY = -1;

    let posicionAlpha = 3;

    for (let y = 0; y < alto; y++) {
      for (let x = 0; x < ancho; x++) {
        const alpha = pixeles[posicionAlpha];
        posicionAlpha += 4;

        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX === -1) {
      textura.add(0, 0, 0, 0, ancho, alto);
    } else {
      const anchoVisible = maxX - minX + 1;
      const altoVisible = maxY - minY + 1;

      textura.add(0, 0, minX, minY, anchoVisible, altoVisible);
    }

    textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    textura.refresh();

    return { textura: nombre, frame: 0 };
  }

  private actualizarImagenHotbar(indice: number): void {
    const tile = this.tilesHotbar[indice];
    const grafico = this.obtenerGraficoTile(tile);
    const imagen = this.imagenesHotbar[indice];

    imagen.setTexture(grafico.textura, grafico.frame);
    this.ajustarIconoHotbar(imagen);
  }

  private cerrarSubHotbar(): void {
    this.ocultarTooltipTile();

    for (let i = 0; i < this.objetosSubHotbar.length; i++) {
      this.objetosSubHotbar[i].destroy();
    }

    this.objetosSubHotbar = [];
    this.subHotbarAbierta = -1;
  }

  private abrirSubHotbar(
    indiceHotbar: number,
    centroX: number,
    centroY: number
  ): void {
    const tile = this.tilesHotbar[indiceHotbar];
    const variantes = this.obtenerVariantes(tile);

    if (variantes === null || variantes.length === 0) {
      return;
    }

    if (this.subHotbarAbierta === indiceHotbar) {
      this.cerrarSubHotbar();
      return;
    }

    this.cerrarSubHotbar();
    this.subHotbarAbierta = indiceHotbar;

    const tamaño = 40;
    const separacion = 52;
    const margen = 12;
    let columnas = Math.min(3, variantes.length);

    if (variantes.length === 4 || variantes.length === 6) {
      columnas = 2;
    }
    const filas = Math.ceil(variantes.length / columnas);
    const ancho = tamaño + (columnas - 1) * separacion + margen * 2;
    const alto = tamaño + (filas - 1) * separacion + margen * 2;
    const izquierda = Math.max(
      8,
      Math.min(centroX - ancho / 2, this.scale.width - ancho - 8)
    );
    const arriba = Math.max(8, centroY - tamaño / 2 - 12 - alto);

    const fondo = this.add.rectangle(
      izquierda + ancho / 2,
      arriba + alto / 2,
      ancho,
      alto,
      COLORES.panelVariantes
    );

    fondo.setStrokeStyle(4, COLORES.violetaHover);
    fondo.setDepth(19);
    fondo.setInteractive();

    this.configurarZonaHotbar(fondo);
    this.objetosSubHotbar.push(fondo);

    for (let i = 0; i < variantes.length; i++) {
      const variante = variantes[i];
      let posicion = i;

      if (variantes.length === 4 || variantes.length === 6) {
        if (i === 2) posicion = 3;
        if (i === 3) posicion = 2;
      }

      const x = izquierda + margen + tamaño / 2 + (posicion % columnas) * separacion;
      const y = arriba + margen + tamaño / 2 + Math.floor(posicion / columnas) * separacion;

      const casilla = this.add.rectangle(
        x,
        y,
        tamaño,
        tamaño,
        COLORES.casilla
      );

      casilla.setStrokeStyle(2, COLORES.fondo);
      casilla.setDepth(20);
      casilla.setInteractive({ useHandCursor: true });

      this.configurarZonaHotbar(
        casilla,
        () => this.herramienta === variante
      );

      this.crearIconoSubHotbar(variante, x, y);
      this.configurarTooltipTile(casilla, () => variante, false);

      casilla.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (
          pointer.button !== 0 ||
          this.popupSalida !== null ||
          this.bloquearMouseHastaSoltar
        ) {
          return;
        }

        this.tilesHotbar[indiceHotbar] = variante;
        this.herramienta = variante;

        this.actualizarImagenHotbar(indiceHotbar);
        this.cerrarSubHotbar();

        this.vistaPegado.setVisible(false);
        this.capaVistaPegado.setVisible(false);
        this.capaVistaPlacasPegado.setVisible(false);
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();

        this.actualizarInterfaz();
        this.actualizarHotbar();
        this.actualizarHoverTile();
      });

      this.objetosSubHotbar.push(casilla);
    }
  }

  private crearIconoSubHotbar(
    tile: number,
    x: number,
    y: number
  ): void {
    const grafico = this.obtenerGraficoTile(tile);
    const imagen = this.add.image(x, y, grafico.textura, grafico.frame);

    this.ajustarIconoHotbar(imagen);
    imagen.setDepth(30);
    this.objetosSubHotbar.push(imagen);
  }

  private ajustarIconoHotbar(imagen: Phaser.GameObjects.Image): void {
    const escala = Math.min(
      32 / imagen.width,
      32 / imagen.height
    );

    imagen.setScale(escala);
  }

  private obtenerNombreTile(tile: number): string {
    if (tile >= 3 && tile <= 6) {
      return this.textoOpciones[24][spanish];
    }
    if (tile >= 11 && tile <= 14) {
      return this.textoOpciones[25][spanish];
    }
    if (tile >= 27 && tile <= 30) {
      return this.textoOpciones[26][spanish];
    }
    if (tile === 37) {
      return this.textoOpciones[27][spanish];
    }
    if (tile === this.tilePlaca) {
      return this.textoOpciones[28][spanish];
    }
    if (tile === 39) {
      return this.textoOpciones[29][spanish];
    }
    if (tile === 17) {
      return this.textoOpciones[30][spanish];
    }
    if (tile === 20) {
      return this.textoOpciones[31][spanish];
    }
    if (tile === 18) {
      return this.textoOpciones[32][spanish];
    }
    if (tile === 19) {
      return this.textoOpciones[33][spanish];
    }
    if (tile === 16) {
      return this.textoOpciones[34][spanish];
    }
    if (tile === 21) {
      return this.textoOpciones[35][spanish];
    }
    if (tile === 22) {
      return this.textoOpciones[36][spanish];
    }
    if (tile === 23) {
      return this.textoOpciones[37][spanish];
    }
    if (tile === 24) {
      return this.textoOpciones[38][spanish];
    }
    if (tile === 41) {
      return this.textoOpciones[39][spanish];
    }
    if (tile === 200) {
      return this.textoOpciones[40][spanish];
    }
    if (tile === 201) {
      return this.textoOpciones[41][spanish];
    }
    if (tile === this.tileJugador) {
      return this.textoOpciones[42][spanish];
    }
    if (tile === this.tileBandera) {
      return this.textoOpciones[43][spanish];
    }
    return this.textoOpciones[44][spanish];
  }

  private ocultarTooltipTile(): void {
    this.ocultarTooltipLink();
    if (this.textoTile !== null) {
      this.textoTile.setVisible(false);
    }
    if (this.bordeTooltipTile !== null) {
      this.bordeTooltipTile.setVisible(false);
    }
    this.zonaTooltipTile = null;
  }

  private configurarTooltipTile(
    zona: Phaser.GameObjects.Rectangle,
    obtenerTile: () => number,
    mostrarAyudaVariantes: boolean
  ): void {
    zona.on("pointerover", () => {
      if (
        this.textoTile === null ||
        this.popupSalida !== null ||
        this.bloquearMouseHastaSoltar ||
        this.input.activePointer.isDown
      ) {
        return;
      }

      const tile = obtenerTile();
      const variantes = this.obtenerVariantes(tile);
      let nombre = this.obtenerNombreTile(tile);
      const atajo = zona.getData("atajo");

      if (typeof atajo === "string") {
        nombre += " [" + atajo + "]";
      }

      if (variantes !== null && variantes.length > 1) {
        nombre += " (" + (variantes.indexOf(tile) + 1) + "/" + variantes.length + ")";

        if (mostrarAyudaVariantes) {
          nombre += this.textoOpciones[45][spanish];
        }
      }

      this.textoTile.setText(nombre);

      const margen = 8;
      const limites = zona.getBounds();
      const ancho = this.textoTile.width;
      const alto = this.textoTile.height;
      let x = zona.x - ancho / 2;
      let y = limites.top - alto - margen;

      if (mostrarAyudaVariantes === false && this.subHotbarAbierta !== -1) {
        x = limites.right + 18;
        y = zona.y - alto / 2;

        if (x + ancho > this.scale.width - margen) {
          x = limites.left - ancho - 18;
        }
      }

      if (y < margen) {
        y = limites.bottom + margen;
      }

      x = Math.max(margen, Math.min(x, this.scale.width - ancho - margen));
      y = Math.max(margen, Math.min(y, this.scale.height - alto - margen));

      this.zonaTooltipTile = zona;
      this.textoTile.setPosition(
        Math.round(x),
        Math.round(y)
      );

      if (this.bordeTooltipTile !== null) {
        this.bordeTooltipTile.setSize(
          this.textoTile.width + 2,
          this.textoTile.height + 2
        );

        this.bordeTooltipTile.setPosition(
          this.textoTile.x - 1,
          this.textoTile.y - 1
        );

        this.bordeTooltipTile.setVisible(true);
      }

      this.textoTile.setVisible(true);
    });

    const ocultar = () => {
      if (this.zonaTooltipTile === zona) {
        this.ocultarTooltipTile();
      }
    };

    zona.on("pointerout", ocultar);
    zona.on("pointerdown", ocultar);
    zona.on("ocultarTooltip", ocultar);
    zona.once("destroy", ocultar);
  }

  private crearFondoTablero(): void {
    const margen = this.margenTablero;
    const anchoDisponible = this.scale.width - this.margenPanel * 2 -
      this.separacionPaneles - this.anchoPanelHerramientas;
    const altoDisponible = this.scale.height - this.margenPanel -
      this.arribaPaneles - this.altoPanelHotbar - this.separacionHotbar;
    const tamañoCelda = Math.min(
      32,
      (anchoDisponible - margen * 2) / this.columns,
      (altoDisponible - margen * 2) / this.rows
    );

    this.cellsize = Math.max(2, Math.floor(tamañoCelda / 2) * 2);
    this.tileScale = this.cellsize / this.tileGraphicSize;
    this.board_width = this.columns * this.cellsize;
    this.board_height = this.rows * this.cellsize;

    this.anchoPanelTablero = this.board_width + margen * 2;

    const centroX = this.margenPanel + anchoDisponible / 2;
    const arriba = this.arribaPaneles;
    this.board_offset_x = centroX - this.board_width / 2;
    this.board_offset_y = arriba + margen;
    const abajo = this.board_offset_y + this.board_height + margen;
    this.yHotbar = abajo + this.separacionHotbar + this.altoPanelHotbar / 2;

    const fondo = this.add.rectangle(
      centroX,
      (arriba + abajo) / 2,
      this.anchoPanelTablero,
      abajo - arriba,
      COLORES.panel
    );

    fondo.setStrokeStyle(4, COLORES.borde);
    fondo.setDepth(-1);
  }

  private clickEnHotbar: boolean = false;

  private pintarCasillaHotbar(
    casilla: Phaser.GameObjects.Rectangle,
    seleccionada: boolean
  ): void {
    const hover = casilla.getData("hoverHotbar") === true;

    let color = COLORES.casilla;
    let borde = COLORES.bordeCasilla;

    if (hover) {
      color = COLORES.casillaHover;
      borde = COLORES.violeta;
    }

    if (seleccionada) {
      borde = COLORES.verde;

      if (hover) {
        borde = COLORES.verdeHover;
      }
    }

    casilla.setFillStyle(color);
    casilla.setStrokeStyle(4, borde);
  }

  private configurarZonaHotbar(
    zona: Phaser.GameObjects.Rectangle,
    seleccionada?: () => boolean
  ): void {
    zona.on(
      "pointerdown",
      (
        mouse: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        evento: Phaser.Types.Input.EventData
      ) => {
        this.updateHoveredCell(mouse.worldX, mouse.worldY);
        this.clickEnHotbar = true;
        evento.stopPropagation();
      }
    );

    zona.on(
      "pointermove",
      (
        mouse: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        evento: Phaser.Types.Input.EventData
      ) => {
        this.updateHoveredCell(mouse.worldX, mouse.worldY);
        evento.stopPropagation();
      }
    );

    if (seleccionada === undefined) {
      return;
    }

    zona.setData("hoverHotbar", false);

    zona.on("pointerover", () => {
      zona.setData("hoverHotbar", true);
      this.pintarCasillaHotbar(zona, seleccionada());
    });

    zona.on("pointerout", () => {
      zona.setData("hoverHotbar", false);
      this.pintarCasillaHotbar(zona, seleccionada());
    });

    this.pintarCasillaHotbar(zona, seleccionada());
  }

  private crearFondoPanel(
    elementos: Phaser.GameObjects.Rectangle[]
  ): void {
    if (elementos.length === 0) {
      return;
    }

    const margen = this.margenPanel;
    const primero = elementos[0].getBounds();

    let izquierda = primero.left;
    let derecha = primero.right;
    let arriba = primero.top;
    let abajo = primero.bottom;

    for (let i = 1; i < elementos.length; i++) {
      const limites = elementos[i].getBounds();

      izquierda = Math.min(izquierda, limites.left);
      derecha = Math.max(derecha, limites.right);
      arriba = Math.min(arriba, limites.top);
      abajo = Math.max(abajo, limites.bottom);
    }

    const fondo = this.add.rectangle(
      (izquierda + derecha) / 2,
      (arriba + abajo) / 2,
      derecha - izquierda + margen * 2,
      abajo - arriba + margen * 2,
      COLORES.panel
    );

    fondo.setStrokeStyle(4, COLORES.borde);
    fondo.setDepth(-1);
  }

  private grupoEn(x: number, y: number): number[][] {
    const tile = this.tablero.getTileAt(x, y);

    if (tile === null) {
      return [[x, y]];
    }

    if (tile.index === this.tileBandera || tile.index === this.tileSalidaArriba) {
      let baseY = y;

      if (tile.index === this.tileSalidaArriba) {
        baseY++;
      }

      const base = this.tablero.getTileAt(x, baseY);
      const arriba = this.tablero.getTileAt(x, baseY - 1);

      if (
        base !== null && base.index === this.tileBandera &&
        arriba !== null && arriba.index === this.tileSalidaArriba
      ) {
        return [[x, baseY], [x, baseY - 1]];
      }

      return [[x, y]];
    }

    for (let i = 0; i < this.formasPared.length; i++) {
      const forma = this.formasPared[i];

      for (let j = 0; j < forma.length; j++) {
        if (tile.index === forma[j][2]) {
          const inicioX = x - forma[j][0];
          const inicioY = y - forma[j][1];

          const casillas = [];

          for (let k = 0; k < forma.length; k++) {
            const columna = inicioX + forma[k][0];
            const fila = inicioY + forma[k][1];

            const parte = this.tablero.getTileAt(
              columna,
              fila
            );

            if (parte === null) {
              return [[x, y]];
            }

            if (parte.index === forma[k][2]) {
              casillas.push([columna, fila]);
            } else {
              return [[x, y]];
            }
          }

          return casillas;
        }
      }
    }

    return [[x, y]];
  }

  borrarGrupoEn(x = 0, y = 0, conservarPlaca: boolean = false) {
    const casillas = this.grupoEn(x, y);

    for (let i = 0; i < casillas.length; i++) {
      const columna = casillas[i][0];
      const fila = casillas[i][1];
      const conservar = conservarPlaca && this.hayPlacaEn(columna, fila);

      this.borrarLinksEn(columna, fila, conservar);
      this.tablero.putTileAt(this.tileInvisible, columna, fila);
      if (!conservar) {
        this.capaPlacas.removeTileAt(columna, fila);
      }
      this.borrarPortalEn(columna, fila);
      this.actualizarParedesConexas(columna, fila);
    }
  }

  crearTexturasParedes() {
    for (let i = 0; i < this.formasPared.length; i++) {
      const forma = this.formasPared[i];
      const nombre = "paredes-" + i;

      if (this.textures.exists(nombre)) {
        this.textures.remove(nombre);
      }

      let ancho = 1;
      let alto = 1;

      for (let j = 0; j < forma.length; j++) {
        ancho = Math.max(ancho, forma[j][0] + 1);
        alto = Math.max(alto, forma[j][1] + 1);
      }

      const tamano = this.tileGraphicSize;
      const lado = Math.max(ancho, alto) * tamano;

      const textura = this.textures.createCanvas(
        nombre,
        lado,
        lado
      );

      if (textura === null) {
        continue;
      }

      const margenX = (lado - ancho * tamano) / 2;
      const margenY = (lado - alto * tamano) / 2;

      for (let j = 0; j < forma.length; j++) {
        const x = margenX + forma[j][0] * tamano;
        const y = margenY + forma[j][1] * tamano;

        textura.drawFrame(
          "editorTiles",
          forma[j][2] - 1,
          x,
          y
        );
      }

      textura.add(0, 0, 0, 0, lado, lado);
      textura.refresh();
    }
  }

  ocultarGrupo(
    x = 0,
    y = 0,
    ocultas = this.ocultasGrupo
  ) {
    const casillas = this.grupoEn(x, y);

    for (let i = 0; i < casillas.length; i++) {
      const columna = casillas[i][0];
      const fila = casillas[i][1];

      const tile = this.tablero.getTileAt(
        columna,
        fila
      );

      const portal = this.capaPortales.getTileAt(
        columna,
        fila
      );

      if (tile !== null) {
        tile.visible = false;
        ocultas.push(tile);
      }

      if (portal !== null) {
        portal.visible = false;
        ocultas.push(portal);
      }

      if (ocultas === this.tilesOcultasVistaPegado) {
        const placa = this.capaPlacas.getTileAt(columna, fila);
        if (placa !== null) {
          placa.visible = false;
          this.placasOcultasVistaPegado.push(placa);
        }
      }
    }
  }

  private seleccionCompleta(): boolean {
    if (
      this.seleccionIzquierda < 0 ||
      this.seleccionArriba < 0 ||
      this.seleccionDerecha < this.seleccionIzquierda ||
      this.seleccionAbajo < this.seleccionArriba ||
      this.seleccionDerecha >= this.columns ||
      this.seleccionAbajo >= this.rows
    ) {
      return false;
    }

    for (
      let y = this.seleccionArriba;
      y <= this.seleccionAbajo;
      y++
    ) {
      for (
        let x = this.seleccionIzquierda;
        x <= this.seleccionDerecha;
        x++
      ) {
        const casillas = this.grupoEn(x, y);

        for (let i = 0; i < casillas.length; i++) {
          const columna = casillas[i][0];
          const fila = casillas[i][1];

          if (
            columna < this.seleccionIzquierda ||
            columna > this.seleccionDerecha ||
            fila < this.seleccionArriba ||
            fila > this.seleccionAbajo
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private obtenerRelieve(indice: number) {
    for (let i = 0; i < this.relieves.length; i++) {
      if (this.relieves[i][0] === indice) {
        return this.relieves[i][1];
      }
    }

    return -1;
  }

  private actualizarCapaRelieve(
    base: Phaser.Tilemaps.TilemapLayer,
    relieve: Phaser.Tilemaps.TilemapLayer
  ) {
    relieve.setVisible(base.visible);

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const tile = base.getTileAt(columna, fila);

        if (tile === null || tile.visible === false) {
          relieve.removeTileAt(columna, fila);
          continue;
        }

        if (
          base === this.capaPortales ||
          base === this.capaVistaPortalesPegado
        ) {
          tile.alpha = 1;

          if (tile.index === this.portalArriba) {
            tile.alpha = 0;
          }
        }

        const indice = this.obtenerRelieve(tile.index);

        const vistaPegado = base === this.capaVistaPegado ||
          base === this.capaVistaPortalesPegado;

        if (indice === -1 || (vistaPegado && fila === 0)) {
          relieve.removeTileAt(columna, fila);
        } else {
          relieve.putTileAt(indice, columna, fila);
        }
      }
    }
  }

  private actualizarRelieves() {
    if (this.capaRelieve !== null) {
      this.actualizarCapaRelieve(
        this.tablero,
        this.capaRelieve
      );
    }

    if (this.capaRelievePegado !== null) {
      this.actualizarCapaRelieve(
        this.capaVistaPegado,
        this.capaRelievePegado
      );
    }

    if (this.capaRelievePortales !== null) {
      this.actualizarCapaRelieve(
        this.capaPortales,
        this.capaRelievePortales
      );
    }

    if (this.capaRelievePortalesPegado !== null) {
      this.actualizarCapaRelieve(
        this.capaVistaPortalesPegado,
        this.capaRelievePortalesPegado
      );
    }
  }

  private profundidadFila(
    fila: number,
    orden: number
  ): number {
    return 1 + (fila + orden / 10) * 4 / this.rows;
  }

  private actualizarCapaProfundidad(
    capa: Phaser.Tilemaps.TilemapLayer | null,
    orden: number,
    alpha: number
  ): void {
    if (capa === null) {
      return;
    }

    capa.setAlpha(0);

    if (this.imagenesProfundidad[orden] === undefined) {
      this.imagenesProfundidad[orden] = [];
    }

    const imagenes = this.imagenesProfundidad[orden];

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const posicion = fila * this.columns + columna;
        const tile = capa.getTileAt(columna, fila);

        let imagen = imagenes[posicion];

        if (
          capa.visible === false ||
          tile === null ||
          tile.visible === false ||
          tile.alpha === 0
        ) {
          if (imagen !== undefined) {
            imagen.setVisible(false);
          }

          continue;
        }

        if (imagen === undefined) {
          imagen = this.add.image(
            capa.x + (columna + 0.5) * this.cellsize,
            capa.y + (fila + 0.5) * this.cellsize,
            "editorTiles",
            tile.index - 1
          );

          imagen.setDepth(this.profundidadFila(fila, orden));
          imagenes[posicion] = imagen;
        }

        if (imagen.getData("tile") !== tile.index) {
          imagen.setTexture("editorTiles", tile.index - 1);
          imagen.setDisplaySize(this.cellsize, this.cellsize);
          imagen.setData("tile", tile.index);
        }

        imagen.setAlpha(alpha * tile.alpha);
        imagen.setVisible(true);
      }
    }
  }

  private grupoPortalEn(columna: number, fila: number): number {
    let grupo = 0;

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (!this.esParDePortales(link)) continue;
      grupo++;

      if ((link[0] === columna && link[1] === fila) ||
        (link[2] === columna && link[3] === fila)) {
        return grupo;
      }
    }

    return 0;
  }

  private recortarPortalEditor(sprite: Phaser.GameObjects.Sprite): void {
    const arriba = sprite.y - sprite.height * sprite.originY * sprite.scaleY;
    const recorte = Math.max(0, Math.ceil((this.board_offset_y - arriba) / sprite.scaleY));

    if (recorte >= sprite.height) {
      sprite.setVisible(false);
    } else if (recorte > 0) {
      sprite.setCrop(0, recorte, sprite.width, sprite.height - recorte);
    } else {
      sprite.setCrop();
    }
  }

  private actualizarCapaPortalesAnimados(
    capa: Phaser.Tilemaps.TilemapLayer,
    base: Phaser.Tilemaps.TilemapLayer,
    orden: number,
    alpha: number
  ): void {
    capa.setAlpha(0);
    if (this.spritesPortales[orden] === undefined) this.spritesPortales[orden] = [];
    const sprites = this.spritesPortales[orden];

    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const posicion = fila * this.columns + columna;
        const tile = capa.getTileAt(columna, fila);
        let sprite = sprites[posicion];

        if (!capa.visible || tile === null || !tile.visible || direccionPortalEditor(tile.index) === -1) {
          if (sprite !== undefined) sprite.setVisible(false);
          continue;
        }

        if (sprite === undefined) {
          sprite = this.add.sprite(0, 0, "portal-normal-green", 0);
          sprites[posicion] = sprite;
        }

        const soporte = base.getTileAt(columna, fila);
        let normal = false;
        if (soporte !== null) normal = esParedExteriorPortal(soporte.index);
        let grupo = 0;
        if (capa === this.capaPortales) grupo = this.grupoPortalEn(columna, fila);

        configurarPortal(sprite, grupo, direccionPortalEditor(tile.index), normal);
        sprite.setScale(this.tileScale);
        sprite.setPosition(capa.x + (columna + 1) * this.cellsize, capa.y + (fila + 1) * this.cellsize);
        sprite.setDepth(this.profundidadFila(fila, orden + 1));
        sprite.setAlpha(alpha);
        sprite.setVisible(true);
        this.recortarPortalEditor(sprite);
      }
    }
  }

  private actualizarProfundidad(): void {
    this.actualizarCapaProfundidad(this.capaPlacas, 0, 1);
    this.actualizarCapaProfundidad(this.tablero, 1, 1);
    this.actualizarCapaProfundidad(this.capaRelieve, 2, 1);

    this.actualizarCapaPortalesAnimados(
      this.capaPortales, this.tablero, 3, 1
    );

    if (this.capaRelievePortales !== null) {
      this.capaRelievePortales.setAlpha(0);
    }

    this.actualizarCapaProfundidad(this.capaVistaPlacasPegado, 4, 0.6);
    this.actualizarCapaProfundidad(this.capaVistaPegado, 5, 0.6);
    this.actualizarCapaProfundidad(this.capaRelievePegado, 6, 0.6);

    this.actualizarCapaPortalesAnimados(
      this.capaVistaPortalesPegado, this.capaVistaPegado, 7, 0.6
    );

    if (this.capaRelievePortalesPegado !== null) {
      this.capaRelievePortalesPegado.setAlpha(0);
    }
  }

  private testearNivel(): void {
    if (this.nivelValido() === false) {
      return;
    }

    const nivel = this.getEditorState();

    for (let y = 0; y < nivel.portales.length; y++) {
      for (let x = 0; x < nivel.portales[y].length; x++) {
        if (nivel.portales[y][x] === -1) {
          continue;
        }

        let tieneLink = false;

        for (let i = 0; i < nivel.links.length; i++) {
          const link = nivel.links[i];

          if (link.length < 4) {
            continue;
          }

          const x1 = link[0];
          const y1 = link[1];
          const x2 = link[2];
          const y2 = link[3];

          if (
            nivel.portales[y1] === undefined ||
            nivel.portales[y2] === undefined ||
            nivel.portales[y1][x1] === undefined ||
            nivel.portales[y2][x2] === undefined ||
            nivel.portales[y1][x1] === -1 ||
            nivel.portales[y2][x2] === -1
          ) {
            continue;
          }

          if (
            (x1 === x && y1 === y) ||
            (x2 === x && y2 === y)
          ) {
            tieneLink = true;
            break;
          }
        }

        if (tieneLink === false) {
          nivel.portales[y][x] = -1;
        }
      }
    }

    let darkLayer: number[][] | undefined = undefined;
    if (this.nivelId !== null) {
      const guardado = obtenerNivel(this.nivelId);
      if (guardado !== undefined) {
        darkLayer = guardado.darkLayer;
      }
    }

    const nivelTest = convertirNivel({
      tablero: nivel.tablero,
      portales: nivel.portales,
      links: nivel.links,
      darkLayer: darkLayer
    });
    const transition = this.scene.get("transition") as TransitionScene;

    transition.changeScene(
      this.sys.settings.key,
      "game",
      {
        modoTest: true,
        nivelTest: nivelTest,
        nivelId: this.nivelId,
        escenaAnterior: this.sys.settings.key,
        testeando: true
      },
      true
    );
  }


  private actualizarParedesConexas(columna: number, fila: number): void {
    for (let y = fila; y <= fila + 1; y++) {
      if (y < 0 || y >= this.rows) {
        continue;
      }

      const tile = this.tablero.getTileAt(columna, y);

      if (tile === null || (tile.index !== 39 && tile.index !== 64)) {
        continue;
      }

      let conectada = false;

      if (y > 0) {
        const arriba = this.tablero.getTileAt(columna, y - 1);

        if (arriba !== null && (arriba.index === 39 || arriba.index === 64)) {
          conectada = true;
        }
      }

      if (conectada) {
        this.tablero.putTileAt(64, columna, y);
      } else {
        this.tablero.putTileAt(39, columna, y);
      }
    }
  }


}
