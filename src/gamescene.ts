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
        dir?: number;
        portal?: number;
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
    //private levelMode = 0;
    private menuup = 0;
    private menuOverlay!: Phaser.GameObjects.Rectangle;

    private history: GameState[] = [];
    
    private laser: any;
    private emitterQueue: Entity[] = [];
    private firedEmitters: Entity[] = [];

    private tempstorage: Entity | undefined;
    private movenumber: Boolean = false;
    
    private playerMoving = false;
    private inputBuffer: string = "";
    private holdBufferOpen: Boolean = false;
    private playerTween: Phaser.Tweens.Tween | undefined;
    private playerVertical: Boolean = true;

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

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private staticRows: any;
    
    private selected = 0;
    
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

    private opposite(dir: number): number | undefined {
        switch(dir) {
            case 0: return 2;
            case 1: return 3;
            case 2: return 0;
            case 3: return 1;
        }
        return undefined;
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

    private findPair(group: number | undefined, exclude: Entity | undefined): Entity | undefined {
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
            if (entry !== undefined) {
            const exit = this.findPair(entry.group, entry);
            if (exit) this.setEmitting(exit, exit.portal);
            return;
            }
        }
        if (this.isWall(nextX, nextY) || (this.getEntityAt(nextX, nextY) && !this.getMirrorAt(nextX, nextY))) {
            return;
        }
        if (this.getMirrorAt(nextX, nextY)) {
            const mirror = this.getMirrorAt(nextX, nextY);
            if (mirror){
            switch(dir) {
            case 0:
                switch(mirror.dir) {
                    case 0: return;
                    case 1: return;
                    case 2: this.setEmitting(mirror, 1); mirror.sprite.setTexture("tiles", Tile.MirrorRFront); break;
                    case 3: this.setEmitting(mirror, 3); mirror.sprite.setTexture("tiles", Tile.MirrorLFront); break;
                }
                return;
            case 1:
                switch(mirror.dir) {
                    case 0: this.setEmitting(mirror, 0); mirror.sprite.setTexture("tiles", Tile.MirrorRBack); break;
                    case 1: return;
                    case 2: return;
                    case 3: this.setEmitting(mirror, 2); mirror.sprite.setTexture("tiles", Tile.MirrorLFront); break;
                }
                return;
            case 2:
                switch(mirror.dir) {
                    case 0: this.setEmitting(mirror, 3); mirror.sprite.setTexture("tiles", Tile.MirrorRBack); break;
                    case 1: this.setEmitting(mirror, 1); mirror.sprite.setTexture("tiles", Tile.MirrorLBack); break;
                    case 2: return;
                    case 3: return;
                }
                return;
            case 3:
                switch(mirror.dir) {
                    case 0: return;
                    case 1: this.setEmitting(mirror, 0); mirror.sprite.setTexture("tiles", Tile.MirrorLBack);  break;
                    case 2: this.setEmitting(mirror, 2); mirror.sprite.setTexture("tiles", Tile.MirrorRFront);  break;
                    case 3: return;
                }   
                return;
            }
            }
        }
    
        if (dir === 0 || dir === 2) {
            this.laser = this.add.sprite(this.offsetX + nextX * 64, this.offsetY + nextY * 64, "tiles", Tile.LaserV).setOrigin(1,1).setScale(2);
        }
        if (dir === 1 || dir === 3) {
            this.laser = this.add.sprite(this.offsetX + nextX * 64, this.offsetY + nextY * 64, "tiles", Tile.LaserH).setOrigin(1,1).setScale(2);
        }
        this.lasers.push(this.laser);
        this.addLaser(nextX, nextY, dir);
    }

    private setEmitting(entity: Entity, dir: number | undefined) {
        entity.emitting = dir;

        if (!this.emitterQueue.includes(entity) && !this.firedEmitters.includes(entity)) {
            this.emitterQueue.push(entity);
        }
    }
        
    private raycast() {
        while (this.emitterQueue.length > 0) {
            const emitter = this.emitterQueue.shift();

            if (!emitter) continue;
            if (this.firedEmitters.includes(emitter)) continue;
            if (emitter.emitting === undefined) continue;

            this.firedEmitters.push(emitter);

            this.addLaser(
                emitter.x,
                emitter.y,
                emitter.emitting
            );
        }
    }

    private laserFunction() {
        this.emitterQueue = [];
        this.firedEmitters = [];
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
                this.setEmitting(emissor, emissor.dir);
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

    private updatePosition(dx: number, dy: number, dir: number, origDx = dx, origDy = dy, origDir = dir): boolean {
        const player = this.entities.find(entity => entity.type === "player");
        if (player !== undefined) {
        const newX = player.x + dx;
        const newY = player.y + dy;

        const frontPortal = this.getPortalAt(newX, newY, dir);

        if (frontPortal && !frontPortal.pushable) {
            const entry = frontPortal;
            const exit = this.findPair(entry.group, entry);
            const savedPlayerX = player.x, savedPlayerY = player.y, savedPlayerDir = player.dir;
            if (!exit){
                console.log("ERROR: COULD NOT FIND EXIT PORTAL @ gamescene.ts; this.findPair unexpectedly returned undefined");
                return false;
            }
            player.x = exit.x;
            player.y = exit.y;
            player.dir = exit.portal;
            player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64).setDepth(2*player.y);

            let success = false;
            switch(exit.portal) {
                case 0: success = this.updatePosition(0, -1, 2, origDx, origDy, origDir); break;
                case 1: success = this.updatePosition(1, 0, 3, origDx, origDy, origDir); break;
                case 2: success = this.updatePosition(0, 1, 0, origDx, origDy, origDir); break;
                case 3: success = this.updatePosition(-1, 0, 1, origDx, origDy, origDir); break;
            }

            if (!success) {
                player.x = savedPlayerX; player.y = savedPlayerY; player.dir = savedPlayerDir;
                player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64).setDepth(2*player.y);
                return false;
            }
            return true;
        }

        if (this.isWall(newX, newY)) {
            return false;
        }

        const entity = this.getEntityAt(newX, newY);
        if (entity) {
            this.tempstorage = entity;
            const newEntityX = entity.x + dx;
            const newEntityY = entity.y + dy;

            if (entity.portal !== undefined && entity.portal === dir) {
                const entry = entity;
                const exit = this.findPair(entry.group, entry);
                if (!exit) return false;
                const savedPlayerX = player.x, savedPlayerY = player.y, savedPlayerDir = player.dir;

                player.x = exit.x;
                player.y = exit.y;
                player.dir = exit.portal;
                player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64).setDepth(2*player.y);

                let teleportSucceeded = false;
                switch(exit.portal) {
                    case 0: teleportSucceeded = this.updatePosition(0, -1, 2, origDx, origDy, origDir); break;
                    case 1: teleportSucceeded = this.updatePosition(1, 0, 3, origDx, origDy, origDir); break;
                    case 2: teleportSucceeded = this.updatePosition(0, 1, 0, origDx, origDy, origDir); break;
                    case 3: teleportSucceeded = this.updatePosition(-1, 0, 1, origDx, origDy, origDir); break;
                }
                if (teleportSucceeded) return true;

                player.x = savedPlayerX; player.y = savedPlayerY; player.dir = savedPlayerDir;
                player.sprite.setPosition(this.offsetX + player.x * 64, this.offsetY + player.y * 64).setDepth(2*player.y);

            }
            if (this.getPortalAt(newEntityX, newEntityY, dir)) {
                const entry = this.getPortalAt(newEntityX, newEntityY);
                if (!entry){
                    console.log("ERROR: I GENUINELY DON'T KNOW HOW YOU GOT HERE BUT A PORTAL STOPPED EXISTING BETWEEN 2 CONSECUTIVE LINES");
                    return false;
                }
                const exit = this.findPair(entry.group, entry);
                if (!exit) {
                    console.log("ERROR: COULD NOT FIND EXIT PORTAL; this.findPair unexpectedly returned undefined");
                    return false;
                }
                if (exit === entity) {
                    entry.x = 1000; entry.y = 0;
                    entry.sprite.setPosition(this.offsetX + entry.x * 64, this.offsetY + entry.y * 64);
                    if (entry.sprite2) entry.sprite2.setPosition(this.offsetX + entry.x * 64, this.offsetY + entry.y * 64);
                    entity.x = 1000; entity.y = 0;
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    if (entity.sprite2) entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                } 
                else {
                const savedX = entity.x, savedY = entity.y, savedDir = entity.dir, savedPortal = entity.portal;
                this.tempstorage = entity;

                entity.x = exit.x;
                entity.y = exit.y;
                if (entity.dir === undefined){
                    console.log("ERROR: ENTITY UNEXPECTEDLY HAS NO DIR PROPERTY");
                    return false;
                }
                if (entry.portal === undefined){
                    console.log("ERROR: YOUR PORTAL HAS NO PORTAL");
                    return false;
                }
                if (exit.portal === undefined){
                    console.log("ERROR: YOUR PORTAL HAS NO PORTAL");
                    return false;
                }
                entity.dir = (((entity.dir + (entry.portal - exit.portal)) % 4) + 4) % 4;
                if (entity.portal !== undefined) {
                    entity.portal = (((entity.portal + (entry.portal - exit.portal)) % 4) + 4) % 4;
                }
                entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                if (entity.sprite2 && entity.group === 1) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 0).setScale(4); break;
                        case 1: entity.sprite2.setTexture("portals", 3).setScale(4); break;
                        case 2: entity.sprite2.setTexture("portals", 1).setScale(4); break;
                        case 3: entity.sprite2.setTexture("portals", 2).setScale(4); break;
                    }
                }
                if (entity.sprite2 && entity.group === 2) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 4).setScale(4); break;
                        case 1: entity.sprite2.setTexture("portals", 7).setScale(4); break;
                        case 2: entity.sprite2.setTexture("portals", 5).setScale(4); break;
                        case 3: entity.sprite2.setTexture("portals", 6).setScale(4); break;
                    }
                }

                let done = false;
                switch(exit.portal) {
                    case 0: done = this.updatePosition2(0, -1, 2); break;
                    case 1: done = this.updatePosition2(1, 0, 3); break;
                    case 2: done = this.updatePosition2(0, 1, 0); break;
                    case 3: done = this.updatePosition2(-1, 0, 1); break;
                }

                if (!done) {
                    entity.x = savedX;
                    entity.y = savedY;
                    entity.dir = savedDir;
                    entity.portal = savedPortal;
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y);
                    if (entity.sprite2 && entity.group === 1) {
                        entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y+1);
                        switch(entity.portal) {
                            case 0: entity.sprite2.setTexture("portals", 0).setScale(4); break;
                            case 1: entity.sprite2.setTexture("portals", 3).setScale(4); break;
                            case 2: entity.sprite2.setTexture("portals", 1).setScale(4); break;
                            case 3: entity.sprite2.setTexture("portals", 2).setScale(4); break;
                        }
                    }
                    if (entity.sprite2 && entity.group === 2) {
                        entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y+1);
                        switch(entity.portal) {
                            case 0: entity.sprite2.setTexture("portals", 4).setScale(4); break;
                            case 1: entity.sprite2.setTexture("portals", 7).setScale(4); break;
                            case 2: entity.sprite2.setTexture("portals", 5).setScale(4); break;
                            case 3: entity.sprite2.setTexture("portals", 6).setScale(4); break;
                        }
                    }
                    return false;
                }
                }
            } else {
                const otherEntity = this.getEntityAt(newEntityX, newEntityY);

                if (entity.portal !== undefined && entity.portal === this.opposite(dir) && otherEntity) {
                    const entry = entity;
                    const exit = this.findPair(entry.group, entry);

                    if (!exit) {
                        return false;
                    }

                    if (exit === otherEntity) {
                        entry.x = 1000;
                        entry.y = 0;
                        entry.sprite.setPosition(this.offsetX + entry.x * 64, this.offsetY + entry.y * 64);
                        if (entry.sprite2) {
                            entry.sprite2.setPosition(this.offsetX + entry.x * 64, this.offsetY + entry.y * 64);
                        }

                        otherEntity.x = 1000;
                        otherEntity.y = 0;
                        otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64);
                        if (otherEntity.sprite2) {
                            otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64);
                        }
                    } else {
                        const savedX = otherEntity.x;
                        const savedY = otherEntity.y;
                        const savedDir = otherEntity.dir;
                        const savedPortal = otherEntity.portal;

                        let exitX = exit.x;
                        let exitY = exit.y;

                        switch(exit.portal) {
                            case 0: exitY--; break;
                            case 1: exitX++; break;
                            case 2: exitY++; break;
                            case 3: exitX--; break;
                        }

                        if (exitX === savedX && exitY === savedY) {
                            otherEntity.x = 1000;
                            otherEntity.y = 0;
                            otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64);

                            if (otherEntity.sprite2) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64);
                            }
                        } else {
                            this.tempstorage = otherEntity;

                            otherEntity.x = exit.x;
                            otherEntity.y = exit.y;

                            if (otherEntity.dir === undefined || entry.portal === undefined || exit.portal === undefined) {
                                console.log("ERROR: i don't know man. i don't know anymore. i'm done with this shit.");
                                return false;
                            }
                            otherEntity.dir = (((otherEntity.dir + (entry.portal - exit.portal)) % 4) + 4) % 4;

                            if (otherEntity.portal !== undefined) {
                                otherEntity.portal = (((otherEntity.portal + (entry.portal - exit.portal)) % 4) + 4) % 4;
                            }

                            otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y);

                            if (otherEntity.sprite2 && otherEntity.group === 1) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y+1);
                                switch(otherEntity.portal) {
                                    case 0: otherEntity.sprite2.setTexture("portals", 0).setScale(4); break;
                                    case 1: otherEntity.sprite2.setTexture("portals", 3).setScale(4); break;
                                    case 2: otherEntity.sprite2.setTexture("portals", 1).setScale(4); break;
                                    case 3: otherEntity.sprite2.setTexture("portals", 2).setScale(4); break;
                                }
                            }
                            if (otherEntity.sprite2 && otherEntity.group === 2) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y+1);
                                switch(otherEntity.portal) {
                                    case 0: otherEntity.sprite2.setTexture("portals", 4).setScale(4); break;
                                    case 1: otherEntity.sprite2.setTexture("portals", 7).setScale(4); break;
                                    case 2: otherEntity.sprite2.setTexture("portals", 5).setScale(4); break;
                                    case 3: otherEntity.sprite2.setTexture("portals", 6).setScale(4); break;
                                }
                            }

                            let done = false;

                            switch(exit.portal) {
                                case 0: done = this.updatePosition2(0, -1, 2); break;
                                case 1: done = this.updatePosition2(1, 0, 3); break;
                                case 2: done = this.updatePosition2(0, 1, 0); break;
                                case 3: done = this.updatePosition2(-1, 0, 1); break;
                            }

                            if (!done) {
                                otherEntity.x = savedX;
                                otherEntity.y = savedY;
                                otherEntity.dir = savedDir;
                                otherEntity.portal = savedPortal;

                                otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y);

                                if (otherEntity.sprite2 && otherEntity.group === 1) {
                                    otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y+1);
                                    switch(otherEntity.portal) {
                                        case 0: otherEntity.sprite2.setTexture("portals", 0).setScale(4); break;
                                        case 1: otherEntity.sprite2.setTexture("portals", 3).setScale(4); break;
                                        case 2: otherEntity.sprite2.setTexture("portals", 1).setScale(4); break;
                                        case 3: otherEntity.sprite2.setTexture("portals", 2).setScale(4); break;
                                    }
                                }
                                if (otherEntity.sprite2 && otherEntity.group === 2) {
                                    otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 64, this.offsetY + otherEntity.y * 64).setDepth(2*otherEntity.y+1);
                                    switch(otherEntity.portal) {
                                        case 0: otherEntity.sprite2.setTexture("portals", 4).setScale(4); break;
                                        case 1: otherEntity.sprite2.setTexture("portals", 7).setScale(4); break;
                                        case 2: otherEntity.sprite2.setTexture("portals", 5).setScale(4); break;
                                        case 3: otherEntity.sprite2.setTexture("portals", 6).setScale(4); break;
                                    }
                                }

                                return false;
                            }
                        }

                        entry.x = newEntityX;
                        entry.y = newEntityY;
                        entry.sprite.setPosition(
                            this.offsetX + entry.x * 64,
                            this.offsetY + entry.y * 64
                        );

                        if (entry.sprite2) {
                            entry.sprite2.setPosition(
                                this.offsetX + entry.x * 64,
                                this.offsetY + entry.y * 64
                            );
                        }
                    }
                } else {
                    if (this.isWall(newEntityX, newEntityY) || this.getEntityAt(newEntityX, newEntityY)) {
                        return false;
                    }
                    entity.x = newEntityX;
                    entity.y = newEntityY;
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64); entity.sprite.setDepth(2*entity.y);
                    if (entity.sprite2) {entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64); entity.sprite2.setDepth(2*entity.y+1)}
                }
            }
        }
        player.x = newX;
        player.y = newY;
        player.dir = dx !== 0 ? dx : dy;

        const facing = this.opposite(dir);
        player.sprite.setScale(4).setDepth(2*player.y);
        this.animatePlayer(player, facing);


        const flag = this.entities.find(entity => entity.type === "flag");
        if (flag && player.x === flag.x && player.y === flag.y && this.winConditionsMet() && this.winConditionsMet2()) {
            this.entities = [];
            for (const laser of this.lasers) laser.destroy();
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
        return true;
        }
        console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
        return false;
    }

    private updatePosition2(dx: number, dy: number, dir: number): boolean {
        if (!this.tempstorage) {
            console.log("ERROR:TEMPSTORAGE IS UNEXPECTEDLY UNDEFINED. something has gone terribly wrong. ");
            return false;
        }
        const newX = this.tempstorage.x + dx;
        const newY = this.tempstorage.y + dy;

        if (this.getPortalAt(newX, newY, dir)) {
            const entry = this.getPortalAt(newX, newY);
            if (!entry){
                console.log("ERROR: I GENUINELY DON'T KNOW HOW YOU GOT HERE BUT A PORTAL STOPPED EXISTING BETWEEN 2 CONSECUTIVE LINES");
                return false;
            }
            const exit = this.findPair(entry.group, entry);
            if (!exit) {
                console.log("ERROR: COULD NOT FIND EXIT PORTAL @ gamescene.ts; this.findPair unexpectedly returned undefined");
                return false;
            }
            this.tempstorage.x = exit.x;
            this.tempstorage.y = exit.y;
            this.tempstorage.dir = exit.portal;
            this.tempstorage.sprite.setPosition(this.offsetX + this.tempstorage.x * 64, this.offsetY + this.tempstorage.y * 64);
            this.tempstorage.sprite.setDepth(2*this.tempstorage.y)
            switch(exit.portal) {
                case 0: return this.updatePosition2(0, -1, 2);
                case 1: return this.updatePosition2(1, 0, 3);
                case 2: return this.updatePosition2(0, 1, 0);
                case 3: return this.updatePosition2(-1, 0, 1);
            }
            return true;
        }

        if (this.isWall(newX, newY) || this.getEntityAt(newX, newY)) {
            return false;
        }

        this.tempstorage.x = newX;
        this.tempstorage.y = newY;
        this.tempstorage.sprite.setPosition(this.offsetX + newX * 64, this.offsetY + newY * 64);
        if (this.tempstorage.sprite2 && this.tempstorage.group === 1) {
            this.tempstorage.sprite2.setPosition(this.offsetX + this.tempstorage.x * 64, this.offsetY + this.tempstorage.y * 64);
            switch(this.tempstorage.portal) {
                case 0: this.tempstorage.sprite2.setTexture("portals", 0).setScale(4); break;
                case 1: this.tempstorage.sprite2.setTexture("portals", 3).setScale(4); break;
                case 2: this.tempstorage.sprite2.setTexture("portals", 1).setScale(4); break;
                case 3: this.tempstorage.sprite2.setTexture("portals", 2).setScale(4); break;
            }
        }   
        if (this.tempstorage.sprite2 && this.tempstorage.group === 2) {
            this.tempstorage.sprite2.setPosition(this.offsetX + this.tempstorage.x * 64, this.offsetY + this.tempstorage.y * 64);
            switch(this.tempstorage.portal) {
                case 0: this.tempstorage.sprite2.setTexture("portals", 4).setScale(4); break;
                case 1: this.tempstorage.sprite2.setTexture("portals", 7).setScale(4); break;
                case 2: this.tempstorage.sprite2.setTexture("portals", 5).setScale(4); break;
                case 3: this.tempstorage.sprite2.setTexture("portals", 6).setScale(4); break;
            }
        }   
        return true;
    }

    private animatePlayer(player: Entity, facing: number | undefined) {
        let animation = "";
        if (!this.movenumber == true) {
            switch(facing) {
                case 0: animation = "lindsey-up"; break;
                case 1: animation = "lindsey-right"; break;
                case 2: animation = "lindsey-down"; break;
                case 3: animation = "lindsey-left"; break;
            }
        }
        else {
            switch(facing) {
                case 0: animation = "lindsey-up2"; break;
                case 1: animation = "lindsey-right2"; break;
                case 2: animation = "lindsey-down2"; break;
                case 3: animation = "lindsey-left2"; break;
            }
        }

        this.playerMoving = true;
        this.holdBufferOpen = false;
        player.sprite.play(animation);

        this.time.delayedCall(160, () => {
            if (this.playerMoving) {
                this.holdBufferOpen = true;
            }
        });

        this.playerTween = this.tweens.add({
            targets: player.sprite,
            x: this.offsetX + player.x * 64,
            y: this.offsetY + player.y * 64,
            duration: 250,
            ease: "Linear",
            onComplete: () => {
                player.sprite.stop();
                player.sprite.setTexture("lindsey", facing);
                this.playerMoving = false;
                this.holdBufferOpen = false;
                this.playerTween = undefined;
            }
        });
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
        this.load.spritesheet("spritestall1x1", "assets/spritesTall1x1.png", {
            frameWidth: 16,
            frameHeight: 23,
        });
        this.load.spritesheet("portals", "assets/portalsheet1.png", {
            frameWidth: 16,
            frameHeight: 23,
        });
        this.load.text("level1", `assets/level1.txt`);
    }

    create() {
        this.entities = [];
        this.history = [];
        this.lasers = [];

        if (!this.anims.exists("lindsey-up")) {
            this.anims.create({
                key: "lindsey-up",
                frames: [
                    { key: "lindsey", frame: 0 },
                    { key: "lindsey", frame: 4 },
                    { key: "lindsey", frame: 8 },
                    { key: "lindsey", frame: 12 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-up2",
                frames: [
                    { key: "lindsey", frame: 16 },
                    { key: "lindsey", frame: 20 },
                    { key: "lindsey", frame: 24 },
                    { key: "lindsey", frame: 28 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-right",
                frames: [
                    { key: "lindsey", frame: 1 },
                    { key: "lindsey", frame: 5 },
                    { key: "lindsey", frame: 9 },
                    { key: "lindsey", frame: 13 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-right2",
                frames: [
                    { key: "lindsey", frame: 17 },
                    { key: "lindsey", frame: 21 },
                    { key: "lindsey", frame: 25 },
                    { key: "lindsey", frame: 29 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-down",
                frames: [
                    { key: "lindsey", frame: 2 },
                    { key: "lindsey", frame: 6 },
                    { key: "lindsey", frame: 10 },
                    { key: "lindsey", frame: 14 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-down2",
                frames: [
                    { key: "lindsey", frame: 18 },
                    { key: "lindsey", frame: 22 },
                    { key: "lindsey", frame: 26 },
                    { key: "lindsey", frame: 30 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-left",
                frames: [
                    { key: "lindsey", frame: 3 },
                    { key: "lindsey", frame: 7 },
                    { key: "lindsey", frame: 11 },
                    { key: "lindsey", frame: 15 }
                ],
                frameRate: 16,
                repeat: -1
            });
            this.anims.create({
                key: "lindsey-left2",
                frames: [
                    { key: "lindsey", frame: 19 },
                    { key: "lindsey", frame: 23 },
                    { key: "lindsey", frame: 27 },
                    { key: "lindsey", frame: 31 }
                ],
                frameRate: 16,
                repeat: -1
            });
        }

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
        this.offsetX = (864 - this.staticRows[0].length * 64) / 2 + 32;
        this.offsetY = (664 - this.staticRows.length * 64) / 2 + 32;

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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 1).setOrigin(1,1).setScale(4).setDepth(2*y)
                        });
                        break;
                    case "X":
                        this.entities.push ({
                        type: "goal",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Goal).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "flag",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Flag1).setOrigin(1,1).setScale(2).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "lindsey", 2).setOrigin(1,1).setScale(4).setDepth(2*y)
                        });
                        break;
                    case "b":
                        this.entities.push ({
                        type: "box",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 0).setOrigin(1,1).setScale(4).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorW).setOrigin(1,1).setScale(2).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorA).setOrigin(1,1).setScale(2).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorS).setOrigin(1,1).setScale(2).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.LaserEmissorD).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "i":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "j":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "k":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "l":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.Reciever).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "t":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorREmpty).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorLEmpty).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "g":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorREmpty).setOrigin(1,1).setScale(2).setDepth(2*y)
                        });
                        break;
                    case "h":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "tiles", Tile.MirrorLEmpty).setOrigin(1,1).setScale(2).setDepth(2*y)
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
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 0).setOrigin(1,1).setScale(4).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 0).setOrigin(1,1).setScale(4).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 0).setOrigin(1,1).setScale(4).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "a":
                        if (entity){
                            entity.portal = 3;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 2).setOrigin(1,1).setScale(4).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 0).setOrigin(1,1).setScale(4).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 2).setOrigin(1,1).setScale(4).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "s":
                        if (entity){
                            entity.portal = 2;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 1).setOrigin(1,1).setScale(4).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 0).setOrigin(1,1).setScale(4).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 1).setOrigin(1,1).setScale(4).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "d":
                        if (entity){
                            entity.portal = 1;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", 3).setOrigin(1,1).setScale(4).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "spritestall1x1", 3).setOrigin(1,1).setScale(4).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*64, this.offsetY+y*64, "portals", Tile.PortalD).setOrigin(1,1).setScale(4).setDepth(2*y+1)
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

        const portals2: Entity[] = this.entities.filter(entity => entity.portal !== undefined && entity.group === 2);
        for(let i = 0; i<portals2.length; i++) {
            switch(portals2[i].portal)
            {
                case 0: portals2[i].sprite2.setTexture("portals", 4); break;
                case 1: portals2[i].sprite2.setTexture("portals", 7); break;
                case 2: portals2[i].sprite2.setTexture("portals", 5); break;
                case 3: portals2[i].sprite2.setTexture("portals", 6); break;
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

    private doMovement(direction: string) {
        const player = this.entities.find(entity => entity.type === "player");
        if (direction === "left") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 3;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            this.updatePosition(-1, 0, 1);
            this.playerVertical = false; 
        }

        if (direction === "right") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 1;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            this.updatePosition(1, 0, 3);
            this.playerVertical = false; 
        }

        if (direction === "up") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            this.updatePosition(0, -1, 2);
            this.playerVertical = true; 
        }

        if (direction === "down") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 2;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            this.updatePosition(0, 1, 0);
            this.playerVertical = true; 
        }

        for (const laser of this.lasers) {
            laser.destroy();
        }
        
        this.lasers = [];
        this.laserFunction();
        this.flagCheck();
    }

    update() {
        if (this.playerMoving) {
            if (this.menuup == 0) {
                const player = this.entities.find(entity => entity.type === "player");
                if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "left";
                    if (player.dir === -1 && this.playerVertical === false) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "right";
                    if (player.dir === 1 && this.playerVertical === false) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer ="up";
                    if (player.dir === -1 && this.playerVertical === true) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "down";
                    if (player.dir === 1 && this.playerVertical === true) this.playerTween?.setTimeScale(50);
                }
                else if (this.holdBufferOpen && this.inputBuffer === "") {
                    if (this.cursors.left!.isDown){
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer = "left";
                    }

                    else if (this.cursors.right!.isDown) {
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer = "right";
                    }

                    else if (this.cursors.up!.isDown) {
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer ="up";
                    }

                    else if (this.cursors.down!.isDown) {
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer = "down";
                    }
                }
            }
            return;
        }

        if (this.inputBuffer !== "") {
            const direction = this.inputBuffer;
            this.inputBuffer = "";

            this.doMovement(direction);
            return;
        }

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

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("left");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("right");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("up");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("down");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.menuup == 0) {
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber});
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.menuup == 0) {
            this.entities = [];
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
        if (Phaser.Input.Keyboard.JustDown(this.escKey) && this.menuup == 0) {
            this.menuup = 1;
            this.selected = 0;
            this.menuOverlay.setVisible(true);
            for (const item of this.menuItems) item.setVisible(true);
            this.updateMenu();
        }
        if (Phaser.Input.Keyboard.JustDown(this.zKey) && this.menuup == 0) {7
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
                entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y);
                if (entity.sprite2 && entity.group == 1) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y+1);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 0).setScale(4); break;
                        case 1: entity.sprite2.setTexture("portals", 3).setScale(4); break;
                        case 2: entity.sprite2.setTexture("portals", 1).setScale(4); break;
                        case 3: entity.sprite2.setTexture("portals", 2).setScale(4); break;
                    }
                }
                if (entity.sprite2 && entity.group == 2) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64).setDepth(2*entity.y+1);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 4).setScale(4); break;
                        case 1: entity.sprite2.setTexture("portals", 7).setScale(4); break;
                        case 2: entity.sprite2.setTexture("portals", 5).setScale(4); break;
                        case 3: entity.sprite2.setTexture("portals", 6).setScale(4); break;
                    }
                }
                if (entity.type === "player") {
                    entity.sprite.setTexture("lindsey", entity.dir).setScale(4).setDepth(10);
                    entity.sprite.setPosition(this.offsetX + entity.x * 64, this.offsetY + entity.y * 64);
                }
            }
            for (const laser of this.lasers) {
                laser.destroy();
            }
            this.laserFunction();
        }
    }
}