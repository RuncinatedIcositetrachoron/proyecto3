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
    
    private mouseX: number = -1;
    private mouseY: number = -1;
    private hoverCell!: Phaser.GameObjects.Rectangle;

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
            1,
          )
          .setVisible(false);
          this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            this.updateHoveredCell(pointer.worldX, pointer.worldY);
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
}

    
