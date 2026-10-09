import Phaser from "phaser";

import { obtenerNivel } from "./niveles";
import { convertirNivel } from "./parser";

interface Entity {
    type: string;
    x: number;
    y: number;
    dir?: number;
    emitting?: number;
    portal?: number;
    group?: number;
    pushable: boolean;
    secret?: string;
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

interface LaserVisual {
    body: Phaser.GameObjects.Sprite;
    cap?: Phaser.GameObjects.Sprite;
    tail?: Phaser.GameObjects.Sprite;
    maskFilter?: any;
    maskShape?: Phaser.GameObjects.Rectangle;
    maskFilter2?: any;
    maskShape2?: Phaser.GameObjects.Rectangle;
    dir: number;
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
    private history: GameState[] = [];
    //private levelMode = 0;

    init(data: any) {
        this.testeando = false;
        this.modoTest = false;
        this.nivelTest = "";
        this.nivelId = "";
        this.levelNumber = 1;
        this.escenaAnterior = "menu";
        if (data === undefined || data === null) {
            return;
        }
        if (typeof data.escenaAnterior === "string") {
            this.escenaAnterior = data.escenaAnterior;
        }
        if (typeof data.nivelId === "string") {
            this.nivelId = data.nivelId;
        }
        if (data.testeando === true) {
            this.testeando = true;
        }
        if (data.modoTest === true) {
            this.modoTest = true;
            if (typeof data.nivelTest === "string") {
                this.nivelTest = data.nivelTest;
            }
            return;
        }
        if (typeof data.level === "number") {
            this.levelNumber = data.level;
        }
        if (data.history !== undefined) {
            this.history = data.history;
        }
    }

    private menuup = 0;
    private menuOverlay!: Phaser.GameObjects.Rectangle;
    private objetosMenuPausa: Phaser.GameObjects.GameObject[] = [];
    private pixelmultiplier: number = 3.33                     // TODO: make this adjustable in settings
    private tilesize: number = this.pixelmultiplier*16;                   // TODO: make this adjustable in settings
    private animationspeed: number = 18;
    private lindseyspeed: number = this.animationspeed*11.94;  
    private laser: any;
    private emitterQueue: Entity[] = [];
    private firedEmitters: Entity[] = [];
    private tempstorage: Entity | undefined;
    private tempstorage2a: Phaser.GameObjects.Sprite | undefined;
    private tempstorage2b: Phaser.GameObjects.Sprite | undefined;
    private tempstorage3: Entity | undefined;
    private movenumber: Boolean = false;
    private playerMoving = false;
    private inputBuffer: string = "";
    private holdBufferOpen: Boolean = false;
    private playerTween: Phaser.Tweens.Tween | undefined;
    private pushTweens: Phaser.Tweens.Tween[] = [];
    private playerVertical: Boolean = true;
    private portalTweens: Phaser.Tweens.Tween[] = [];
    private playerPortalMask: any;
    private maskFilter: any;
    private maskFilter2: any;
    private qKey!: Phaser.Input.Keyboard.Key;
    private rKey!: Phaser.Input.Keyboard.Key;
    private zKey!: Phaser.Input.Keyboard.Key;
    private escKey!: Phaser.Input.Keyboard.Key;
    private entities: Entity[] = [];
    private lasers: LaserVisual[] = [];
    private offsetX = 0;
    private offsetY = 0;
    private altoBarra = 68;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private staticRows: any;
    private deathmessage: Phaser.GameObjects.Text | undefined;


    //TEST

    private escenaAnterior = "menu";
    private modoTest = false;
    private nivelTest = "";
    private nivelId = "";
    private testeando = false;

    ////////////////////////
    //BRUNO COSAS DEL MENU//
    ////////////////////////

    private obtenerNombreNivel() {
        if (this.nivelId !== "") {
            const nivel = obtenerNivel(this.nivelId);
            if (nivel !== undefined) {
                return nivel.nombre;
            }
        }
        if (this.modoTest) {
            return "Untitled Level";
        }
        return "Nivel " + this.levelNumber;
    }

    private crearBotonJuego(
        x: number,
        y: number,
        ancho: number,
        texto: string,
        color: number,
        profundidad: number,
        accion: () => void
    ) {
    const objetos: Phaser.GameObjects.GameObject[] = [];
    const sombra = this.add.rectangle(
        x + 3,
        y + 3,
        ancho + 4,
        44,
        0x14121e
    );
    sombra.setDepth(profundidad);
    objetos.push(sombra);
    const fondo = this.add.rectangle(
        x,
        y,
        ancho,
        40,
        color
    );
    fondo.setStrokeStyle(4, 0x222034);
    fondo.setDepth(profundidad + 1);
    fondo.setInteractive({
        useHandCursor: true
    });
    objetos.push(fondo);
    const etiqueta = this.add.text(
        x,
        y,
        texto,
        {
            fontFamily: "Fuente",
            fontSize: "16px",
            color: "#222034",
        }
    );
    etiqueta.setOrigin(0.5);
    etiqueta.setDepth(profundidad + 2);
    objetos.push(etiqueta);
    fondo.on("pointerover", () => {
        fondo.setAlpha(0.8);
    });
    fondo.on("pointerout", () => {
        fondo.setAlpha(1);
    });
    fondo.on("pointerdown", () => {
        accion();
    });
    return objetos;
}

private crearBarraSuperior() {
    const alto = this.altoBarra;

    const separacion = 12;
    const margen = separacion / 2;

    const anchoBoton = 96;

    const y = 30;

    const xPausa =
        this.scale.width -
        margen -
        anchoBoton / 2 -
        5;

    const xReset =
        xPausa -
        anchoBoton -
        separacion -
        5;

    const xDeshacer =
        xReset -
        anchoBoton -
        separacion -
        5;

    const barra = this.add.rectangle(
        this.scale.width / 2,
        alto / 2,
        this.scale.width,
        alto,
        0x171a2e
    );

    barra.setDepth(900);

    const bordeInferior = this.add.rectangle(
        this.scale.width / 2,
        alto - 2,
        this.scale.width,
        4,
        0x6f87b0
    );

    bordeInferior.setDepth(901);

    const nombreCompleto = this.obtenerNombreNivel();

    const nombre = this.add.text(
    margen*2,
    alto / 2,
    nombreCompleto,
    {
        fontFamily: "Fuente",
        fontSize: "18px",
        color: "#ffffff",
    }
    );

nombre.setOrigin(0, 0.5);

    nombre.setOrigin(0, 0.5);
    nombre.setDepth(902);

    let nombreVisible = nombreCompleto;

    const anchoMaximo =
        xDeshacer -
        anchoBoton / 2 -
        separacion -
        nombre.x - 150;

    while (
        nombre.width > anchoMaximo &&
        nombreVisible.length > 0
    ) {
        nombreVisible = nombreVisible.substring(
            0,
            nombreVisible.length - 1
        );

        nombre.setText(nombreVisible + "...");
    }
    if (this.modoTest || this.nivelId !== "") {
        const etiquetaTest = this.add.text(
            nombre.x + nombre.width + 8,
            nombre.y,
            "Test Mode",
            {
                fontFamily: "Fuente",
                fontSize: "18px",
                color: "#ffd166",
            }
        );
        etiquetaTest.setOrigin(0, 0.5);
        etiquetaTest.setDepth(902);
    }
    const objetosDeshacer = this.crearBotonJuego(
        xDeshacer,
        y,
        anchoBoton,
        "Undo",
        0x9ccc65,
        903,
        () => {
            if (this.history.length === 0) {
                return;
            }

            this.undoMove();
        }
    );

    const objetosReset = this.crearBotonJuego(
        xReset,
        y,
        anchoBoton,
        "Reset",
        0xe6c56a,
        903,
        () => {
            if (this.history.length === 0) {
                return;
            }

            this.reiniciarNivel();
        }
    );

    this.crearBotonJuego(
        xPausa,
        y,
        anchoBoton,
        "Pause",
        0xb39ddb,
        903,
        () => {
            this.abrirMenuPausa();
        }
    );

    const botonDeshacer =
        objetosDeshacer[1] as Phaser.GameObjects.Rectangle;

    const botonReset =
        objetosReset[1] as Phaser.GameObjects.Rectangle;

    const actualizarBotones = () => {
        if (this.history.length === 0) {
            botonDeshacer.disableInteractive();
            botonReset.disableInteractive();

            botonDeshacer.setFillStyle(0x79869e);
            botonReset.setFillStyle(0x79869e);

            botonDeshacer.setAlpha(1);
            botonReset.setAlpha(1);
        } else {
            botonDeshacer.setInteractive({
                useHandCursor: true
            });

            botonReset.setInteractive({
                useHandCursor: true
            });

            botonDeshacer.setFillStyle(0x9ccc65);
            botonReset.setFillStyle(0xe6c56a);
        }
    };

    actualizarBotones();

    this.events.on(
        Phaser.Scenes.Events.UPDATE,
        actualizarBotones
    );

    this.events.once(
        Phaser.Scenes.Events.SHUTDOWN,
        () => {
            this.events.off(
                Phaser.Scenes.Events.UPDATE,
                actualizarBotones
            );
        }
    );
}

    private reiniciarNivel() {
        this.scene.restart({
            modoTest: this.modoTest,
            nivelTest: this.nivelTest,
            nivelId: this.nivelId,
            level: this.levelNumber
        });
    }

    private undoMove() {
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
            entity.sprite.setPosition(this.offsetX + entity.x * 16 * this.pixelmultiplier, this.offsetY + entity.y * 16 * this.pixelmultiplier).setDepth(2*entity.y);
            if (entity.sprite2 && entity.group == 1 && entity.type === "wall") {
                entity.sprite2.setPosition(this.offsetX + entity.x * 16 * this.pixelmultiplier, this.offsetY + entity.y * 16 * this.pixelmultiplier - 3 * this.pixelmultiplier).setDepth(2*entity.y+1);
                switch(entity.portal) {
                    case 0: entity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                    case 1: entity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                    case 2: entity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                    case 3: entity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                }
            }
            if (entity.sprite2 && entity.group == 2 && entity.type === "wall") {
                entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier - 3*this.pixelmultiplier).setDepth(2*entity.y+1);
                switch(entity.portal) {
                    case 0: entity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                    case 1: entity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                    case 2: entity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                    case 3: entity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                }
            }
            if (entity.sprite2 && entity.group == 1 && entity.type !== "wall") {
                entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier).setDepth(2*entity.y+1);
                switch(entity.portal) {
                    case 0: entity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                    case 1: entity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                    case 2: entity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                    case 3: entity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                }
            }
            if (entity.sprite2 && entity.group == 2 && entity.type !== "wall") {
                entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier).setDepth(2*entity.y+1);
                switch(entity.portal) {
                    case 0: entity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                    case 1: entity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                    case 2: entity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                    case 3: entity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                }
            }
            if (entity.type === "player") {
                entity.sprite.setTexture("lindseyi", entity.dir).setScale(this.pixelmultiplier).setDepth(10);
                entity.sprite.setPosition(this.offsetX + entity.x * 16 * this.pixelmultiplier, this.offsetY + entity.y * 16 * this.pixelmultiplier);
            }
            entity.sprite.setDepth(2*entity.y);
            if (entity.sprite2) entity.sprite2.setDepth(2*entity.y+1);
            if (entity.type === "goal") entity.sprite.setDepth(-0.5)
        }
        for (const laser of this.lasers) {
            this.destroyLaser(laser);
        }
        this.laserFunction();
        if (this.menuup == 2) {
            this.menuup = 0;
            this.menuOverlay.setVisible(false);
            if (this.deathmessage) this.deathmessage.setVisible(false);
        }
    }

private abrirMenuPausa() {
    if (this.menuup != 0) {
        return;
    }

    this.menuup = 1;
    this.inputBuffer = "";

    const centroX = this.scale.width / 2;
    const centroY = this.scale.height / 2;

    const capa = this.add.rectangle(
        centroX,
        centroY,
        this.scale.width,
        this.scale.height,
        0x080b17,
        0.72
    );

    capa.setDepth(1000);
    capa.setInteractive();

    this.objetosMenuPausa.push(capa);

    const sombra = this.add.rectangle(
        centroX + 6,
        centroY + 6,
        424,
        304,
        0x080b17
    );

    sombra.setDepth(1001);

    this.objetosMenuPausa.push(sombra);

    const panel = this.add.rectangle(
        centroX,
        centroY,
        420,
        300,
        0x171a2e
    );

    panel.setStrokeStyle(4, 0xb39ddb);
    panel.setDepth(1002);

    this.objetosMenuPausa.push(panel);

    const titulo = this.add.text(
        centroX,
        centroY - 105,
        "PAUSE",
        {
            fontFamily: "Fuente",
            fontSize: "26px",
            color: "#ffffff",
        }
    );

    titulo.setOrigin(0.5);
    titulo.setDepth(1003);

    this.objetosMenuPausa.push(titulo);

    let objetosBoton = this.crearBotonJuego(
        centroX,
        centroY - 35,
        260,
        "Continue",
        0xcbdbfc,
        1004,
        () => {
            this.cerrarMenuPausa();
        }
    );

    for (let i = 0; i < objetosBoton.length; i++) {
        this.objetosMenuPausa.push(objetosBoton[i]);
    }

    objetosBoton = this.crearBotonJuego(
        centroX,
        centroY + 25,
        260,
        "Reset",
        0xe6c56a,
        1004,
        () => {
            this.cerrarMenuPausa();
            this.reiniciarNivel();
        }
    );

    for (let i = 0; i < objetosBoton.length; i++) {
        this.objetosMenuPausa.push(objetosBoton[i]);
    }

    objetosBoton = this.crearBotonJuego(
        centroX,
        centroY + 85,
        260,
        "Exit",
        0xe57373,
        1004,
        () => {
            this.entities = [];
            for (const laser of this.lasers) {
                this.destroyLaser(laser);
            }
            this.lasers = [];
            this.menuup = 0;
            this.playerMoving = false;
            this.inputBuffer = "";
            this.holdBufferOpen = false;
            if (this.scene.isSleeping(this.escenaAnterior)) {
                this.scene.wake(this.escenaAnterior);
                this.scene.stop();
                return;
            }
            this.scene.start(this.escenaAnterior);
        }
    );

    for (let i = 0; i < objetosBoton.length; i++) {
        this.objetosMenuPausa.push(objetosBoton[i]);
    }
}
private cerrarMenuPausa() {
    if (this.menuup != 1) {
        return;
    }

    this.menuup = 0;

    for (let i = 0; i < this.objetosMenuPausa.length; i++) {
        if (this.objetosMenuPausa[i].scene) {
            this.objetosMenuPausa[i].destroy();
        }
    }

    this.objetosMenuPausa = [];
}

    ////////////////////////
    //LUCAS COSAS DEL GAME//
    ////////////////////////

    private opposite(dir: number): number {
        switch(dir) {
            case 0: return 2;
            case 1: return 3;
            case 2: return 0;
            case 3: return 1;
        }
        return 4;
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
    private getEmitterAt(x: number, y: number, dir: number): Entity | undefined {
        return this.entities.find(entity => entity.type === "laserEmissor" && entity.x === x && entity.y === y && entity.dir === dir);
    }
    private getAnythingAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.x === x && entity.y === y);
    }
    private getMirrorAt(x: number, y: number): Entity | undefined {
        return this.entities.find(entity => entity.x === x && entity.y === y && entity.type === "mirror");
    }
    private getViableMirrorAt(x: number, y: number, dir: number): Entity | undefined {
        return this.entities.find(entity => entity.x === x && entity.y === y && entity.type === "mirror" && (entity.dir === this.opposite(dir) || this.opposite(dir+1)));
    }

    private findPair(group: number | undefined, exclude: Entity | undefined): Entity | undefined {
        return (this.entities.find(entity => entity.portal !== undefined && entity.group === group && entity !== exclude));
    }
    
    private createLaserBody(x: number, y: number, dir: number): LaserVisual {
        let frame = 0;
        let animation = "";

        if (dir === 0) {
            frame = 1;
            animation = "laser-vertical2";
        }

        if (dir === 1) {
            frame = 0;
            animation = "laser-horizontal";
        }

        if (dir === 2) {
            frame = 1;
            animation = "laser-vertical";
        }

        if (dir === 3) {
            frame = 0;
            animation = "laser-horizontal2";
        }

        const body = this.add.sprite(this.offsetX + x * this.tilesize, this.offsetY + y * this.tilesize, "laserBody", frame);
        body.setOrigin(1, 1);
        body.setScale(this.pixelmultiplier);
        this.playLaserAnimation(body, animation);
        const visual: LaserVisual = {body: body, dir: dir};

        return visual;
    }
    
    private addLaserCap(laser: LaserVisual) {
        const body = laser.body;       
        let frame = 0;
        let origina = 0;
        let originb = 0;

        switch (laser.dir) {
            case 0: frame = 1.5*Math.PI; originb = 0.751; break;
            case 1: frame = 0; origina = 0.8; originb = 0.8; break;
            case 2: frame = 0.5*Math.PI; origina = 0.8; originb = 0.178; break;
            case 3: frame = Math.PI; originb = 0.178; break;
        }
        const cap = this.add.sprite(body.x, body.y, "laserheads", 1).setRotation(frame);

        cap.setOrigin(origina, originb);
        cap.setScale(this.pixelmultiplier);
        cap.setDepth(body.depth + 6); 
        this.playLaserAnimation(cap, "laserhead");
        laser.cap = cap;
    }
    
    private addLaserTail(laser: LaserVisual) {
        const body = laser.body;
        let frame = 4;
        switch (laser.dir) {
            case 0: frame = 3; break;
            case 1: frame = 0; break;
            case 2: frame = 2; break;
            case 3: frame = 1; break;
        }
        const tail = this.add.sprite(body.x, body.y, "lasertails", frame);

        tail.setOrigin(1, 1);
        tail.setScale(this.pixelmultiplier);
        tail.setDepth(body.depth);

        const cut = 4 * this.pixelmultiplier;

        let maskX = body.x - this.tilesize;
        let maskY = body.y - this.tilesize;
        let maskW = this.tilesize;
        let maskH = this.tilesize;

        switch(laser.dir) {
            case 2:
                maskY += cut;
                maskH -= cut;
                break;
            case 3:
                maskW -= cut;
                break;
            case 0:
                maskH -= cut;
                break;
            case 1:
                maskX += cut;
                maskW -= cut;
                break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);

        const masks = Phaser.Actions.AddMaskShape(body, {
                shape: "rectangle",
                region: region
            }
        );
        const maskFilter = masks[0];
        const maskShape = maskFilter.maskGameObject as Phaser.GameObjects.Rectangle;

        laser.tail = tail;
        laser.maskFilter2 = maskFilter;
        laser.maskShape2 = maskShape;
    }

    private addLaser(x: number, y: number, dir: number, first: boolean = false): LaserVisual | undefined {
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
                    case 2: this.setEmitting(mirror, 1); break;
                    case 3: this.setEmitting(mirror, 3); break;
                }
                return;
            case 1:
                switch(mirror.dir) {
                    case 0: this.setEmitting(mirror, 0); break;
                    case 1: return;
                    case 2: return;
                    case 3: this.setEmitting(mirror, 2); break;
                }
                return;
            case 2:
                switch(mirror.dir) {
                    case 0: this.setEmitting(mirror, 3); break;
                    case 1: this.setEmitting(mirror, 1); break;
                    case 2: return;
                    case 3: return;
                }
                return;
            case 3:
                switch(mirror.dir) {
                    case 0: return;
                    case 1: this.setEmitting(mirror, 0);  break;
                    case 2: this.setEmitting(mirror, 2);  break;
                    case 3: return;
                }   
                return;
            }
            }
        }
        const laser = this.createLaserBody(nextX, nextY, dir);
        this.lasers.push(laser);
        if (first) {
            this.addLaserTail(laser);
        }
        const nextLaser = this.addLaser(nextX, nextY, dir, false);
        let last: boolean;
        if (!nextLaser) last = true;
        else last = false;
        if (last === true && !this.getPortalAt(nextX + dx, nextY + dy) && !this.getViableMirrorAt(nextX + dx, nextY + dy, dir)) {
            this.addLaserCap(laser);
        }
        return laser;
    }

    private destroyLaser(laser: LaserVisual) {

        if (laser.cap) {
            laser.cap.destroy();
            laser.cap = undefined;
        }

        if (laser.tail) {
            laser.tail.destroy();
            laser.tail = undefined;
        }

        laser.body.destroy();

        if (laser.maskFilter) {
            if (laser.body.filters) {
                laser.body.filters.external.remove(
                    laser.maskFilter
                );
            }

            laser.maskFilter = undefined;
        }

        if (laser.maskFilter2) {
            if (laser.body.filters) {
                laser.body.filters.external.remove(
                    laser.maskFilter2
                );
            }

            laser.maskFilter2 = undefined;
        }

        if (laser.maskShape) {
            laser.maskShape.destroy();
            laser.maskShape = undefined;
        }

        if (laser.maskShape2) {
            laser.maskShape2.destroy();
            laser.maskShape2 = undefined;
        }

        laser.body.destroy();
    }

    private setEmitting(entity: Entity, dir: number | undefined) {
        entity.emitting = dir;

        if (!this.emitterQueue.includes(entity) && !this.firedEmitters.includes(entity)) {
            this.emitterQueue.push(entity);
        }
    }

    private playLaserAnimation(laser: Phaser.GameObjects.Sprite, animation: string) {
        const frameRate = this.animationspeed * 1.5;
        const totalFrames = 8;
        const millisecondsPerFrame = 1000 / frameRate;
        const frame = Math.floor(this.time.now / millisecondsPerFrame) % totalFrames;

        laser.play({key: animation, startFrame: frame});
    }
        
    private raycast() {
        while (this.emitterQueue.length > 0) {
            const emitter = this.emitterQueue.shift();

            if (!emitter) continue;
            if (this.firedEmitters.includes(emitter)) continue;
            if (emitter.emitting === undefined) continue;

            this.firedEmitters.push(emitter);

            let first = false;
            if (emitter.type === "laserEmissor") {
                first = true;
            }
            this.addLaser(
                emitter.x,
                emitter.y,
                emitter.emitting,
                first
            );
        }
    }
    
    private lindseyDeath(): boolean {
        const player = this.entities.find(entity => entity.type === "player");
        if (player === undefined) {console.log("ERROR: there is no player, idiot."); return true;}
        const currX = player.x;
        const currY = player.y;
        if (this.lasers.find((laser) => (laser.body.x === this.offsetX + currX * this.tilesize && laser.body.y === this.offsetY + (currY-1) * this.tilesize && laser.dir === 2)) || this.entities.find((emissor) => (emissor.y === currY-1 && emissor.x === currX && emissor.emitting === 2))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.body.y === this.offsetY + currY * this.tilesize && laser.body.x === this.offsetX + (currX+1) * this.tilesize && laser.dir == 3)) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX+1 && emissor.emitting === 3))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.body.x === this.offsetX + currX * this.tilesize && laser.body.y === this.offsetY + (currY+1) * this.tilesize && laser.dir == 0)) || this.entities.find((emissor) => (emissor.y === currY+1 && emissor.x === currX && emissor.emitting === 0))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.body.y === this.offsetY + currY * this.tilesize && laser.body.x === this.offsetX + (currX-1) * this.tilesize && laser.dir == 1)) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX-1 && emissor.emitting === 1))) {
            return true;
        }
        return false;
    }

    private laserFunction() {
        for (const laser of this.lasers) {
            this.destroyLaser(laser);
        }
        this.lasers = [];
        this.emitterQueue = [];
        this.firedEmitters = [];
        const mirrors = this.entities.filter(entity => entity.type === "mirror");
        if (mirrors) {
            for (const mirror of mirrors) {
                mirror.emitting = undefined;
            }
        }
        const emissors = this.entities.filter(entity => entity.type === "laserEmissor");
        if (emissors) {
            for (const emissor of emissors) {
                this.setEmitting(emissor, emissor.dir);
                switch(emissor.dir) {
                    case 0: emissor.sprite.setTexture("tileset-fogo", 10); break;
                    case 1: emissor.sprite.setTexture("tileset-fogo", 13); break;
                    case 2: emissor.sprite.setTexture("tileset-fogo", 11); break;
                    case 3: emissor.sprite.setTexture("tileset-fogo", 12); break;
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
            const box = this.entities.find(entity => entity.pushable ===true && entity.x === goal.x && entity.y === goal.y);
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
        let activated = false;
        switch (reciever.dir) {
            case 0:
                if (
                    this.lasers.find((laser) =>
                        laser.body.x === this.offsetX + currX * 16 * this.pixelmultiplier &&
                        laser.body.y === this.offsetY + (currY - 1) * 16 * this.pixelmultiplier &&
                        laser.dir === 2
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY - 1 &&
                        emissor.x === currX &&
                        emissor.emitting === 2
                    )
                ) {
                    activated = true;
                }
                break;
            case 1:
                if (
                    this.lasers.find((laser) =>
                        laser.body.y === this.offsetY + currY * 16 * this.pixelmultiplier &&
                        laser.body.x === this.offsetX + (currX + 1) * 16 * this.pixelmultiplier &&
                        laser.dir === 3
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY &&
                        emissor.x === currX + 1 &&
                        emissor.emitting === 3
                    )
                ) {
                    activated = true;
                }
                break;
            case 2:
                if (
                    this.lasers.find((laser) =>
                        laser.body.x === this.offsetX + currX * 16 * this.pixelmultiplier &&
                        laser.body.y === this.offsetY + (currY + 1) * 16 * this.pixelmultiplier &&
                        laser.dir === 0
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY + 1 &&
                        emissor.x === currX &&
                        emissor.emitting === 0
                    )
                ) {
                    activated = true;
                }
                break;
            case 3:
                if (
                    this.lasers.find((laser) =>
                        laser.body.y === this.offsetY + currY * 16 * this.pixelmultiplier &&
                        laser.body.x === this.offsetX + (currX - 1) * 16 * this.pixelmultiplier &&
                        laser.dir === 1
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY &&
                        emissor.x === currX - 1 &&
                        emissor.emitting === 1
                    )
                ) {
                    activated = true;
                }
                break;
        }
        if (activated === false) {
            return false;
        }
    }
    return true;
}

    private flagCheck() {
        const flag = this.entities.find(entity => entity.secret === "flag");
        if (!flag) {
            return;
        }
        if (!this.winConditionsMet()) {
            flag.sprite.setTexture("tiles", Tile.Flag0).setScale(this.pixelmultiplier/2);
            flag.type = "wall";
        } else if (!this.winConditionsMet2()) {
	        flag.sprite.setTexture("tiles", Tile.Flag0).setScale(this.pixelmultiplier/2);
            flag.type = "wall";
        } else {
            flag.sprite.setTexture("tiles", Tile.Flag1).setScale(this.pixelmultiplier/2);
            flag.type = "flag";
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
            player.sprite.setPosition(this.offsetX + player.x * 16*this.pixelmultiplier, this.offsetY + player.y * 16*this.pixelmultiplier).setDepth(2*player.y);

            let success = false;
            switch(exit.portal) {
                case 0: success = this.updatePosition(0, -1, 2, origDx, origDy, origDir); break;
                case 1: success = this.updatePosition(1, 0, 3, origDx, origDy, origDir); break;
                case 2: success = this.updatePosition(0, 1, 0, origDx, origDy, origDir); break;
                case 3: success = this.updatePosition(-1, 0, 1, origDx, origDy, origDir); break;
            }

            if (!success) {
                player.y = savedPlayerY;
                player.x = savedPlayerX;
                player.dir = savedPlayerDir;
                player.sprite.setPosition(this.offsetX + savedPlayerX * this.tilesize, this.offsetY + savedPlayerY * this.tilesize).setDepth(2 * player.y);
                return false;
            }
            this.animatePortalEntry(savedPlayerX, savedPlayerY, entry.x, entry.y, entry.portal, this.opposite(dir));
                    this.maskPlayerPortal(player, exit.x, exit.y, exit.portal);
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
                player.sprite.setPosition(this.offsetX + player.x * 16*this.pixelmultiplier, this.offsetY + player.y * 16*this.pixelmultiplier).setDepth(2*player.y);

                let teleportSucceeded = false;
                switch(exit.portal) {
                    case 0: teleportSucceeded = this.updatePosition(0, -1, 2, origDx, origDy, origDir); break;
                    case 1: teleportSucceeded = this.updatePosition(1, 0, 3, origDx, origDy, origDir); break;
                    case 2: teleportSucceeded = this.updatePosition(0, 1, 0, origDx, origDy, origDir); break;
                    case 3: teleportSucceeded = this.updatePosition(-1, 0, 1, origDx, origDy, origDir); break;
                }
                if (teleportSucceeded) {
                    this.animatePortalEntry(savedPlayerX, savedPlayerY, entry.x, entry.y, entry.portal, this.opposite(dir));
                    this.maskPlayerPortal(player, exit.x, exit.y, exit.portal);
                    return true;
                }
                player.x = savedPlayerX; player.y = savedPlayerY; player.dir = savedPlayerDir;
                player.sprite.setPosition(this.offsetX + player.x * 16*this.pixelmultiplier, this.offsetY + player.y * 16*this.pixelmultiplier).setDepth(2 * player.y);
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
                    entry.sprite.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                    if (entry.sprite2) entry.sprite2.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                    entity.x = 1000; entity.y = 0;
                    entity.sprite.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                    if (entity.sprite2) entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                } 
                else {
                const savedX = entity.x, savedY = entity.y, savedDir = entity.dir, savedPortal = entity.portal;
                this.tempstorage2a = this.duplicateSprite(entity.sprite);
                if (entity.sprite2) this.tempstorage2b = this.duplicateSprite(entity.sprite2);
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
                
                const incomingDir = (entry.portal + 2) % 4;
                let rotation = exit.portal - incomingDir;
                if (rotation < 0) {
                    rotation += 4;
                }
                entity.dir = (entity.dir + rotation) % 4;
                if (entity.portal !== undefined) {
                    entity.portal = (entity.portal + rotation) % 4;
                }
                
                entity.sprite.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                if (entity.sprite2 && entity.group === 1) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                        case 1: entity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                        case 2: entity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                        case 3: entity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                    }
                }
                if (entity.sprite2 && entity.group === 2) {
                    entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                    switch(entity.portal) {
                        case 0: entity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                        case 1: entity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                        case 2: entity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                        case 3: entity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                    }
                }

                let done = false;
                switch(exit.portal) {
                    case 0: done = this.updatePosition2(0, -1, 2, entry); break;
                    case 1: done = this.updatePosition2(1, 0, 3, entry); break;
                    case 2: done = this.updatePosition2(0, 1, 0, entry); break;
                    case 3: done = this.updatePosition2(-1, 0, 1, entry); break;
                }

                if (!done) {
                    entity.x = savedX;
                    entity.y = savedY;
                    entity.dir = savedDir;
                    entity.portal = savedPortal;
                    entity.sprite.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier).setDepth(2*entity.y);
                    if (entity.sprite2 && entity.group === 1) {
                        entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier).setDepth(2*entity.y+1);
                        switch(entity.portal) {
                            case 0: entity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                            case 1: entity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                            case 2: entity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                            case 3: entity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                        }
                    }
                    if (entity.sprite2 && entity.group === 2) {
                        entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier).setDepth(2*entity.y+1);
                        switch(entity.portal) {
                            case 0: entity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                            case 1: entity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                            case 2: entity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                            case 3: entity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                        }
                    }

                    if (this.tempstorage2a) {
                        this.tempstorage2a.destroy();
                    }
                    if (this.tempstorage2b) {
                        this.tempstorage2b.destroy();
                    }
                    return false;
                }
                }
            } else {
                const otherEntity = this.getEntityAt(newEntityX, newEntityY);

                if (entity.portal !== undefined && entity.portal === this.opposite(dir) && otherEntity) {   // eat branch
                    const entry = entity;
                    const exit = this.findPair(entry.group, entry);

                    if (!exit) {
                        return false;
                    }

                    if (exit === otherEntity) {
                        entry.x = 1000;
                        entry.y = 0;
                        entry.sprite.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                        if (entry.sprite2) {
                            entry.sprite2.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                        }

                        otherEntity.x = 1000;
                        otherEntity.y = 0;
                        otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);
                        if (otherEntity.sprite2) {
                            otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);
                        }
                    } else {
                        const savedX = otherEntity.x;
                        const savedY = otherEntity.y;
                        const savedDir = otherEntity.dir;
                        const savedPortal = otherEntity.portal;
                        this.tempstorage2a = this.duplicateSprite(otherEntity.sprite);
                        if (otherEntity.sprite2) this.tempstorage2b = this.duplicateSprite(otherEntity.sprite2);

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
                            otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);

                            if (otherEntity.sprite2) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);
                            }
                        } else {
                            this.tempstorage = otherEntity;

                            otherEntity.x = exit.x;
                            otherEntity.y = exit.y;

                            if (otherEntity.dir === undefined || entry.portal === undefined || exit.portal === undefined) {
                                console.log("ERROR: i don't know man. i don't know anymore. i'm done with this shit.");
                                return false;
                            }
                            const incomingDir = (entry.portal + 2) % 4;
                            let rotation = exit.portal - incomingDir;

                            if (rotation < 0) rotation += 4;

                            otherEntity.dir = (otherEntity.dir + rotation) % 4;

                            if (otherEntity.portal !== undefined) {
                                otherEntity.portal = (otherEntity.portal + rotation) % 4;
                            }

                            otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y);

                            if (otherEntity.sprite2 && otherEntity.group === 1) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y+1);
                                switch(otherEntity.portal) {
                                    case 0: otherEntity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                                    case 1: otherEntity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                                    case 2: otherEntity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                                    case 3: otherEntity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                                }
                            }
                            if (otherEntity.sprite2 && otherEntity.group === 2) {
                                otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y+1);
                                switch(otherEntity.portal) {
                                    case 0: otherEntity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                                    case 1: otherEntity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                                    case 2: otherEntity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                                    case 3: otherEntity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                                }
                            }

                            let done = false;

                            switch(exit.portal) {
                                case 0: done = this.updatePosition2(0, -1, 2, entry, true); break;
                                case 1: done = this.updatePosition2(1, 0, 3, entry, true); break;
                                case 2: done = this.updatePosition2(0, 1, 0, entry, true); break;
                                case 3: done = this.updatePosition2(-1, 0, 1, entry, true); break;
                            }

                            if (!done) {
                                otherEntity.x = savedX;
                                otherEntity.y = savedY;
                                otherEntity.dir = savedDir;
                                otherEntity.portal = savedPortal;
                                this.tempstorage2a.destroy();
                                if(this.tempstorage2b) this.tempstorage2b.destroy();

                                otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y);

                                if (otherEntity.sprite2 && otherEntity.group === 1) {
                                    otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y+1);
                                    switch(otherEntity.portal) {
                                        case 0: otherEntity.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                                        case 1: otherEntity.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                                        case 2: otherEntity.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                                        case 3: otherEntity.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
                                    }
                                }
                                if (otherEntity.sprite2 && otherEntity.group === 2) {
                                    otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y+1);
                                    switch(otherEntity.portal) {
                                        case 0: otherEntity.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                                        case 1: otherEntity.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                                        case 2: otherEntity.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                                        case 3: otherEntity.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
                                    }
                                }

                                return false;
                            }
                        }
                        const portalStartX = entry.x;
                        const portalStartY = entry.y;

                        entry.x = newEntityX;
                        entry.y = newEntityY;

                        this.animatePushable(entry);

                        this.animateEat(portalStartX, portalStartY, entry.portal, dx, dy);
                    }
                } else {
                    if (this.isWall(newEntityX, newEntityY) || this.getEntityAt(newEntityX, newEntityY)) {
                        return false;
                    }
                    entity.x = newEntityX;
                    entity.y = newEntityY;
                    this.animatePushable(entity);
                }
            }
        }
        player.x = newX;
        player.y = newY;
        player.dir = dx !== 0 ? dx : dy;

        const facing = this.opposite(dir);
        player.sprite.setScale(this.pixelmultiplier).setDepth(2*player.y);
        this.animatePlayer(player, facing);
        this.laserFunction();
        if (this.lindseyDeath()){
            this.menuup = 2;
            this.menuOverlay.setVisible(true);
            if (this.deathmessage) this.deathmessage.setVisible(true);
        }
        const flag = this.entities.find(entity => entity.type === "flag");
        if (flag && player.x === flag.x && player.y === flag.y && this.winConditionsMet() && this.winConditionsMet2()) {
            this.entities = [];
            for (const laser of this.lasers) this.destroyLaser(laser);
            this.lasers = [];
            this.scene.start("game", {level: this.levelNumber+1});
        }
        return true;
        }
        console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
        return false;
    }

    private updatePosition2(dx: number, dy: number, dir: number, entry: Entity | undefined, eat: boolean = false): boolean {
        if (!this.tempstorage) {
            console.log("ERROR:TEMPSTORAGE IS UNEXPECTEDLY UNDEFINED. something has gone terribly wrong.");
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
            this.tempstorage.sprite.setPosition(this.offsetX + this.tempstorage.x * 16*this.pixelmultiplier, this.offsetY + this.tempstorage.y * 16*this.pixelmultiplier);
            this.tempstorage.sprite.setDepth(2*this.tempstorage.y)
            switch(exit.portal) {
                case 0: return this.updatePosition2(0, -1, 2, entry);
                case 1: return this.updatePosition2(1, 0, 3, entry);
                case 2: return this.updatePosition2(0, 1, 0, entry);
                case 3: return this.updatePosition2(-1, 0, 1, entry);
            }
            return true;
        }

        if (this.isWall(newX, newY) || this.getEntityAt(newX, newY)) {
            return false;
        }

        this.tempstorage.x = newX;
        this.tempstorage.y = newY;
        this.animatePushable(this.tempstorage);
        if (!entry) {
            console.log("ERROR: YOU ARE EXITING A PORTAL WITH NO ENTRY");
            return false;
        }
        if (eat == false) {
            this.animateBPortalEntry(entry.x, entry.y, entry.portal);
        }
        this.maskBoxPortal(this.tempstorage, this.tempstorage.x-dx, this.tempstorage.y-dy, this.opposite(dir));
        if (this.tempstorage.sprite2 && this.tempstorage.group === 1) {
            switch(this.tempstorage.portal) {
                case 0: this.tempstorage.sprite2.setTexture("portals", 0).setScale(this.pixelmultiplier); break;
                case 1: this.tempstorage.sprite2.setTexture("portals", 3).setScale(this.pixelmultiplier); break;
                case 2: this.tempstorage.sprite2.setTexture("portals", 1).setScale(this.pixelmultiplier); break;
                case 3: this.tempstorage.sprite2.setTexture("portals", 2).setScale(this.pixelmultiplier); break;
            }
        }   
        if (this.tempstorage.sprite2 && this.tempstorage.group === 2) {
            switch(this.tempstorage.portal) {
                case 0: this.tempstorage.sprite2.setTexture("portals", 4).setScale(this.pixelmultiplier); break;
                case 1: this.tempstorage.sprite2.setTexture("portals", 7).setScale(this.pixelmultiplier); break;
                case 2: this.tempstorage.sprite2.setTexture("portals", 5).setScale(this.pixelmultiplier); break;
                case 3: this.tempstorage.sprite2.setTexture("portals", 6).setScale(this.pixelmultiplier); break;
            }
        }   
        return true;
    }

    private duplicateSprite(sprite: Phaser.GameObjects.Sprite): Phaser.GameObjects.Sprite {
        const copy = this.add.sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name);
        copy.setOrigin(sprite.originX, sprite.originY);
        copy.setScale(sprite.scaleX, sprite.scaleY);
        copy.setDepth(sprite.depth);
        return copy;
    }

    private animatePushable(entity: Entity) {
        const sprites: Phaser.GameObjects.Sprite[] = [];

        sprites.push(entity.sprite);
        if (entity.sprite2) {
            sprites.push(entity.sprite2);
        }

        const tween = this.tweens.add({
            targets: sprites,
            x: this.offsetX + entity.x * this.tilesize,
            y: this.offsetY + entity.y * this.tilesize,
            duration: this.lindseyspeed,
            ease: "Linear",

            onUpdate: () => {
                entity.sprite.setDepth(2*entity.y-0.1);
                if (entity.sprite2) {
                    entity.sprite2.setDepth(2*entity.y+0.9);
                }
            }
        });

        this.pushTweens.push(tween);
    }
    
    private maskBoxPortal(box: Entity, portalX: number, portalY: number, portalDir: number | undefined) {
        this.tempstorage3 = box;
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        switch(portalDir) {
            case 0: maskH = portalY*this.tilesize - 23 * this.pixelmultiplier; break;
            case 3: maskW = portalX*this.tilesize + this.offsetX; break;
            case 2: maskY = portalY*this.tilesize - 13 * this.pixelmultiplier + this.offsetY; break;
            case 1: maskW = portalX*this.tilesize + this.offsetX; break; // i have no clue why this works, it's literally the same logic as leftward portal but w/e it works
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        const masks = Phaser.Actions.AddMaskShape(box.sprite, {
            shape: "rectangle",
            region: region
        });
        if (box.sprite2) {
        const masks2 = Phaser.Actions.AddMaskShape(box.sprite2, {
            shape: "rectangle",
            region: region
        });
        this.maskFilter2 = masks2[0];
        }
        this.maskFilter = masks[0];
    }

    private animateBPortalEntry(portalX: number, portalY: number, portalDir: number | undefined) {
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        switch(portalDir) {
            case 0: maskH = portalY*this.tilesize - 23*this.pixelmultiplier; break;
            case 1: maskX = portalX*this.tilesize + this.offsetX; break;
            case 2: maskY = portalY*this.tilesize - 13*this.pixelmultiplier + this.offsetY; break;
            case 3: maskW = portalX*this.tilesize - this.tilesize; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        if (!this.tempstorage2a) return;
        const masks = Phaser.Actions.AddMaskShape(this.tempstorage2a, {
            shape: "rectangle",
            region: region
        });
        if (this.tempstorage2b) {
        const masks2 = Phaser.Actions.AddMaskShape(this.tempstorage2b, {
            shape: "rectangle",
            region: region
        });
        const maskFilter2 = masks2[0];
        }
        const maskFilter = masks[0];
        if (!this.tempstorage2a) {console.log ("fuck you"); return;}
        const tween = this.tweens.add({
            targets: this.tempstorage2a, 
            x: this.offsetX + portalX * 16*this.pixelmultiplier,
            y: this.offsetY + portalY * 16*this.pixelmultiplier,
            duration: this.lindseyspeed,
            ease: "Linear",

            onComplete: () => {
                if (this.tempstorage2a) this.tempstorage2a.destroy();
            }
        });
        this.portalTweens.push(tween);
        if (this.tempstorage2b) {
            const tween2 = this.tweens.add({
                targets: this.tempstorage2b, 
                x: this.offsetX + portalX * 16*this.pixelmultiplier,
                y: this.offsetY + portalY * 16*this.pixelmultiplier,
                duration: this.lindseyspeed,
                ease: "Linear",

                onComplete: () => {
                    if (this.tempstorage2b) this.tempstorage2b.destroy();
                }
            });
            this.portalTweens.push(tween2);
        }
    }

    private animateEat(portalX: number, portalY: number, portalDir: number | undefined, dx: number, dy: number) {
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        switch(portalDir) {
            case 0: maskH = portalY*this.tilesize - 23*this.pixelmultiplier; break;
            case 1: maskX = portalX*this.tilesize + this.offsetX; break;
            case 2: maskY = portalY*this.tilesize - 13*this.pixelmultiplier + this.offsetY; break;
            case 3: maskW = portalX*this.tilesize - this.tilesize; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        if (!this.tempstorage2a) {console.log ("fuck you"); return;}
        const masks = Phaser.Actions.AddMaskShape(this.tempstorage2a, {
            shape: "rectangle",
            region: region
        });
        const maskFilter = masks[0];
        const maskShape = maskFilter.maskGameObject as Phaser.GameObjects.Rectangle;
        maskFilter.autoUpdate = true;

        if (!this.tempstorage2a) {console.log ("fuck you"); return;}

        const tween = this.tweens.add({
            targets: maskShape, 
            x: maskShape.x + dx*this.tilesize,
            y: maskShape.y + dy*this.tilesize,
            duration: this.lindseyspeed,
            ease: "Linear",

            onComplete: () => {
                if (!this.tempstorage2a) {console.log ("fuck you"); return;}
                if(this.tempstorage2a.filters) this.tempstorage2a.filters.external.remove(maskFilter);
                maskShape.destroy();

                if (this.tempstorage2a) this.tempstorage2a.destroy();
            }
        });
        this.portalTweens.push(tween);
        if (this.tempstorage2b) {
            const masks2 = Phaser.Actions.AddMaskShape(this.tempstorage2b, {
                shape: "rectangle",
                region: region
            });
            const maskFilter2 = masks2[0];
            const maskShape2 = maskFilter2.maskGameObject as Phaser.GameObjects.Rectangle;
            maskFilter2.autoUpdate = true;
            const tween2 = this.tweens.add({
                targets: maskShape2, 
                x: maskShape2.x + dx*this.tilesize,
                y: maskShape2.y + dy*this.tilesize,
                duration: this.lindseyspeed,
                ease: "Linear",

                onComplete: () => {
                    if (!this.tempstorage2b) {console.log ("fuck you"); return;}
                    if(this.tempstorage2b.filters) this.tempstorage2b.filters.external.remove(maskFilter);
                    maskShape2.destroy();
                    if (this.tempstorage2b) this.tempstorage2b.destroy();
                }
            });
            this.portalTweens.push(tween2);
        }
    }

    private getLindseyAnimation(facing: number | undefined): string {
        let animation = "";

        if (this.movenumber == false) {
            switch(facing) {
                case 0: animation = "lindsey-up"; break;
                case 1: animation = "lindsey-right"; break;
                case 2: animation = "lindsey-down"; break;
                case 3: animation = "lindsey-left"; break;
            }
        } else {
            switch(facing) {
                case 0: animation = "lindsey-up2"; break;
                case 1: animation = "lindsey-right2"; break;
                case 2: animation = "lindsey-down2"; break;
                case 3: animation = "lindsey-left2"; break;
            }
        }

        return animation;
    }

    private animatePortalEntry(startX: number, startY: number, portalX: number, portalY: number, portalDir: number | undefined, facing: number | undefined) {
        const animation = this.getLindseyAnimation(facing);
        const copy = this.add.sprite(this.offsetX + startX * 16*this.pixelmultiplier, this.offsetY + startY * 16*this.pixelmultiplier, "lindsey", 0).setOrigin(1, 1.04).setScale(this.pixelmultiplier).setDepth(2 * startY + 1.1);
        copy.play(animation);

        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        switch(portalDir) {
            case 0: maskH = portalY*this.pixelmultiplier*16-23*this.pixelmultiplier; break;
            case 1: maskX = portalX*this.pixelmultiplier*16 + this.offsetX; break;
            case 2: maskY = portalY*this.pixelmultiplier*16-19*this.pixelmultiplier + this.offsetY; break;
            case 3: maskW = portalX*this.pixelmultiplier*16-16*this.pixelmultiplier; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        const masks = Phaser.Actions.AddMaskShape(copy, {
            shape: "rectangle",
            region: region
        });
        const maskFilter = masks[0]

        const tween = this.tweens.add({
            targets: copy,
            x: this.offsetX + portalX * 16*this.pixelmultiplier,
            y: this.offsetY + portalY * 16*this.pixelmultiplier,
            duration: this.lindseyspeed,
            ease: "Linear",

            onComplete: () => {
                copy.destroy();
            }
        });

        this.portalTweens.push(tween);
    }

    private maskPlayerPortal(player: Entity, portalX: number, portalY: number, portalDir: number | undefined) {
        let maskX = 0;
        let maskY = 0;
        let maskW = 5000;
        let maskH = 5000;
        switch(portalDir) {
            case 0: maskH = portalY*this.pixelmultiplier*16-23*this.pixelmultiplier + this.offsetY; break;
            case 1: maskX = portalX*this.pixelmultiplier*16 + this.offsetX; break;
            case 2: maskY = portalY*this.pixelmultiplier*16-19*this.pixelmultiplier + this.offsetY; break;
            case 3: maskW = portalX*this.pixelmultiplier*15 + this.offsetX; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        const masks = Phaser.Actions.AddMaskShape(player.sprite, {
            shape: "rectangle",
            region: region
        });
        this.playerPortalMask = masks[0];
    }

    private animatePlayer(player: Entity, facing: number | undefined) {
        const animation = this.getLindseyAnimation(facing);

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
            x: this.offsetX + player.x * 16*this.pixelmultiplier,
            y: this.offsetY + player.y * 16*this.pixelmultiplier,
            duration: this.lindseyspeed,
            ease: "Linear",
            onComplete: () => {

                player.sprite.stop();
                player.sprite.setTexture("lindseyi", facing);

                if (this.playerPortalMask) {
                    if (player.sprite.filters) player.sprite.filters.external.remove(this.playerPortalMask);
                    this.playerPortalMask = undefined;
                }

                if (this.maskFilter) {
                    if (this.tempstorage3) {
                        if (this.tempstorage3.sprite.filters) {
                            this.tempstorage3.sprite.filters.external.remove(
                                this.maskFilter
                            );
                        }
                    }
                    this.maskFilter = undefined;
                }

                if (this.maskFilter2) {
                    if (this.tempstorage3) {
                        if (this.tempstorage3.sprite2) {
                            if (this.tempstorage3.sprite2.filters) {
                                this.tempstorage3.sprite2.filters.external.remove(
                                    this.maskFilter2
                                );
                            }
                        }
                    }
                    this.maskFilter2 = undefined;
                }

                this.tempstorage3 = undefined;
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
        this.load.spritesheet("lindseyi", "assets/lindsey.idle.spr.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("spritestall1x1", "assets/spritesTall1x1.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("portals", "assets/portalsheet1.png", {
            frameWidth: 16,
            frameHeight: 23,
        });
        this.load.spritesheet("laserBody", "assets/laser.body.spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("lasertails", "assets/laser.tail.spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("laserheads", "assets/laser.head.spritesheet.png", {
            frameWidth: 20,
            frameHeight: 28,
        });
        this.load.spritesheet("laserTurn", "assets/laser.turn.spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("tileset-fogo", "./tileset.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        if (this.modoTest === false && this.nivelId === "") {
            this.load.text(
                "level",
                "assets/level" + this.levelNumber + ".txt"
            );
        }
    }

    create() {
        this.entities = [];
        this.history = [];
        this.lasers = [];
        this.menuup = 0;
        this.objetosMenuPausa = [];
        this.entities = [];
        this.history = [];
        this.lasers = [];
        this.menuup = 0;
        this.objetosMenuPausa = [];
        this.playerMoving = false;
        this.inputBuffer = "";
        this.holdBufferOpen = false;
        this.movenumber = false;
        this.playerVertical = true;
        this.playerTween = undefined;
        this.pushTweens = [];
        this.portalTweens = [];
        this.playerPortalMask = undefined;
        this.maskFilter = undefined;
        this.maskFilter2 = undefined;
        this.tempstorage = undefined;
        this.tempstorage2a = undefined;
        this.tempstorage2b = undefined;
        this.tempstorage3 = undefined;
        this.emitterQueue = [];
        this.firedEmitters = [];

        if (!this.anims.exists("lindsey-up")) {
            this.anims.create({
                key: "lindsey-up",
                frames: [
                    { key: "lindsey", frame: 0 },
                    { key: "lindsey", frame: 4 },
                    { key: "lindsey", frame: 8 },
                    { key: "lindsey", frame: 12 }
                ],
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
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
                frameRate: this.animationspeed,
                repeat: -1
            });
        }

        if (!this.anims.exists("laser-horizontal")) {
            this.anims.create({
                key: "laser-horizontal",
                frames: [
                    { key: "laserBody", frame: 0 },
                    { key: "laserBody", frame: 2 },
                    { key: "laserBody", frame: 4 },
                    { key: "laserBody", frame: 6 },
                    { key: "laserBody", frame: 8 },
                    { key: "laserBody", frame: 10 },
                    { key: "laserBody", frame: 12 },
                    { key: "laserBody", frame: 14 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });

            this.anims.create({
                key: "laser-vertical",
                frames: [
                    { key: "laserBody", frame: 1 },
                    { key: "laserBody", frame: 3 },
                    { key: "laserBody", frame: 5 },
                    { key: "laserBody", frame: 7 },
                    { key: "laserBody", frame: 9 },
                    { key: "laserBody", frame: 11 },
                    { key: "laserBody", frame: 13 },
                    { key: "laserBody", frame: 15 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "laser-horizontal2",
                frames: [
                    { key: "laserBody", frame: 14 },
                    { key: "laserBody", frame: 12 },
                    { key: "laserBody", frame: 10 },
                    { key: "laserBody", frame: 8 },
                    { key: "laserBody", frame: 6 },
                    { key: "laserBody", frame: 4 },
                    { key: "laserBody", frame: 2 },
                    { key: "laserBody", frame: 0 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "laser-vertical2",
                frames: [
                    { key: "laserBody", frame: 15 },
                    { key: "laserBody", frame: 13 },
                    { key: "laserBody", frame: 11 },
                    { key: "laserBody", frame: 9 },
                    { key: "laserBody", frame: 7 },
                    { key: "laserBody", frame: 5 },
                    { key: "laserBody", frame: 3 },
                    { key: "laserBody", frame: 1 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorse",
                frames: [
                    { key: "laserTurn", frame: 0 },
                    { key: "laserTurn", frame: 4 },
                    { key: "laserTurn", frame: 8 },
                    { key: "laserTurn", frame: 12 },
                    { key: "laserTurn", frame: 16 },
                    { key: "laserTurn", frame: 20 },
                    { key: "laserTurn", frame: 24 },
                    { key: "laserTurn", frame: 28 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorse",
                frames: [
                    { key: "laserTurn", frame: 1 },
                    { key: "laserTurn", frame: 5 },
                    { key: "laserTurn", frame: 9 },
                    { key: "laserTurn", frame: 13 },
                    { key: "laserTurn", frame: 17 },
                    { key: "laserTurn", frame: 21 },
                    { key: "laserTurn", frame: 25 },
                    { key: "laserTurn", frame: 29 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorse",
                frames: [
                    { key: "laserTurn", frame: 2 },
                    { key: "laserTurn", frame: 6 },
                    { key: "laserTurn", frame: 10 },
                    { key: "laserTurn", frame: 14 },
                    { key: "laserTurn", frame: 18 },
                    { key: "laserTurn", frame: 22 },
                    { key: "laserTurn", frame: 26 },
                    { key: "laserTurn", frame: 30 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorse",
                frames: [
                    { key: "laserTurn", frame: 3 },
                    { key: "laserTurn", frame: 7 },
                    { key: "laserTurn", frame: 11 },
                    { key: "laserTurn", frame: 15 },
                    { key: "laserTurn", frame: 19 },
                    { key: "laserTurn", frame: 23 },
                    { key: "laserTurn", frame: 27 },
                    { key: "laserTurn", frame: 31 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
        }
        if (!this.anims.exists("laserhead")) {
            this.anims.create({
                key: "laserhead",
                frames: [
                    { key: "laserheads", frame: 0 },
                    { key: "laserheads", frame: 1 },
                    { key: "laserheads", frame: 0 },
                    { key: "laserheads", frame: 1 },
                    { key: "laserheads", frame: 0 },
                    { key: "laserheads", frame: 1 },
                    { key: "laserheads", frame: 0 },
                    { key: "laserheads", frame: 1 }
                ],
                frameRate: this.animationspeed*1.2,
                repeat: -1
            });
        }

        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        //MORE TEST STUFF

        let level = "";
        if (this.modoTest) {
            level = this.nivelTest;
        } else if (this.nivelId !== "") {
            const nivel = obtenerNivel(this.nivelId);
            if (nivel === undefined) {
                return;
            }
            level = convertirNivel(nivel);
        } else {
            level = this.cache.text.get("level");
        }

        const [staticLayer, dynamicLayer, laserLayer, portalLayer, directionLayer] = level.split("^");
        this.staticRows = staticLayer.trim().split("\n");
        const dynamicRows = dynamicLayer.trim().split("\n");
        const laserRows = laserLayer.trim().split("\n");
        const portalRows = portalLayer.trim().split("\n");
        const directionRows = directionLayer.trim().split("\n");
        
        //CALCULO DE MEDIDAS // HOLA LUCAS!!! // WHO DOESN'T LOVE SOFTCODING?
        // I DON'T!!! YOU RUINED MY BEAUTIFUL CODE!!!!!!

            const margen = 12;
            const columnas = this.staticRows[0].length;
            const filas = this.staticRows.length;
            const anchoDisponible = this.scale.width - margen * 2;
            const altoDisponible = this.scale.height - this.altoBarra - margen * 2;
            const extraSuperior = 8;
            this.pixelmultiplier = Math.min(
                3.33,
                anchoDisponible / (columnas * 16),
                altoDisponible / (filas * 16 + extraSuperior)
            );
            this.tilesize = 16 * this.pixelmultiplier;
            const anchoTablero = columnas * this.tilesize;
            const altoTablero = filas * this.tilesize;
            const extra = extraSuperior * this.pixelmultiplier;
            this.offsetX =
                (this.scale.width - anchoTablero) / 2 +
                this.tilesize;
            this.offsetY =
                this.altoBarra +
                margen +
                (altoDisponible - altoTablero - extra) / 2 +
                extra +
                this.tilesize;


        for (let y = 0; y<this.staticRows.length; y++) {
            for (let x = 0; x<this.staticRows[y].length; x++){
                this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 14).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-1);
                const thistile = this.staticRows[y][x];
                switch(thistile) {
                    case "#":
                        if (y > 0) {
                        if (this.staticRows[y-1][x] === "#") {
                            this.entities.push ({
                            type: "wall",
                            x: x,
                            y: y,
                            pushable: false,
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                            });
                            break;
                        }
                        else {
                            this.entities.push ({
                            type: "wall",
                            x: x,
                            y: y,
                            pushable: false,
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                            });
                            break;
                        }
                        }else {
                            this.entities.push ({
                            type: "wall",
                            x: x,
                            y: y,
                            pushable: false,
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                            });
                            break;
                        }
                    case "X":
                        this.entities.push ({
                        type: "goal",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-0.5)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        secret: "flag",
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tiles", Tile.Flag1).setOrigin(1,1).setScale(this.pixelmultiplier/2).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "lindsey", 2).setOrigin(1,1.04).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "b":
                        this.entities.push ({
                        type: "box",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 10).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 12).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 11).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 13).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "i":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 6).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "j":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 8).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "k":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 7).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "l":
                        this.entities.push ({
                        type: "laserReciever",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 9).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "t":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 4).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "f":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 3,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "g":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 2,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "h":
                        this.entities.push ({
                        type: "mirror",
                        x: x,
                        y: y,
                        dir: 1,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 5).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                            entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "a":
                        if (entity){
                            if (entity.type === "wall"){
                                entity.portal = 3;
                                entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 3*this.pixelmultiplier, "portals", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
                            }
                            else {
                                entity.portal = 3;
                                entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
                            }
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
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "s":
                        if (entity){
                            entity.portal = 2;
                            entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
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
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y+1)
                            });
                        }
                        break;
                    case "d":
                        if (entity){
                            if (entity.type === "wall"){
                                entity.portal = 1;
                                entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 3*this.pixelmultiplier, "portals", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
                            }
                            else {
                                entity.portal = 1;
                                entity.sprite2 = this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y);
                            }
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
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall1x1", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            sprite2: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "portals", Tile.PortalD).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y+1)
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
        this.menuOverlay = this.add.rectangle(0, 0, 5000, 5000, 0x222034, 0.6).setVisible(false).setDepth(100);
        this.deathmessage = this.add.text(400, 250, "you died", {
            fontFamily: "biysmall",
            fontSize: "16px",
            color: "#ffffff",
        }).setOrigin(0.5).setVisible(false).setDepth(101);
        this.laserFunction();
        this.crearBarraSuperior();
    }

    //////////////////////////////
    //INPUT HANDLING STARTS HERE//
    //////////////////////////////

    private doMovement(direction: string) {
        this.pushTweens = [];
        this.portalTweens = [];
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
            this.destroyLaser(laser);
        }
        
        this.lasers = [];
        this.laserFunction();
        this.flagCheck();
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            if (this.menuup == 0) {
                this.abrirMenuPausa();
            } else if (this.menuup == 1) {
                this.cerrarMenuPausa();
            }
            return;
        }

        if (this.menuup == 1) {
            return;
        }

        if (this.playerMoving) {
            if (this.menuup === 0) {
                const player = this.entities.find(entity => entity.type === "player");
                if (Phaser.Input.Keyboard.JustDown(this.cursors.left!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "left";
                    if (!player) return;
                    if (player.dir === -1 && this.playerVertical === false && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.right!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "right";
                    if (!player) return;
                    if (player.dir === 1 && this.playerVertical === false && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer ="up";
                    if (!player) return;
                    if (player.dir === -1 && this.playerVertical === true && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (Phaser.Input.Keyboard.JustDown(this.cursors.down!)) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "down";
                    if (!player) return;
                    if (player.dir === 1 && this.playerVertical === true && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
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

        if (this.inputBuffer !== "" && this.menuup === 0) {
            const direction = this.inputBuffer;
            this.inputBuffer = "";

            this.doMovement(direction);
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.left!) && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("left");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.right!) && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("right");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("up");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down!) && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("down");
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.rKey) && this.menuup !== 1) {
            this.reiniciarNivel();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.menuup !== 1) {
            this.entities = [];
            for (const laser of this.lasers) {
                this.destroyLaser(laser);
            }
            this.lasers = [];
            this.menuup = 0;
            this.scene.start("game", {level: this.levelNumber+1});
        }
        if (Phaser.Input.Keyboard.JustDown(this.zKey) && this.menuup !== 1) {
            this.undoMove();
            return;
        }
    }
}