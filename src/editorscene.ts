import Phaser from "phaser";
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

export class EditorScene extends Phaser.Scene {
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
    this.portapapelesArrastre = null;
    this.portapapelesPortalesArrastre = null;

    this.tilesOcultasVistaPegado = [];
    this.portalesOcultosVistaPegado = [];
    this.placasOcultasVistaPegado = [];
    this.tileOcultaHover = null;
    this.portalOcultoHover = null;

    this.linkInicioX = -1;
    this.linkInicioY = -1;
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

  private tileInvisible: number = 1;
  private sinHerramienta: number = -1;
  private selectTool: number = 100;
  private pasteTool: number = 101;
  private linkTool: number = 103;
  private tilesSinPortal: number[] = [2, 5, 6, 7, 8];
  private tileJugador: number = 66;
  private tileBandera: number = 25;
  private tileSalidaArriba: number = 26;
  private formaSalida: number[][] = [
    [0, 0, this.tileBandera],
    [0, -1, this.tileSalidaArriba]
  ];
  private tilePlaca: number = 2;
  private tilePlacaConObjeto: number = 1000;
  private colorLinkEmisor: number = 0xe6c56a;
  private colorLinkPortales: number = 0x9ccc65;
  private colorLinkPlaca: number = 0xb39ddb;

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
  private linkInicioX: number = -1;
  private linkInicioY: number = -1;
  private graficosLinks!: Phaser.GameObjects.Graphics;
  private graficosLinkTemporal!: Phaser.GameObjects.Graphics;
  private botonLink!: Phaser.GameObjects.Rectangle;

  private ultimoClickLinkX: number = -1;
  private ultimoClickLinkY: number = -1;
  private tiempoUltimoClickLink: number = 0;

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
    [66, 25],
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
    this.load.spritesheet("editorTiles", "./tileset.png", {
      frameWidth: this.tileGraphicSize,
      frameHeight: this.tileGraphicSize
    });
  }

  create(): void {
    crearAnimacionesPortales(this);
    this.cameras.main.setBackgroundColor("#222034");
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

    this.textoEstado = this.add.text(24, 22, "Level Editor", {
      fontFamily: "Fuente",
      fontSize: "14px",
      color: "#95add6"
    });

    let nombre = "Untitled Level";

    if (this.nivelId !== null) {
      const nivel = obtenerNivel(this.nivelId);

      if (nivel !== undefined) {
        nombre = nivel.nombre;
      }
    }

    const nombreNivel = this.add.text(24, 46, nombre, {
      fontFamily: "Fuente",
      fontSize: "18px",
      color: "#ffffff",
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
      0x000000,
      0.12
    );

    this.hoverCell.setStrokeStyle(2, 0x6f87b0, 0.65);
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
      "Save",
      () => {
        this.guardarNivelActual();
      }
    );

    this.botonVolver = crearBoton(
      this,
      xVolver,
      yBotones,
      anchoBoton,
      "Back",
      () => {
        this.solicitarSalida();
      }
    );

    this.botonTest = crearBoton(
      this,
      xTest,
      yBotones,
      anchoBoton,
      "Test",
      () => {
        this.testearNivel();
      }
    );

    this.botonTest.setData("atajo", "Ctrl/Cmd + Enter");
    this.botonGuardar.setData("atajo", "Ctrl/Cmd + S");

    this.input.on("pointermove", (mouse: Phaser.Input.Pointer) => {
      if (this.popupSalida !== null || this.bloquearMouseHastaSoltar) {
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
        this.haySeleccion = false;

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

          const inicioX =
            this.mouseX - Math.floor((anchoSeleccion - 1) / 2);

          const inicioY =
            this.mouseY - Math.floor((altoSeleccion - 1) / 2);

          this.borrarSeleccion();
          this.pegarSeleccion(true);

          this.ubicarSeleccion(
            inicioX,
            inicioY,
            anchoSeleccion,
            altoSeleccion
          );

          this.saveIfChanged();
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

        this.vistaPegado.setVisible(false);
        this.capaVistaPegado.setVisible(false);
        this.capaVistaPlacasPegado.setVisible(false);
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();

        this.haySeleccion = true;
        this.actualizarInterfaz();
        return;
      }

      if (this.posibleArrastreSeleccion) {
        const columna = this.arrastreInicioX;
        const fila = this.arrastreInicioY;

        this.posibleArrastreSeleccion = false;
        this.arrastreInicioX = -1;
        this.arrastreInicioY = -1;

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

    this.graficosLinkTemporal = this.add.graphics();
    this.graficosLinkTemporal.setDepth(8);

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

            this.links.push(link.slice());
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
    });

    this.input.on("pointerdown", (mouse: Phaser.Input.Pointer) => {
      if (this.popupSalida !== null || this.bloquearMouseHastaSoltar) {
        return;
      }

      this.cerrarSubHotbar();
      this.clickEnHotbar = false;

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

        if (this.esDobleClickLink()) {
          this.cancelarLinkTemporal();

          const indiceLink = this.buscarLinkDeCasilla(
            this.mouseX,
            this.mouseY
          );

          if (indiceLink !== -1) {
            this.links.splice(indiceLink, 1);
            this.dibujarLinks();
          }

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
      0x9ccc65,
      0.25
    );

    this.rectanguloSeleccion.setOrigin(0, 0);
    this.rectanguloSeleccion.setStrokeStyle(2, 0x73994b, 1);
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
    this.vistaPegado.setFillStyle(0xffffff, 0.25);
    this.vistaPegado.setStrokeStyle(2, 0xffffff);
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

    this.textoTile = this.add.text(0, 0, "", {
      fontFamily: "Fuente",
      fontSize: "14px",
      color: "#cbdbfc",
      backgroundColor: "#171a2e",
      padding: { x: 10, y: 8 },
      align: "center",
    });

    this.textoTile.setOrigin(0, 0);
    this.textoTile.setDepth(1000);
    this.textoTile.setVisible(false);
    this.bordeTooltipTile = this.add.rectangle(
      0, 0, 1, 1, 0x171a2e
    );

this.bordeTooltipTile.setOrigin(0, 0);
this.bordeTooltipTile.setStrokeStyle(2, 0xcbdbfc);
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

    const paredSuperior = arriba.index === 16 ||
      arriba.index === 39 || arriba.index === 64 ||
      arriba.index === this.tileSalidaArriba || arriba.index === this.tileBandera;

    return baseLibre && paredSuperior;
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
      this.rectanguloSeleccion.setFillStyle(0x9ccc65, 0.25);
      this.rectanguloSeleccion.setStrokeStyle(2, 0x73994b);
    } else {
      this.rectanguloSeleccion.setFillStyle(0xff0000, 0.25);
      this.rectanguloSeleccion.setStrokeStyle(2, 0xff0000);
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

    const inicioX = this.mouseX - Math.floor((ancho - 1) / 2);
    const inicioY = this.mouseY - Math.floor((alto - 1) / 2);

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

    const inicioX =
      this.mouseX - Math.floor((anchoSeleccion - 1) / 2);

    const inicioY =
      this.mouseY - Math.floor((altoSeleccion - 1) / 2);

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
      this.vistaPegado.setFillStyle(0xffffff, 0.25);
      this.vistaPegado.setStrokeStyle(2, 0xffffff);
    } else {
      this.vistaPegado.setFillStyle(0xff0000, 0.25);
      this.vistaPegado.setStrokeStyle(2, 0xff0000);
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
    alto: number
  ): void {
    this.seleccionando = false;
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

    this.rectanguloSeleccion.setFillStyle(0x9ccc65, 0.25);
    this.rectanguloSeleccion.setStrokeStyle(2, 0x73994b);

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

    const inicioX =
      this.mouseX - Math.floor((anchoSeleccion - 1) / 2);

    const inicioY =
      this.mouseY - Math.floor((altoSeleccion - 1) / 2);

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
    if (this.popupSalida !== null) {
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
      "You have unsaved changes.\nLeave without saving?";

    if (this.nivelValido() === false) {
      if (
        this.existeTile(this.tileJugador) &&
        this.existeTile(this.tileBandera)
      ) {
        mensaje = "The door must occupy the first and second rows.\nLeaving will discard your unsaved changes.";
      } else {
        mensaje = "The player or exit is missing.\nLeaving will discard your unsaved changes.";
      }
    }

    const cantidadAnterior = this.children.list.length;

    mostrarConfirmacion(
      this,
      "Unsaved Changes",
      mensaje,
      "Leave Without Saving",
      0xe57373,
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
        window.alert("Could not save the level.\n\n" + String(error));
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

    const colorNormal = 0xcbdbfc;
    const colorSeleccionado = 0xffd166;
    const colorDesactivado = 0x79869e;

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

      this.botonBorrar.setFillStyle(0xe57373);
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
      this.botonGuardar.setFillStyle(0x9ccc65);
    } else {
      this.botonGuardar.disableInteractive();
      this.botonGuardar.setFillStyle(colorDesactivado);
    }

    this.botonVolver.setInteractive({ useHandCursor: true });
    this.botonVolver.setFillStyle(0xe6a05a);

    if (this.botonTest !== null) {
      if (valido) {
        this.botonTest.setInteractive({ useHandCursor: true });
        this.botonTest.setFillStyle(0xb39ddb);
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
          this.textoEstado.setText("The door must occupy rows 1 and 2");
        } else {
          this.textoEstado.setText("Player or exit missing");
        }
        this.textoEstado.setColor("#e6a05a");
      } else if (this.hayCambiosSinGuardar()) {
        this.textoEstado.setText("Unsaved changes");
        this.textoEstado.setColor("#ffd166");
      } else {
        this.textoEstado.setText("Level saved");
        this.textoEstado.setColor("#9ccc65");
      }
    }

    this.botonGuardar.setAlpha(1);
    this.botonVolver.setAlpha(1);

    for (let i = 0; i < this.botonesInterfaz.length; i++) {
      const boton = this.botonesInterfaz[i];

      if (boton.input && boton.input.enabled) {
        if (boton.getData("hoverInterfaz") === true) {
          if (boton.fillColor === colorSeleccionado) {
            boton.setFillStyle(0xd9ad4f);
          } else if (boton === this.botonVolver) {
            boton.setFillStyle(0xc98543);
          } else if (boton === this.botonGuardar) {
            boton.setFillStyle(0x7eaa4c);
          } else if (boton === this.botonTest) {
            boton.setFillStyle(0x957bc1);
          } else if (boton === this.botonBorrar && this.haySeleccion) {
            boton.setFillStyle(0xc05757);
          } else {
            boton.setFillStyle(0x95add6);
          }
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
      "Select",
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
      "Deselect",
      () => this.quitarSeleccion()
    );

    y += separacion;

    this.botonCopiar = crearBoton(
      this,
      x,
      y,
      ancho,
      "Copy",
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
      "Paste",
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
      "Delete",
      () => this.borrarOGoma()
    );

    y += separacion;

    this.botonPortal = crearBoton(
      this,
      x,
      y,
      ancho,
      "Portal",
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
      "Link",
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
      "Undo",
      () => this.undo()
    );

    y += separacion;

    this.botonRedo = crearBoton(
      this,
      x,
      y,
      ancho,
      "Redo",
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
        0x14121e
      );

      const casilla = this.add.rectangle(
        casillaX,
        y,
        tamaño,
        tamaño,
        0x303038
      );

      casilla.setStrokeStyle(4, 0x222034);
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
          0xffd166
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

      this.links.push(link.slice());
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

  private esParDePortales(link: number[]): boolean {
    return link.length === 4 &&
      this.hayPortalEn(link[0], link[1]) &&
      this.hayPortalEn(link[2], link[3]);
  }

  private esLinkDeEmisor(link: number[]): boolean {
    return link.length === 5 && link[4] === 2 &&
      this.hayPlacaEn(link[0], link[1]) &&
      this.hayEmisorEn(link[2], link[3]);
  }

  private esLinkDePlaca(link: number[]): boolean {
    if (this.esLinkDeEmisor(link)) {
      return true;
    }
    if (link.length !== 4 || this.esParDePortales(link)) {
      return false;
    }
    return (
      this.hayPlacaEn(link[0], link[1]) &&
      this.hayPortalEn(link[2], link[3])
    ) || (
      this.hayPortalEn(link[0], link[1]) &&
      this.hayPlacaEn(link[2], link[3])
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

  private buscarLinkDePlaca(columna: number, fila: number): number {
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (!this.esLinkDePlaca(link)) {
        continue;
      }
      if (link[0] === columna && link[1] === fila &&
          this.hayPlacaEn(link[0], link[1])) {
        return i;
      }
      if (link.length === 4 && link[2] === columna &&
          link[3] === fila && this.hayPlacaEn(link[2], link[3])) {
        return i;
      }
    }
    return -1;
  }

  private buscarLinkDeEmisor(columna: number, fila: number): number {
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (this.esLinkDeEmisor(link) &&
          link[2] === columna && link[3] === fila) {
        return i;
      }
    }
    return -1;
  }

  private buscarLinkDeCasilla(columna: number, fila: number): number {
    if (this.hayPlacaEn(columna, fila)) {
      const placa = this.buscarLinkDePlaca(columna, fila);
      if (placa !== -1) {
        return placa;
      }
    }
    if (this.hayPortalEn(columna, fila)) {
      const portal = this.buscarLinkDePortal(columna, fila);
      if (portal !== -1) {
        return portal;
      }
    }
    if (this.hayEmisorEn(columna, fila)) {
      return this.buscarLinkDeEmisor(columna, fila);
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
    const placaInicio = this.hayPlacaEn(x1, y1);
    const placaFinal = this.hayPlacaEn(x2, y2);

    if (placaInicio && this.hayEmisorEn(x2, y2)) {
      return true;
    }
    if (placaFinal && this.hayEmisorEn(x1, y1)) {
      return true;
    }

    if (portalInicio && portalFinal) {
      const linkInicio = this.buscarLinkDePortal(x1, y1);
      const linkFinal = this.buscarLinkDePortal(x2, y2);
      let cantidadPares = 0;

      for (let i = 0; i < this.links.length; i++) {
        if (this.esParDePortales(this.links[i])) {
          cantidadPares++;
        }
      }
      if (linkInicio !== -1) {
        cantidadPares--;
      }
      if (linkFinal !== -1 && linkFinal !== linkInicio) {
        cantidadPares--;
      }
      return cantidadPares + 1 <= 5;
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

  private dibujarLinks(): void {
    this.graficosLinks.clear();

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];

      const inicio = this.centroCasilla(
        link[0],
        link[1]
      );

      const final = this.centroCasilla(
        link[2],
        link[3]
      );

      let color = this.colorLinkPortales;

      if (this.esLinkDeEmisor(link)) {
        color = this.colorLinkEmisor;
      } else if (this.esLinkDePlaca(link)) {
        color = this.colorLinkPlaca;
      }

      this.dibujarLink(
        this.graficosLinks,
        inicio.x,
        inicio.y,
        final.x,
        final.y,
        color
      );
    }
  }

  private iniciarLink(_mouse: Phaser.Input.Pointer): void {
    if (
      !this.hayPortalEn(this.mouseX, this.mouseY) &&
      !this.hayPlacaEn(this.mouseX, this.mouseY) &&
      !this.hayEmisorEn(this.mouseX, this.mouseY)
    ) {
      return;
    }

    this.linkInicioX = this.mouseX;
    this.linkInicioY = this.mouseY;

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

    const final = this.centroCasilla(this.mouseX, this.mouseY);
    let color = 0xe57373;

    if (this.linkInicioX === -1 || this.linkInicioY === -1) {
      if (this.hayPortalEn(this.mouseX, this.mouseY)) {
        color = this.colorLinkPortales;
      }

      if (this.hayPlacaEn(this.mouseX, this.mouseY)) {
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
          (this.hayPlacaEn(this.linkInicioX, this.linkInicioY) &&
            this.hayEmisorEn(this.mouseX, this.mouseY)) ||
          (this.hayPlacaEn(this.mouseX, this.mouseY) &&
            this.hayEmisorEn(this.linkInicioX, this.linkInicioY))
        ) {
          color = this.colorLinkEmisor;
        } else if (
          this.hayPlacaEn(this.linkInicioX, this.linkInicioY) ||
          this.hayPlacaEn(this.mouseX, this.mouseY)
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
    graficos.lineStyle(2, 0x222034, 1);
    graficos.strokeRect(x - 6, y - 6, 12, 12);
  }

  private cancelarLinkTemporal(): void {
    this.linkInicioX = -1;
    this.linkInicioY = -1;
    this.graficosLinkTemporal.clear();
  }

  private terminarLink(): void {
    if (this.linkInicioX === -1 || this.linkInicioY === -1) {
      return;
    }

    const inicioX = this.linkInicioX;
    const inicioY = this.linkInicioY;

    if (this.mouseX === inicioX && this.mouseY === inicioY) {
      this.cancelarLinkTemporal();
      return;
    }

    if (
      this.mouseX !== -1 && this.mouseY !== -1 &&
      this.puedeCrearLink(inicioX, inicioY, this.mouseX, this.mouseY)
    ) {
      const placaInicio = this.hayPlacaEn(inicioX, inicioY);
      const placaFinal = this.hayPlacaEn(this.mouseX, this.mouseY);

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
        this.links.push([inicioX, inicioY, this.mouseX, this.mouseY]);
      } else {
        let placaX = inicioX;
        let placaY = inicioY;
        let destinoX = this.mouseX;
        let destinoY = this.mouseY;

        if (!placaInicio && placaFinal) {
          placaX = this.mouseX;
          placaY = this.mouseY;
          destinoX = inicioX;
          destinoY = inicioY;
        }

        const anterior = this.buscarLinkDePlaca(placaX, placaY);
        if (anterior !== -1) {
          this.links.splice(anterior, 1);
        }

        if (this.hayEmisorEn(destinoX, destinoY)) {
          this.links.push([placaX, placaY, destinoX, destinoY, 2]);
        } else {
          this.links.push([placaX, placaY, destinoX, destinoY]);
        }
      }
    } else {
      const anterior = this.buscarLinkDeCasilla(inicioX, inicioY);
      if (anterior !== -1) {
        this.links.splice(anterior, 1);
      }
    }

    this.cancelarLinkTemporal();
    this.actualizarLinks();
  }

  private actualizarLinks(): void {
    const pares: number[][] = [];
    const linksValidos: number[][] = [];
    const placasUsadas: number[][] = [];

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (this.esParDePortales(link) && pares.length < 5) {
        pares.push(link);
        linksValidos.push(link);
      }
    }

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      if (!this.esLinkDePlaca(link)) {
        continue;
      }

      let placaX = link[0];
      let placaY = link[1];
      let destinoX = link[2];
      let destinoY = link[3];

      if (link.length === 4 && this.hayPortalEn(link[0], link[1])) {
        placaX = link[2];
        placaY = link[3];
        destinoX = link[0];
        destinoY = link[1];
      }

      let valido = this.esLinkDeEmisor(link);
      if (!valido) {
        for (let j = 0; j < pares.length; j++) {
          const par = pares[j];
          if (
            (par[0] === destinoX && par[1] === destinoY) ||
            (par[2] === destinoX && par[3] === destinoY)
          ) {
            valido = true;
            break;
          }
        }
      }
      if (!valido) {
        continue;
      }

      let repetida = false;
      for (let j = 0; j < placasUsadas.length; j++) {
        if (placasUsadas[j][0] === placaX && placasUsadas[j][1] === placaY) {
          repetida = true;
          break;
        }
      }
      if (repetida) {
        continue;
      }

      placasUsadas.push([placaX, placaY]);
      if (this.esLinkDeEmisor(link)) {
        linksValidos.push([placaX, placaY, destinoX, destinoY, 2]);
      } else {
        linksValidos.push([placaX, placaY, destinoX, destinoY]);
      }
    }

    this.links = linksValidos;
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

      copia.push(link.slice());
    }

    return copia;
  }

  private esDobleClickLink(): boolean {
    const ahora = this.time.now;

    const dobleClick =
      this.mouseX === this.ultimoClickLinkX &&
      this.mouseY === this.ultimoClickLinkY &&
      ahora - this.tiempoUltimoClickLink < 300;

    this.ultimoClickLinkX = this.mouseX;
    this.ultimoClickLinkY = this.mouseY;
    this.tiempoUltimoClickLink = ahora;

    if (dobleClick) {
      this.ultimoClickLinkX = -1;
      this.ultimoClickLinkY = -1;
      this.tiempoUltimoClickLink = 0;
    }

    return dobleClick;
  }

  private actualizarHoverTile() {
    this.restaurarTileHover();
    this.hoverTile.setVisible(false);
    this.hoverTile.clearTint();
    this.hoverCell.setFillStyle(0x000000, 0.12);
    this.hoverCell.setStrokeStyle(2, 0x6f87b0, 0.65);

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
        this.hoverCell.setFillStyle(0xff0000, 0.25);
        this.hoverCell.setStrokeStyle(2, 0xff0000, 0.6);
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
        this.hoverPortal.setTint(0xff0000);
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
      this.hoverCell.setFillStyle(0xff0000, 0.25);
      this.hoverCell.setStrokeStyle(2, 0xff0000, 0.6);
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
          imagen.setTint(0xff0000);
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
          imagenRelieve.setTint(0xff0000);
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
        if (link.length === 5 && esInicio) {
          continue;
        }
        if (link.length === 4 &&
            ((esInicio && this.hayPlacaEn(link[0], link[1])) ||
             (esFinal && this.hayPlacaEn(link[2], link[3])))) {
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
            const izquierda = this.tablero.getTileAt(columna - 1, 0);
            const derecha = this.tablero.getTileAt(columna + 1, 0);
            let paredSuperior = 39;

            if (
              (izquierda !== null && izquierda.index === 16) ||
              (derecha !== null && derecha.index === 16)
            ) {
              paredSuperior = 16;
            }

            this.borrarGrupoEn(columna, fila);

            if (fila === 0 || fila === 1) {
              this.tablero.putTileAt(paredSuperior, columna, 0);

              if (fila === 1 && paredSuperior === 16) {
                this.tablero.putTileAt(17, columna, fila);
              }

              this.actualizarParedesConexas(columna, 0);
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
      0x302641
    );

    fondo.setStrokeStyle(4, 0x8573a6);
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
        0x303038
      );

      casilla.setStrokeStyle(2, 0x222034);
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
      return "Mirror";
    }
    if (tile >= 11 && tile <= 14) {
      return "Emitter";
    }
    if (tile >= 27 && tile <= 30) {
      return "Receiver";
    }
    if (tile === 37) {
      return "Crate";
    }
    if (tile === this.tilePlaca) {
      return "Pressure plate";
    }
    if (tile === 39) {
      return "Interior wall";
    }
    if (tile === 17) {
      return "Top wall";
    }
    if (tile === 20) {
      return "Bottom wall";
    }
    if (tile === 18) {
      return "Right wall";
    }
    if (tile === 19) {
      return "Left wall";
    }
    if (tile === 16) {
      return "Ceiling";
    }
    if (tile === 21) {
      return "Top left corner";
    }
    if (tile === 22) {
      return "Top right corner";
    }
    if (tile === 23) {
      return "Bottom right corner";
    }
    if (tile === 24) {
      return "Bottom left corner";
    }
    if (tile === 41) {
      return "Single machine";
    }
    if (tile === 200) {
      return "Double machine";
    }
    if (tile === 201) {
      return "Triple machine";
    }
    if (tile === this.tileJugador) {
      return "Player";
    }
    if (tile === this.tileBandera) {
      return "Exit";
    }
    return "Unknown tile";
  }

  private ocultarTooltipTile(): void {
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
          nombre += "\nRight-click to see variants";
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
      0x171a2e
    );

    fondo.setStrokeStyle(4, 0x6f87b0);
    fondo.setDepth(-1);
  }

  private clickEnHotbar: boolean = false;

  private pintarCasillaHotbar(
    casilla: Phaser.GameObjects.Rectangle,
    seleccionada: boolean
  ): void {
    const hover = casilla.getData("hoverHotbar") === true;

    let color = 0x303038;
    let borde = 0x62626e;

    if (hover) {
      color = 0x3d3d48;
      borde = 0xb39ddb;
    }

    if (seleccionada) {
      borde = 0x9ccc65;

      if (hover) {
        borde = 0xb0d782;
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
      0x171a2e
    );

    fondo.setStrokeStyle(4, 0x6f87b0);
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

          if (link.length !== 4) {
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
