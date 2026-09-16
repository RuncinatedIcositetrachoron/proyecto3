import Phaser from "phaser";

interface EstadoEditor {
  tablero: number[][];
  portales: number[][];
  links: number[][];
}

import {obtenerNivel, actualizarNivel, crearBoton} from "./niveles";

export class EditorScene extends Phaser.Scene {
  init(data: { nivelId?: string }): void {
    if (data.nivelId !== undefined) {
      this.nivelId = data.nivelId;
    } else {
      this.nivelId = null;
    }
  }

  constructor() {
        super("editor");
    }

    private nivelId: string | null = null;

    //TABLERO FISICO

    private columns: number = 16;
    private rows: number = 10;
    private cellsize: number = 32;
    private board_offset_x: number = 32;
    private board_offset_y: number = 32;
    private board_width: number = this.columns * this.cellsize;
    private board_height: number = this.rows * this.cellsize;

    //ARRASTRE

    private arrastrandoSeleccion: boolean = false;
    private posibleArrastreSeleccion: boolean = false;
    private arrastreInicioX: number = -1;
    private arrastreInicioY: number = -1;

    //VALORES DEFAULT

    private tileInvisible: number = 1;
    private sinHerramienta: number = -1;
    private selectTool: number  = 100;
    private pasteTool: number = 101;
    private linkTool: number = 103;
    private tilesSinPortal: number[] = [2, 5, 6, 7, 8];

    //LINKS

    private links: number[][] = [];
    private linkInicioX: number = -1;
    private linkInicioY: number = -1;
    private graficosLinks!: Phaser.GameObjects.Graphics;
    private graficosLinkTemporal!: Phaser.GameObjects.Graphics;
    private botonLink!: Phaser.GameObjects.Rectangle;
    
    private ultimoClickLinkX: number = -1;
    private ultimoClickLinkY: number = -1;
    private tiempoUltimoClickLink: number = 0;

    //PORTALES

    private portalTool: number = 102;
    private portalArriba: number = 25;
    private portalDerecha: number = 26;
    private portalIzquierda: number = 27;
    private portalAbajo: number = 28;

    //UNDO Y REDO

    private undoHistory: EstadoEditor[] = [];
    private redoHistory: EstadoEditor[] = [];
    private lastState: EstadoEditor = {
      tablero: [],
      portales: [],
      links: [],
    };
    //INTERFAZ

    private botonSeleccionar!: Phaser.GameObjects.Rectangle;
    private botonPegar!: Phaser.GameObjects.Rectangle;
    private botonBorrar!: Phaser.GameObjects.Rectangle;
    private botonDeseleccionar!: Phaser.GameObjects.Rectangle;
    private botonCopiar!: Phaser.GameObjects.Rectangle;
    private botonRedo!: Phaser.GameObjects.Rectangle;
    private botonUndo!: Phaser.GameObjects.Rectangle;
    private botonPortal!: Phaser.GameObjects.Rectangle;

    private tilesHotbar: number[] = [2, 3, 4, 5, 6, 7, 8];
    private casillasHotbar: Phaser.GameObjects.Rectangle[] = [];
    private casillaGoma!: Phaser.GameObjects.Rectangle;

    //COPIAR Y PEGAR

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

    private haySeleccion: boolean = false;
    private seleccionando: boolean = false;
    private seleccionInicioX: number = -1;
    private seleccionInicioY: number = -1;
    private rectanguloSeleccion!: Phaser.GameObjects.Rectangle;

    private seleccionIzquierda: number = -1;
    private seleccionDerecha: number = -1;
    private seleccionArriba: number = -1;
    private seleccionAbajo: number = -1;

    //LAYERS DEL TILEMAP

    private mapa!: Phaser.Tilemaps.Tilemap;
    private tablero!: Phaser.Tilemaps.TilemapLayer;
    private capaPortales!: Phaser.Tilemaps.TilemapLayer;
    private capaVistaPegado!: Phaser.Tilemaps.TilemapLayer;
    private capaVistaPortalesPegado!: Phaser.Tilemaps.TilemapLayer;

    private herramienta: number = 1;

    preload(): void {
      this.load.spritesheet("editorTiles", "assets/placeholders.png", {
        frameWidth: this.cellsize,
        frameHeight: this.cellsize,
      });
    }

    create(): void {
        const boardCenterX = this.board_offset_x + this.board_width / 2;
        const boardCenterY = this.board_offset_y + this.board_height / 2;
        this.add.grid(
          boardCenterX,
          boardCenterY,
          this.board_width,
          this.board_height,
          this.cellsize,
          this.cellsize,
          0x00ff00,
          1,
          0xff0000,
          1,
        );
        this.hoverCell = this.add
          .rectangle(
            this.board_offset_x + this.cellsize / 2,
            this.board_offset_y + this.cellsize / 2,
            this.cellsize - 1,
            this.cellsize - 1,
            0x0000ff,
            0.5,
          )
          .setVisible(false);
      
    this.hoverTile = this.add.image(0, 0, "editorTiles", 0)
    .setDisplaySize(this.cellsize, this.cellsize)
    .setAlpha(0.4)
    .setDepth(5)
    .setVisible(false);
    this.hoverCell.setDepth(6);
          
          crearBoton(
            this,
            100,
            500,
            100,
            "Guardar",
            () => {
              this.guardarNivelActual();
            });

            crearBoton(
              this,
              100,
              550,
              100,
              "Volver",
              () => {
                this.scene.start("LevelsScene");
              });

        //EVENTOS DEL MOUSE

        this.input.on("pointermove", (mouse: Phaser.Input.Pointer) => {
          this.updateHoveredCell(mouse.worldX, mouse.worldY);
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

          if (this.herramienta === this.pasteTool || this.arrastrandoSeleccion) {
            this.actualizarVistaPegado();
          }

          if (mouse.leftButtonDown()) {
            this.usarHerramienta();
          }

          if (this.herramienta === this.selectTool && this.seleccionando) {
            this.actualizarSeleccion();
            return;
          }
        });

        this.input.on("pointerup", (mouse: Phaser.Input.Pointer) => {
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
              const inicioX = this.mouseX - Math.floor((anchoSeleccion - 1) / 2);
              const inicioY = this.mouseY - Math.floor((altoSeleccion - 1) / 2);
              this.borrarSeleccion();
              this.pegarSeleccion();        
              this.ubicarSeleccion(
                inicioX,
                inicioY,
                anchoSeleccion,
                altoSeleccion,
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
            this.haySeleccion = true;
            this.seleccionando = false;
            this.actualizarInterfaz();
          }
        });

          //CREADO DEL TILEMAP

          this.mapa = this.make.tilemap({
            width: this.columns,
            height: this.rows,
            tileWidth: this.cellsize,
            tileHeight: this.cellsize,
          });

          //CREADO DEL TILESET

          const conjuntoTiles = this.mapa.addTilesetImage(
            "gameTiles",
            "editorTiles",
            this.cellsize,
            this.cellsize,
            0,
            0,
            1
            );

            if (conjuntoTiles === null) {
             return;
            }


            //CREADO DE CAPAS

            const capaCreada = this.mapa.createBlankLayer(
              "objetos",
              conjuntoTiles,
              this.board_offset_x,
              this.board_offset_y,
            );
            
            if (capaCreada === null) {
             return;
            }
            
            this.tablero = capaCreada;

            //CAPA DE PORTALES

            const capaPortalesCreada = this.mapa.createBlankLayer(
              "portales",
              conjuntoTiles,
              this.board_offset_x,
              this.board_offset_y,
            );
            
            if (capaPortalesCreada === null) {
              return;
            }
            
            this.capaPortales = capaPortalesCreada;

            const capaVistaPegadoCreada = this.mapa.createBlankLayer(
              "vistaTilesPegado",
              conjuntoTiles,
              this.board_offset_x,
              this.board_offset_y,
            );
            
            if (capaVistaPegadoCreada === null) {
              return;
            }
            
            this.capaVistaPegado = capaVistaPegadoCreada;
            this.capaVistaPegado.setAlpha(0.4);
            this.capaVistaPegado.setVisible(false);

            const capaVistaPortalesPegadoCreada = this.mapa.createBlankLayer(
              "vistaPortalesPegado",
              conjuntoTiles,
              this.board_offset_x,
              this.board_offset_y,
            );
          if (capaVistaPortalesPegadoCreada === null) {
            return;
          }

          this.capaVistaPortalesPegado = capaVistaPortalesPegadoCreada;
          this.capaVistaPortalesPegado.setAlpha(0.4);
          this.capaVistaPortalesPegado.setVisible(false);

          this.graficosLinks = this.add.graphics();
          this.graficosLinks.setDepth(7);

          this.graficosLinkTemporal = this.add.graphics();
          this.graficosLinkTemporal.setDepth(8);

          this.restaurarTilesVistaPegado(); 

            //RELLENADO INICIAL DEL TABLERO

            for (let fila = 0; fila < this.rows; fila++) {
              for (let columna = 0; columna < this.columns; columna++) {
                this.mapa.putTileAt(
                  this.tileInvisible,
                  columna,
                  fila,
                  true,
                  this.tablero,
                );
              }
            }
            
            //CARGADO DE NIVEL

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
                      link[3],
                    ]);
                  }
                }
                this.eliminarPortalesSinLink();
                this.actualizarLinks();
              }
            }
            
            this.tablero.setDepth(1);
            this.capaPortales.setDepth(2);
            this.capaVistaPegado.setDepth(3);
            this.capaVistaPortalesPegado.setDepth(4);

            //EVENTOS DE CLICK

            this.input.on("pointerdown", (mouse: Phaser.Input.Pointer) => {
              if (mouse.button !== 0) {
                return;
              }
              this.updateHoveredCell(
                mouse.worldX,
                mouse.worldY,
              );
              if (this.mouseX === -1 || this.mouseY === -1) {
                return;
              }
              
              if (this.herramienta === this.linkTool) {
                this.quitarSeleccion();
                if (this.esDobleClickLink()) {
                  this.cancelarLinkTemporal();
                  const indiceLink = this.buscarLinkDePortal(
                    this.mouseX,
                    this.mouseY,
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
              if (this.mouseX === -1 || this.mouseY === -1) return;
              if (this.herramienta === this.selectTool && this.mouseDentroSeleccion()) {
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
              0xff5a00,
              0.5,
            )     
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x3399ff, 1)
            .setDepth(6)
            .setVisible(false);

        //EVENTOS DE TECLADO

        this.input.keyboard?.on("keydown", (evento: KeyboardEvent) => {
          const tecla = evento.key.toLowerCase();
          const control = evento.ctrlKey || evento.metaKey;

          if (control && tecla === "c") {
            evento.preventDefault();
            if (this.haySeleccion) this.copiarSeleccion();
          }
          if (control && tecla === "v") {
            evento.preventDefault();
            if (this.seleccionCopiada.length === 0) return;
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
            if (this.herramienta === this.selectTool) this.herramienta = this.sinHerramienta;
            else {
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
            if (!this.haySeleccion) return;
            this.borrarSeleccion();
            this.saveIfChanged();
          }

          if (tecla === "escape") {
            if (this.haySeleccion) this.quitarSeleccion();
          }

          if (tecla === "l") {
            this.herramienta = this.linkTool;
          }

          if (tecla === "p") {
            this.herramienta = this.portalTool;
          }

          if (control && tecla === "z" && !evento.shiftKey) {
            evento.preventDefault();
            this.undo();
          }

          if ((control && tecla === "y") || (control && evento.shiftKey && tecla === "z")) {
            evento.preventDefault();
            this.redo();
          }

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

            this.crearInterfaz();
            this.crearHotbar();
          
            this.herramienta = this.sinHerramienta;
            this.actualizarInterfaz();
            this.actualizarHotbar();

            this.lastState = this.getEditorState();
      }
      private updateHoveredCell(pointerX: number, pointerY: number): void {
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
          this.hoverCell.setVisible(false);
          return;
        }
        this.mouseX = Math.floor(localX / this.cellsize);
        this.mouseY = Math.floor(localY / this.cellsize);
        const cell_center_x = this.board_offset_x + this.mouseX * this.cellsize + this.cellsize / 2;
        const cell_center_y = this.board_offset_y + this.mouseY * this.cellsize + this.cellsize / 2;
        this.hoverCell.setPosition(cell_center_x, cell_center_y);
        this.hoverCell.setVisible(true);
        this.actualizarHoverTile();

    }
      private usarHerramienta(): void {
        if (this.mouseX === -1 || this.mouseY === -1 || this.herramienta === this.selectTool || this.herramienta === this.pasteTool || this.herramienta === this.sinHerramienta || this.herramienta === this.portalTool || this.herramienta === this.linkTool) {
          return;
         }

        if (this.herramienta === 0) {
          this.mapa.putTileAt(
            this.tileInvisible,
            this.mouseX,
            this.mouseY,
            true,
            this.tablero,
          );
          this.mapa.removeTileAt(
            this.mouseX,
            this.mouseY,
            true,
            true,
            this.capaPortales,
          );
        }else{
          this.mapa.putTileAt(
            this.herramienta,
            this.mouseX,
            this.mouseY,
            true,
            this.tablero,
         )};
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
    
    private actualizarSeleccion(): void {
        if (this.mouseX === -1 || this.mouseY === -1) {
            return;
        }
    
        const columnaIzquierda = Math.min(
            this.seleccionInicioX,
            this.mouseX,
        );
    
        const columnaDerecha = Math.max(
            this.seleccionInicioX,
            this.mouseX,
        );
    
        const filaSuperior = Math.min(
            this.seleccionInicioY,
            this.mouseY,
        );
    
        const filaInferior = Math.max(
            this.seleccionInicioY,
            this.mouseY,
        );
    
        const posicionX =
            this.board_offset_x +
            columnaIzquierda * this.cellsize;
    
        const posicionY =
            this.board_offset_y +
            filaSuperior * this.cellsize;
    
        const ancho =
            (columnaDerecha - columnaIzquierda + 1) *
            this.cellsize;
    
        const alto =
            (filaInferior - filaSuperior + 1) *
            this.cellsize;
    
        this.rectanguloSeleccion
            .setPosition(posicionX, posicionY)
            .setSize(ancho, alto);

        this.seleccionIzquierda = columnaIzquierda;
        this.seleccionDerecha = columnaDerecha;
        this.seleccionArriba = filaSuperior;
        this.seleccionAbajo = filaInferior;
      }
      
      private borrarSeleccion(quitar: boolean = true): void {
        if (this.seleccionIzquierda === -1 || this.seleccionDerecha === -1 || this.seleccionAbajo === -1 || this.seleccionArriba === -1) {
            return;
        }
        for (let fila = this.seleccionArriba; fila <= this.seleccionAbajo; fila++) {
          for (let columna = this.seleccionIzquierda; columna <= this.seleccionDerecha; columna++) {
            this.mapa.putTileAt(
              this.tileInvisible,
              columna,
              fila,
              true,
              this.tablero,
            );
            this.mapa.removeTileAt(
              columna,
              fila,
              true,
              true,
              this.capaPortales,
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
      
      private pegarSeleccion(): void {
        if ((this.herramienta !== this.pasteTool && !this.arrastrandoSeleccion) || this.seleccionCopiada.length === 0 || this.mouseX === -1 || this.mouseY === -1) {
          return;
        }
        const altoSeleccion = this.seleccionCopiada.length;
        const anchoSeleccion = this.seleccionCopiada[0].length;
        const inicioX = this.mouseX - Math.floor((anchoSeleccion - 1) / 2);
        const inicioY = this.mouseY - Math.floor((altoSeleccion - 1) / 2);
        if (inicioX < 0 || inicioY < 0 || inicioX + anchoSeleccion > this.columns || inicioY + altoSeleccion > this.rows) {
          return;
        }
        for (let fila = 0; fila < this.seleccionCopiada.length; fila++) {
          for (let columna = 0; columna < this.seleccionCopiada[fila].length; columna++) {
            const tileEncontrada = this.seleccionCopiada[fila][columna];
            this.mapa.putTileAt(
              tileEncontrada,
              inicioX + columna,
              inicioY + fila,
              true,
              this.tablero,
            );
            const portalEncontrado = this.portalesCopiados[fila][columna];
            if (portalEncontrado === -1) {
              this.mapa.removeTileAt(inicioX + columna, inicioY + fila, true, true, this.capaPortales);
            } else {
              this.mapa.putTileAt(portalEncontrado, inicioX + columna, inicioY + fila, true, this.capaPortales);
            }
          }
        }
      }
    
    private actualizarVistaPegado(): void {
      if ((!this.arrastrandoSeleccion && this.herramienta !== this.pasteTool) || this.seleccionCopiada.length === 0 || this.mouseX === -1 || this.mouseY === -1) {
        this.vistaPegado.setVisible(false);
        this.capaVistaPegado.setVisible(false);
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();
        return;
      }
      const altoSeleccion = this.seleccionCopiada.length;
      const anchoSeleccion = this.seleccionCopiada[0].length;

      const inicioX = this.mouseX - Math.floor((anchoSeleccion - 1) / 2);
      const inicioY = this.mouseY - Math.floor((altoSeleccion - 1) / 2);
      
      this.ocultarTilesDebajoVistaPegado(inicioX, inicioY);
      this.actualizarTilesVistaPegado(inicioX, inicioY);

      const posicionX = this.board_offset_x + inicioX * this.cellsize;
      const posicionY = this.board_offset_y + inicioY * this.cellsize;
      this.vistaPegado.setPosition(posicionX, posicionY);

      const entraEnTablero = inicioX + anchoSeleccion <= this.columns &&  inicioY + altoSeleccion <= this.rows && inicioX >= 0 && inicioY >= 0;
      const izquierdaVisible = Math.max(inicioX, 0);
      const arribaVisible = Math.max(inicioY, 0);
      const derechaVisible = Math.min(inicioX + anchoSeleccion, this.columns);
      const abajoVisible = Math.min(inicioY + altoSeleccion, this.rows);
      const anchoVisible = derechaVisible - izquierdaVisible;
      const altoVisible = abajoVisible - arribaVisible;
      if (anchoVisible <= 0 || altoVisible <= 0) {
          this.vistaPegado.setVisible(false);
          this.capaVistaPegado.setVisible(false);
          this.capaVistaPortalesPegado.setVisible(false);
          this.restaurarTilesVistaPegado();
          return;
      }
      const posX = this.board_offset_x + izquierdaVisible * this.cellsize;
      const posY = this.board_offset_y + arribaVisible * this.cellsize;
      this.vistaPegado.setPosition(posX, posY);
      this.vistaPegado.setSize(anchoVisible * this.cellsize, altoVisible * this.cellsize);
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
      alto: number,
    ): void {
      this.seleccionando = false;
      this.seleccionInicioX = inicioX;
      this.seleccionInicioY = inicioY;

      this.seleccionIzquierda = inicioX;
      this.seleccionDerecha = inicioX + ancho - 1;
      this.seleccionArriba = inicioY;
      this.seleccionAbajo = inicioY + alto - 1;

      this.rectanguloSeleccion
        .setPosition(
          this.board_offset_x + inicioX * this.cellsize,
          this.board_offset_y + inicioY * this.cellsize,
        )
        .setSize(
          ancho * this.cellsize,
          alto * this.cellsize,
        )
        .setVisible(true);
        this.haySeleccion = true;
        this.actualizarInterfaz();
    }

  private puedePegarSeleccion(): boolean {
    if (this.seleccionCopiada.length === 0 || this.mouseX === -1 || this.mouseY === -1) {
        return false;
    }
    const altoSeleccion = this.seleccionCopiada.length;
    const anchoSeleccion = this.seleccionCopiada[0].length;
    const inicioX = this.mouseX - Math.floor((anchoSeleccion - 1) / 2);
    const inicioY = this.mouseY - Math.floor((altoSeleccion - 1) / 2);
    return (inicioX >= 0 && inicioY >= 0 && inicioX + anchoSeleccion <= this.columns && inicioY + altoSeleccion <= this.rows
    );
  }

  private getBoardState(): number[][] {
    const state: number[][] = [];
    for (let row = 0; row < this.rows; row++) {
      const savedRow: number[] = [];
      for (let column = 0; column < this.columns;column++) {
        const tile = this.mapa.getTileAt(
          column,
          row,
          false,
          this.tablero,
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
        this.tablero.putTileAt(
          tileIndex,
          column,
          row,
          true,
        );
      }
    }
  }

  private statesAreEqual(firstState: EstadoEditor, secondState: EstadoEditor): boolean {
    return (
      this.matricesAreEqual(firstState.tablero, secondState.tablero) &&
      this.matricesAreEqual(firstState.portales, secondState.portales) &&
      this.matricesAreEqual(firstState.links, secondState.links)
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
  if (this.seleccionIzquierda === -1 || this.seleccionDerecha === -1 || this.seleccionArriba === -1 || this.seleccionAbajo === -1) {
    return [];
  }
  const contenido: number[][] = [];
  for (let fila = this.seleccionArriba; fila <= this.seleccionAbajo; fila++) {
    const filaCopiada: number[] = [];
    for (let columna = this.seleccionIzquierda; columna <= this.seleccionDerecha; columna++) {
      const tileEncontrada = this.mapa.getTileAt(
        columna,
        fila,
        true,
        this.tablero,
      );
      filaCopiada.push(tileEncontrada.index);
    }
    contenido.push(filaCopiada);
  }
  return contenido;
}

update(): void {
  this.actualizarLinks();
  if (this.herramienta !== this.selectTool && this.rectanguloSeleccion.visible) {
    this.quitarSeleccion();
  }
  if (this.herramienta !== this.pasteTool && !this.arrastrandoSeleccion && this.vistaPegado.visible) {
    this.vistaPegado.setVisible(false);
    this.capaVistaPegado.setVisible(false);
    this.capaVistaPortalesPegado.setVisible(false);
    this.restaurarTilesVistaPegado();
  }
}

private guardarNivelActual(): void {
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
}

//INTERFAZ

private actualizarInterfaz(): void {
  if (this.herramienta === this.selectTool){
    this.botonSeleccionar.setFillStyle(0x6666aa);
  } else {
    this.botonSeleccionar.setFillStyle(0x333333);
  }

  if (this.seleccionCopiada.length === 0 || this.arrastrandoSeleccion) {
      this.botonPegar.disableInteractive();
      this.botonPegar.setFillStyle(0x777777);
      this.botonPegar.setAlpha(0.5);
  } else {
      this.botonPegar.setInteractive({ useHandCursor: true });
      this.botonPegar.setAlpha(1);
      if (this.herramienta === this.pasteTool) {
        this.botonPegar.setFillStyle(0x6666aa);
      } else {
        this.botonPegar.setFillStyle(0x333333);
      }
  }

  if (this.haySeleccion) {
      this.botonBorrar.setInteractive({ useHandCursor: true });
      this.botonDeseleccionar.setInteractive({ useHandCursor: true });
      this.botonCopiar.setInteractive({ useHandCursor: true });
      this.botonBorrar.setFillStyle(0x333333);
      this.botonDeseleccionar.setFillStyle(0x333333);
      this.botonCopiar.setFillStyle(0x333333);
      this.botonBorrar.setAlpha(1);
      this.botonDeseleccionar.setAlpha(1);
      this.botonCopiar.setAlpha(1);
  } else {
      this.botonBorrar.disableInteractive();
      this.botonDeseleccionar.disableInteractive();
      this.botonCopiar.disableInteractive();
      this.botonBorrar.setFillStyle(0x777777);
      this.botonDeseleccionar.setFillStyle(0x777777);
      this.botonCopiar.setFillStyle(0x777777);
      this.botonBorrar.setAlpha(0.5);
      this.botonDeseleccionar.setAlpha(0.5);
      this.botonCopiar.setAlpha(0.5);
  }
  if (this.undoHistory.length === 0) {
    this.botonUndo.disableInteractive();
    this.botonUndo.setFillStyle(0x777777);
    this.botonUndo.setAlpha(0.5);
  } else {
    this.botonUndo.setInteractive({ useHandCursor: true });
    this.botonUndo.setFillStyle(0x333333);
    this.botonUndo.setAlpha(1);
  }
  if (this.redoHistory.length === 0) {
    this.botonRedo.disableInteractive();
    this.botonRedo.setFillStyle(0x777777);
    this.botonRedo.setAlpha(0.5);
  } else {
    this.botonRedo.setInteractive({ useHandCursor: true });
    this.botonRedo.setFillStyle(0x333333);
    this.botonRedo.setAlpha(1);
  }
  if (this.herramienta === this.linkTool) {
    this.botonLink.setFillStyle(0x6666aa);
  } else {
    this.botonLink.setFillStyle(0x333333);
  }
  if (this.herramienta === this.portalTool) {
    this.botonPortal.setFillStyle(0x6666aa);
  } else {
    this.botonPortal.setFillStyle(0x333333);
  }
}

private crearInterfaz(): void {
  let y = 60;
  const x = 600;
  const separacion = 60;
this.botonSeleccionar = crearBoton(this, x, y, 100, "Seleccionar", () => {
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
});

y += separacion;

this.botonPortal = crearBoton(this, x, y, 100, "Portal", () => {
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
});

y += separacion;

this.botonLink = crearBoton(this, x, y, 100, "Link", () => {
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
});

  y += separacion;
  this.botonCopiar = crearBoton(this, x, y, 100, "Copiar", () => {
      this.copiarSeleccion();
      this.actualizarInterfaz();
  });
  y += separacion;
this.botonPegar = crearBoton(this, x, y, 100, "Pegar", () => {
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
});
  y += separacion;
  this.botonBorrar = crearBoton(this, x, y, 100, "Borrar", () => {
      this.borrarSeleccion();
      this.quitarSeleccion();
      this.actualizarInterfaz();
  });
  y += separacion;
  this.botonDeseleccionar = crearBoton(this, x, y, 100, "Deseleccionar", () => {
      this.quitarSeleccion();
      this.actualizarInterfaz();
  });
  y += separacion;
  this.botonUndo = crearBoton(this, x, y, 100, "Undo", () => this.undo());
  y += separacion;
  this.botonRedo = crearBoton(this, x, y, 100, "Redo", () => this.redo());
  this.actualizarInterfaz();
}

//HOTBAR

private crearHotbar(): void {
  this.casillasHotbar = [];
  const y = 390;
  const tamaño = 42;
  const separacion = 48;
  let x = 55;

  for (let i = 0; i < this.tilesHotbar.length; i++) {
    const tile = this.tilesHotbar[i];
    const casilla = this.add.rectangle(x, y, tamaño, tamaño, 0x333333);
    casilla.setStrokeStyle(2, 0xffffff)
    casilla.setInteractive({ useHandCursor: true });
    casilla.on("pointerdown", () => {
      if (this.herramienta === tile) {
        this.herramienta = this.sinHerramienta;
      } else {
        this.herramienta = tile;
        this.vistaPegado.setVisible(false);
        this.capaVistaPegado.setVisible(false);
        this.capaVistaPortalesPegado.setVisible(false);
        this.restaurarTilesVistaPegado();
      }
      this.actualizarInterfaz();
      this.actualizarHotbar();
    });
    this.add.image(x, y, "editorTiles", tile - 1);
    this.casillasHotbar.push(casilla);
    x += separacion;
  }
  x+= separacion;
  this.casillaGoma = crearBoton(this, x, y, 70, "Goma", () => {
    if (this.herramienta === 0) {
      this.herramienta = this.sinHerramienta;
    } else {
      this.herramienta = 0;
      this.vistaPegado.setVisible(false);
      this.capaVistaPegado.setVisible(false);
      this.capaVistaPortalesPegado.setVisible(false);
      this.restaurarTilesVistaPegado();
    }
    this.actualizarInterfaz();
    this.actualizarHotbar();
    }
  );
}

private actualizarHotbar(): void {
  for (let i = 0; i < this.casillasHotbar.length; i++) {
    if (this.herramienta === this.tilesHotbar[i]) {
      this.casillasHotbar[i].setFillStyle(0x6666aa);
    } else {
      this.casillasHotbar[i].setFillStyle(0x333333);
    }
  }

  if (this.herramienta === 0) {
    this.casillaGoma.setFillStyle(0x6666aa);
  } else {
    this.casillaGoma.setFillStyle(0x333333);
  }
}


//FUNCIONES DE COLOCADO DE PORTALES

private obtenerPortal(pointerX: number, pointerY: number): number {
  const izquierda = this.board_offset_x + this.mouseX * this.cellsize;
  const arriba = this.board_offset_y + this.mouseY * this.cellsize;

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
    distanciaIzquierda,
  );

  if (menor === distanciaArriba) return this.portalArriba;
  if (menor === distanciaDerecha) return this.portalDerecha;
  if (menor === distanciaAbajo) return this.portalAbajo;

  return this.portalIzquierda;
}

private usarPortal(pointerX: number, pointerY: number): void {
  if (this.mouseX === -1 || this.mouseY === -1) {
    return;
  }
  const portal = this.obtenerPortal(pointerX, pointerY);
  if (!this.puedeColocarPortal(this.mouseX, this.mouseY, portal)) {
    return;
  }
  const portalActual = this.mapa.getTileAt(
    this.mouseX,
    this.mouseY,
    false,
    this.capaPortales,
  );
  if (portalActual !== null && portalActual.index === portal) {
    this.mapa.removeTileAt(
      this.mouseX,
      this.mouseY,
      true,
      true,
      this.capaPortales,
    );
  } else {
    this.mapa.putTileAt(
      portal,
      this.mouseX,
      this.mouseY,
      true,
      this.capaPortales,
    );
  }
}
   

private puedeColocarPortal(columna: number, fila: number, portal: number): boolean {
  const tile = this.mapa.getTileAt(columna, fila, false, this.tablero);
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

//PORTALES CON HERRAMIENTAS

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

  for (let fila = this.seleccionArriba; fila <= this.seleccionAbajo; fila++) {
    const filaCopiada: number[] = [];

    for (let columna = this.seleccionIzquierda; columna <= this.seleccionDerecha; columna++) {
      const portal = this.mapa.getTileAt(
        columna,
        fila,
        false,
        this.capaPortales,
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

private actualizarTilesVistaPegado(inicioX: number, inicioY: number): void {
  this.capaVistaPegado.fill(-1);
  this.capaVistaPortalesPegado.fill(-1);
  for (let fila = 0; fila < this.seleccionCopiada.length; fila++) {
    for (let columna = 0; columna < this.seleccionCopiada[fila].length; columna++) {
      const x = inicioX + columna;
      const y = inicioY + fila;
      if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) {
        continue;
      }
      const tileEncontrada = this.seleccionCopiada[fila][columna];
      this.capaVistaPegado.putTileAt(tileEncontrada, x, y);
      const portalEncontrado = this.portalesCopiados[fila][columna];
      if (portalEncontrado !== -1) {
        this.capaVistaPortalesPegado.putTileAt(portalEncontrado, x, y);
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

private ocultarTilesDebajoVistaPegado(inicioX: number, inicioY: number): void {
  this.restaurarTilesVistaPegado();
  for (let fila = 0; fila < this.seleccionCopiada.length; fila++) {
    for (let columna = 0; columna < this.seleccionCopiada[fila].length; columna++) {
      const x = inicioX + columna;
      const y = inicioY + fila;
      if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) {
        continue;
      }
      const tile = this.mapa.getTileAt(x, y, false, this.tablero);
      if (tile !== null) {
        tile.visible = false;
        this.tilesOcultasVistaPegado.push(tile);
      }
      const portal = this.mapa.getTileAt(x, y, false, this.capaPortales);
      if (portal !== null) {
        portal.visible = false;
        this.portalesOcultosVistaPegado.push(portal);
      }
    }
  }
}

private getPortalState(): number[][] {
  const state: number[][] = [];
  for (let fila = 0; fila < this.rows; fila++) {
    const savedRow: number[] = [];
    for (let columna = 0; columna < this.columns; columna++) {
      const portal = this.mapa.getTileAt(columna, fila, false, this.capaPortales);
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
    links: this.copiarLinks(),
  };
}

private restorePortalState(state: number[][]): void {
  this.capaPortales.fill(-1);
  for (let fila = 0; fila < this.rows; fila++) {
    for (let columna = 0; columna < this.columns; columna++) {
      const portal = state[fila][columna];
      if (portal !== -1) {
        this.capaPortales.putTileAt(portal, columna, fila, true);
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
      link[3],
    ]);
  }
  this.actualizarLinks();
  this.dibujarLinks();
}


private matricesAreEqual(firstState: number[][], secondState: number[][]): boolean {
  if (firstState.length !== secondState.length) {
    return false;
  }
  for (let fila = 0; fila < firstState.length; fila++) {
    if (firstState[fila].length !== secondState[fila].length) {
      return false;
    }
    for (let columna = 0; columna < firstState[fila].length; columna++) {
      if (firstState[fila][columna] !== secondState[fila][columna]) {
        return false;
      }
    }
  }
  return true;
}

//links

private centroCasilla(columna: number, fila: number): {x: number, y: number} {
  return {
    x: this.board_offset_x + columna * this.cellsize + this.cellsize / 2,
    y: this.board_offset_y + fila * this.cellsize + this.cellsize / 2,
  };
}

private hayPortalEn(columna: number, fila: number): boolean {
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
    this.capaPortales,
  );
  return portal !== null;
}

private buscarLinkDePortal(columna: number, fila: number): number {
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
  y2: number,
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
  color: number,
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
      distancia,
    );
    graficos.lineBetween(
      x1 + direccionX * distanciaActual,
      y1 + direccionY * distanciaActual,
      x1 + direccionX * final,
      y1 + direccionY * final,
    );
  }
}

private dibujarLinks(): void {
  this.graficosLinks.clear();
  for (let i = 0; i < this.links.length; i++) {
    const link = this.links[i];
    const inicio = this.centroCasilla(
      link[0],
      link[1],
    );
    const final = this.centroCasilla(
      link[2],
      link[3],
    );
    this.dibujarLink(
      this.graficosLinks,
      inicio.x,
      inicio.y,
      final.x,
      final.y,
      0x3399ff,
    );
  }
}

private iniciarLink(mouse: Phaser.Input.Pointer): void {
  if (!this.hayPortalEn(this.mouseX, this.mouseY)) {
    return;
  }
  this.linkInicioX = this.mouseX;
  this.linkInicioY = this.mouseY;
  this.actualizarVistaLink()
}

private actualizarVistaLink(): void {
  this.graficosLinkTemporal.clear();
  if (
    this.linkInicioX === -1 ||
    this.linkInicioY === -1 ||
    this.mouseX === -1 ||
    this.mouseY === -1
  ) {
    return;
  }
  const inicio = this.centroCasilla(
    this.linkInicioX,
    this.linkInicioY,
  );
  const final = this.centroCasilla(
    this.mouseX,
    this.mouseY,
  );
  let color = 0xff0000;
  if (
    this.puedeCrearLink(
      this.linkInicioX,
      this.linkInicioY,
      this.mouseX,
      this.mouseY,
    )
  ) {
    color = 0x00ff00;
  }
  this.dibujarLink(
    this.graficosLinkTemporal,
    inicio.x,
    inicio.y,
    final.x,
    final.y,
    color,
  );
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
    this.mouseX !== -1 &&
    this.mouseY !== -1 &&
    this.puedeCrearLink(
      inicioX,
      inicioY,
      this.mouseX,
      this.mouseY,
    )
  ) {
    const linkInicio = this.buscarLinkDePortal(
      inicioX,
      inicioY,
    );
    const linkFinal = this.buscarLinkDePortal(
      this.mouseX,
      this.mouseY,
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
      this.mouseY,
    ]);
  } else {
    const linkExistente = this.buscarLinkDePortal(
      inicioX,
      inicioY,
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
      link[1],
    );

    const hayPortalFinal = this.hayPortalEn(
      link[2],
      link[3],
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
  color: number,
): void {
  this.dibujarLineaPunteada(
    graficos,
    x1,
    y1,
    x2,
    y2,
    color,
  );
  graficos.fillStyle(color, 1);
  graficos.fillCircle(x1, y1, 4);
  graficos.fillCircle(x2, y2, 4);
}

private copiarLinks(): number[][] {
  const copia: number[][] = [];
  for (let i = 0; i < this.links.length; i++) {
    const link = this.links[i];
    copia.push([
      link[0],
      link[1],
      link[2],
      link[3],
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
        this.capaPortales,
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
          this.capaPortales,
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

private actualizarHoverTile(): void {
  if (!this.hoverCell.visible || !this.tilesHotbar.includes(this.herramienta)) {
      this.hoverTile.setVisible(false);
      return;
  }
  this.hoverTile
      .setFrame(this.herramienta - 1)
      .setPosition(this.hoverCell.x, this.hoverCell.y)
      .setVisible(true);
}



}