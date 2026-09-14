import Phaser from "phaser";

interface Entity {
    type: string;
    x: number;
    y: number;
    dir?: number;
    emitting?: number;
    portal?: number;
    group?: number;
    pushable: boolean;
    sprite: Phaser.GameObjects.Sprite;
    sprite2?: Phaser.GameObjects.Sprite;
}

interface GameState {
    entities: {
        type: string;
        x: number;
        y: number;
        dir: number;
        portal: number;
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

    MirrorLEmpty: 12,
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
    LaserEmissorS: 23,

    PortalW: 24,
    PortalD: 25,
    PortalA: 26,
    PortalS: 27
} as const;

/////////////////////
//CLASS STARTS HERE//
/////////////////////

export class GameScene extends Phaser.Scene {
    
    private levelNumber = 1;
    private levelMode = 0;
    private menuup = 0;
    private menuOverlay!: Phaser.GameObjects.Rectangle;

    private history: GameState[] = [];
    
    private laser;

    private tempstorage: Entity | undefined;

    init(data: { level: number, history: GameState[] }) {
        this.levelNumber = data.level;
        this.history = data.history;
    }

    private qKey!: Phaser.Input.Keyboard.Key;
    private rKey!: Phaser.Input.Keyboard.Key;
    private zKey!: Phaser.Input.Keyboard.Key;
    private escKey!: Phaser.Input.Keyboard.Key;
    private enterKey!: Phaser.Input.Keyboard.Key;

    private entities: Entity[] = [];
    private lasers: Phaser.GameObjects.Sprite[] = [];

    private offsetX = 0;
    private offsetY = 0;
    private playeroffsetY = 24;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private staticRows;
    
    private selected = 0;

    private operationNumber = 0;
    
    private menuItems: Phaser.GameObjects.Text[] = [];
    private menuLabels: string[] = [];
        
    private updateMenu() {
        for (let i = 0; i < this.menuItems.length; i++) {
            if (i === this.selected) {
                this.menuItems[i].setText("> " + this.menuLabels[i]);
            } else {
                this.menuItems[i].setText(" " + this.menuLabels[i]);
            }
        }
    }

    private opposite(dir: number): number {
        switch(dir) {
            case 0: return 2;
            case 1: return 3;
            case 2: return 0;
            case 3: return 1;
        }
    }

    private isWall(x: number, y: number): boolean {
        if (y < 0 || y >= this.staticRows.length || x < 0 || x >= this.staticRows[y].length) {
            return true;
        }
        if (this.entities.find(entity => entity.type === "wall" && entity.x === x && entity.y === y)) {
            return true;
        }
        return false;
    }

    private getPortalAt(x: number, y: number, dir?: number): Entity | undefined {
        if (dir !== undefined) {
            return this.entities.find(entity => entity.portal === dir && entity.x === x && entity.y === y );
        } else {
            return this.entities.find(entity => entity.portal !== undefined && entity.x === x && entity.y === y );
        }
    }

    private getEntityAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.pushable === true && entity.x === x && entity.y === y);
    }
    private getAnythingAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.x === x && entity.y === y);
    }
    private getMirrorAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.x === x && entity.y === y && entity.type === "mirror");
    }

    private findPair(group: number, exclude: Entity): Entity | undefined {
        return (this.entities.find(entity => entity.portal !== undefined && entity.group === group && entity !== exclude));
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

        if(this.getPortalAt(nextX, nextY, this.opposite(dir))) {
            const entry = this.getPortalAt(nextX, nextY);
            const exit = this.findPair(entry.group, entry);
            exit.emitting = exit.portal;
            return;
        }
        if (this.isWall(nextX, nextY) || (this.getEntityAt(nextX, nextY) && !this.getMirrorAt(nextX, nextY))) {
            return;
        }
        if (this.getMirrorAt(nextX, nextY)) {
            const mirror = this.getMirrorAt(nextX, nextY);
            switch(dir) {
            case 0:
                switch(mirror.dir) {
                    case 0: return;
                    case 1: return;
                    case 2: mirror.emitting = 1; mirror.sprite.setTexture("tiles", Tile.MirrorRFront); break;
                    case 3: mirror.emitting = 3; mirror.sprite.setTexture("tiles", Tile.MirrorLFront); break;
                }
                return;
            case 1:
                switch(mirror.dir) {
                    case 0: mirror.emitting = 0; mirror.sprite.setTexture("tiles", Tile.MirrorRBack); break;
                    case 1: return;
                    case 2: return;
                    case 3: mirror.emitting = 2; mirror.sprite.setTexture("tiles", Tile.MirrorLFront); break;
                }
                return;
            case 2:
                switch(mirror.dir) {
                    case 0: mirror.emitting = 3; mirror.sprite.setTexture("tiles", Tile.MirrorRBack); break;
                    case 1: mirror.emitting = 1; mirror.sprite.setTexture("tiles", Tile.MirrorLBack); break;
                    case 2: return;
                    case 3: return;
                }
                return;
            case 3:
                switch(mirror.dir) {
                    case 0: return;
                    case 1: mirror.emitting = 0; mirror.sprite.setTexture("tiles", Tile.MirrorLBack);  break;
                    case 2: mirror.emitting = 2; mirror.sprite.setTexture("tiles", Tile.MirrorRFront);  break;
                    case 3: return;
                }   
                return;
            }
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
        const emitters = this.entities.filter(entity => entity.emitting !== undefined);
        if (!emitters) {
            return;
        }
        for (const emitter of emitters) {
            this.addLaser(emitter.x, emitter.y, emitter.emitting);
        }
    }

    private laserFunction() {
        const mirrors = this.entities.filter(entity => entity.type === "mirror");
        if (mirrors) {
            for (const mirror of mirrors) {
                mirror.emitting = undefined;
                switch(mirror.dir) {
                    case 0: case 2: mirror.sprite.setTexture("tiles", Tile.MirrorREmpty); break;
                    case 1: case 3: mirror.sprite.setTexture("tiles", Tile.MirrorLEmpty); break;
                }
            }
        }
        const emissors = this.entities.filter(entity => entity.type === "laserEmissor");
        if (emissors) {
            for (const emissor of emissors) {
                emissor.emitting = emissor.dir;
                switch(emissor.dir) {
                    case 0: emissor.sprite.setTexture("tiles", Tile.LaserEmissorW); break;
                    case 1: emissor.sprite.setTexture("tiles", Tile.LaserEmissorD); break;
                    case 2: emissor.sprite.setTexture("tiles", Tile.LaserEmissorS); break;
                    case 3: emissor.sprite.setTexture("tiles", Tile.LaserEmissorA); break;
                }
            }
        }
        const portals = this.entities.filter(entity => entity.portal !== undefined);
        if (portals) {
            for (const portal of portals) {
                portal.emitting = undefined;
            }
        }
        this.raycast();
        this.raycast();
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
                if (this.lasers.find((laser) => (laser.x === this.offsetX + currX * 64 && laser.y === this.offsetY + (currY-1) * 64 && String(laser.frame.name) === "8")) || this.entities.find((emissor) => (emissor.y === currY-1 && emissor.x === currX && emissor.emitting === 2))) {
                    return true;
                }
                break;
            case 1:
                if (this.lasers.find((laser) => (laser.y === this.offsetY + currY * 64 && laser.x === this.offsetX + (currX+1) * 64 && String(laser.frame.name) === "4")) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX+1 && emissor.emitting === 3))) {
                    return true;
                }
                break;
            case 2:
                if (this.lasers.find((laser) => (laser.x === this.offsetX + currX * 64 && laser.y === this.offsetY + (currY+1) * 64 && String(laser.frame.name) === "8")) || this.entities.find((emissor) => (emissor.y === currY+1 && emissor.x === currX && emissor.emitting === 0))) {
                    return true;
                }
                break;
            case 3:
                if (this.lasers.find((laser) => (laser.y === this.offsetY + currY * 64 && laser.x === this.offsetX + (currX-1) * 64 && String(laser.frame.name) === "4")) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX-1 && emissor.emitting === 1))) {
                    return true;
                }
                break;
            }
        }
        return false;
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

    private updatePosition(dx: number, dy: number, dir: number) { // main movement function, is a mess
        const player = this.entities.find(entity => entity.type === "player");
        const newX = player.x + dx;
        const newY = player.y + dy;

        if (this.getPortalAt(newX, newY, dir)) {
            const entry = this.getPortalAt(newX, newY);
            const exit = this.findPair(entry.group, entry);
            player.x = exit.x;
            player.y = exit.y;
            player.dir = exit.portal;
            player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64 - this.playeroffsetY);
            switch(exit.portal) {
                case 0:
                    this.operationNumber = 1;
                    this.updatePosition(0, -1, 2);
                    break;
                case 1:
                    this.operationNumber = 1;
                    this.updatePosition(1, 0, 3);
                    break;
                case 2:
                    this.operationNumber = 1;
                    this.updatePosition(0, 1, 0);
                    break;
                case 3:
                    this.operationNumber = 1;
                    this.updatePosition(-1, 0, 1);
                    break;
            }
        }
        else {
            if (this.isWall(newX, newY) && this.operationNumber == 0) {
                return;
            } 
            else if (this.isWall(newX, newY) && this.operationNumber == 1){
                this.operationNumber = 0;
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
                    if (entity.sprite2) {entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);}
                }
                for (const laser of this.lasers) {
                    laser.destroy();
                }
                this.laserFunction();
                return;
            }
            const entity = this.getEntityAt(newX, newY);
            if (entity) {
                this.tempstorage = entity;
                const newEntityX = entity.x + dx;
                const newEntityY = entity.y + dy;
                if (this.getPortalAt(newEntityX, newEntityY, dir)) {
                    const entry= this.getPortalAt(newEntityX, newEntityY);
                    const exit = this.findPair(entry.group, entry);
                    entity.x = exit.x;
                    entity.y = exit.y;
                    entity.dir = (((entity.dir + (entry.portal - exit.portal)) % 4) + 4) % 4;
                    if (entity.portal !== undefined) {
                        entity.portal = (((entity.portal + (entry.portal - exit.portal)) % 4) + 4) % 4;
                    }
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    if (entity.sprite2) {
                        entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                        switch(entity.portal) {
                            case 0: entity.sprite2.setTexture("tiles", Tile.PortalW).setScale(2); break;
                            case 1: entity.sprite2.setTexture("tiles", Tile.PortalD).setScale(2); break;
                            case 2: entity.sprite2.setTexture("tiles", Tile.PortalS).setScale(2); break;
                            case 3: entity.sprite2.setTexture("tiles", Tile.PortalA).setScale(2); break;
                        }
                    }
                    let done = false;
                    switch(exit.portal) {
                        case 0:
                            this.operationNumber = 1;
                            done = this.updatePosition2(0, -1, 2);
                            break;
                        case 1:
                            this.operationNumber = 1;
                            done = this.updatePosition2(1, 0, 3);
                            break;
                        case 2:
                            this.operationNumber = 1;
                            done = this.updatePosition2(0, 1, 0);
                            break;
                        case 3:
                            this.operationNumber = 1;
                            done = this.updatePosition2(-1, 0, 1);
                            break;
                    }
                    if (!done) {
                        return;
                    }
                } else {
                    if ((this.isWall(newEntityX, newEntityY) || this.getEntityAt(newEntityX, newEntityY)) && this.operationNumber == 0) {
                        return;
                    }
                    else if ((this.isWall(newEntityX, newEntityY) || this.getEntityAt(newEntityX, newEntityY)) && this.operationNumber == 1) {
                        this.operationNumber = 0;
                        const state = this.history.pop();
                        for (let i = 0; i < this.entities.length; i++) {
                            const entity = this.entities[i];
                            const oldEntity = state.entities[i];
                            entity.x = oldEntity.x;
                            entity.y = oldEntity.y;
                            entity.dir = oldEntity.dir;
                            entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                            if (entity.sprite2) {entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);}

                        }
                        for (const laser of this.lasers) {
                            laser.destroy();
                        }
                        this.laserFunction();
                        return;
                    }
                    entity.x = newEntityX;
                    entity.y = newEntityY;
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    if (entity.sprite2) {entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);}
                }
            }
            player.x = newX;
            player.y = newY;
            player.dir = dx !== 0 ? dx : dy;
            player.sprite.setTexture("lindsey", this.opposite(dir)).setScale(4).setDepth(10);
            player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64 - this.playeroffsetY);

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
    }

    private updatePosition2(dx: number, dy: number, dir: number): boolean{ // box & portal auxiliary function
        const newX = this.tempstorage.x + dx;
        const newY = this.tempstorage.y + dy;

        if (this.getPortalAt(newX, newY, dir)) {
            const entry = this.getPortalAt(newX, newY);
            const exit = this.findPair(entry.group, entry);
            this.tempstorage.x = exit.x;
            this.tempstorage.y = exit.y;
            this.tempstorage.dir = exit.portal;
            this.tempstorage.sprite.setPosition(this.offsetX + this.tempstorage.x * 64, this.offsetY + this.tempstorage.y * 64);
            switch(exit.portal) {
                case 0:
                    return this.updatePosition2(0, -1, 2);
                case 1:
                    return this.updatePosition2(1, 0, 3);
                case 2:
                    return this.updatePosition2(0, 1, 0);
                case 3:
                    return this.updatePosition2(-1, 0, 1);
            }
            return;
        }

        if (this.isWall(newX, newY)|| this.getEntityAt(newX, newY)) {
            this.operationNumber = 0;
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
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.laserFunction();
            return false;
        }

        this.tempstorage.x = newX;
        this.tempstorage.y = newY;
        this.tempstorage.sprite.setPosition(this.offsetX + newX * 64, this.offsetY + newY * 64);
        if (this.tempstorage.sprite2) {
            this.tempstorage.sprite2.setPosition(this.offsetX + this.tempstorage.x * 64, this.offsetY + this.tempstorage.y * 64);
            switch(this.tempstorage.portal) {
                case 0: this.tempstorage.sprite2.setTexture("tiles", Tile.PortalW).setScale(2); break;
                case 1: this.tempstorage.sprite2.setTexture("tiles", Tile.PortalD).setScale(2); break;
                case 2: this.tempstorage.sprite2.setTexture("tiles", Tile.PortalS).setScale(2); break;
                case 3: this.tempstorage.sprite2.setTexture("tiles", Tile.PortalA).setScale(2); break;
            }
        }
        return true;
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
        this.load.spritesheet("lindsey", "assets/lindsey.walking.anim.sheet.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.text("level1", `assets/level1.txt`);
    }

    create() {
        this.entities = [];
        this.history = [];
        this.lasers = [];

        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        const level = this.cache.text.get(`level${this.levelNumber}`);
        const [staticLayer, dynamicLayer, laserLayer, portalLayer, directionLayer] = level.split("^");
        this.staticRows = staticLayer.trim().split("\n");
        const dynamicRows = dynamicLayer.trim().split("\n");
        const laserRows = laserLayer.trim().split("\n");
        const portalRows = portalLayer.trim().split("\n");
        const directionRows = directionLayer.trim().split("\n");
        this.offsetX = (864 - this.staticRows[0].length * 64) / 2;
        this.offsetY = (664 - this.staticRows.length * 64) / 2;

        for (let y = 0; y<this.staticRows.length; y++) {
            for (let x = 0; x<this.staticRows[y].length; x++){
                const thistile = this.staticRows[y][x];
                switch(thistile) {
                    case "#":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Wall).setScale(2)
                        });
                        break;
                    case "X":
                        this.entities.push ({
                        type: "goal",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Goal).setScale(2)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "flag",
                        x: x,
                        y: y,
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
                        sprite: this.add.sprite(this.offsetX+x*64, (this.offsetY+y*64)-this.playeroffsetY, "lindsey", 2).setScale(4).setDepth(10)
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
                        emitting: 0,
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
                        emitting: 3,
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
                        emitting: 2,
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
                        emitting: 1,
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
                    case "t":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorREmpty).setScale(2)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorLEmpty).setScale(2)
                        });
                        break;
                    case "g":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorREmpty).setScale(2)
                        });
                        break;
                    case "h":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorLEmpty).setScale(2)
                        });
                        break;
                }
            }
        }
        for (let y = 0; y<portalRows.length; y++) {
            for (let x = 0; x<portalRows[y].length; x++){
                const thistile = portalRows[y][x];
                let entity = this.getAnythingAt(x, y);
                switch(thistile) {
                    case "w":
                        if (entity){
                            entity.portal = 0;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalW).setScale(2);
                        } else {
                            this.entities.push ({
                            type: "box",
                            x: x,
                            y: y,
                            dir: 0,
                            emitting: 4,
                            portal: 0,
                            group: 0,
                            pushable: true,
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Box).setScale(2),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalW).setScale(2)
                            });
                        }
                        break;
                    case "a":
                        if (entity){
                            entity.portal = 3;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalA).setScale(2);
                        } else {
                            this.entities.push ({
                            type: "box",
                            x: x,
                            y: y,
                            dir: 0,
                            emitting: 4,
                            portal: 3,
                            group: 0,
                            pushable: true,
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Box).setScale(2),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalA).setScale(2)
                            });
                        }
                        break;
                    case "s":
                        if (entity){
                            entity.portal = 2;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalS).setScale(2);
                        } else {
                            this.entities.push ({
                            type: "box",
                            x: x,
                            y: y,
                            dir: 0,
                            emitting: 4,
                            portal: 2,
                            group: 0,
                            pushable: true,
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Box).setScale(2),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalS).setScale(2)
                            });
                        }
                        break;
                    case "d":
                        if (entity){
                            entity.portal = 1;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalD).setScale(2);
                        } else {
                            this.entities.push ({
                            type: "box",
                            x: x,
                            y: y,
                            dir: 0,
                            emitting: 4,
                            portal: 1,
                            group: 0,
                            pushable: true,
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Box).setScale(2),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.PortalD).setScale(2)
                            });
                        }
                        break;
                }
            }
        }
        for (let y = 0; y<directionRows.length; y++) {
            for (let x = 0; x<directionRows[y].length; x++){
                const thistile = directionRows[y][x];
                let entity = this.getAnythingAt(x, y);
                if (entity && thistile !== "." && entity.portal !== undefined){
                    entity.group = Number(thistile);
                }
            }
        }
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.menuOverlay = this.add.rectangle(432, 332, 864, 664, 0x2d2d2d, 0.6).setVisible(false).setDepth(100);
        this.menuLabels = ["RESUME", "OPTIONS", "EXIT"];
        for (let i = 0; i < this.menuLabels.length; i++) {
            const text = this.add.text(400, 250 + i * 40, this.menuLabels[i], {
                    fontFamily: "biysmall",
                    fontSize: "16px",
                    color: "#ffffff",
                }).setOrigin(0.5).setVisible(false).setDepth(101);
            this.menuItems.push(text);
        }
        this.laserFunction();
    }

    //////////////////////////////
    //INPUT HANDLING STARTS HERE//
    //////////////////////////////

    update() {
        if (this.menuup == 1) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
                this.selected = (this.selected - 1 + this.menuItems.length) % this.menuItems.length;
                this.updateMenu();
            }
            if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
                this.selected = (this.selected + 1) % this.menuItems.length;
                this.updateMenu();
            }
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
                switch (this.selected) {
                    case 0:
                        this.menuup = 0;
                        this.menuOverlay.setVisible(false);
                        for (const item of this.menuItems) item.setVisible(false);
                        break;
                    case 1:
                        break;
                    case 2:
                        this.entities = [];
                        for (const laser of this.lasers) laser.destroy();
                        this.lasers = [];
                        this.scene.start("menu");
                        break;
                }
            }
            if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
                this.menuup = 0;
                for (const item of this.menuItems) item.setVisible(false);
                this.menuOverlay.setVisible(false);
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!) && this.menuup == 0) {
            const player = this.entities.find(entity => entity.type === "player");
            player.dir = 3;
            this.operationNumber = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))
            });
            this.updatePosition(-1, 0, 1);
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.laserFunction();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!) && this.menuup == 0) {
            const player = this.entities.find(entity => entity.type === "player");
            player.dir = 1;
            this.operationNumber = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))
            });
            this.updatePosition(1, 0, 3);
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.laserFunction();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) && this.menuup == 0) {
            const player = this.entities.find(entity => entity.type === "player");
            player.dir = 0;
            this.operationNumber = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))
            });
            this.updatePosition(0, -1, 2);
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.laserFunction();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!) && this.menuup == 0) {
            const player = this.entities.find(entity => entity.type === "player");
            player.dir = 2;
            this.operationNumber = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))
            }); 
            this.updatePosition(0, 1, 0);
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.laserFunction();
            this.flagCheck();
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.menuup == 0) {
            this.operationNumber = 0;
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber});
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.menuup == 0) {
            this.operationNumber = 0;
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
        if (Phaser.Input.Keyboard.JustDown(this.escKey) && this.menuup == 0) {
            this.operationNumber = 0;
            this.menuup = 1;
            this.selected = 0;
            this.menuOverlay.setVisible(true);
            for (const item of this.menuItems) item.setVisible(true);
            this.updateMenu();
        }
        if (Phaser.Input.Keyboard.JustDown(this.zKey) && this.menuup == 0) {
            this.operationNumber = 0;
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
                entity.portal = oldEntity.portal;
                entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                if (entity.sprite2) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("tiles", Tile.PortalW).setScale(2); break;
                        case 1: entity.sprite2.setTexture("tiles", Tile.PortalD).setScale(2); break;
                        case 2: entity.sprite2.setTexture("tiles", Tile.PortalS).setScale(2); break;
                        case 3: entity.sprite2.setTexture("tiles", Tile.PortalA).setScale(2); break;
                    }
                }
                if (entity.type === "player") {
                    entity.sprite.setTexture("lindsey", entity.dir).setScale(4).setDepth(10);
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64 - this.playeroffsetY);
                }
            }
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.laserFunction();
        }
    }
}