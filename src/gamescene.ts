import Phaser from "phaser";

interface Entity {
    type: string;
    x: number;
    y: number;
    dir: number;
    pushable: boolean;
    sprite: Phaser.GameObjects.Sprite;
}

interface GameState {
    entities: {
        type: string;
        x: number;
        y: number;
        dir: number;
    }[];
}

const Tile = {
    Empty: 0,
    Flag0: 1,
    Box: 2,
    Reciever: 3,
    LaserH: 4,
    Flag1: 5,
    Player: 6,
    Door0: 7,
    LaserV: 8,
    Goal: 9,
    Wall: 10,
    Door1: 11,

    MirrorLEempty: 12,
    MirrorLBack: 13,
    MirrorLBackFront: 14,
    MirrorLFront: 15,

    MirrorRFront: 16,
    MirrorRBackFront: 17,
    MirrorRBack: 18,
    MirrorREmpty: 19,

    LaserEmissorW: 20,
    LaserEmissorD: 21,
    LaserEmissorA: 22,
    LaserEmissorS: 23

} as const;

/////////////////////
//CLASS STARTS HERE//
/////////////////////

export class GameScene extends Phaser.Scene {
    
    private levelNumber = 1;

    private history: GameState[] = [];
    
    private laser;

    init(data: { level: number }) {
    this.levelNumber = data.level;
    }

    private qKey!: Phaser.Input.Keyboard.Key;
    private rKey!: Phaser.Input.Keyboard.Key;
    private zKey!: Phaser.Input.Keyboard.Key;

    private entities: Entity[] = [];
    private lasers: Phaser.GameObjects.Sprite[] = [];

    private offsetX = 0;
    private offsetY = 0;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private staticRows;  

    private getEntityAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.pushable === true && entity.x === x && entity.y === y);
    }
    
    private addLaser(x: number, y: number, dir: number) {
        let dx = 0;
        let dy = 0;
        switch (dir) {
            case 0: dy = -1; break;
            case 1: dx = 1;  break;
            case 2: dy = 1;  break;
            case 3: dx = -1; break;
        }
        const nextX = x + dx;
        const nextY = y + dy;

        if (this.isWall(nextX, nextY) || this.getEntityAt(nextX, nextY)) {
            return;
        }
    
        if (dir === 0 || dir === 2) {
            this.laser = this.add.sprite(this.offsetX + nextX * 64, this.offsetY + nextY * 64, "tiles", Tile.LaserV).setScale(2);
        }
        if (dir === 1 || dir === 3) {
            this.laser = this.add.sprite(this.offsetX + nextX * 64, this.offsetY + nextY * 64, "tiles", Tile.LaserH).setScale(2);
        }
        this.lasers.push(this.laser);
        this.addLaser(nextX, nextY, dir);
    }

    private raycast() {
        for (const laser of this.lasers) {
            laser.destroy();
        }
        this.lasers = [];
        const emitters = this.entities.filter(entity => entity.type === "laserEmissor");
        if (!emitters) {
            return;
        }
        for (const emitter of emitters) {
            this.addLaser(emitter.x, emitter.y, emitter.dir);
        }
    }

    private isWall(x: number, y: number): boolean {
        if (this.staticRows[y][x] === "#") {
            return true;
        }
        return false;
    }

    private winConditionsMet(): boolean {
        const goals = this.entities.filter(entity => entity.type === "goal");
        for (const goal of goals) {
            const box = this.entities.find(entity => entity.type === "box" && entity.x === goal.x && entity.y === goal.y);
            if (!box) {
                return false;
            }
        }
        return true;
    }
    
    private winConditionsMet2(): boolean {
        const recievers = this.entities.filter(entity => entity.type === "laserReciever");
        for (const reciever of recievers) {
            const currX = reciever.x;
            const currY = reciever.y;
            switch(reciever.dir){
            case 0:
                if (!this.lasers.find((laser) => (laser.x === this.offsetX + currX * 64 && laser.y === this.offsetY + (currY-1) * 64 && String(laser.frame.name) === "8"))) {
                    return false;
                }
                break;
            case 1:
                if (!this.lasers.find((laser) => (laser.y === this.offsetY + currY * 64 && laser.x === this.offsetX + (currX+1) * 64 && String(laser.frame.name) === "4"))) {
                    return false;
                }
                break;
            case 2:
                if (!this.lasers.find((laser) => (laser.x === this.offsetX + currX * 64 && laser.y === this.offsetY + (currY+1) * 64 && String(laser.frame.name) === "8"))) {
                    return false;
                }
                break;
            case 3:
                if (!this.lasers.find((laser) => (laser.y === this.offsetY + currY * 64 && laser.x === this.offsetX + (currX-1) * 64 && String(laser.frame.name) === "4"))) {
                    return false;
                }
                break;
            }
        }
        return true;
    }

    private flagCheck() {
        const flag = this.entities.find(entity => entity.type === "flag");
        if (!flag) {
            return;
        }
        if (!this.winConditionsMet()) {
            flag.sprite.setTexture("tiles", Tile.Flag0).setScale(2);
        } else if (!this.winConditionsMet2()) {
            flag.sprite.setTexture("tiles", Tile.Flag0).setScale(2);
        } else {
            flag.sprite.setTexture("tiles", Tile.Flag1).setScale(2);
        }
    }

    private updatePosition(dx: number, dy: number) {
        const player = this.entities.find(entity => entity.type === "player");
        const newX = player.x + dx;
        const newY = player.y + dy;
        this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir}))
        });

        if (this.isWall(newX, newY)) {
            return;
        }
        const entity = this.getEntityAt(newX, newY);
        if (entity) {
            const newEntityX = entity.x + dx;
            const newEntityY = entity.y + dy;
            if (this.isWall(newEntityX, newEntityY) || this.getEntityAt(newEntityX, newEntityY)) {
                return;
            }
            entity.x = newEntityX;
            entity.y = newEntityY;
            entity.sprite.setPosition(
                this.offsetX + entity.x * 64,
                this.offsetY + entity.y * 64
            );
        }
        player.x = newX;
        player.y = newY;
        player.dir = dx !== 0 ? dx : dy;
        player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64);

        const flag = this.entities.find(entity => entity.type === "flag");

        if (flag && player.x === flag.x && player.y === flag.y && this.winConditionsMet() && this.winConditionsMet2()) {
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
    }

    constructor() {
        super("game");
    }

    ////////////////////////////////
    //PRELOAD & CREATE STARTS HERE//
    ////////////////////////////////

    preload() {
        this.load.spritesheet("tiles", "assets/placeholders.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
        this.load.text("level1", `assets/level1.txt`);
        this.load.text("level2", `assets/level2.txt`);
    }

    create() {
        this.entities = [];
        this.history = [];
        this.lasers = [];
        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        const level = this.cache.text.get(`level${this.levelNumber}`);
        const [staticLayer, dynamicLayer, laserLayer] = level.split("^");
        this.staticRows = staticLayer.trim().split("\n");
        const dynamicRows = dynamicLayer.trim().split("\n");
        const laserRows = laserLayer.trim().split("\n");
        this.offsetX = (864 - this.staticRows[0].length * 64) / 2;
        this.offsetY = (664 - this.staticRows.length * 64) / 2;

        for (let y = 0; y<this.staticRows.length; y++) {
            for (let x = 0; x<this.staticRows[y].length; x++){
                const thistile = this.staticRows[y][x];
                switch(thistile) {
                    case "#":
                        this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Wall).setScale(2);
                        break;
                    case "X":
                        this.entities.push ({
                        type: "goal",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Goal).setScale(2)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "flag",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Flag1).setScale(2)
                        });
                        break;
                }
            }
        }
        for (let y = 0; y<dynamicRows.length; y++) {
            for (let x = 0; x<dynamicRows[y].length; x++){
                const thistile = dynamicRows[y][x];
                switch(thistile) {
                    case "p":
                        this.entities.push ({
                        type: "player",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Player).setScale(2)
                        });
                        break;
                    case "b":
                        this.entities.push ({
                        type: "box",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Box).setScale(2)
                        });
                        break;
                }
            }
        }
        for (let y = 0; y<laserRows.length; y++) {
            for (let x = 0; x<laserRows[y].length; x++){
                const thistile = laserRows[y][x];
                switch(thistile) {
                    case "w":
                        this.entities.push ({
                        type: "laserEmissor",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorW).setScale(2)
                        });
                        break;
                    case "a":
                        this.entities.push ({
                        type: "laserEmissor",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorA).setScale(2)
                        });
                        break;
                    case "s":
                        this.entities.push ({
                        type: "laserEmissor",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorS).setScale(2)
                        });
                        break;
                    case "d":
                        this.entities.push ({
                        type: "laserEmissor",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorD).setScale(2)
                        });
                        break;
                    case "i":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setScale(2)
                        });
                        break;
                    case "j":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setScale(2)
                        });
                        break;
                    case "k":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setScale(2)
                        });
                        break;
                    case "l":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setScale(2)
                        });
                        break;
                }
            }
        }
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.raycast();
    }

    //////////////////////////////
    //INPUT HANDLING STARTS HERE//
    //////////////////////////////

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
            this.updatePosition(-1, 0);
            this.raycast();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
            this.updatePosition(1, 0);
            this.raycast();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
            this.updatePosition(0, -1);
            this.raycast();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
            this.updatePosition(0, 1);
            this.raycast();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber});
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
        if (Phaser.Input.Keyboard.JustDown(this.zKey)) {
            const state = this.history.pop();
            if (!state) {
                return;
            }   
            for (let i = 0; i < this.entities.length; i++) {
                const entity = this.entities[i];
                const oldEntity = state.entities[i];
                entity.x = oldEntity.x;
                entity.y = oldEntity.y;
                entity.dir = oldEntity.dir;
                entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
            }
            this.raycast();
        }
    }
}