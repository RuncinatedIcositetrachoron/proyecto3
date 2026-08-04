import Phaser from "phaser";

interface Entity {
    x: number;
    y: number;
    sprite: Phaser.GameObjects.Sprite;
}

export class GameScene extends Phaser.Scene {
    
    private levelNumber = 1;

    init(data: { level: number }) {
    this.levelNumber = data.level;
    }

    private qKey!: Phaser.Input.Keyboard.Key;
    private rKey!: Phaser.Input.Keyboard.Key;

    private player!: Entity;
    private flag!: Entity;
    private boxes: Entity[] = [];
    private goals: Entity[] = [];

    private offsetX = 0;
    private offsetY = 0;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private staticRows;

    private isOccupied(x:number, y:number): boolean {
        if (this.goals.find(goal => goal.x === x && goal.y === y)) {
            if (this.getBoxAt(x, y)) {
                return true;
            }
            return false;
        }
        return true;
    }

    private getBoxAt(x: number, y: number): Entity | undefined {
        return this.boxes.find(box => box.x === x && box.y === y);
    }
    
    private isWall(x: number, y: number): boolean {
        if (this.staticRows[y][x] === "7") {
            return true;
        }
        return false;
    }

    private winConditionsMet(): boolean {
        let counter: number = 0;
        for (let y = 0; y<this.goals.length; y++) {
            if (!this.isOccupied(this.goals[y].x, this.goals[y].y)) {
                counter++;
            }
        }
        if (counter > 0) {
            return false;
        }
        return true;
    }

    private flagCheck() {
        if (!this.winConditionsMet()) {
            this.flag.sprite.setTexture("tiles", 2).setScale(2)
        } else {
            this.flag.sprite.setTexture("tiles", 4).setScale(2)
        }
    }

    private updatePosition(dx: number, dy: number) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        const box = this.getBoxAt(newX, newY);
        if (this.isWall(newX, newY)){
            return;
        }
        if (box) {
            const bnewX = box.x + dx;
            const bnewY = box.y + dy;
            if (this.getBoxAt(bnewX, bnewY) || this.isWall(bnewX, bnewY)) {
                return;
            }
            box.x = bnewX;
            box.y = bnewY;
            box.sprite.setPosition(
                this.offsetX + box.x * 64,
                this.offsetY + box.y * 64
            );
        }
        this.player.x = newX;
        this.player.y = newY;
        this.player.sprite.setPosition(
            this.offsetX + this.player.x * 64,
            this.offsetY + this.player.y * 64
        );

        if (this.player.x == this.flag.x && this.player.y == this.flag.y && this.winConditionsMet() == true) {
            this.boxes = [];
            this.goals = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
    }

    constructor() {
        super("game");
    }

    preload() {
        this.load.spritesheet("tiles", "assets/placeholders.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
        this.load.text("level1", `assets/level1.txt`);
        this.load.text("level2", `assets/level2.txt`);
        this.load.text("level3", `assets/level3.txt`);
        this.load.text("level4", `assets/level4.txt`);
        this.load.text("level5", `assets/level5.txt`);
    }

    create() {
        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        const level = this.cache.text.get(`level${this.levelNumber}`);
        const [staticLayer, dynamicLayer] = level.split(".");
        this.staticRows = staticLayer.trim().split("\n");
        const dynamicRows = dynamicLayer.trim().split("\n");
        this.offsetX = (864 - this.staticRows[0].length * 64) / 2;
        this.offsetY = (664 - this.staticRows.length * 64) / 2;

        for (let y = 0; y<this.staticRows.length; y++) {
            for (let x = 0; x<this.staticRows[y].length; x++){
                if (this.staticRows[y][x]==="6") {
                    this.goals.push ({
                    x: x,
                    y: y,
                    sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", 6).setScale(2)
                    });
                }
                if (this.staticRows[y][x] == "4") {
                    this.flag = {
                    x: x,
                    y: y,
                    sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", 4).setScale(2)
                    };
                } else {
                    this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", this.staticRows[y][x]).setScale(2);
                }
            }
        }
        for (let y = 0; y<dynamicRows.length; y++) {
            for (let x = 0; x<dynamicRows[y].length; x++){
                if (dynamicRows[y][x] == "5") {
                    this.player = {
                    x: x,
                    y: y,
                    sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", 5).setScale(2)
                    };
                } else if (dynamicRows[y][x] == "3") {
                    this.boxes.push ({
                    x: x,
                    y: y,
                    sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", 3).setScale(2)
                    });
                }
            }
        }
        this.cursors = this.input.keyboard!.createCursorKeys();
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
            this.updatePosition(-1, 0);
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
            this.updatePosition(1, 0);
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
            this.updatePosition(0, -1);
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
            this.updatePosition(0, 1);
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.boxes = [];
            this.goals = [];
            this.scene.start("game", {level: this.levelNumber});
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.boxes = [];
            this.goals = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
    }
}