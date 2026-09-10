import Phaser from "phaser";

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
        super("EditorScene");
    }

    private nivelId: string | null = null;

    private columns: number = 16;
    private rows: number = 10;
    private cellsize: number = 32;
    private board_offset_x: number = 32;
    private board_offset_y: number = 32;
    private board_width: number = this.columns * this.cellsize;
    private board_height: number = this.rows * this.cellsize;

    private arrastrandoSeleccion: boolean = false;
    private posibleArrastreSeleccion: boolean = false;
    private arrastreInicioX: number = -1;
    private arrastreInicioY: number = -1;

    private tileInvisible: number = 1;

    private undoHistory: number[][][] = [];
    private redoHistory: number[][][] = [];
    private lastBoardState: number[][] = [];

    private selectTool: number  = 100;
    private pasteTool: number = 101;

    //INTERFAZ

    private botonSeleccionar!: Phaser.GameObjects.Rectangle;
    private botonPegar!: Phaser.GameObjects.Rectangle;
    private botonBorrar!: Phaser.GameObjects.Rectangle;
    private botonDeseleccionar!: Phaser.GameObjects.Rectangle;

    private seleccionCopiada: number[][] = [];
    private portapapelesArrastre: number[][] | null = null;
    private vistaPegado!: Phaser.GameObjects.Rectangle;
    
    private mouseX: number = -1;
    private mouseY: number = -1;
    private hoverCell!: Phaser.GameObjects.Rectangle;

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
    private herramienta: number = 1;

    preload(): void {
      this.load.image("editorTiles", "assets/placeholders.png");
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

        this.input.on("pointermove", (mouse: Phaser.Input.Pointer) => {
          this.updateHoveredCell(mouse.worldX, mouse.worldY);
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
            this.copiarSeleccion();
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
          this.saveIfChanged();
        
        //EVENTOS  

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
            this.arrastrandoSeleccion = false;
            this.posibleArrastreSeleccion = false;
            this.arrastreInicioX = -1;
            this.arrastreInicioY = -1;
        
            this.vistaPegado.setVisible(false);
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
          }
        });

          this.mapa = this.make.tilemap({
            width: this.columns,
            height: this.rows,
            tileWidth: this.cellsize,
            tileHeight: this.cellsize,
          });

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
            if (this.nivelId !== null) {
              const nivel = obtenerNivel(this.nivelId);
              if (nivel !== undefined) {
                this.restoreBoardState(nivel.tablero);
              }
            }

            this.tablero.setDepth(1);
            this.hoverCell.setDepth(2);
        
            
            this.input.on("pointerdown", (mouse: Phaser.Input.Pointer) => {
              if (mouse.button !== 0) {
                  return;
              }
              this.updateHoveredCell(mouse.worldX, mouse.worldY);
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

            this.input.keyboard?.on("keydown-SPACE", () => {
              this.herramienta = (this.herramienta + 1) % 25;
            });

            this.input.keyboard?.on("keydown-S", () => {
              this.herramienta = this.selectTool;
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
            .setDepth(3)
            .setVisible(false);

            //EVENTOS DE TECLADO

            this.input.keyboard?.on("keydown-BACKSPACE", () => {
              this.borrarSeleccion();
              this.saveIfChanged();
            });

            this.input.keyboard?.on("keydown-C", () => {
              this.copiarSeleccion();
            });

            this.input.keyboard?.on("keydown-V", () => {
              if (this.seleccionCopiada.length === 0) {
                return;
              }
              this.herramienta = this.pasteTool;
              this.actualizarVistaPegado();
            });
          
            this.input.keyboard?.on("keydown-DELETE", () => {
              this.borrarSeleccion();
              this.saveIfChanged();
            });

            this.input.keyboard?.on("keydown-Z", () => {
              this.undo();
            });

            this.input.keyboard?.on("keydown-Y", () => {
              this.redo();
            });

            this.vistaPegado = this.add.rectangle(0, 0, 1, 1);
            this.vistaPegado.setOrigin(0);
            this.vistaPegado.setFillStyle(0xffffff, 0.25);
            this.vistaPegado.setStrokeStyle(2, 0xffffff);
            this.vistaPegado.setVisible(false);
            this.vistaPegado.setDepth(10);

            this.crearInterfaz();
            this.lastBoardState = this.getBoardState();

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

    }
      private usarHerramienta(): void {
        if (this.mouseX === -1 || this.mouseY === -1 || this.herramienta === this.selectTool || this.herramienta === this.pasteTool) {
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
    
        this.rectanguloSeleccion.setVisible(true);
        this.actualizarInterfaz;
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
          }
        }
      }
    
    private actualizarVistaPegado(): void {
      if ((!this.arrastrandoSeleccion && this.herramienta !== this.pasteTool) || this.seleccionCopiada.length === 0 || this.mouseX === -1 || this.mouseY === -1) {
        this.vistaPegado.setVisible(false);
        return;
      }
      const altoSeleccion = this.seleccionCopiada.length;
      const anchoSeleccion = this.seleccionCopiada[0].length;

      const inicioX = this.mouseX - Math.floor((anchoSeleccion - 1) / 2);
      const inicioY = this.mouseY - Math.floor((altoSeleccion - 1) / 2);

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

private statesAreEqual(firstState: number[][], secondState: number[][]): boolean {
  if (firstState.length !== secondState.length) {
    return false;
  }
  for (let row = 0; row < this.rows; row++) {
    for (let column = 0;column < this.columns; column++) {
      if (firstState[row][column] !== secondState[row][column]) {
        return false;
      }
    }
  }
  return true;
}

private saveIfChanged(): void {
  const currentState = this.getBoardState();
  if (this.statesAreEqual(this.lastBoardState, currentState)) {
    return;
  }
  this.undoHistory.push(this.lastBoardState);
  this.redoHistory = [];
  this.lastBoardState = currentState;
  if (this.undoHistory.length > 100) {
    this.undoHistory.shift();
  }
}

private undo(): void {
  const previousState = this.undoHistory.pop();
  if (!previousState) {
    return;
  }
  this.redoHistory.push(this.getBoardState());
  this.restoreBoardState(previousState);
  this.lastBoardState = previousState;
  this.quitarSeleccion();
}

private redo(): void {
  const nextState = this.redoHistory.pop();
  if (!nextState) {
    return;
  }
  this.undoHistory.push(this.getBoardState());
  this.restoreBoardState(nextState);
  this.lastBoardState = nextState;
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
  if (this.herramienta !== this.selectTool && this.rectanguloSeleccion.visible) {
    this.quitarSeleccion();
  }
  if (this.herramienta !== this.pasteTool && !this.arrastrandoSeleccion && this.vistaPegado.visible) {
    this.vistaPegado.setVisible(false);
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
  actualizarNivel(nivel);
}

//INTERFAZ

private actualizarInterfaz(): void {
  if (this.herramienta === this.selectTool){
    this.botonSeleccionar.setFillStyle(0x6666aa);
  } else {
    this.botonSeleccionar.setFillStyle(0x333333);
  }

  if (this.seleccionCopiada.length === 0) {
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
      this.botonBorrar.setFillStyle(0x333333);
      this.botonDeseleccionar.setFillStyle(0x333333);
      this.botonBorrar.setAlpha(1);
      this.botonDeseleccionar.setAlpha(1);
  } else {
      this.botonBorrar.disableInteractive();
      this.botonDeseleccionar.disableInteractive();
      this.botonBorrar.setFillStyle(0x777777);
      this.botonDeseleccionar.setFillStyle(0x777777);
      this.botonBorrar.setAlpha(0.5);
      this.botonDeseleccionar.setAlpha(0.5);
  }
}
private crearInterfaz(): void {
  let y = 60;
  const x = 600;
  const separacion = 60;
  this.botonSeleccionar = crearBoton(this, x, y, 100, "Seleccionar", () => {
      this.herramienta = this.selectTool;
      this.actualizarInterfaz();
  });
  y += separacion;
  crearBoton(this, x, y, 100, "Copiar", () => {
      this.copiarSeleccion();
      this.actualizarInterfaz();
  });
  y += separacion;
  this.botonPegar = crearBoton(this, x, y, 100, "Pegar", () => {
      this.herramienta = this.pasteTool;
      this.actualizarInterfaz();
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
  crearBoton(this, x, y, 100, "Undo", () => this.undo());
  y += separacion;
  crearBoton(this, x, y, 100, "Redo", () => this.redo());
  this.actualizarInterfaz();
}




}

