import Phaser from "phaser";
import { obtenerNivel, actualizarNivel, crearBoton } from "./niveles";
import { convertirNivel } from "./parser";
import { mostrarConfirmacion } from "./popup";

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

  private estadoGuardado: EstadoEditor | null = null;
  private popupSalida: Phaser.GameObjects.GameObject | null = null;
  private bloquearMouseHastaSoltar: boolean = false;
  private puedeGuardarAnterior: boolean = false;
  private nivelValidoAnterior: boolean = false;

  private arrastrandoSeleccion: boolean = false;
  private posibleArrastreSeleccion: boolean = false;
  private arrastreInicioX: number = -1;
  private arrastreInicioY: number = -1;

  private tKey!: Phaser.Input.Keyboard.Key;

  private tileInvisible: number = 1;
  private sinHerramienta: number = -1;
  private selectTool: number = 100;
  private pasteTool: number = 101;
  private linkTool: number = 103;
  private tilesSinPortal: number[] = [2, 5, 6, 7, 8];
  private tileJugador: number = 66;
  private tileBandera: number = 25;

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
  private botonPegar!: Phaser.GameObjects.Rectangle;
  private botonBorrar!: Phaser.GameObjects.Rectangle;
  private botonDeseleccionar!: Phaser.GameObjects.Rectangle;
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

  private imagenesHotbar: Phaser.GameObjects.Image[] = [];
  private objetosSubHotbar: Phaser.GameObjects.GameObject[] = [];
  private subHotbarAbierta: number = -1;

  //CUSTOMIZAR HOTBAR
  
  private tilesHotbar = [37, 3, 11, 27, 39, 41, 66];

  private variantesTiles = [
    [3, 4, 5, 6],
    [11, 12, 13, 14],
    [27, 28, 29, 30],
    [41, 200, 201]
  ];

  private casillasHotbar: Phaser.GameObjects.Rectangle[] = [];
  private casillaGoma!: Phaser.GameObjects.Rectangle;

  private seleccionCopiada: number[][] = [];
  private portapapelesArrastre: number[][] | null = null;
  private portalesCopiados: number[][] = [];
  private portapapelesPortalesArrastre: number[][] | null = null;
  private vistaPegado!: Phaser.GameObjects.Rectangle;
  private tilesOcultasVistaPegado: Phaser.Tilemaps.Tile[] = [];
  private portalesOcultosVistaPegado: Phaser.Tilemaps.Tile[] = [];

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
  private capaPortales!: Phaser.Tilemaps.TilemapLayer;
  private capaVistaPegado!: Phaser.Tilemaps.TilemapLayer;
  private capaVistaPortalesPegado!: Phaser.Tilemaps.TilemapLayer;
  private capaRelieve: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePegado: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePortales: Phaser.Tilemaps.TilemapLayer | null = null;
  private capaRelievePortalesPegado: Phaser.Tilemaps.TilemapLayer | null = null;

  private herramienta: number = 1;

  preload(): void {
    this.load.spritesheet("editorTiles", "./tileset.png", {
      frameWidth: this.tileGraphicSize,
      frameHeight: this.tileGraphicSize
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#222034");

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
      this.cellsize - 1,
      this.cellsize - 1,
      0x000000,
      0.6
    );

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
      "Guardar",
      () => {
        this.guardarNivelActual();
      }
    );

    this.botonVolver = crearBoton(
      this,
      xVolver,
      yBotones,
      anchoBoton,
      "Volver",
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

    this.botonTest.setData("atajo", "T");

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
          this.pegarSeleccion();

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

            this.links.push([
              link[0],
              link[1],
              link[2],
              link[3]
            ]);
          }
        }

        this.estadoGuardado = this.getEditorState();
        this.eliminarPortalesSinLink();
        this.actualizarLinks();
      }
    }

    if (
      !this.existeTile(this.tileJugador) &&
      !this.existeTile(this.tileBandera)
    ) {
      this.mapa.putTileAt(
        this.tileJugador,
        1,
        1,
        true,
        this.tablero
      );

      this.mapa.putTileAt(
        this.tileBandera,
        this.columns - 2,
        this.rows - 2,
        true,
        this.tablero
      );
    }
    for (let x = 0; x < this.columns; x++) {
      this.tablero.putTileAt(39, x, 0);
      this.tablero.putTileAt(39, x, this.rows - 1);
    }
    for (let y = 0; y < this.rows; y++) {
      this.tablero.putTileAt(39, 0, y);
      this.tablero.putTileAt(39, this.columns - 1, y);
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

          const indiceLink = this.buscarLinkDePortal(
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

    this.tKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.T
    );

    const alTeclado = (evento: KeyboardEvent) => {
      if (this.popupSalida !== null) {
        if (evento.key === "Escape") {
          evento.preventDefault();
        }

        return;
      }

      const tecla = evento.key.toLowerCase();
      const control = evento.ctrlKey || evento.metaKey;

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
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        } else {
          this.herramienta = this.pasteTool;
          this.actualizarVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (tecla === "s") {
        if (this.herramienta === this.selectTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.selectTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (tecla === "delete" || tecla === "backspace") {
        if (this.haySeleccion === false) {
          return;
        }

        this.borrarSeleccion();
        this.saveIfChanged();
      }

      if (tecla === "escape") {
        if (this.haySeleccion) {
          this.quitarSeleccion();
        }
      }

      if (tecla === "l") {
        this.herramienta = this.linkTool;
        this.actualizarInterfaz();
        this.actualizarHotbar();
      }

      if (tecla === "p") {
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
      this.botonPortal,
      this.botonLink,
      this.botonCopiar,
      this.botonPegar,
      this.botonBorrar,
      this.botonDeseleccionar,
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

    this.configurarZonaHotbar(
      this.casillaGoma,
      () => this.herramienta === 0
    );

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

    let forma = this.formasPared[this.herramienta - 200];

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
        x < 0 ||
        y < 0 ||
        x >= this.columns ||
        y >= this.rows
      ) {
        return;
      }

      casillas.push([x, y]);
    }

    this.restaurarTileHover();

    for (let i = 0; i < casillas.length; i++) {
      this.borrarGrupoEn(casillas[i][0], casillas[i][1]);
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

  private pegarSeleccion() {
    const pegando =
      this.herramienta === this.pasteTool ||
      this.arrastrandoSeleccion;

    if (
      pegando === false ||
      this.puedePegarSeleccion() === false
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
        this.borrarGrupoEn(
          inicioX + columna,
          inicioY + fila
        );

        const tile = this.seleccionCopiada[fila][columna];

        if (tile === this.tileJugador) {
          this.borrarTileUnico(this.tileJugador);
        }

        if (tile === this.tileBandera) {
          this.borrarTileUnico(this.tileBandera);
        }
      }
    }

    for (let fila = 0; fila < alto; fila++) {
      for (let columna = 0; columna < ancho; columna++) {
        const x = inicioX + columna;
        const y = inicioY + fila;
        const tile = this.seleccionCopiada[fila][columna];
        const portal = this.portalesCopiados[fila][columna];

        this.tablero.putTileAt(tile, x, y);

        if (portal >= 0) {
          this.capaPortales.putTileAt(portal, x, y);
        }
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
      inicioY >= 0;

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

    return (
      inicioX >= 0 &&
      inicioY >= 0 &&
      inicioX + anchoSeleccion <= this.columns &&
      inicioY + altoSeleccion <= this.rows
    );
  }

  private getBoardState(): number[][] {
    const state: number[][] = [];

    for (let row = 0; row < this.rows; row++) {
      const savedRow: number[] = [];

      for (let column = 0; column < this.columns; column++) {
        const tile = this.mapa.getTileAt(
          column,
          row,
          false,
          this.tablero
        );

        savedRow.push(tile?.index ?? -1);
      }

      state.push(savedRow);
    }

    return state;
  }

  private restoreBoardState(state: number[][]): void {
    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        const tileIndex = state[row][column];
        this.tablero.putTileAt(tileIndex, column, row, true);
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
        const tileEncontrada = this.mapa.getTileAt(
          columna,
          fila,
          true,
          this.tablero
        );

        if (tileEncontrada === null) {
          continue;
        }

        filaCopiada.push(tileEncontrada.index);
      }

      contenido.push(filaCopiada);
    }

    return contenido;
  }

  update(): void {
    if (this.popupSalida !== null) {
      Phaser.Input.Keyboard.JustDown(this.tKey);

      if (this.popupSalida.scene !== undefined) {
        return;
      }

      this.popupSalida = null;
      this.actualizarInterfaz();
    }

    if (Phaser.Input.Keyboard.JustDown(this.tKey)) {
      this.testearNivel();
      return;
    }

    this.actualizarLinks();
    this.actualizarParedesConexas();

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
      this.scene.start("LevelsScene");
      return;
    }

    this.cerrarSubHotbar();
    this.cancelarLinkTemporal();
    this.restaurarTileHover();

    this.hoverTile.setVisible(false);
    this.hoverCell.setVisible(false);
    this.vistaPegado.setVisible(false);
    this.capaVistaPegado.setVisible(false);
    this.capaVistaPortalesPegado.setVisible(false);

    this.restaurarTilesVistaPegado();
    this.actualizarRelieves();
    this.actualizarProfundidad();

    for (let i = 0; i < this.children.list.length; i++) {
      this.children.list[i].emit("ocultarTooltip");
    }

    let mensaje =
      "Tenés cambios sin guardar.\n¿Querés salir sin guardarlos?";

    if (this.nivelValido() === false) {
      mensaje =
        "Falta el jugador o la salida.\nSi salís, se perderán los cambios sin guardar.";
    }

    const cantidadAnterior = this.children.list.length;

    mostrarConfirmacion(
      this,
      "Cambios sin guardar",
      mensaje,
      "Salir sin guardar",
      0xe57373,
      () => {
        this.scene.start("LevelsScene");
      }
    );

    this.popupSalida = this.children.list[cantidadAnterior];

    this.popupSalida.once("destroy", () => {
      this.bloquearMouseHastaSoltar = this.input.activePointer.isDown;
    });
  }

  private guardarNivelActual(): void {
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

    actualizarNivel(nivel);

    this.estadoGuardado = this.getEditorState();
    this.actualizarInterfaz();
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

    if (this.haySeleccion) {
      this.botonBorrar.setInteractive({ useHandCursor: true });
      this.botonDeseleccionar.setInteractive({ useHandCursor: true });
      this.botonCopiar.setInteractive({ useHandCursor: true });

      this.botonBorrar.setFillStyle(0xe57373);
      this.botonDeseleccionar.setFillStyle(colorNormal);
      this.botonCopiar.setFillStyle(colorNormal);

      this.botonBorrar.setAlpha(1);
      this.botonDeseleccionar.setAlpha(1);
      this.botonCopiar.setAlpha(1);
    } else {
      this.botonBorrar.disableInteractive();
      this.botonDeseleccionar.disableInteractive();
      this.botonCopiar.disableInteractive();

      this.botonBorrar.setFillStyle(colorDesactivado);
      this.botonDeseleccionar.setFillStyle(colorDesactivado);
      this.botonCopiar.setFillStyle(colorDesactivado);

      this.botonBorrar.setAlpha(1);
      this.botonDeseleccionar.setAlpha(1);
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
        this.textoEstado.setText("Level Editor - Falta jugador o salida");
        this.textoEstado.setColor("#e6a05a");
      } else if (this.hayCambiosSinGuardar()) {
        this.textoEstado.setText("Level Editor - Hay cambios sin guardar");
        this.textoEstado.setColor("#ffd166");
      } else {
        this.textoEstado.setText("Level Editor - Nivel guardado");
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
          } else if (boton === this.botonBorrar) {
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
    let y = 124;
    const x = 684;
    const separacion = 51;

    this.botonSeleccionar = crearBoton(
      this,
      x,
      y,
      136,
      "Seleccionar",
      () => {
        if (this.herramienta === this.selectTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.selectTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonPortal = crearBoton(
      this,
      x,
      y,
      136,
      "Portal",
      () => {
        if (this.herramienta === this.portalTool) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = this.portalTool;
          this.cancelarLinkTemporal();
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
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
      136,
      "Link",
      () => {
        if (this.herramienta === this.linkTool) {
          this.herramienta = this.sinHerramienta;
          this.cancelarLinkTemporal();
        } else {
          this.herramienta = this.linkTool;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
          this.quitarSeleccion();
        }

        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );

    y += separacion;

    this.botonCopiar = crearBoton(
      this,
      x,
      y,
      136,
      "Copiar",
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
      136,
      "Pegar",
      () => {
        if (this.herramienta === this.pasteTool) {
          this.herramienta = this.sinHerramienta;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
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
      136,
      "Borrar",
      () => {
        this.borrarSeleccion();
        this.quitarSeleccion();
        this.actualizarInterfaz();
      }
    );

    y += separacion;

    this.botonDeseleccionar = crearBoton(
      this,
      x,
      y,
      136,
      "Deseleccionar",
      () => {
        this.quitarSeleccion();
        this.actualizarInterfaz();
      }
    );

    y += separacion;

    this.botonUndo = crearBoton(
      this,
      x,
      y,
      136,
      "Deshacer",
      () => this.undo()
    );

    y += separacion;

    this.botonRedo = crearBoton(
      this,
      x,
      y,
      136,
      "Rehacer",
      () => this.redo()
    );

    this.botonSeleccionar.setData("atajo", "S");
    this.botonPortal.setData("atajo", "P");
    this.botonLink.setData("atajo", "L");
    this.botonCopiar.setData("atajo", "Ctrl/Cmd + C");
    this.botonPegar.setData("atajo", "Ctrl/Cmd + V");
    this.botonDeseleccionar.setData("atajo", "Esc");
    this.botonBorrar.setData("atajo", "Delete / Backspace");
    this.botonUndo.setData("atajo", "Ctrl/Cmd + Z");
    this.botonRedo.setData("atajo", "Ctrl/Cmd + Y");

    this.botonesInterfaz = [
      this.botonSeleccionar,
      this.botonPortal,
      this.botonLink,
      this.botonCopiar,
      this.botonPegar,
      this.botonBorrar,
      this.botonDeseleccionar,
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

    const y = 500;
    const tamaño = 40;
    const separacion = 52;
    let x = 44;

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

    x += 28;

    this.casillaGoma = crearBoton(
      this,
      x,
      y,
      96,
      "Goma",
      () => {
        if (this.herramienta === 0) {
          this.herramienta = this.sinHerramienta;
        } else {
          this.herramienta = 0;
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
        }

        this.cerrarSubHotbar();
        this.actualizarInterfaz();
        this.actualizarHotbar();
      }
    );
  }

  private actualizarHotbar(): void {
    for (let i = 0; i < this.casillasHotbar.length; i++) {
      this.pintarCasillaHotbar(
        this.casillasHotbar[i],
        this.herramienta === this.tilesHotbar[i]
      );
    }

    this.pintarCasillaHotbar(
      this.casillaGoma,
      this.herramienta === 0
    );
  }

  private obtenerPortal(
    pointerX: number,
    pointerY: number
  ): number {
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
  }

  private puedeColocarPortal(
    columna: number,
    fila: number,
    _portal: number
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

    if (tile.index === this.tileInvisible) {
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

        this.capaVistaPegado.putTileAt(tileEncontrada, x, y);

        const portalEncontrado = this.portalesCopiados[fila][columna];

        if (portalEncontrado !== -1) {
          this.capaVistaPortalesPegado.putTileAt(
            portalEncontrado,
            x,
            y
          );
        }
      }
    }

    this.capaVistaPegado.setVisible(true);
    this.capaVistaPortalesPegado.setVisible(true);
  }

  private restaurarTilesVistaPegado(): void {
    for (const tile of this.tilesOcultasVistaPegado) {
      tile.visible = true;
    }

    for (const portal of this.portalesOcultosVistaPegado) {
      portal.visible = true;
    }

    this.tilesOcultasVistaPegado = [];
    this.portalesOcultosVistaPegado = [];
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
        const portal = state[fila][columna];

        if (portal !== -1) {
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

      this.links.push([
        link[0],
        link[1],
        link[2],
        link[3]
      ]);
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

  private hayPortalEn(
    columna: number,
    fila: number
  ): boolean {
    if (
      columna < 0 ||
      fila < 0 ||
      columna >= this.columns ||
      fila >= this.rows
    ) {
      return false;
    }

    const portal = this.mapa.getTileAt(
      columna,
      fila,
      false,
      this.capaPortales
    );

    return portal !== null;
  }

  private buscarLinkDePortal(
    columna: number,
    fila: number
  ): number {
    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];

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
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): boolean {
    if (x1 === x2 && y1 === y2) {
      return false;
    }

    if (!this.hayPortalEn(x1, y1)) {
      return false;
    }

    if (!this.hayPortalEn(x2, y2)) {
      return false;
    }

    const linkInicio = this.buscarLinkDePortal(x1, y1);
    const linkFinal = this.buscarLinkDePortal(x2, y2);

    let cantidadDespues = this.links.length;

    if (linkInicio !== -1) {
      cantidadDespues--;
    }

    if (linkFinal !== -1 && linkFinal !== linkInicio) {
      cantidadDespues--;
    }

    cantidadDespues++;

    if (cantidadDespues > 5) {
      return false;
    }

    return true;
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

      this.dibujarLink(
        this.graficosLinks,
        inicio.x,
        inicio.y,
        final.x,
        final.y,
        0x9ccc65
      );
    }
  }

  private iniciarLink(_mouse: Phaser.Input.Pointer): void {
    if (!this.hayPortalEn(this.mouseX, this.mouseY)) {
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

    const final = this.centroCasilla(
      this.mouseX,
      this.mouseY
    );

    let color = 0xe57373;

    if (
      this.linkInicioX === -1 ||
      this.linkInicioY === -1
    ) {
      if (this.hayPortalEn(this.mouseX, this.mouseY)) {
        color = 0x9ccc65;
      }
    } else {
      const inicio = this.centroCasilla(
        this.linkInicioX,
        this.linkInicioY
      );

      if (
        this.puedeCrearLink(
          this.linkInicioX,
          this.linkInicioY,
          this.mouseX,
          this.mouseY
        )
      ) {
        color = 0x9ccc65;
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
    if (
      this.linkInicioX === -1 ||
      this.linkInicioY === -1
    ) {
      return;
    }

    const inicioX = this.linkInicioX;
    const inicioY = this.linkInicioY;

    if (
      this.mouseX === inicioX &&
      this.mouseY === inicioY
    ) {
      this.cancelarLinkTemporal();
      return;
    }

    if (
      this.mouseX !== -1 &&
      this.mouseY !== -1 &&
      this.puedeCrearLink(
        inicioX,
        inicioY,
        this.mouseX,
        this.mouseY
      )
    ) {
      const linkInicio = this.buscarLinkDePortal(
        inicioX,
        inicioY
      );

      const linkFinal = this.buscarLinkDePortal(
        this.mouseX,
        this.mouseY
      );

      if (
        linkInicio !== -1 &&
        linkFinal !== -1 &&
        linkInicio !== linkFinal
      ) {
        const mayor = Math.max(linkInicio, linkFinal);
        const menor = Math.min(linkInicio, linkFinal);

        this.links.splice(mayor, 1);
        this.links.splice(menor, 1);
      } else if (linkInicio !== -1) {
        this.links.splice(linkInicio, 1);
      } else if (linkFinal !== -1) {
        this.links.splice(linkFinal, 1);
      }

      this.links.push([
        inicioX,
        inicioY,
        this.mouseX,
        this.mouseY
      ]);
    } else {
      const linkExistente = this.buscarLinkDePortal(
        inicioX,
        inicioY
      );

      if (linkExistente !== -1) {
        this.links.splice(linkExistente, 1);
      }
    }

    this.cancelarLinkTemporal();
    this.dibujarLinks();
  }

  private actualizarLinks(): void {
    const linksValidos: number[][] = [];

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];

      const hayPortalInicio = this.hayPortalEn(
        link[0],
        link[1]
      );

      const hayPortalFinal = this.hayPortalEn(
        link[2],
        link[3]
      );

      if (hayPortalInicio && hayPortalFinal) {
        linksValidos.push(link);
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

      copia.push([
        link[0],
        link[1],
        link[2],
        link[3]
      ]);
    }

    return copia;
  }

  private eliminarPortalesSinLink(): void {
    for (let fila = 0; fila < this.rows; fila++) {
      for (let columna = 0; columna < this.columns; columna++) {
        const portal = this.mapa.getTileAt(
          columna,
          fila,
          false,
          this.capaPortales
        );

        if (portal === null) {
          continue;
        }

        if (this.buscarLinkDePortal(columna, fila) === -1) {
          this.mapa.removeTileAt(
            columna,
            fila,
            true,
            true,
            this.capaPortales
          );
        }
      }
    }
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
    this.hoverCell.setFillStyle(0x000000, 0.6);

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

      if (
        this.puedeColocarPortal(
          this.mouseX,
          this.mouseY,
          portal
        ) === false
      ) {
        this.hoverCell.setFillStyle(0xff0000, 0.6);
        return;
      }

      this.hoverTile.setVisible(false);

      if (portal !== this.portalArriba) {
        this.hoverTile.setTexture("editorTiles", portal - 1);
        this.hoverTile.setDisplaySize(this.cellsize, this.cellsize);
        this.hoverTile.setPosition(this.hoverCell.x, this.hoverCell.y);
        this.hoverTile.setDepth(this.profundidadFila(this.mouseY, 8));
        this.hoverTile.setVisible(true);
      }

      const indiceRelieve = this.obtenerRelieve(portal);

      if (indiceRelieve !== -1) {
        const imagenRelieve = this.add.image(
          this.hoverCell.x,
          this.hoverCell.y - this.cellsize,
          "editorTiles",
          indiceRelieve - 1
        );

        imagenRelieve.setDisplaySize(
          this.cellsize,
          this.cellsize
        );

        imagenRelieve.setAlpha(0.6);
        imagenRelieve.setDepth(
          this.profundidadFila(this.mouseY, 9)
        );

        this.hoverGrupo.push(imagenRelieve);
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

    let forma = this.formasPared[this.herramienta - 200];

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
    }

    if (entra === false) {
      this.hoverCell.setFillStyle(0xff0000, 0.6);
    }

    for (let i = 0; i < forma.length; i++) {
      const x = this.mouseX + forma[i][0];
      const y = this.mouseY + forma[i][1];

      if (
        x < 0 ||
        y < 0 ||
        x >= this.columns ||
        y >= this.rows
      ) {
        continue;
      }

      if (entra) {
        this.ocultarGrupo(x, y);
      }

      const px =
        this.board_offset_x + (x + 0.5) * this.cellsize;

      const py =
        this.board_offset_y + (y + 0.5) * this.cellsize;

      const imagen = this.add.image(
        px,
        py,
        "editorTiles",
        forma[i][2] - 1
      );

      imagen.setDisplaySize(this.cellsize, this.cellsize);
      imagen.setAlpha(0.6);
      imagen.setDepth(this.profundidadFila(y, 8));

      if (entra === false) {
        imagen.setTint(0xff0000);
      }

      this.hoverGrupo.push(imagen);

      const indiceRelieve = this.obtenerRelieve(forma[i][2]);

      if (indiceRelieve !== -1) {
        const imagenRelieve = this.add.image(
          px,
          py - this.cellsize,
          "editorTiles",
          indiceRelieve - 1
        );

        imagenRelieve.setDisplaySize(
          this.cellsize,
          this.cellsize
        );

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

  private borrarPortalEn(
    columna: number,
    fila: number
  ): void {
    const portal = this.mapa.getTileAt(
      columna,
      fila,
      false,
      this.capaPortales
    );

    if (portal === null) {
      return;
    }

    this.mapa.removeTileAt(
      columna,
      fila,
      true,
      true,
      this.capaPortales
    );

    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];

      if (
        (link[0] === columna && link[1] === fila) ||
        (link[2] === columna && link[3] === fila)
      ) {
        this.links.splice(i, 1);
      }
    }

    this.dibujarLinks();
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
          this.mapa.putTileAt(
            this.tileInvisible,
            columna,
            fila,
            true,
            this.tablero
          );
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

    let forma = this.formasPared[tile - 200];

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
    const yFinal = centroY - 64;

    let y = yFinal - (variantes.length - 1) * separacion;

    const alto =
      tamaño + (variantes.length - 1) * separacion;

    const fondo = this.add.rectangle(
      centroX,
      (y + yFinal) / 2,
      tamaño + margen * 2,
      alto + margen * 2,
      0x302641
    );

    fondo.setStrokeStyle(4, 0x8573a6);
    fondo.setDepth(19);
    fondo.setInteractive();

    this.configurarZonaHotbar(fondo);
    this.objetosSubHotbar.push(fondo);

    for (let i = 0; i < variantes.length; i++) {
      const variante = variantes[i];

      const casilla = this.add.rectangle(
        centroX,
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

      this.crearIconoSubHotbar(variante, centroX, y);
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
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();

        this.actualizarInterfaz();
        this.actualizarHotbar();
        this.actualizarHoverTile();
      });

      this.objetosSubHotbar.push(casilla);

      y += separacion;
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
      this.cellsize / imagen.width,
      this.cellsize / imagen.height
    );

    imagen.setScale(escala);
  }

  private obtenerNombreTile(tile: number): string {
    if (tile >= 3 && tile <= 6) {
      return "Espejo";
    }
    if (tile >= 11 && tile <= 14) {
      return "Emisor";
    }
    if (tile >= 27 && tile <= 30) {
      return "Receptor";
    }
    if (tile === 37) {
      return "Caja";
    }
    if (tile === 39) {
      return "Pared";
    }
    if (tile === 41) {
      return "Maquinaria simple";
    }
    if (tile === 200) {
      return "Maquinaria doble";
    }
    if (tile === 201) {
      return "Maquinaria triple";
    }
    if (tile === this.tileJugador) {
      return "Jugador";
    }
    if (tile === this.tileBandera) {
      return "Salida";
    }
    return "Tile desconocido";
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

      if (variantes !== null && variantes.length > 1) {
        nombre += " (" + (variantes.indexOf(tile) + 1) + "/" + variantes.length + ")";

        if (mostrarAyudaVariantes) {
          nombre += "\nClic derecho para ver variantes";
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
    const margen = 16;
    let altoRelieve = 0;

    for (let i = 0; i < this.relieves.length; i++) {
      const frame = this.relieves[i][1] - 1;
      let primeraFila = this.tileGraphicSize;

      for (let y = 0; y < this.tileGraphicSize; y++) {
        for (let x = 0; x < this.tileGraphicSize; x++) {
          const alpha = this.textures.getPixelAlpha(x, y, "editorTiles", frame);

          if (alpha > 0) {
            primeraFila = y;
            break;
          }
        }

        if (primeraFila < this.tileGraphicSize) {
          break;
        }
      }

      altoRelieve = Math.max(
        altoRelieve,
        (this.tileGraphicSize - primeraFila) * this.tileScale
      );
    }

    const arriba = this.board_offset_y - altoRelieve - margen;
    const abajo = this.board_offset_y + this.board_height + margen;

    const fondo = this.add.rectangle(
      this.board_offset_x + this.board_width / 2,
      (arriba + abajo) / 2,
      this.board_width + margen * 2,
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

    if (casilla === this.casillaGoma) {
      let color = 0xcbdbfc;

      if (seleccionada) {
        color = 0xffd166;
      }

      if (hover) {
        if (seleccionada) {
          color = 0xd9ad4f;
        } else {
          color = 0x95add6;
        }
      }

      casilla.setFillStyle(color);
      return;
    }

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

    const margen = 24;
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

  borrarGrupoEn(x = 0, y = 0) {
    const casillas = this.grupoEn(x, y);

    for (let i = 0; i < casillas.length; i++) {
      const columna = casillas[i][0];
      const fila = casillas[i][1];

      this.tablero.putTileAt(
        this.tileInvisible,
        columna,
        fila
      );

      this.borrarPortalEn(columna, fila);
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

        if (indice === -1) {
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

  private actualizarProfundidad(): void {
    this.actualizarCapaProfundidad(
      this.tablero,
      0,
      1
    );

    this.actualizarCapaProfundidad(
      this.capaRelieve,
      1,
      1
    );

    this.actualizarCapaProfundidad(
      this.capaPortales,
      2,
      1
    );

    this.actualizarCapaProfundidad(
      this.capaRelievePortales,
      3,
      1
    );

    this.actualizarCapaProfundidad(
      this.capaVistaPegado,
      4,
      0.6
    );

    this.actualizarCapaProfundidad(
      this.capaRelievePegado,
      5,
      0.6
    );

    this.actualizarCapaProfundidad(
      this.capaVistaPortalesPegado,
      6,
      0.6
    );

    this.actualizarCapaProfundidad(
      this.capaRelievePortalesPegado,
      7,
      0.6
    );
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

          if (
            (link[0] === x && link[1] === y) ||
            (link[2] === x && link[3] === y)
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

    const nivelTest = convertirNivel(nivel);

    this.scene.launch("game", {
      modoTest: true,
      nivelTest: nivelTest,
      nivelId: this.nivelId,
      escenaAnterior: this.sys.settings.key,
      testeando: true
    });

    this.scene.sleep();
  }


  private actualizarParedesConexas(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
      const tile = this.tablero.getTileAt(x, y);
      if (tile === null) {
        continue;
      }
      if (tile.index !== 39 && tile.index !== 64) {
        continue;
      }
      if (y > 0) {
        const arriba = this.tablero.getTileAt(x, y - 1);
        if (arriba !== null && arriba.index === 39 || arriba.index === 64) {
          this.tablero.putTileAt(64, x, y);
        } else {
          this.tablero.putTileAt(39, x, y);
        }
      } else {
        this.tablero.putTileAt(39, x, y);
  }}}}


}