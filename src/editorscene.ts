import Phaser from "phaser";

export class EditorScene extends Phaser.Scene {
    constructor() {
        super("EditorScene");
    }

    private columns: number = 16;
    private rows: number = 10;
    private cellsize: number = 32;
    private board_offset_x: number = 32;
    private board_offset_y: number = 32;
    private board_width: number = this.columns * this.cellsize;
    private board_height: number = this.rows * this.cellsize;

    private selectTool: number  = 4;
    
    private mouseX: number = -1;
    private mouseY: number = -1;
    private hoverCell!: Phaser.GameObjects.Rectangle;

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
          
        this.input.on("pointermove", (mouse: Phaser.Input.Pointer) => {
          this.updateHoveredCell(
            mouse.worldX,
            mouse.worldY,
          );

          if (mouse.isDown && mouse.button === 0) {
            this.usarHerramienta();
          }

          if (this.herramienta === this.selectTool && this.seleccionando) {
            this.actualizarSeleccion();
            return;
          }
        });

        this.input.on("pointerup", (mouse: Phaser.Input.Pointer) => {
              if (!this.seleccionando) {
                  return;
              }
              this.updateHoveredCell(
                  mouse.worldX,
                  mouse.worldY,
              );
              this.actualizarSeleccion();
              this.seleccionando = false;
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
            console.log("Tiles reconocidos:", conjuntoTiles.total);

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
            this.tablero.setDepth(1);
            this.hoverCell.setDepth(2);
            
            this.input.on("pointerdown", (mouse: Phaser.Input.Pointer) => {
              if (mouse.button !== 0) {
                return;
              }
              
              this.quitarSeleccion();

              this.updateHoveredCell(
                mouse.worldX,
                mouse.worldY,
              );
              
              if (this.herramienta === this.selectTool) {
                this.iniciarSeleccion();
              } else {
                this.usarHerramienta();
              }
            });

            this.input.keyboard?.on("keydown-SPACE", () => {
              this.herramienta = (this.herramienta + 1) % 25;
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

            this.input.keyboard?.on("keydown-BACKSPACE", () => {
              this.borrarSeleccion();
            });
          
            this.input.keyboard?.on("keydown-DELETE", () => {
              this.borrarSeleccion();
            });
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
        if (this.mouseX === -1 || this.mouseY === -1 || this.herramienta === this.selectTool) {
          return;
         }

        if (this.herramienta === 0) {
          this.mapa.removeTileAt(
            this.mouseX,
            this.mouseY,
            true,
            true,
            this.tablero,
          );
        }else {
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
        this.actualizarSeleccion();
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
      
      private borrarSeleccion(): void {
        if (this.seleccionIzquierda === -1 || this.seleccionDerecha === -1 || this.seleccionAbajo === -1 || this.seleccionArriba === -1) {
            return;
        }
        for (let fila = this.seleccionArriba; fila <= this.seleccionAbajo; fila++) {
          for (let columna = this.seleccionIzquierda; columna <= this.seleccionDerecha; columna++) {
            this.mapa.removeTileAt(
              columna,
              fila,
              true,
              true,
              this.tablero,
            );
          }
        }
      }

      private quitarSeleccion(): void {
        this.seleccionando = false;
    
        this.rectanguloSeleccion.setVisible(false);
    
        this.seleccionInicioX = -1;
        this.seleccionInicioY = -1;
    
        this.seleccionIzquierda = -1;
        this.seleccionDerecha = -1;
        this.seleccionArriba = -1;
        this.seleccionAbajo = -1;
      }

}