import Phaser from "phaser";
import { spanish } from "./idioma";
import { cargarPortales, crearAnimacionesPortales, configurarPortal, esParedExteriorPortal } from "./portales";

import { obtenerNivel, crearBoton } from "./niveles";
import { convertirNivel } from "./parser";

import { demo, completarNivelInvitado } from "./datosDemo";
import {
    completarNivelDescargadoBackend,
    completarNivelOriginalBackend,
    leerNivelesOriginalesBackend,
    leerNivelOriginalBackend
} from "./api";
import { apiAEditor } from "./parserApi";
import { TransitionScene } from "./transitionScene.ts"


interface Entity {
    type: string;
    x: number;
    y: number;
    dir?: number;
    emitting?: number;
    portal?: number;
    group?: number;
    controlGroup?: string;
    pushable: boolean;
    secret?: string;
    laserPhase?: number;
    sprite: Phaser.GameObjects.Sprite;
    sprite2?: Phaser.GameObjects.Sprite;
    shadow?: Phaser.GameObjects.Sprite;
}

interface TutorialNivel {
    nivel: number;
    partes: string[][];
    movimientos: number;
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
    sprite: Phaser.GameObjects.Sprite;
    incomingDir: number;
    outgoingDir: number;
    incomingPhase: number;
    outgoingPhase: number;
    cap?: Phaser.GameObjects.Sprite;
    tail?: Phaser.GameObjects.Sprite;
    maskFilter?: any;
    maskShape?: Phaser.GameObjects.Rectangle;
    maskFilter2?: any;
    maskShape2?: Phaser.GameObjects.Rectangle;

    source?: Entity;
    visualOffsetX: number;
    visualOffsetY: number;
    startLength?: number;
}

/////////////////////
//CLASS STARTS HERE//
/////////////////////

export class GameScene extends Phaser.Scene {    
  textoOpciones: string[][] = [
    ["Untitled Level", "Nivel sin título"],
    ["Level ", "Nivel "],
    ["Test Mode", "Modo de prueba"],
    ["No active session.", "No hay una sesión activa."],
    ["Level completed, but your progress could not be saved:\n\n", "Nivel completado, pero no se pudo guardar tu progreso:\n\n"],
    ["Undo", "Deshacer"],
    ["Reset", "Reiniciar"],
    ["Pause", "Pausa"],
    ["Continue", "Continuar"],
    ["YOU DIED", "MORISTE"],
    ["Press", "Presioná"],
    ["to undo", "para deshacer"],
    ["or", "o"],
    ["to restart", "para reiniciar"],
    ["PAUSED", "PAUSA"],
    ["COMMUNITY LEVEL", "NIVEL DE LA COMUNIDAD"],
    ["Exit", "Salir"],
    ["Loading level...", "Cargando nivel..."],
    ["Could not load the official level:\n\n", "No se pudo cargar el nivel oficial:\n\n"]
  ];

    private volumenEfectos = 0.7; 
    private sonidosPreparados = false;
    private reflejosSonido: string[] = [];
    private movimientoEmpujo = false;
    private movimientoConPortal = false;
    private sonidos = [
        // 1. WALKING:
        {
            nombre: "paso",
            archivo: "lindsey_sfx/step01.wav",
            volumen: 0.4,
            espera: 70,
            ultimo: -1000
        },
        // 2. PUSHING
        {
            nombre: "empujar",
            archivo: "lindsey_sfx/02_empujar.ogg",
            volumen: 0.45,
            espera: 80,
            ultimo: -1000
        },
        // 3. LASER REFLECTION
        {
            nombre: "rebote",
            archivo: "lindsey_sfx/03_rebote_laser.ogg",
            volumen: 0.18,
            espera: 80,
            ultimo: -1000
        },
        // 4. DEATH
        {
            nombre: "morir",
            archivo: "lindsey_sfx/04_morir.ogg",
            volumen: 0.5,
            espera: 150,
            ultimo: -1000
        },
        // 5. RECEIVER ACTIVATION
        {
            nombre: "receptor",
            archivo: "lindsey_sfx/05_receptor_activar.ogg",
            volumen: 0.45,
            espera: 80,
            ultimo: -1000
        },
        // 6. PORTAL
        {
            nombre: "portal",
            archivo: "lindsey_sfx/06_portal.ogg",
            volumen: 0.35,
            espera: 100,
            ultimo: -1000
        },
        // 7. DOOR OPENING
        {
            nombre: "puerta",
            archivo: "lindsey_sfx/07_puerta_abrir.ogg",
            volumen: 0.4,
            espera: 100,
            ultimo: -1000
        },
        // 7b. DOOR CLOSING
        {
            nombre: "puertaCerrar",
            archivo: "lindsey_sfx/07b_puerta_cerrar.ogg",
            volumen: 0.3,
            espera: 100,
            ultimo: -1000
        },
        // 8. LEVEL COMPLETE
        {
            nombre: "victoria",
            archivo: "lindsey_sfx/08_victoria.ogg",
            volumen: 0.5,
            espera: 1000,
            ultimo: -1000
        },
        // 9a. UI HOVER
        {
            nombre: "hover",
            archivo: "lindsey_sfx/09a_ui_hover.ogg",
            volumen: 0.12,
            espera: 60,
            ultimo: -1000
        },
        // 9b. UI CLICK
        {
            nombre: "click",
            archivo: "lindsey_sfx/09b_ui_click.ogg",
            volumen: 0.12,
            espera: 70,
            ultimo: -1000
        }
    ];
    private levelNumber = 1;
    private history: GameState[] = [];
    private community: boolean = true;
    private movimientosAyuda = 0;
    private tutorialActual: TutorialNivel | null = null;

    private tutoriales: TutorialNivel[] = [
        {
            nivel: 1,
            partes: [["Use", "arrows", "or", "WASD", "to move"], ["Usá", "arrows", "o", "WASD", "para moverte"]],
            movimientos: 3
        },
        {
            nivel: 2,
            partes: [["Push boxes to block lasers."], ["Empujá cajas para bloquear los láseres."]],
            movimientos: 6
        }
    ];
    private izquierdaPresionada = false;
    private derechaPresionada = false;
    private arribaPresionada = false;
    private abajoPresionada = false;

    init(data: any) {
        this.sonidosPreparados = false;
        this.reflejosSonido = [];
        this.movimientoEmpujo = false;
        this.movimientoConPortal = false;
        for (let i = 0; i < this.sonidos.length; i++) {
            this.sonidos[i].ultimo = -1000;
        }
        this.nivelDescargado = null;
        this.saliendoDelNivel = false;
        this.testeando = false;
        this.modoTest = false;
        this.nivelTest = "";
        this.nivelId = "";
        this.levelNumber = 1;
        this.nombreNivelOficial = "";
        this.idsNivelesOficiales = [];
        this.cargandoNivel = true;
        this.escenaAnterior = "menu";
        this.idGlobalDescargado = null;
        this.victoriaDescargadaEnCurso = false;
        this.movimientosAyuda = 0;
        this.tutorialActual = null;
        this.izquierdaPresionada = false;
        this.derechaPresionada = false;
        this.arribaPresionada = false;
        this.abajoPresionada = false;
        
        if (data && typeof data.idGlobal === "number") {
        this.idGlobalDescargado = data.idGlobal;
        }
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
        if (Array.isArray(data.idsNivelesOficiales)) {
            this.idsNivelesOficiales = data.idsNivelesOficiales.slice();
        }
        if (data.history !== undefined) {
            this.history = data.history;
        }
        if (
            data.nivelDescargado !== undefined &&
            data.nivelDescargado !== null
        ) {
            this.nivelDescargado = data.nivelDescargado;
        }
    }

    private idGlobalDescargado: number | null = null;
    private victoriaDescargadaEnCurso = false;
    private nombreNivelOficial = "";
    private idsNivelesOficiales: number[] = [];
    private cargandoNivel = true;
    private numeroCarga = 0;

    private menuup = 0;
    private pantallaMuerte!: Phaser.GameObjects.Container;
    private ayudaMovimiento!: Phaser.GameObjects.Container;
    private objetosMenuPausa: Phaser.GameObjects.GameObject[] = [];
    private pixelmultiplier: number = 3.33
    private tilesize: number = this.pixelmultiplier*16;
    private animationspeed: number = 18;
    private lindseyspeed: number = this.animationspeed*11.94;
    private emitterQueue: Entity[] = [];
    private firedEmitters: Entity[] = [];
    private tempstorage: Entity | undefined;
    private tempstorage2a: Phaser.GameObjects.Sprite | undefined;
    private tempstorage2b: Phaser.GameObjects.Sprite | undefined;
    private tempstorage2c: Phaser.GameObjects.Sprite | undefined;
    private tempstorage3: Entity | undefined;
    private movenumber: Boolean = false;
    private pushing: Boolean = false;
    private playerMoving = false;
    private inputBuffer: string = "";
    private holdBufferOpen: Boolean = false;
    private playerTween: Phaser.Tweens.Tween | undefined;
    private pushTweens: Phaser.Tweens.Tween[] = [];
    private playerVertical: Boolean = true;
    private portalTweens: Phaser.Tweens.Tween[] = [];
    private shadowTweens: Phaser.Tweens.Tween[] = [];
    private playerPortalMask: any;
    private maskFilter: any;
    private maskFilter2: any;
    private maskFilter3: any;
    private dead: boolean = false;
    private qKey!: Phaser.Input.Keyboard.Key;
    private rKey!: Phaser.Input.Keyboard.Key;
    private zKey!: Phaser.Input.Keyboard.Key;
    private escKey!: Phaser.Input.Keyboard.Key;
    private wKey!: Phaser.Input.Keyboard.Key;
    private aKey!: Phaser.Input.Keyboard.Key;
    private sKey!: Phaser.Input.Keyboard.Key;
    private dKey!: Phaser.Input.Keyboard.Key;
    private entities: Entity[] = [];
    private lasers: LaserVisual[] = [];
    private movingLasers: LaserVisual[] = [];
    private movingLaserCount = 0;
    private offsetX = 0;
    private offsetY = 0;
    private altoBarra = 68;
    private altoAvisos = 92;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private staticRows: any;
    private nivelDescargado: any = null;
    private saliendoDelNivel = false;
    private finishinglevel: any;


    //TEST

    private escenaAnterior = "menu";
    private modoTest = false;
    private nivelTest = "";
    private nivelId = "";
    private testeando = false;

    ////////////////////////
    //BRUNO COSAS DEL MENU//
    ////////////////////////


    private cargarSonidos() {
        for (let i = 0; i < this.sonidos.length; i++) {
            const sonido = this.sonidos[i];
            const clave = "game-" + sonido.nombre;
            if (sonido.archivo !== "" && !this.cache.audio.exists(clave)) {
                this.load.audio(clave, "assets/sound/" + sonido.archivo);
            }
        }
    }

    private reproducirSonido(nombre: string) {
        if (this.cargandoNivel || this.volumenEfectos <= 0 || this.sound.locked) {
            return;
        }
        for (let i = 0; i < this.sonidos.length; i++) {
            const sonido = this.sonidos[i];
            if (sonido.nombre !== nombre) {
                continue;
            }
            const clave = "game-" + nombre;
            if (sonido.archivo === "" || !this.cache.audio.exists(clave)) {
                return;
            }
            if (this.time.now - sonido.ultimo < sonido.espera) {
                return;
            }
            let tono = 0;
            if (nombre === "paso" || nombre === "empujar") {
                tono = Phaser.Math.Between(-60, 60);
            }
            this.sound.play(clave, {
                volume: sonido.volumen * this.volumenEfectos,
                detune: tono,
                loop: false
            });
            sonido.ultimo = this.time.now;
            return;
        }
    }

    private actualizarSonidosReflejos() {
        const reflejosActuales: string[] = [];
        let hayNuevoReflejo = false;
        for (let i = 0; i < this.lasers.length; i++) {
            const laser = this.lasers[i];
            if (laser.incomingDir === laser.outgoingDir || !laser.source) {
                continue;
            }
            if (laser.source.type !== "mirror") {
                continue;
            }
            const reflejo = laser.source.x + "," + laser.source.y + "," +
                laser.incomingDir + "," + laser.outgoingDir;
            reflejosActuales.push(reflejo);
            if (!this.reflejosSonido.includes(reflejo)) {
                hayNuevoReflejo = true;
            }
        }
        this.reflejosSonido = reflejosActuales;
        if (this.sonidosPreparados && hayNuevoReflejo) {
            this.reproducirSonido("rebote");
        }
    }

    private obtenerNombreNivel() {
        if (this.nivelDescargado !== null) {
         return this.nivelDescargado.nombre;
        }
        if (this.nivelId !== "") {
            const nivel = obtenerNivel(this.nivelId);
            if (nivel !== undefined) {
                return nivel.nombre;
            }
        }
        if (this.modoTest) {
            return this.textoOpciones[0][spanish];
        }
        if (this.nombreNivelOficial !== "") {
            return this.nombreNivelOficial;
        }
        return this.textoOpciones[1][spanish] + this.levelNumber;
    }

    private obtenerEtiquetaNivel() {
        let texto = "";
        let color = "#9ccc65";

        if (this.modoTest || this.testeando || (this.nivelId !== "" && this.nivelDescargado === null)) {
            texto = this.textoOpciones[2][spanish];
            color = "#ffd166";
        } else if (this.community === false) {
            texto = this.textoOpciones[1][spanish] + this.levelNumber;
        }

        return { texto: texto, color: color };
    }

    private async registrarVictoriaDescargada(): Promise<void> {
    if (this.victoriaDescargadaEnCurso || this.idGlobalDescargado === null) {
        return;
    }
    this.victoriaDescargadaEnCurso = true;
    try {
        const usuario = demo.usuarioActual;

        if (usuario === null || usuario === undefined) {
            throw new Error(this.textoOpciones[3][spanish]);
        }

        await completarNivelDescargadoBackend(
            usuario.nombre,
            this.idGlobalDescargado
        );
        for (let i = 0; i < demo.descargas.length; i++) {
            const descarga = demo.descargas[i];
            if (
                descarga.usuarioId === usuario.id &&
                descarga.nivelId === this.idGlobalDescargado
            ) {
                descarga.completado = true;
            }
        }
        if (this.nivelDescargado !== null) {
            this.nivelDescargado.completado = true;
        }
    } catch (error: any) {
        window.alert(
            this.textoOpciones[4][spanish] +
            String(error)
        );
    }
    const transition = this.scene.get("transition") as TransitionScene;

    transition.changeScene(
        this.sys.settings.key,
        "communityDemo",
        {
            pestana: "Descargados"
        }
    );
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
        const cantidadAnterior = this.children.list.length;
        const fondo = crearBoton(this, x, y, ancho, texto, () => {
            this.reproducirSonido("click");
            accion();
        });

        fondo.setFillStyle(color);

        if (texto === this.textoOpciones[5][spanish]) {
            fondo.setData("atajo", "Z");
        }

        if (texto === this.textoOpciones[6][spanish]) {
            fondo.setData("atajo", "R");
        }

        if (texto === this.textoOpciones[7][spanish] || texto === this.textoOpciones[8][spanish]) {
            fondo.setData("atajo", "Esc");
        }

        const objetos: Phaser.GameObjects.GameObject[] = [];

        for (let i = cantidadAnterior; i < this.children.list.length; i++) {
            const objeto = this.children.list[i] as
                Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text;

            objeto.setDepth(profundidad + i - cantidadAnterior);
            objetos.push(objeto);
        }

        fondo.on("pointerover", () => {
            if (fondo.input && fondo.input.enabled) {
                this.reproducirSonido("hover");
            }
            fondo.setFillStyle(color);
            fondo.setAlpha(0.8);
        });

        fondo.on("pointerout", () => {
            fondo.setAlpha(1);
        });

        const teclado = this.input.keyboard;
        const ocultarTooltip = () => {
            fondo.emit("ocultarTooltip");
        };

        if (teclado) {
            teclado.on("keydown", ocultarTooltip);

            fondo.once("destroy", () => {
                teclado.off("keydown", ocultarTooltip);
            });
        }

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

    barra.setDepth(-0.000002);

    const bordeInferior = this.add.rectangle(
        this.scale.width / 2,
        alto - 2,
        this.scale.width,
        4,
        0x6f87b0
    );

    bordeInferior.setDepth(-0.0000000002);

    const nombreCompleto = this.obtenerNombreNivel();

    const nombre = this.add.text(
    margen*2,
    alto / 2,
    nombreCompleto,
    {
        padding: { top: 6, bottom: 6 },
        fontFamily: "Fuente",
        fontSize: "18px",
        color: "#ffffff",
    }
    );

    nombre.setOrigin(0, 0.5);
    nombre.setDepth(902);

    const datosEtiqueta = this.obtenerEtiquetaNivel();
    const etiqueta = this.add.text(nombre.x, nombre.y, datosEtiqueta.texto, {
        padding: { top: 6, bottom: 6 },
        fontFamily: "Fuente",
        fontSize: "18px",
        color: datosEtiqueta.color
    }).setOrigin(0, 0.5).setDepth(902);

    if (datosEtiqueta.texto !== "") {
        nombre.setX(etiqueta.x + etiqueta.width + 16);
    }

    let nombreVisible = nombreCompleto;

    const anchoMaximo =
        xDeshacer -
        anchoBoton / 2 -
        separacion -
        nombre.x;

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
    const objetosDeshacer = this.crearBotonJuego(
        xDeshacer,
        y,
        anchoBoton,
        this.textoOpciones[5][spanish],
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
        this.textoOpciones[6][spanish],
        0xe6c56a,
        903,
        () => {
            if (this.history.length === 0) {
                return;
            }

            this.reiniciarNivel();
        }
    );

    const objetosPausa = this.crearBotonJuego(
        xPausa,
        y,
        anchoBoton,
        this.textoOpciones[7][spanish],
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

    const botonPausa =
        objetosPausa[1] as Phaser.GameObjects.Rectangle;

    const actualizarBotones = () => {
        if (this.menuup === 2) {
            botonPausa.disableInteractive();
            botonPausa.setFillStyle(0x79869e);
            botonPausa.setAlpha(1);
            botonPausa.emit("ocultarTooltip");
        } else {
            botonPausa.setInteractive({ useHandCursor: true });
            botonPausa.setFillStyle(0xb39ddb);
        }

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
        this.reproducirSonido("click");
        this.scene.restart({
            modoTest: this.modoTest,
            nivelTest: this.nivelTest,
            nivelId: this.nivelId,
            testeando: this.testeando,
            nivelDescargado: this.nivelDescargado,
            escenaAnterior: this.escenaAnterior,
            level: this.levelNumber,
            idGlobal: this.idGlobalDescargado,
            idsNivelesOficiales: this.idsNivelesOficiales
        });
        }

        private volver() {
            if (this.saliendoDelNivel) {
                return;
            }
            this.saliendoDelNivel = true;
            this.menuup = 0;
            this.playerMoving = false;
            this.inputBuffer = "";
            this.holdBufferOpen = false;
            const transition = this.scene.get("transition") as TransitionScene;
            transition.changeScene(this.sys.settings.key, this.escenaAnterior);
        }

    private async ganarNivel() {
        if (this.saliendoDelNivel) {
            return;
        }
        if (this.idGlobalDescargado !== null) {
            this.saliendoDelNivel = true;
            this.registrarVictoriaDescargada();
            return;
        }
        if (this.modoTest || this.testeando || this.nivelId !== "") {
            this.volver();
            return;
        }

        this.saliendoDelNivel = true;
        const cargaActual = this.numeroCarga;
        let progresoGuardado = false;

        try {
            const usuario = demo.usuarioActual;
            if (usuario === null || usuario === undefined) {
                throw new Error("No active session.");
            }
            if (usuario.id === 0) {
                completarNivelInvitado(this.levelNumber, 1);
            } else {
                await completarNivelOriginalBackend(
                    usuario.nombre,
                    this.levelNumber,
                    1
                );
            }
            progresoGuardado = true;
        } catch (error) {
            if (cargaActual !== this.numeroCarga) {
                return;
            }
            window.alert(
                "Level completed, but your progress could not be saved:\n\n" +
                String(error)
            );
        }

        if (cargaActual !== this.numeroCarga) {
            return;
        }

        if (progresoGuardado && this.escenaAnterior === "selectscene") {
            const selector: any = this.scene.get("selectscene");
            if (typeof selector.marcarNivelCompletado === "function") {
                selector.marcarNivelCompletado(this.levelNumber);
            }
        }

        let siguienteNivel = 0;

        for (let i = 0; i < this.idsNivelesOficiales.length; i++) {
            const id = this.idsNivelesOficiales[i];
            if (id > this.levelNumber && (siguienteNivel === 0 || id < siguienteNivel)) {
                siguienteNivel = id;
            }
        }
        if (siguienteNivel === 0) {
            this.saliendoDelNivel = false;
            this.volver();
            return;
        }

        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(this.sys.settings.key, "game",
            {
            level: siguienteNivel,
            escenaAnterior: this.escenaAnterior,
            idsNivelesOficiales: this.idsNivelesOficiales
            }
        );
    }

    private undoMove() {
        if (this.playerMoving) {
            return;
        }
        const state = this.history.pop();
        if (!state) {
            return;
        }
        this.reproducirSonido("click");
        const sonidosAntes = this.sonidosPreparados;
        this.sonidosPreparados = false;
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            const oldEntity = state.entities[i];
            entity.x = oldEntity.x;
            entity.y = oldEntity.y;
            entity.dir = oldEntity.dir;
            entity.portal = oldEntity.portal;
            entity.sprite.setPosition(this.offsetX + entity.x * 16 * this.pixelmultiplier, this.offsetY + entity.y * 16 * this.pixelmultiplier).setDepth(2*entity.y);
            if (entity.shadow) entity.shadow.setPosition(this.offsetX + entity.x * 16 * this.pixelmultiplier - this.tilesize, this.offsetY + entity.y * 16 * this.pixelmultiplier - this.tilesize);
            this.actualizarPortal(entity);
            this.actualizarAlphaPortal(entity, 1);
            if (entity.type === "player") {
                entity.sprite.stop();
                entity.sprite.setTexture("lindseyi", entity.dir).setScale(this.pixelmultiplier).setDepth(10).setOrigin(1,1.04);
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
            this.inputBuffer = "";
            this.holdBufferOpen = false;
            this.tweens.killTweensOf(this.pantallaMuerte);
            this.pantallaMuerte.setVisible(false).setAlpha(0);
            this.ayudaMovimiento.setVisible(
                this.ayudaPendiente()
            );
        }
        this.flagCheck();
        this.sonidosPreparados = sonidosAntes;
    }

    private crearTecla(
        contenedor: Phaser.GameObjects.Container,
        x: number,
        y: number,
        texto: string
    ) {
        const sombra = this.add.rectangle(x, y + 3, 28, 28, 0x080b17);
        const tecla = this.add.rectangle(x, y, 28, 28, 0x2c344c);
        tecla.setStrokeStyle(2, 0x7c8eaf);
        contenedor.add([sombra, tecla]);

        if (texto === "up" || texto === "left" || texto === "down" || texto === "right") {
            const flecha = this.add.graphics();
            flecha.lineStyle(3, 0xeef3ff, 1);
            flecha.beginPath();
            flecha.moveTo(-6, 3);
            flecha.lineTo(0, -3);
            flecha.lineTo(6, 3);
            flecha.strokePath();
            flecha.setPosition(x, y);

            if (texto === "right") {
                flecha.setAngle(90);
            } else if (texto === "down") {
                flecha.setAngle(180);
            } else if (texto === "left") {
                flecha.setAngle(270);
            }

            contenedor.add(flecha);
            return;
        }

        const etiqueta = this.add.text(x, y, texto, {
            padding: { top: 6, bottom: 6 },
            fontFamily: "Fuente, Arial",
            fontSize: "18px",
            color: "#eef3ff"
        }).setOrigin(0.5);

        contenedor.add(etiqueta);
    }

    private crearPantallaMuerte() {
        const centroX = this.scale.width / 2;
        const centroY = this.scale.height - this.altoAvisos / 2;

        this.pantallaMuerte = this.add.container(centroX, centroY);
        this.pantallaMuerte.setDepth(950).setVisible(false).setAlpha(0);

        const fondo = this.add.rectangle(
            0,
            0,
            this.scale.width,
            this.altoAvisos - 12,
            0x171a2e,
            0.82
        );
        this.pantallaMuerte.add(fondo);

        const titulo = this.add.text(
            0,
            -22,
            this.textoOpciones[9][spanish],
            {
                padding: { top: 6, bottom: 6 },
                fontFamily: "Fuente",
                fontSize: "21px",
                color: "#e57373"
            }
        ).setOrigin(0.5);
        this.pantallaMuerte.add(titulo);

        const instrucciones = this.add.container(0, 15);
        this.pantallaMuerte.add(instrucciones);
        let x = 0;
        const partes = [this.textoOpciones[10][spanish], "Z", this.textoOpciones[11][spanish], this.textoOpciones[12][spanish], "R", this.textoOpciones[13][spanish]];

        for (let i = 0; i < partes.length; i++) {
            if (partes[i] === "Z" || partes[i] === "R") {
                this.crearTecla(instrucciones, x + 14, 0, partes[i]);
                x += 28;
            } else {
                const texto = this.add.text(x, 0, partes[i], {
                    padding: { top: 6, bottom: 6 },
                    fontFamily: "Fuente",
                    fontSize: "16px",
                    color: "#cbdbfc"
                }).setOrigin(0, 0.5);
                instrucciones.add(texto);
                x += texto.width;
            }
            x += 12;
        }

        instrucciones.setX(-(x - 12) / 2);
    }

    private ayudaPendiente(): boolean {
        return this.tutorialActual !== null &&
            this.movimientosAyuda < this.tutorialActual.movimientos;
    }

    private crearAyudaMovimiento() {
        const centroX = this.scale.width / 2;
        const centroY = this.scale.height - this.altoAvisos / 2;
        this.ayudaMovimiento = this.add.container(centroX, centroY);
        this.ayudaMovimiento.setDepth(940);

        this.tutorialActual = null;
        if (this.community === false && !this.testeando && !this.modoTest) {
            for (let i = 0; i < this.tutoriales.length; i++) {
                if (this.tutoriales[i].nivel === this.levelNumber) {
                    this.tutorialActual = this.tutoriales[i];
                    break;
                }
            }
        }

        const tutorial = this.tutorialActual;
        if (tutorial === null || this.movimientosAyuda >= tutorial.movimientos) {
            this.ayudaMovimiento.setVisible(false);
            return;
        }

        const fondo = this.add.rectangle(
            0, 0, this.scale.width,
            this.altoAvisos - 12, 0x171a2e, 0.74
        );
        this.ayudaMovimiento.add(fondo);

        const instrucciones = this.add.container(0, 0);
        this.ayudaMovimiento.add(instrucciones);
        const partes = tutorial.partes[spanish];
        let x = 0;

        for (let i = 0; i < partes.length; i++) {
            if (partes[i] === "arrows" || partes[i] === "WASD") {
                let teclas = ["up", "left", "down", "right"];
                if (partes[i] === "WASD") {
                    teclas = ["W", "A", "S", "D"];
                }
                this.crearTecla(instrucciones, x + 46, -17, teclas[0]);
                this.crearTecla(instrucciones, x + 14, 15, teclas[1]);
                this.crearTecla(instrucciones, x + 46, 15, teclas[2]);
                this.crearTecla(instrucciones, x + 78, 15, teclas[3]);
                x += 92;
            } else {
                const texto = this.add.text(x, 0, partes[i], {
                    padding: { top: 6, bottom: 6 },
                    fontFamily: "Fuente",
                    fontSize: "16px",
                    color: "#cbdbfc",
                    align: "center",
                    wordWrap: { width: this.scale.width - 64 }
                }).setOrigin(0, 0.5);
                instrucciones.add(texto);
                x += texto.width;
            }
            x += 16;
        }

        instrucciones.setX(-(x - 16) / 2);
    }


    private abrirMenuPausa() {
        if (this.menuup != 0) {
            return;
        }

        this.reproducirSonido("click");
        this.menuup = 1;
        this.inputBuffer = "";
        this.ayudaMovimiento.setVisible(false);

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
            364,
            0x080b17
        );

        sombra.setDepth(1001);

        this.objetosMenuPausa.push(sombra);

        const panel = this.add.rectangle(
            centroX,
            centroY,
            420,
            360,
            0x171a2e
        );

        panel.setStrokeStyle(4, 0xb39ddb);
        panel.setDepth(1002);

        this.objetosMenuPausa.push(panel);

        const titulo = this.add.text(
            centroX,
            centroY - 135,
            this.textoOpciones[14][spanish],
            {
                padding: { top: 6, bottom: 6 },
                fontFamily: "Fuente",
                fontSize: "26px",
                color: "#ffffff",
            }
        );

        titulo.setOrigin(0.5);
        titulo.setDepth(1003);

        this.objetosMenuPausa.push(titulo);

        const datosEtiqueta = this.obtenerEtiquetaNivel();
        let detalleNivel = datosEtiqueta.texto;
        if (detalleNivel === "") {
            detalleNivel = this.textoOpciones[15][spanish];
        }

        const etiquetaNivel = this.add.text(
            centroX,
            centroY - 95,
            detalleNivel,
            {
                padding: { top: 6, bottom: 6 },
                fontFamily: "Fuente",
                fontSize: "17px",
                color: datosEtiqueta.color
            }
        ).setOrigin(0.5).setDepth(1003);
        this.objetosMenuPausa.push(etiquetaNivel);

        let nombreVisible = this.obtenerNombreNivel();
        const nombreNivel = this.add.text(
            centroX,
            centroY - 65,
            nombreVisible,
            {
                padding: { top: 6, bottom: 6 },
                fontFamily: "Fuente",
                fontSize: "18px",
                color: "#cbdbfc"
            }
        ).setOrigin(0.5).setDepth(1003);

        while (nombreNivel.width > 356 && nombreVisible.length > 0) {
            nombreVisible = nombreVisible.substring(0, nombreVisible.length - 1);
            nombreNivel.setText(nombreVisible + "...");
        }
        this.objetosMenuPausa.push(nombreNivel);

        let objetosBoton = this.crearBotonJuego(
            centroX,
            centroY - 10,
            260,
            this.textoOpciones[8][spanish],
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
            centroY + 50,
            260,
            this.textoOpciones[6][spanish],
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
            centroY + 110,
            260,
            this.textoOpciones[16][spanish],
            0xe57373,
            1004,
            () => {
                this.volver();
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

        this.reproducirSonido("click");
        this.menuup = 0;
        this.ayudaMovimiento.setVisible(
            this.ayudaPendiente()
        );

        for (let i = 0; i < this.objetosMenuPausa.length; i++) {
            if (this.objetosMenuPausa[i].scene) {
                this.objetosMenuPausa[i].destroy();
            }
        }

        this.objetosMenuPausa = [];
    }

    //////////////////////////
    //LUCAS HELPERS DEL GAME//
    //////////////////////////

    private opposite(dir: number): number {
        switch(dir) {
            case 0: return 2;
            case 1: return 3;
            case 2: return 0;
            case 3: return 1;
        }
        return 4;
    }
    private isDoor(x: number, y: number): boolean {
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if (entity.secret === "flag" && entity.x === x &&
                (entity.y === y || entity.y - 1 === y)) {
                return true;
            }
        }
        return false;
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
        return (this.entities.find(entity => entity.portal !== undefined && entity.group === group && entity !== exclude && this.isPortalActive(entity)));
    }

    //PORTAL WITH PRESSURE PLATES

    private isPortalActive(portal: Entity): boolean {
        let hasPlate = false;
        for (let i = 0; i < this.entities.length; i++) {
            const plate = this.entities[i];
            if (plate.type === "goal" && plate.group !== undefined && plate.group === portal.group) {
                hasPlate = true;
                for (let j = 0; j < this.entities.length; j++) {
                    const entity = this.entities[j];
                    if ((entity.type === "player" || entity.pushable === true) && entity.x === plate.x && entity.y === plate.y) {
                        return true;
                    }
                }
            }
        }
        return hasPlate === false;
    }

    private isPlatePressed(plate: Entity): boolean {
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if ((entity.type === "player" || entity.pushable) &&
                entity.x === plate.x && entity.y === plate.y) {
                return true;
            }
        }
        return false;
    }

    private isEmitterActive(emitter: Entity): boolean {
        if (emitter.controlGroup === undefined) {
            return true;
        }
        for (let i = 0; i < this.entities.length; i++) {
            const plate = this.entities[i];
            if (plate.type === "goal" &&
                plate.controlGroup === emitter.controlGroup &&
                this.isPlatePressed(plate)) {
                return true;
            }
        }
        return false;
    }

    private getPortalAt(x: number, y: number, dir?: number): Entity | undefined {
        if (dir !== undefined) {
            return this.entities.find(entity => entity.portal === dir && entity.x === x && entity.y === y && this.isPortalActive(entity));
        } else {
            return this.entities.find(entity => entity.portal !== undefined && entity.x === x && entity.y === y && this.isPortalActive(entity));
        }
    }
    
    /////////////////////
    //FUNCIONES LASERES//
    /////////////////////

    private createLaserBody(x: number, y: number, dir: number, phase: number, source?: Entity): LaserVisual {
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
        this.playLaserAnimation(body, animation, phase);
        const visual: LaserVisual = {
            sprite: body,
            source: source,
            visualOffsetX: 0,
            visualOffsetY: 0,
            incomingDir: dir,
            outgoingDir: dir,
            incomingPhase: phase,
            outgoingPhase: phase
        };
        return visual;
    }

    private addLaserCap(laser: LaserVisual) {
        const body = laser.sprite;
        let frame = 0;
        let origina = 0;
        let originb = 0;

        switch (laser.outgoingDir) {
            case 0: frame = 1.5*Math.PI; originb = 1; break;
            case 1: frame = 0; origina = 1; originb = 1; break;
            case 2: frame = 0.5*Math.PI; origina = 1; break;
            case 3: frame = Math.PI; break;
        }
        const cap = this.add.sprite(body.x, body.y, "laserheads", 1).setRotation(frame);

        cap.setOrigin(origina, originb);
        cap.setScale(this.pixelmultiplier);
        this.playLaserAnimation(cap, "laserhead", laser.outgoingPhase);
        laser.cap = cap;
        this.updateLaserCapDepth(laser);
    }

    private updateEntityDepth(entity: Entity) {
        const depth = 2 * (entity.sprite.y - this.offsetY) / this.tilesize;
        entity.sprite.setDepth(depth);
        if (entity.sprite2) {
            entity.sprite2.setDepth(depth + 1);
        }
    }

    private actualizarPortal(entity: Entity, mover: boolean = true, profundidad: boolean = true): void {
        if (entity.portal === undefined) return;

        const normal = entity.type === "wall" &&
            entity.sprite.texture.key === "tileset-fogo" &&
            esParedExteriorPortal(Number(entity.sprite.frame.name) + 1);

        if (!entity.sprite2) {
            entity.sprite2 = this.add.sprite(entity.sprite.x, entity.sprite.y, "portal-normal-green", 0);
        }

        let grupo = 0;
        if (entity.group !== undefined) grupo = entity.group;
        configurarPortal(entity.sprite2, grupo, entity.portal, normal);
        entity.sprite2.setScale(this.pixelmultiplier);
        if (mover) entity.sprite2.setPosition(entity.sprite.x, entity.sprite.y);
        if (profundidad) entity.sprite2.setDepth(2 * entity.y + 1);
    }

    private addLaserTail(laser: LaserVisual) {
        const body = laser.sprite;
        let frame = 0;
        let origina = 0;
        let originb = 0;
        switch (laser.incomingDir) {
            case 0: frame = 1.5*Math.PI; originb = 1; break;
            case 1: frame = 0; origina = 1; originb = 1; break;
            case 2: frame = 0.5*Math.PI; origina = 1; break;
            case 3: frame = Math.PI; break;
        }
        const tail = this.add.sprite(body.x, body.y, "lasertails", 1).setRotation(frame);

        tail.setOrigin(origina, originb);
        tail.setScale(this.pixelmultiplier);
        tail.setDepth(body.depth);
        this.playLaserAnimation(tail, "lasertails", laser.outgoingPhase);

        const cut = 4 * this.pixelmultiplier;

        let maskX = body.x - this.tilesize;
        let maskY = body.y - this.tilesize;
        let maskW = this.tilesize;
        let maskH = this.tilesize;

        switch(laser.incomingDir) {
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

    private setLaserVisible(laser: LaserVisual, visible: boolean) {
        laser.sprite.setVisible(visible);
        if (laser.cap) laser.cap.setVisible(visible);
        if (laser.tail) laser.tail.setVisible(visible);
    }

    private clearMovingLasers() {
        for (let i = 0; i < this.movingLasers.length; i++) {
            this.destroyLaser(this.movingLasers[i]);
        }
        this.movingLasers = [];
        this.movingLaserCount = 0;
    }

    private getMovingLaser(source: Entity, x: number, y: number, dir: number, phase: number, outgoingDir: number, first: boolean): LaserVisual | undefined {
        const index = this.movingLaserCount;
        let laser: LaserVisual | undefined = this.movingLasers[index];
        if (laser && (
            laser.source !== source || laser.incomingDir !== dir ||
            laser.outgoingDir !== outgoingDir || laser.incomingPhase !== phase ||
            Boolean(laser.tail) !== first
        )) {
            this.destroyLaser(laser);
            laser = undefined;
        }
        if (!laser) {
            if (dir === outgoingDir) {
                laser = this.createLaserBody(x, y, dir, phase, source);
            } else {
                laser = this.addLaserTurn(source, dir, outgoingDir, phase);
            }
            if (!laser) return;
            if (first) this.addLaserTail(laser);
            this.movingLasers[index] = laser;
        }
        this.movingLaserCount++;
        this.setLaserVisible(laser, true);
        if (laser.cap) laser.cap.setVisible(false);
        return laser;
    }

    private positionMovingLaser(laser: LaserVisual, x: number, y: number, width: number, height: number, tailX: number, tailY: number) {
        laser.sprite.setPosition(x, y).setScale(
            this.pixelmultiplier * width / this.tilesize,
            this.pixelmultiplier * height / this.tilesize
        );

        let depth = 0;
        if (laser.incomingDir !== laser.outgoingDir && laser.source) {
            depth = laser.source.sprite.depth + 0.00001;
        }
        laser.sprite.setDepth(depth);
        if (laser.tail) {
            laser.tail.setPosition(tailX, tailY).setDepth(depth);
        }
        if (laser.maskShape2) {
            const cut = 4 * this.pixelmultiplier;
            let maskX = x - width;
            let maskY = y - height;
            let maskW = width;
            let maskH = height;
            if (laser.incomingDir === 0) maskH -= cut;
            else if (laser.incomingDir === 1) { maskX += cut; maskW -= cut; }
            else if (laser.incomingDir === 2) { maskY += cut; maskH -= cut; }
            else if (laser.incomingDir === 3) maskW -= cut;
            laser.maskShape2.setScale(1).setOrigin(0, 0);
            laser.maskShape2.setPosition(maskX, maskY);
            laser.maskShape2.setSize(Math.max(0, maskW), Math.max(0, maskH));
        }
    }

    private updateLaserPositions() {
        let moving = false;
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if (entity.pushable && (
                Math.abs(entity.sprite.x - this.offsetX - entity.x * this.tilesize) > 0.001 ||
                Math.abs(entity.sprite.y - this.offsetY - entity.y * this.tilesize) > 0.001
            )) {
                moving = true;
                break;
            }
        }
        for (let i = 0; i < this.lasers.length; i++) {
            this.setLaserVisible(this.lasers[i], !moving);
        }
        
        if (!moving) {
            for (let i = 0; i < this.lasers.length; i++) {
                const laser = this.lasers[i];
                const source = laser.source;
                if (!source || laser.incomingDir === laser.outgoingDir) {
                    continue;
                }
                const dx = source.sprite.x - laser.sprite.x;
                const dy = source.sprite.y - laser.sprite.y;
                laser.sprite.setPosition(source.sprite.x, source.sprite.y);
                laser.sprite.setDepth(source.sprite.depth + 0.00001);
                if (laser.cap) {
                    laser.cap.setPosition(laser.cap.x + dx, laser.cap.y + dy);
                    this.updateLaserCapDepth(laser);
                }
                if (laser.tail) {
                    laser.tail.setPosition(laser.tail.x + dx, laser.tail.y + dy);
                    laser.tail.setDepth(laser.sprite.depth);
                }
                if (laser.maskShape) {
                    laser.maskShape.setPosition(
                        laser.maskShape.x + dx,
                        laser.maskShape.y + dy
                    );
                }
                if (laser.maskShape2) {
                    laser.maskShape2.setPosition(
                        laser.maskShape2.x + dx,
                        laser.maskShape2.y + dy
                    );
                }
                laser.visualOffsetX = 0;
                laser.visualOffsetY = 0;
            }
            this.clearMovingLasers();
            return;
        }
        
        this.movingLaserCount = 0;
        const queue: {
            source: Entity;
            dir: number;
            phase: number;
            x?: number;
            y?: number;
        }[] = [];
        const fired: Entity[] = [];
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if (entity.type === "laserEmissor" && entity.dir !== undefined &&
                this.isEmitterActive(entity)) {
                queue.push({ source: entity, dir: entity.dir, phase: 0 });
            }
        }
        for (let i = 0; i < queue.length; i++) {
            const ray = queue[i];
            const source = ray.source;
            if (fired.includes(source)) continue;
            fired.push(source);
            let dx = 0;
            let dy = 0;
            if (ray.dir === 0) dy = -1;
            else if (ray.dir === 1) dx = 1;
            else if (ray.dir === 2) dy = 1;
            else if (ray.dir === 3) dx = -1;
            else continue;
            let sourceX = source.sprite.x;
            let sourceY = source.sprite.y;
            if (ray.x !== undefined) sourceX = ray.x;
            if (ray.y !== undefined) sourceY = ray.y;
            const row = Math.max(0, Math.min(this.staticRows.length - 1, Math.round((sourceY - this.offsetY) / this.tilesize)));
            let distance = 0;
            if (dx === 1) distance = this.offsetX + (this.staticRows[row].length - 1) * this.tilesize - sourceX;
            else if (dx === -1) distance = sourceX - this.offsetX;
            else if (dy === 1) distance = this.offsetY + (this.staticRows.length - 1) * this.tilesize - sourceY;
            else distance = sourceY - this.offsetY;
            let target: Entity | undefined;
            let aligned = false;
            for (let j = 0; j < this.entities.length; j++) {
                const entity = this.entities[j];
                if (entity === source) continue;
                const differenceX = entity.sprite.x - sourceX;
                const differenceY = entity.sprite.y - sourceY;
                const across = Math.abs(differenceX * dy - differenceY * dx);
                const ahead = differenceX * dx + differenceY * dy;
                if (across >= this.tilesize / 2 || ahead < this.tilesize / 2) continue;
                const entryPortal = across < 0.001 &&
                    entity.portal === this.opposite(ray.dir) &&
                    this.isPortalActive(entity);
                if (entity.type !== "wall" && !entity.pushable && !entryPortal) continue;
                const gap = Math.max(0, ahead - this.tilesize);
                if (gap < distance || (gap <= distance && entryPortal)) {
                    distance = gap;
                    target = entity;
                    aligned = across < 0.001;
                }
            }
            distance = Math.max(0, distance);
            let outgoingDir = -1;
            let portal = false;
            let turnX = 0;
            let turnY = 0;
            if (target) {
                turnX = target.sprite.x;
                turnY = target.sprite.y;
                portal = aligned &&
                    target.portal === this.opposite(ray.dir) &&
                    this.isPortalActive(target);

                if (!portal && target.type === "mirror") {
                    outgoingDir = this.getMirrorDirection(target, ray.dir);

                    if (outgoingDir !== -1) {
                        let slope = -1;
                        if (target.dir === 1 || target.dir === 3) {
                            slope = 1;
                        }
                        if (dx !== 0) {
                            turnX += slope * (sourceY - target.sprite.y);
                            turnY = sourceY;
                        } else {
                            turnX = sourceX;
                            turnY += slope * (sourceX - target.sprite.x);
                        }
                        distance = Math.max(
                            0,
                            (turnX - sourceX) * dx +
                            (turnY - sourceY) * dy -
                            this.tilesize
                        );
                    }
                }
            }
            let last: LaserVisual | undefined;
            for (let travelled = 0; travelled < distance - 0.001; travelled += this.tilesize) {
                const length = Math.min(this.tilesize, distance - travelled);
                const tileX = sourceX + dx * (travelled + this.tilesize);
                const tileY = sourceY + dy * (travelled + this.tilesize);
                const first = travelled === 0 && source.type === "laserEmissor";
                const laser = this.getMovingLaser(
                    source,
                    (tileX - this.offsetX) / this.tilesize,
                    (tileY - this.offsetY) / this.tilesize,
                    ray.dir,
                    ray.phase,
                    ray.dir,
                    first
                );
                if (!laser) continue;
                let x = tileX;
                let y = tileY;
                let width = this.tilesize;
                let height = this.tilesize;
                if (dx !== 0) {
                    width = length;
                    if (dx > 0) x = sourceX + travelled + length;
                } else {
                    height = length;
                    if (dy > 0) y = sourceY + travelled + length;
                }
                this.positionMovingLaser(
                    laser,
                    x,
                    y,
                    width,
                    height,
                    sourceX + dx * this.tilesize,
                    sourceY + dy * this.tilesize
                );
                last = laser;
            }
            if (target && outgoingDir !== -1) {
                const first = distance < 0.001 && source.type === "laserEmissor";
                const turn = this.getMovingLaser(
                    target,
                    target.x,
                    target.y,
                    ray.dir,
                    ray.phase,
                    outgoingDir,
                    first
                );
                if (turn) {
                    this.positionMovingLaser(
                        turn,
                        turnX,
                        turnY,
                        this.tilesize,
                        this.tilesize,
                        sourceX + dx * this.tilesize,
                        sourceY + dy * this.tilesize
                    );
                    queue.push({
                        source: target,
                        dir: outgoingDir,
                        phase: turn.outgoingPhase,
                        x: turnX,
                        y: turnY
                    });
                }
            } else if (target && portal) {
                const exit = this.findPair(target.group, target);
                if (exit && exit.portal !== undefined) {
                    queue.push({
                        source: exit,
                        dir: exit.portal,
                        phase: ray.phase
                    });
                }
            } else {
                if (!last && source.type === "mirror") {
                    for (let j = 0; j < this.movingLaserCount; j++) {
                        const laser = this.movingLasers[j];
                        if (laser.source === source && laser.incomingDir !== laser.outgoingDir) {
                            last = laser;
                            break;
                        }
                    }
                }
                if (last) {
                    if (!last.cap) this.addLaserCap(last);
                    last.cap!.setPosition(
                        sourceX + dx * distance,
                        sourceY + dy * distance
                    ).setVisible(true);
                    this.updateLaserCapDepth(last);
                }
            }
        }
        while (this.movingLasers.length > this.movingLaserCount) {
            this.destroyLaser(this.movingLasers.pop()!);
        }
    }

    private getMirrorDirection(mirror: Entity, dir: number): number {
        switch(dir) {
            case 0:
                if (mirror.dir === 2) return 1;
                if (mirror.dir === 3) return 3;
                break;
            case 1:
                if (mirror.dir === 0) return 0;
                if (mirror.dir === 3) return 2;
                break;
            case 2:
                if (mirror.dir === 0) return 3;
                if (mirror.dir === 1) return 1;
                break;
            case 3:
                if (mirror.dir === 1) return 0;
                if (mirror.dir === 2) return 2;
                break;
        }
        return -1;
    }

    private updateLaserCapDepth(laser: LaserVisual) {
        const cap = laser.cap;
        if (!cap) return;
        let dx = 0;
        let dy = 0;
        if (laser.outgoingDir === 0) dy = -1;
        else if (laser.outgoingDir === 1) dx = 1;
        else if (laser.outgoingDir === 2) dy = 1;
        else if (laser.outgoingDir === 3) dx = -1;
        let depth = 2 * (cap.y - this.offsetY) / this.tilesize - 0.1;
        if (laser.incomingDir !== laser.outgoingDir) {
            depth = laser.sprite.depth + 0.00002;
        }
        const targetX = cap.x + dx * this.tilesize;
        const targetY = cap.y + dy * this.tilesize;
        for (let i = 0; i < this.entities.length; i++) {
            const entity = this.entities[i];
            if (entity === laser.source) continue;
            if (entity.type !== "wall" && !entity.pushable) continue;
            const differenceX = entity.sprite.x - targetX;
            const differenceY = entity.sprite.y - targetY;
            const along = Math.abs(differenceX * dx + differenceY * dy);
            const across = Math.abs(differenceX * dy - differenceY * dx);
            if (along < 0.001 && across < this.tilesize / 2) {
                depth = Math.min(depth, entity.sprite.depth - 0.00001);
            }
        }
        cap.setDepth(depth);
    }

    private addLaser(x: number, y: number, dir: number, first: boolean = false, phase: number = 0, source?: Entity): LaserVisual | undefined {
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
            if (exit) this.setEmitting(exit, exit.portal, phase);
            return;
            }
        }
        if (this.isWall(nextX, nextY) || (this.getEntityAt(nextX, nextY) && !this.getMirrorAt(nextX, nextY))) {
            return;
        }
        if (this.getMirrorAt(nextX, nextY)) {
            const mirror = this.getMirrorAt(nextX, nextY);
            if (mirror){
                let outgoingDir = -1;

                switch(dir) {
                    case 0:
                        switch(mirror.dir) {
                            case 2: outgoingDir = 1; break;
                            case 3: outgoingDir = 3; break;
                        }
                        break;
                    case 1:
                        switch(mirror.dir) {
                            case 0: outgoingDir = 0; break;
                            case 3: outgoingDir = 2; break;
                        }
                        break;
                    case 2:
                        switch(mirror.dir) {
                            case 0: outgoingDir = 3; break;
                            case 1: outgoingDir = 1; break;
                        }
                        break;
                    case 3:
                        switch(mirror.dir) {
                            case 1: outgoingDir = 0; break;
                            case 2: outgoingDir = 2; break;
                        }
                        break;
                }
                if (outgoingDir === -1) {
                    return;
                }
                const turn = this.addLaserTurn(mirror, dir, outgoingDir, phase);
                if (!turn) return;
                this.lasers.push(turn);
                if (first) this.addLaserTail(turn);
                this.setEmitting(mirror, outgoingDir, turn.outgoingPhase);
                return turn;
            }
        }
        const laser = this.createLaserBody(nextX, nextY, dir, phase, source);
        this.lasers.push(laser);
        if (first) {
            this.addLaserTail(laser);
        }
        const nextLaser = this.addLaser(nextX, nextY, dir, false, phase, source);
        const portalAhead = this.getPortalAt(nextX + dx, nextY + dy, this.opposite(dir));
        if (!nextLaser && !portalAhead) {
            this.addLaserCap(laser);
        }
        return laser;
    }

    private addLaserTurn(mirror: Entity, incomingDir: number, outgoingDir: number, phase: number): LaserVisual | undefined {
        let animation = "";
        let sprite: number = 0;
        let outgoingPhase = (phase + 3) % 8;
        const entrySide = this.opposite(incomingDir);
        if (entrySide === 4) return;
        if ((entrySide === 2 && outgoingDir === 1)) {
            animation = "lasermirrorse";
            sprite = 0;
            outgoingPhase = (phase - 2) % 8;
        }
        if ((entrySide === 1 && outgoingDir === 2)) {
            animation = "lasermirrores";
            sprite = 0;
            outgoingPhase = (phase - 2) % 8;
        }
        if ((entrySide === 2 && outgoingDir === 3)) {
            animation = "lasermirrorsw";
            sprite = 1;
        }
        if ((entrySide === 3 && outgoingDir === 2)) {
            animation = "lasermirrorws";
            sprite = 1;
        }
        if ((entrySide === 0 && outgoingDir === 1)) {
            animation = "lasermirrorne";
            sprite = 3;
        }
        if ((entrySide === 1 && outgoingDir === 0)) {
            animation = "lasermirroren";
            sprite = 3;
        }
        if ((entrySide === 0 && outgoingDir === 3)) {
            animation = "lasermirrorwn";
            sprite = 2;
            outgoingPhase = phase;
        }
        if ((entrySide === 3 && outgoingDir === 0)) {
            animation = "lasermirrornw";
            sprite = 2;
            outgoingPhase = phase;
        }
        if (animation === "") {
            return;
        }
        const turn = this.add.sprite(mirror.sprite.x, mirror.sprite.y, "laserTurn", sprite).setOrigin(1, 1).setScale(this.pixelmultiplier).setDepth(mirror.sprite.depth + 0.00001);
        this.playLaserAnimation(turn, animation, phase);
        const visual: LaserVisual = {
            sprite: turn,
            source: mirror,
            visualOffsetX: mirror.sprite.x - (this.offsetX + mirror.x * this.tilesize),
            visualOffsetY: mirror.sprite.y - (this.offsetY + mirror.y * this.tilesize),
            incomingDir: incomingDir,
            outgoingDir: outgoingDir,
            incomingPhase: phase,
            outgoingPhase: outgoingPhase
        };
        return visual;
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

        laser.sprite.destroy();

        if (laser.maskFilter) {
            if (laser.sprite.filters) {
                laser.sprite.filters.external.remove(
                    laser.maskFilter
                );
            }

            laser.maskFilter = undefined;
        }

        if (laser.maskFilter2) {
            if (laser.sprite.filters) {
                laser.sprite.filters.external.remove(
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

        laser.sprite.destroy();
    }

    private setEmitting(entity: Entity, dir: number | undefined, phase: number = 0) {
        entity.emitting = dir;
        entity.laserPhase = phase;

        if (!this.emitterQueue.includes(entity) && !this.firedEmitters.includes(entity)) {
            this.emitterQueue.push(entity);
        }
    }

    private playLaserAnimation(laser: Phaser.GameObjects.Sprite, animation: string, phase: number = 0) {
        const frameRate = this.animationspeed * 1.5;
        const totalFrames = 8;
        const millisecondsPerFrame = 1000 / frameRate;
        const globalFrame = Math.floor(this.time.now / millisecondsPerFrame);
        const frame = (globalFrame + phase) % totalFrames;

        laser.play({key: animation, startFrame: frame});
    }

    private raycast() {
        while (this.emitterQueue.length > 0) {
            const emitter = this.emitterQueue.shift();

            if (!emitter) continue;
            let phase = 0;
            if (emitter.laserPhase !== undefined) {
                phase = emitter.laserPhase;
            }
            if (this.firedEmitters.includes(emitter)) continue;
            if (emitter.emitting === undefined) continue;

            this.firedEmitters.push(emitter);

            let first = false;
            if (emitter.type === "laserEmissor") {
                first = true;
            }
            const nextLaser = this.addLaser(emitter.x, emitter.y, emitter.emitting, first, phase, emitter);
            if (emitter.type === "mirror" && !nextLaser) {
                const turn = this.lasers.find (laser => laser.sprite.x === emitter.sprite.x &&  laser.sprite.y === emitter.sprite.y && laser.outgoingDir === emitter.emitting && laser.incomingDir !== laser.outgoingDir);
                if (turn) {
                    let dx = 0;
                    let dy = 0;
                    switch(emitter.emitting) {
                        case 0: dy = -1; break;
                        case 1: dx = 1; break;
                        case 2: dy = 1; break;
                        case 3: dx = -1; break;
                    }
                    const portalAhead = this.getPortalAt(emitter.x + dx, emitter.y + dy, this.opposite(emitter.emitting));
                    if (!portalAhead) this.addLaserCap(turn);
                }
            }
        }
    }
    
    private lindseyDeath(): boolean {
        const player = this.entities.find(entity => entity.type === "player");
        if (player === undefined) {console.log("ERROR: there is no player, idiot."); return true;}
        const currX = player.x;
        const currY = player.y;
        if (this.lasers.find((laser) => (laser.sprite.x === this.offsetX + currX * this.tilesize && laser.sprite.y === this.offsetY + (currY-1) * this.tilesize && laser.outgoingDir == 2)) || this.entities.find((emissor) => (emissor.y === currY-1 && emissor.x === currX && emissor.emitting === 2))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.sprite.y === this.offsetY + currY * this.tilesize && laser.sprite.x === this.offsetX + (currX+1) * this.tilesize && laser.outgoingDir == 3)) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX+1 && emissor.emitting === 3))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.sprite.x === this.offsetX + currX * this.tilesize && laser.sprite.y === this.offsetY + (currY+1) * this.tilesize && laser.outgoingDir == 0)) || this.entities.find((emissor) => (emissor.y === currY+1 && emissor.x === currX && emissor.emitting === 0))) {
            return true;
        }
        if (this.lasers.find((laser) => (laser.sprite.y === this.offsetY + currY * this.tilesize && laser.sprite.x === this.offsetX + (currX-1) * this.tilesize && laser.outgoingDir == 1)) || this.entities.find((emissor) => (emissor.y === currY && emissor.x === currX-1 && emissor.emitting === 1))) {
            return true;
        }
        return false;
    }

    private laserFunction() {
        this.clearMovingLasers();
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
                switch(mirror.dir) {
                    case 0: mirror.sprite.setTexture("tileset-fogo", 4); break;
                    case 1: mirror.sprite.setTexture("tileset-fogo", 5); break;
                    case 2: mirror.sprite.setTexture("tileset-fogo", 2); break;
                    case 3: mirror.sprite.setTexture("tileset-fogo", 3); break;
                }
            }
        }
        const emissors = this.entities.filter(entity => entity.type === "laserEmissor");
        
    if (emissors) {
        for (const emissor of emissors) {
            emissor.emitting = undefined;
            emissor.sprite.clearTint();

            if (this.isEmitterActive(emissor)) {
                this.setEmitting(emissor, emissor.dir, 0);

                switch(emissor.dir) {
                    case 0: emissor.sprite.setTexture("tileset-fogo", 10); break;
                    case 1: emissor.sprite.setTexture("tileset-fogo", 13); break;
                    case 2: emissor.sprite.setTexture("tileset-fogo", 11); break;
                    case 3: emissor.sprite.setTexture("tileset-fogo", 12); break;
                }
            } else {
                switch(emissor.dir) {
                    case 0: emissor.sprite.setTexture("tileset-fogo", 30); break;
                    case 1: emissor.sprite.setTexture("tileset-fogo", 25); break;
                    case 2: emissor.sprite.setTexture("tileset-fogo", 31); break;
                    case 3: emissor.sprite.setTexture("tileset-fogo", 24); break;
                }
            }
        }
    }
        const recievers = this.entities.filter(entity => entity.type === "laserReciever");
        if (recievers) {
            for (const emissor of recievers) {
                switch(emissor.dir) {
                    case 0: emissor.sprite.setTexture("tileset-fogo", 6); break;
                    case 1: emissor.sprite.setTexture("tileset-fogo", 9); break;
                    case 2: emissor.sprite.setTexture("tileset-fogo", 7); break;
                    case 3: emissor.sprite.setTexture("tileset-fogo", 8); break;
                }
            }
        }
        const portals = this.entities.filter(entity => entity.portal !== undefined);
        if (portals) {
            for (const portal of portals) {
                portal.emitting = undefined;
                if (portal.sprite2) {
                    if (this.isPortalActive(portal)) {
                        portal.sprite2.setAlpha(portal.sprite.alpha);
                    } else {
                        portal.sprite2.setAlpha(0.25 * portal.sprite.alpha);
                    }
                }
            }
        }
        this.raycast();
        this.actualizarSonidosReflejos();
    }

    private winConditionsMet2(): boolean {
    let todosActivados = true;
    const recievers = this.entities.filter(entity => entity.type === "laserReciever");
    for (const reciever of recievers) {
        const currX = reciever.x;
        const currY = reciever.y;
        let activated = false;
        switch (reciever.dir) {
            case 0:
                if (
                    this.lasers.find((laser) =>
                        laser.sprite.x === this.offsetX + currX * 16 * this.pixelmultiplier &&
                        laser.sprite.y === this.offsetY + (currY - 1) * 16 * this.pixelmultiplier &&
                        laser.outgoingDir === 2
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY - 1 &&
                        emissor.x === currX &&
                        emissor.emitting === 2
                    )
                ) {
                    activated = true;
                    reciever.sprite.setTexture("tileset-fogo", 6).setScale(this.pixelmultiplier);
                } else reciever.sprite.setTexture("tileset-fogo", 26).setScale(this.pixelmultiplier);
                break;
            case 1:
                if (
                    this.lasers.find((laser) =>
                        laser.sprite.y === this.offsetY + currY * 16 * this.pixelmultiplier &&
                        laser.sprite.x === this.offsetX + (currX + 1) * 16 * this.pixelmultiplier &&
                        laser.outgoingDir === 3
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY &&
                        emissor.x === currX + 1 &&
                        emissor.emitting === 3
                    )
                ) {
                    activated = true;
                    reciever.sprite.setTexture("tileset-fogo", 9).setScale(this.pixelmultiplier);
                } else reciever.sprite.setTexture("tileset-fogo", 29).setScale(this.pixelmultiplier);
                break;
            case 2:
                if (
                    this.lasers.find((laser) =>
                        laser.sprite.x === this.offsetX + currX * 16 * this.pixelmultiplier &&
                        laser.sprite.y === this.offsetY + (currY + 1) * 16 * this.pixelmultiplier &&
                        laser.outgoingDir === 0
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY + 1 &&
                        emissor.x === currX &&
                        emissor.emitting === 0
                    )
                ) {
                    activated = true;
                    reciever.sprite.setTexture("tileset-fogo", 7).setScale(this.pixelmultiplier);
                } else reciever.sprite.setTexture("tileset-fogo", 27).setScale(this.pixelmultiplier);
                break;
            case 3:
                if (
                    this.lasers.find((laser) =>
                        laser.sprite.y === this.offsetY + currY * 16 * this.pixelmultiplier &&
                        laser.sprite.x === this.offsetX + (currX - 1) * 16 * this.pixelmultiplier &&
                        laser.outgoingDir === 1
                    ) ||
                    this.entities.find((emissor) =>
                        emissor.y === currY &&
                        emissor.x === currX - 1 &&
                        emissor.emitting === 1
                    )
                ) {
                    activated = true;
                    reciever.sprite.setTexture("tileset-fogo", 8).setScale(this.pixelmultiplier);
                } else reciever.sprite.setTexture("tileset-fogo", 28).setScale(this.pixelmultiplier);
                break;
        }
        if (
            this.sonidosPreparados && activated &&
            reciever.sprite.getData("receptorActivo") === false
        ) {
            this.reproducirSonido("receptor");
        }
        reciever.sprite.setData("receptorActivo", activated);
        if (activated === false) {
            todosActivados = false;
        }
    }
    return todosActivados;
    }

    ///////////////////////////////
    //FUNCIONES GATE & MOVIMIENTO//
    ///////////////////////////////

    private flagCheck() {
        const flag = this.entities.find(entity => entity.secret === "flag");
        if (!flag) {
            return;
        }
        if (!this.winConditionsMet2()) {
            if (flag.type !== "wall") {
                if (this.sonidosPreparados) this.reproducirSonido("puertaCerrar");
                flag.sprite.play({key: "doorclose", startFrame: 0});
	            flag.sprite.setTexture("door", 11).setScale(this.pixelmultiplier);
                flag.type = "wall";
            }
        } else {
            if (flag.type === "wall") {
                if (this.sonidosPreparados) this.reproducirSonido("puerta");
                flag.sprite.play({key: "dooropen", startFrame: 0});
                flag.type = "flag";
	            flag.sprite.setTexture("door", 0).setScale(this.pixelmultiplier);
            }
        }
    }

    private updatePosition(dx: number, dy: number, dir: number, origDx = dx, origDy = dy, origDir = dir): boolean {
        const player = this.entities.find(entity => entity.type === "player");
        this.pushing = false;
        this.dead = false;
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
            this.movimientoConPortal = true;
            return true;
        }

        if (this.isWall(newX, newY)) {
            return false;
        }

        const entity = this.getEntityAt(newX, newY);
        if (entity) {
            this.pushing = true;
            this.tempstorage = entity;
            const newEntityX = entity.x + dx;
            const newEntityY = entity.y + dy;

            if (entity.portal !== undefined && entity.portal === dir && this.isPortalActive(entity)) {
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
                    this.movimientoConPortal = true;
                    return true;
                }
                player.x = savedPlayerX; player.y = savedPlayerY; player.dir = savedPlayerDir;
                player.sprite.setPosition(this.offsetX + player.x * 16*this.pixelmultiplier, this.offsetY + player.y * 16*this.pixelmultiplier).setDepth(2 * player.y);
            }
            if (this.isDoor(newEntityX, newEntityY)) {
                return false;
            }
            this.movimientoEmpujo = true;
            let portalHandled = false;
            let paradox: boolean = false;
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
                this.movimientoConPortal = true;
                if (exit === entity) {
                    this.flashbang();
                    paradox = true;
                    entry.x = 1000; entry.y = 0;
                    entry.sprite.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                    if (entry.sprite2) entry.sprite2.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                    if (entry.shadow) entry.shadow.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + entry.y * 16*this.pixelmultiplier - this.tilesize);                    
                    entity.x = 1000; entity.y = 0;
                    entity.sprite.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                    if (entity.sprite2) entity.sprite2.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier, this.offsetY + entity.y * 16*this.pixelmultiplier);
                    if (entity.shadow) entity.shadow.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + entity.y * 16*this.pixelmultiplier - this.tilesize);
                } 
                else {
                const savedX = entity.x, savedY = entity.y, savedDir = entity.dir, savedPortal = entity.portal;
                this.tempstorage2a = this.duplicateSprite(entity.sprite);
                this.tempstorage2b = undefined;
                if (entity.sprite2) this.tempstorage2b = this.duplicateSprite(entity.sprite2);
                this.tempstorage2c = undefined;
                if (entity.shadow) this.tempstorage2c = this.duplicateSprite(entity.shadow);
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
                if (entity.shadow) entity.shadow.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + entity.y * 16*this.pixelmultiplier - this.tilesize);
                this.actualizarPortal(entity, true, false);

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
                    if (entity.shadow) entity.shadow.setPosition(this.offsetX + entity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + entity.y * 16*this.pixelmultiplier - this.tilesize);
                    this.actualizarPortal(entity);

                    if (this.tempstorage2a) {
                        this.tempstorage2a.destroy();
                    }
                    if (this.tempstorage2b) {
                        this.tempstorage2b.destroy();
                    }
                    if (this.tempstorage2c) {
                        this.tempstorage2c.destroy();
                    }
                }
                if (done) {
                    portalHandled = true;
                }
                }
            }
            if (!portalHandled && !paradox) {
                const otherEntity = this.getEntityAt(newEntityX, newEntityY);

                if (entity.portal !== undefined && entity.portal === this.opposite(dir) && otherEntity && this.isPortalActive(entity)) {
                    const entry = entity;
                    const exit = this.findPair(entry.group, entry);

                    if (!exit) {
                        return false;
                    }

                    this.movimientoConPortal = true;
                    if (exit === otherEntity) {
                        paradox = true;
                        this.flashbang();
                        entry.x = 1000;
                        entry.y = 0;
                        entry.sprite.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                        if (entry.sprite2) {
                            entry.sprite2.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier, this.offsetY + entry.y * 16*this.pixelmultiplier);
                        }
                        if (entry.shadow) {
                            entry.shadow.setPosition(this.offsetX + entry.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + entry.y * 16*this.pixelmultiplier - this.tilesize);
                        }

                        otherEntity.x = 1000;
                        otherEntity.y = 0;
                        otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);
                        if (otherEntity.sprite2) {
                            otherEntity.sprite2.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier);
                        }
                        if (otherEntity.shadow) {
                            otherEntity.shadow.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + otherEntity.y * 16*this.pixelmultiplier - this.tilesize);
                        }
                    } else {
                        const savedX = otherEntity.x;
                        const savedY = otherEntity.y;
                        const savedDir = otherEntity.dir;
                        const savedPortal = otherEntity.portal;
                        this.tempstorage2a = this.duplicateSprite(otherEntity.sprite);
                        this.tempstorage2b = undefined;
                        if (otherEntity.sprite2) this.tempstorage2b = this.duplicateSprite(otherEntity.sprite2);
                        this.tempstorage2c = undefined;
                        if (otherEntity.shadow) this.tempstorage2c = this.duplicateSprite(otherEntity.shadow);

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
                            if (otherEntity.shadow) {
                                otherEntity.shadow.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + otherEntity.y * 16*this.pixelmultiplier - this.tilesize);
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
                            if (otherEntity.shadow) otherEntity.shadow.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + otherEntity.y * 16*this.pixelmultiplier - this.tilesize);

                            this.actualizarPortal(otherEntity);

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
                                if (this.tempstorage2b) this.tempstorage2b.destroy();
                                if (this.tempstorage2c) this.tempstorage2c.destroy();

                                otherEntity.sprite.setPosition(this.offsetX + otherEntity.x * 16*this.pixelmultiplier, this.offsetY + otherEntity.y * 16*this.pixelmultiplier).setDepth(2*otherEntity.y);

                                this.actualizarPortal(otherEntity);

                                return false;
                            }
                        }
                        if (!paradox) {
                            const portalStartX = entry.x;
                            const portalStartY = entry.y;

                            entry.x = newEntityX;
                            entry.y = newEntityY;

                            this.animatePushable(entry);

                            this.animateEat(portalStartX, portalStartY, entry.portal, dx, dy);
                        }
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
        player.sprite.setScale(this.pixelmultiplier);
        this.updateEntityDepth(player);
        this.laserFunction();
        const flag = this.entities.find(entity => entity.type === "flag");
        if (flag && player.x === flag.x && player.y === flag.y && this.winConditionsMet2()) {
            this.animateLindseyExit(player, flag);
            return true;
        }
        if (this.lindseyDeath()){
            this.menuup = 2;
            this.inputBuffer = "";
            this.holdBufferOpen = false;
            this.ayudaMovimiento.setVisible(false);
            this.dead = true;
        }
        this.animatePlayer(player, facing);
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

        if (this.isDoor(newX, newY)) {
            return false;
        }
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
            if (this.tempstorage.shadow) this.tempstorage.shadow.setPosition(this.offsetX + this.tempstorage.x * 16*this.pixelmultiplier - this.tilesize, this.offsetY + this.tempstorage.y * 16*this.pixelmultiplier - this.tilesize);
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
        this.animatePushable(this.tempstorage, true);
        if (!entry) {
            console.log("ERROR: YOU ARE EXITING A PORTAL WITH NO ENTRY");
            return false;
        }
        if (eat == false) {
            this.animateBPortalEntry(entry.x, entry.y, entry.portal);
        }
        this.maskBoxPortal(this.tempstorage, this.tempstorage.x-dx, this.tempstorage.y-dy, this.opposite(dir));
        this.actualizarPortal(this.tempstorage, false, false);   
        return true;
    }

    /////////////////////////
    //FUNCIONES ANIMACIONES//
    /////////////////////////

    private duplicateSprite(sprite: Phaser.GameObjects.Sprite): Phaser.GameObjects.Sprite {
        const copy = this.add.sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name);
        copy.setOrigin(sprite.originX, sprite.originY);
        copy.setScale(sprite.scaleX, sprite.scaleY);
        copy.setDepth(sprite.depth);
        copy.setAlpha(sprite.alpha);
        if (sprite.anims.isPlaying && sprite.anims.currentAnim) {
            copy.play(sprite.anims.currentAnim.key);
            copy.anims.setProgress(sprite.anims.getProgress());
        }
        return copy;
    }

    private actualizarAlphaPortal(entity: Entity, alpha: number): void {
        entity.sprite.setAlpha(alpha);
        if (entity.sprite2) {
            let alphaPortal = alpha;
            if (!this.isPortalActive(entity)) alphaPortal *= 0.25;
            entity.sprite2.setAlpha(alphaPortal);
        }
        if (entity.shadow) {
            entity.shadow.setAlpha(alpha);
        }
    }

    private animatePushable(entity: Entity, saliendoPortal: boolean = false) {
        const sprites: Phaser.GameObjects.Sprite[] = [];
        let speed = this.lindseyspeed;

        sprites.push(entity.sprite);
        if (entity.sprite2) {
            sprites.push(entity.sprite2);
        }

        const inicioX = entity.sprite.x;
        const inicioY = entity.sprite.y;
        if (saliendoPortal) this.actualizarAlphaPortal(entity, 0);
        const tween = this.tweens.add({
            targets: sprites,
            x: this.offsetX + entity.x * this.tilesize,
            y: this.offsetY + entity.y * this.tilesize,
            duration: speed,
            ease: "Linear",
            onUpdate: () => {
                this.updateEntityDepth(entity);
                this.updateLaserPositions();
                if (saliendoPortal) {
                    const distancia = Math.abs(entity.sprite.x - inicioX) + Math.abs(entity.sprite.y - inicioY);
                    const avance = Math.min(1, distancia / this.tilesize);
                    this.actualizarAlphaPortal(entity, Math.min(1, avance / 0.5));
                }
            },
            onComplete: () => {
                if (saliendoPortal) this.actualizarAlphaPortal(entity, 1);
            }
        });

        this.pushTweens.push(tween);
        
        if (entity.shadow) {
            const tween2 = this.tweens.add({
                targets: entity.shadow,
                x: this.offsetX + entity.x * this.tilesize - this.tilesize,
                y: this.offsetY + entity.y * this.tilesize - this.tilesize,
                duration: speed,
                ease: "Linear",
                onUpdate: () => {
                    this.updateEntityDepth(entity);
                    this.updateLaserPositions();
                    if (saliendoPortal) {
                        const distancia = Math.abs(entity.sprite.x - inicioX) + Math.abs(entity.sprite.y - inicioY);
                        const avance = Math.min(1, distancia / this.tilesize);
                        this.actualizarAlphaPortal(entity, Math.min(1, avance / 0.5));
                    }
                },
                onComplete: () => {
                    if (saliendoPortal) this.actualizarAlphaPortal(entity, 1);
                }
            });

            this.pushTweens.push(tween2);
        }
    }
    
    private ajustarMascaraPortalPared(region: Phaser.Geom.Rectangle, portalX: number, portalY: number, portalDir: number | undefined): void {
        const portal = this.entities.find(entity => entity.x === portalX && entity.y === portalY && entity.portal === portalDir);
        if (!portal || portal.type !== "wall") return;
        if (portal.sprite.texture.key !== "tileset-fogo") return;
        if (!esParedExteriorPortal(Number(portal.sprite.frame.name) + 1)) return;

        const bounds = portal.sprite.getBounds();
        const margenLateral = this.tilesize * 0.5;
        if (portalDir === 0) region.height += 8 * this.pixelmultiplier;
        if (portalDir === 1) {
            region.x = bounds.right - margenLateral;
            region.width += margenLateral;
        }
        if (portalDir === 2) region.y += 4 * this.pixelmultiplier;
        if (portalDir === 3) region.width = bounds.left + margenLateral - region.x;
    }

    private maskBoxPortal(box: Entity, portalX: number, portalY: number, portalDir: number | undefined) {
        this.tempstorage3 = box;
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        switch(portalDir) {
            case 0: maskH = portalY*this.tilesize - 23 * this.pixelmultiplier; break;
            case 3: maskW = (portalX - 1)*this.tilesize; break;
            case 2: maskY = portalY*this.tilesize - 13 * this.pixelmultiplier + this.offsetY; break;
            case 1: maskX = portalX*this.tilesize + this.offsetX; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        this.ajustarMascaraPortalPared(region, portalX, portalY, portalDir);
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
        this.maskFilter3 = undefined;
        if (box.shadow && box.shadow.scene) {
            const masks3 = Phaser.Actions.AddMaskShape(box.shadow, {
                shape: "rectangle",
                region: region
            });
            this.maskFilter3 = masks3[0];
        }
        this.maskFilter = masks[0];
    }

    private animateBPortalEntry(portalX: number, portalY: number, portalDir: number | undefined) {
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        let speed = this.lindseyspeed;
        switch(portalDir) {
            case 0: maskH = portalY*this.tilesize - 23*this.pixelmultiplier; break;
            case 1: maskX = portalX*this.tilesize + this.offsetX; break;
            case 2: maskY = portalY*this.tilesize - 13*this.pixelmultiplier + this.offsetY; break;
            case 3: maskW = portalX*this.tilesize - this.tilesize; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        this.ajustarMascaraPortalPared(region, portalX, portalY, portalDir);
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
        if (this.tempstorage2c) {
        const masks3 = Phaser.Actions.AddMaskShape(this.tempstorage2c, {
            shape: "rectangle",
            region: region
        });
        const maskFilter3 = masks3[0];
        }
        const maskFilter = masks[0];
        if (!this.tempstorage2a) {console.log ("fuck you"); return;}
        const copia = this.tempstorage2a;
        const copiaPortal = this.tempstorage2b;
        const copiaSombra = this.tempstorage2c;
        const inicioX = copia.x;
        const inicioY = copia.y;
        const alphaInicial = copia.alpha;
        let alphaPortalInicial = 1;
        let alphaSombraInicial = 1;
        if (copiaSombra) alphaSombraInicial = copiaSombra.alpha;
        if (copiaPortal) alphaPortalInicial = copiaPortal.alpha;
        const tween = this.tweens.add({
            targets: copia, 
            x: this.offsetX + portalX * 16*this.pixelmultiplier,
            y: this.offsetY + portalY * 16*this.pixelmultiplier,
            duration: speed,
            ease: "Linear",
            onUpdate: () => {
                const distancia = Math.abs(copia.x - inicioX) + Math.abs(copia.y - inicioY);
                const avance = Math.min(1, distancia / this.tilesize);
                const alpha = 1 - Math.max(0, (avance - 0.5) / 0.5);
                copia.setAlpha(alphaInicial * alpha);
                if (copiaPortal) copiaPortal.setAlpha(alphaPortalInicial * alpha);
                if (copiaSombra) copiaSombra.setAlpha(alphaSombraInicial * alpha);
            },

            onComplete: () => {
                copia.destroy();
            }
        });
        this.portalTweens.push(tween);
        if (copiaPortal) {
            const tween2 = this.tweens.add({
                targets: copiaPortal, 
                x: this.offsetX + portalX * 16*this.pixelmultiplier,
                y: this.offsetY + portalY * 16*this.pixelmultiplier,
                duration: this.lindseyspeed,
                ease: "Linear",

                onComplete: () => {
                    if (copiaPortal) copiaPortal.destroy();
                }
            });
            this.portalTweens.push(tween2);
        }
        if (copiaSombra) {
            const tween3 = this.tweens.add({
                targets: copiaSombra, 
                x: this.offsetX + portalX * 16*this.pixelmultiplier - this.tilesize,
                y: this.offsetY + portalY * 16*this.pixelmultiplier - this.tilesize,
                duration: this.lindseyspeed,
                ease: "Linear",

                onComplete: () => {
                    if (copiaSombra) copiaSombra.destroy();
                }
            });
            this.shadowTweens.push(tween3);
        }
    }

    private animateEat(portalX: number, portalY: number, portalDir: number | undefined, dx: number, dy: number) {
        let maskW = 5000;
        let maskH = 5000;
        let maskX = this.offsetX;
        let maskY = this.offsetY;
        let speed = this.lindseyspeed;
        
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

        const copia = this.tempstorage2a;
        const copiaPortal = this.tempstorage2b;
        const copiaSombra = this.tempstorage2c;
        const inicioX = maskShape.x;
        const inicioY = maskShape.y;
        const alphaInicial = copia.alpha;
        let alphaPortalInicial = 1;
        if (copiaPortal) alphaPortalInicial = copiaPortal.alpha;
        const tween = this.tweens.add({
            targets: maskShape, 
            x: maskShape.x + dx*this.tilesize,
            y: maskShape.y + dy*this.tilesize,
            duration: speed,
            ease: "Linear",
            onUpdate: () => {
                const distancia = Math.abs(maskShape.x - inicioX) + Math.abs(maskShape.y - inicioY);
                const avance = Math.min(1, distancia / this.tilesize);
                const alpha = 1 - Math.max(0, (avance - 0.5) / 0.5);
                copia.setAlpha(alphaInicial * alpha);
                if (copiaPortal) copiaPortal.setAlpha(alphaPortalInicial * alpha);
            },

            onComplete: () => {
                if(copia.filters) copia.filters.external.remove(maskFilter);
                maskShape.destroy();

                copia.destroy();
            }
        });
        this.portalTweens.push(tween);
        if (copiaPortal) {
            const masks2 = Phaser.Actions.AddMaskShape(copiaPortal, {
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
                    if(copiaPortal.filters) copiaPortal.filters.external.remove(maskFilter2);
                    maskShape2.destroy();
                    copiaPortal.destroy();
                }
            });
            this.portalTweens.push(tween2);
        }
        if (copiaSombra) {
            const masks3 = Phaser.Actions.AddMaskShape(copiaPortal, {
                shape: "rectangle",
                region: region
            });
            const maskFilter3 = masks3[0];
            const maskShape3 = maskFilter3.maskGameObject as Phaser.GameObjects.Rectangle;
            maskFilter3.autoUpdate = true;
            const tween3 = this.tweens.add({
                targets: maskShape3, 
                x: maskShape3.x + dx*this.tilesize,
                y: maskShape3.y + dy*this.tilesize,
                duration: this.lindseyspeed,
                ease: "Linear",

                onComplete: () => {
                    if(copiaPortal.filters) copiaPortal.filters.external.remove(maskFilter3);
                    maskShape3.destroy();
                    copiaPortal.destroy();
                }
            });
            this.shadowTweens.push(tween3);
        }
    }

    private getLindseyAnimation(facing: number | undefined): string {
        let animation = "";
        if (this.pushing == false) {
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
        } else {
            switch(facing) {
                case 0: animation = "lindseypush0"; break;
                case 1: animation = "lindseypush1"; break;
                case 2: animation = "lindseypush2"; break;
                case 3: animation = "lindseypush3"; break;
            }
        }

        return animation;
    }

    private animatePortalEntry(startX: number, startY: number, portalX: number, portalY: number, portalDir: number | undefined, facing: number | undefined) {
        const animation = this.getLindseyAnimation(facing);
        let speed = this.lindseyspeed;

        const copy = this.add.sprite(this.offsetX + startX * 16*this.pixelmultiplier, this.offsetY + startY * 16*this.pixelmultiplier, "lindsey", 0).setOrigin(1, 1.04).setScale(this.pixelmultiplier).setDepth(2 * startY + 1.1);
        copy.play(animation);
        const inicioX = copy.x;
        const inicioY = copy.y;

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
        this.ajustarMascaraPortalPared(region, portalX, portalY, portalDir);
        const masks = Phaser.Actions.AddMaskShape(copy, {
            shape: "rectangle",
            region: region
        });
        const maskFilter = masks[0]

        const tween = this.tweens.add({
            targets: copy,
            x: this.offsetX + portalX * 16*this.pixelmultiplier,
            y: this.offsetY + portalY * 16*this.pixelmultiplier,
            duration: speed,
            ease: "Linear",
            onUpdate: () => {
                const distancia = Math.abs(copy.x - inicioX) + Math.abs(copy.y - inicioY);
                const avance = Math.min(1, distancia / this.tilesize);
                copy.setAlpha(1 - Math.max(0, (avance - 0.5) / 0.5));
            },

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
            case 3: maskW = (portalX - 1)*this.tilesize + this.offsetX; break;
        }
        const region = new Phaser.Geom.Rectangle(maskX, maskY, maskW, maskH);
        this.ajustarMascaraPortalPared(region, portalX, portalY, portalDir);
        const masks = Phaser.Actions.AddMaskShape(player.sprite, {
            shape: "rectangle",
            region: region
        });
        this.playerPortalMask = masks[0];
        if (!this.finishinglevel) this.actualizarAlphaPortal(player, 0);
    }

    private animatePlayer(player: Entity, facing: number | undefined) {
        const animation = this.getLindseyAnimation(facing);
        let speed = this.lindseyspeed;

        this.playerMoving = true;
        this.holdBufferOpen = false;
        player.sprite.play(animation);

        this.time.delayedCall(160, () => {
            if (this.playerMoving) {
                this.holdBufferOpen = true;
            }
        });

        const inicioX = player.sprite.x;
        const inicioY = player.sprite.y;
        this.playerTween = this.tweens.add({
            targets: player.sprite,
            x: this.offsetX + player.x * 16*this.pixelmultiplier,
            y: this.offsetY + player.y * 16*this.pixelmultiplier,
            duration: speed,
            ease: "Linear",
            onUpdate: () => {
                this.updateEntityDepth(player);
                if (this.playerPortalMask) {
                    const distancia = Math.abs(player.sprite.x - inicioX) + Math.abs(player.sprite.y - inicioY);
                    const avance = Math.min(1, distancia / this.tilesize);
                    this.actualizarAlphaPortal(player, Math.min(1, avance / 0.5));
                }
            },
            onComplete: () => {
                this.actualizarAlphaPortal(player, 1);
                this.updateEntityDepth(player);
                player.sprite.stop();
                if (this.dead === true) {
                    player.sprite.setOrigin(0.96, 1).play("lindseydie"+String(facing));
                    player.sprite.once(
                        Phaser.Animations.Events.ANIMATION_COMPLETE,
                        () => {
                            player.sprite.play("lindseydied"+String(facing));
                        }
                    );
                }
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

                if (this.maskFilter3) {
                    if (this.tempstorage3) {
                        if (this.tempstorage3.shadow) {
                            if (this.tempstorage3.shadow.filters) {
                                this.tempstorage3.shadow.filters.external.remove(
                                    this.maskFilter3
                                );
                            }
                        }
                    }
                    this.maskFilter3 = undefined;
                }


                this.tempstorage3 = undefined;
                this.playerMoving = false;
                this.holdBufferOpen = false;
                this.playerTween = undefined;
                if (this.menuup === 2) {
                    this.reproducirSonido("morir");
                    this.tweens.killTweensOf(this.pantallaMuerte);
                    this.pantallaMuerte.setAlpha(0).setVisible(true);
                    this.tweens.add({
                        targets: this.pantallaMuerte,
                        alpha: 1,
                        duration: 280,
                        ease: "Sine.Out"
                    });
                }
            }
        });
    }

    private animateEntrance() {
        const player = this.entities.find(entity => entity.type === "player");
        if (!player) return;
        const finalX = this.offsetX + player.x * this.tilesize;
        const finalY = this.offsetY + player.y * this.tilesize;
        let startY: number;
        let maskShape: Phaser.GameObjects.Rectangle;
        let maskFilter: any;
        let speed: number;
        if (this.community == true) { startY = finalY - 4 * this.tilesize; speed = this.lindseyspeed*3}
        else {startY = finalY + 3 * this.tilesize; speed = this.lindseyspeed*3}
        player.sprite.setPosition(finalX, startY);
        player.sprite.setDepth(2 * player.y);
        if (this.community == false) {
        this.updateEntityDepth(player);
        const region = new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height-6*this.pixelmultiplier);
        const masks = Phaser.Actions.AddMaskShape(player.sprite,{
            shape: "rectangle",
            region: region
        });
        maskFilter = masks[0];
        maskShape = maskFilter.maskGameObject as Phaser.GameObjects.Rectangle;
        }

        this.playerMoving = true;
        if (this.community == false) {
            player.sprite.play(
                "lindsey-up"
            ); 
        } else {
            player.sprite.play(
                "lindseyenter"
            ).setAlpha(0);
        }

        this.playerTween = this.tweens.add({
            targets: player.sprite,
            x: finalX,
            y: finalY,
            duration: speed,
            alpha: 1,
            ease: "Linear",
            onUpdate: () => {
                if (this.community == false) {
                    this.updateEntityDepth(player);
                }
            },
            onComplete: () => {
                this.updateEntityDepth(player);
                player.sprite.stop();
                player.sprite.setTexture("lindseyi", 0);
                player.dir = 0;
                if (this.community == false) {
                if (player.sprite.filters) {
                    player.sprite.filters.external.remove(maskFilter);
                }
                maskShape.destroy();
                }
                this.playerMoving = false;
                this.playerTween = undefined;
            }
        });
    }

    private animateLindseyExit(player: Entity, flag: Entity) {
        if (this.finishinglevel) return;
        this.reproducirSonido("victoria");
        player.sprite.setDepth(-0.01)
        this.finishinglevel = true;
        this.playerMoving = true;
        this.inputBuffer = "";
        player.sprite.play("lindsey-up");
        const finalX = flag.sprite.x;
        const finalY = flag.sprite.y - this.tilesize * 3;
        const maskY = flag.sprite.getTopLeft().y + this.tilesize;
        const region = new Phaser.Geom.Rectangle(
            0, maskY, this.scale.width, this.scale.height - maskY
        );
        const masks = Phaser.Actions.AddMaskShape(player.sprite, {
            shape: "rectangle",
            region: region
        });
        const maskFilter = masks[0];
        const maskShape = maskFilter.maskGameObject as Phaser.GameObjects.Rectangle;

        this.playerTween = this.tweens.add({
            targets: player.sprite,
            x: finalX,
            y: finalY,
            duration: this.lindseyspeed * 3,
            ease: "Linear",

            onComplete: () => {
                player.sprite.stop();
                player.sprite.setVisible(false);
                if (player.sprite.filters) {
                    player.sprite.filters.external.remove(maskFilter);
                }
                maskShape.destroy();
                this.ganarNivel();
            }
        });
    }

    private flashbang() {
        const chance = Math.floor(Math.random()*10);
        if (chance === 0) { 
            const flash = this.add.image(this.scale.width/2, this.scale.height/2, "dario");
            flash.setDepth(80000000).setScale(this.scale.height/flash.height).setOrigin(0.5,0.5);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: this.lindseyspeed * 5,
                ease: "Linear",
                onComplete: () => {
                    flash.destroy();
                }
            });
        } else {
            const flash = this.add.image(this.scale.width/2, this.scale.height/2, "white");
            flash.setDepth(80000000).setScale(this.scale.width/flash.width).setOrigin(0.5,0.5);
            this.tweens.add({
                targets: flash,
                alpha: 0,
                duration: this.lindseyspeed * 5,
                ease: "Linear",
                onComplete: () => {
                    flash.destroy();
                }
            });
        }
    }

    constructor() {
        super("game");
    }

    ////////////////////
    //PRELOAD & CREATE//
    ////////////////////

    preload() {
        this.load.spritesheet("lindsey", "assets/lindsey.walking.anim.sheet.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("lindseypush", "assets/lindsey.pushing.anim.png", {
            frameWidth: 18,
            frameHeight: 28,
        });
        this.load.spritesheet("lindseydie", "assets/lindsey.dying.png", {
            frameWidth: 18,
            frameHeight: 35,
        });
        this.load.spritesheet("lindseydied", "assets/lindsey.dead.png", {
            frameWidth: 18,
            frameHeight: 42,
        });
        this.load.spritesheet("lindseyi", "assets/lindsey.idle.spr.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("spritestall", "assets/boxes&walls.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("printershadow", "assets/printershadow.png", {
            frameWidth: 36,
            frameHeight: 56,
        });
        this.load.spritesheet("boxshadow", "assets/crateshadow.png", {
            frameWidth: 36,
            frameHeight: 56,
        });
        this.load.spritesheet("wallshadow", "assets/wallshadow.png", {
            frameWidth: 20,
            frameHeight: 24,
        });
        this.load.spritesheet("sewingshadow", "assets/sewingshadow.png", {
            frameWidth: 36,
            frameHeight: 56,
        });
        this.load.image("dario", "assets/dariojumpscare.jpg");
        this.load.image("white", "assets/white.jpg");
        cargarPortales(this);
        this.load.spritesheet("laserBody", "assets/laser.body.spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("lasertails", "assets/laser.tail.sprsheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("laserheads", "assets/laser.head.anim.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("laserTurn", "assets/laser.turn.spritesheet.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("tileset-fogo", "./tileset.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.spritesheet("dark", "assets/dark.spr.png", {
            frameWidth: 16,
            frameHeight: 28,
        });
        this.load.spritesheet("door", "assets/door.anim1.png", {
            frameWidth: 16,
            frameHeight: 32,
        });
        if (this.modoTest === false && this.nivelId === "") {
            this.load.text(
                "level",
                "assets/level" + this.levelNumber + ".txt"
            );
        }

        this.cargarSonidos();
    }

async create() {
    crearAnimacionesPortales(this);
    
    this.cargandoNivel = true;
    const cargaActual = ++this.numeroCarga;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.numeroCarga++;
        this.cargandoNivel = true;
    });

    this.entities = [];
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
        this.shadowTweens = [];
        this.playerPortalMask = undefined;
        this.maskFilter = undefined;
        this.maskFilter2 = undefined;
        this.tempstorage = undefined;
        this.tempstorage2a = undefined;
        this.tempstorage2b = undefined;
        this.tempstorage3 = undefined;
        this.emitterQueue = [];
        this.firedEmitters = [];
        this.finishinglevel = false;
        this.dead = false;

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
            this.anims.create({
                key: "lindseyenter",
                frames: [
                    { key: "lindseyi", frame: 0 },
                    { key: "lindseyi", frame: 1 },
                    { key: "lindseyi", frame: 2 },
                    { key: "lindseyi", frame: 3 }
                ],
                frameRate: this.animationspeed / 2.5,
                repeat: -1
            });
            this.anims.create({
                key: "lindseypush0",
                frames: [
                    { key: "lindseypush", frame: 0 },
                    { key: "lindseypush", frame: 4 },
                    { key: "lindseypush", frame: 8 },
                    { key: "lindseypush", frame: 12 },
                    { key: "lindseypush", frame: 16 },
                    { key: "lindseypush", frame: 20 },
                    { key: "lindseypush", frame: 24 },
                    { key: "lindseypush", frame: 28 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lindseypush1",
                frames: [
                    { key: "lindseypush", frame: 1 },
                    { key: "lindseypush", frame: 5 },
                    { key: "lindseypush", frame: 9 },
                    { key: "lindseypush", frame: 13 },
                    { key: "lindseypush", frame: 17 },
                    { key: "lindseypush", frame: 21 },
                    { key: "lindseypush", frame: 25 },
                    { key: "lindseypush", frame: 29 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lindseypush2",
                frames: [
                    { key: "lindseypush", frame: 2 },
                    { key: "lindseypush", frame: 6 },
                    { key: "lindseypush", frame: 10 },
                    { key: "lindseypush", frame: 14 },
                    { key: "lindseypush", frame: 18 },
                    { key: "lindseypush", frame: 22 },
                    { key: "lindseypush", frame: 26 },
                    { key: "lindseypush", frame: 30 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lindseypush3",
                frames: [
                    { key: "lindseypush", frame: 3 },
                    { key: "lindseypush", frame: 7 },
                    { key: "lindseypush", frame: 11 },
                    { key: "lindseypush", frame: 15 },
                    { key: "lindseypush", frame: 19 },
                    { key: "lindseypush", frame: 23 },
                    { key: "lindseypush", frame: 27 },
                    { key: "lindseypush", frame: 31 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lindseydie1",
                frames: [
                    { key: "lindseydie", frame: 3 },
                    { key: "lindseydie", frame: 7 },
                    { key: "lindseydie", frame: 11 },
                    { key: "lindseydie", frame: 15 },
                    { key: "lindseydie", frame: 19 },
                    { key: "lindseydie", frame: 23 },
                    { key: "lindseydie", frame: 27 },
                    { key: "lindseydie", frame: 31 },
                    { key: "lindseydie", frame: 35 },
                    { key: "lindseydie", frame: 39 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });
            this.anims.create({
                key: "lindseydie2",
                frames: [
                    { key: "lindseydie", frame: 0 },
                    { key: "lindseydie", frame: 4 },
                    { key: "lindseydie", frame: 8 },
                    { key: "lindseydie", frame: 12 },
                    { key: "lindseydie", frame: 16 },
                    { key: "lindseydie", frame: 20 },
                    { key: "lindseydie", frame: 24 },
                    { key: "lindseydie", frame: 18 },
                    { key: "lindseydie", frame: 32 },
                    { key: "lindseydie", frame: 36 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });
            this.anims.create({
                key: "lindseydie0",
                frames: [
                    { key: "lindseydie", frame: 1 },
                    { key: "lindseydie", frame: 5 },
                    { key: "lindseydie", frame: 9 },
                    { key: "lindseydie", frame: 13 },
                    { key: "lindseydie", frame: 17 },
                    { key: "lindseydie", frame: 21 },
                    { key: "lindseydie", frame: 25 },
                    { key: "lindseydie", frame: 29 },
                    { key: "lindseydie", frame: 33 },
                    { key: "lindseydie", frame: 37 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });
            this.anims.create({
                key: "lindseydie3",
                frames: [
                    { key: "lindseydie", frame: 2 },
                    { key: "lindseydie", frame: 6 },
                    { key: "lindseydie", frame: 10 },
                    { key: "lindseydie", frame: 14 },
                    { key: "lindseydie", frame: 18 },
                    { key: "lindseydie", frame: 22 },
                    { key: "lindseydie", frame: 26 },
                    { key: "lindseydie", frame: 30 },
                    { key: "lindseydie", frame: 34 },
                    { key: "lindseydie", frame: 38 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });this.anims.create({
                key: "lindseydied1",
                frames: [
                    { key: "lindseydied", frame: 3 },
                    { key: "lindseydied", frame: 7 },
                    { key: "lindseydied", frame: 11 },
                    { key: "lindseydied", frame: 15 },
                    { key: "lindseydied", frame: 19 },
                    { key: "lindseydied", frame: 23 },
                    { key: "lindseydied", frame: 27 },
                    { key: "lindseydied", frame: 31 },
                ],
                frameRate: this.animationspeed*1,
                repeat: -1
            });
            this.anims.create({
                key: "lindseydied2",
                frames: [
                    { key: "lindseydied", frame: 0 },
                    { key: "lindseydied", frame: 4 },
                    { key: "lindseydied", frame: 8 },
                    { key: "lindseydied", frame: 12 },
                    { key: "lindseydied", frame: 16 },
                    { key: "lindseydied", frame: 20 },
                    { key: "lindseydied", frame: 24 },
                    { key: "lindseydied", frame: 18 },
                ],
                frameRate: this.animationspeed*1,
                repeat: -1
            });
            this.anims.create({
                key: "lindseydied0",
                frames: [
                    { key: "lindseydied", frame: 1 },
                    { key: "lindseydied", frame: 5 },
                    { key: "lindseydied", frame: 9 },
                    { key: "lindseydied", frame: 13 },
                    { key: "lindseydied", frame: 17 },
                    { key: "lindseydied", frame: 21 },
                    { key: "lindseydied", frame: 25 },
                    { key: "lindseydied", frame: 29 },
                ],
                frameRate: this.animationspeed*1,
                repeat: -1
            });
            this.anims.create({
                key: "lindseydied3",
                frames: [
                    { key: "lindseydied", frame: 2 },
                    { key: "lindseydied", frame: 6 },
                    { key: "lindseydied", frame: 10 },
                    { key: "lindseydied", frame: 14 },
                    { key: "lindseydied", frame: 18 },
                    { key: "lindseydied", frame: 22 },
                    { key: "lindseydied", frame: 26 },
                    { key: "lindseydied", frame: 30 },
                ],
                frameRate: this.animationspeed*1,
                repeat: -1
            });

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
                key: "lasermirrores",
                frames: [
                    { key: "laserTurn", frame: 0 },
                    { key: "laserTurn", frame: 28 },
                    { key: "laserTurn", frame: 24 },
                    { key: "laserTurn", frame: 20 },
                    { key: "laserTurn", frame: 16 },
                    { key: "laserTurn", frame: 12 },
                    { key: "laserTurn", frame: 8 },
                    { key: "laserTurn", frame: 4 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorsw",
                frames: [
                    { key: "laserTurn", frame: 1 },
                    { key: "laserTurn", frame: 29 },
                    { key: "laserTurn", frame: 25 },
                    { key: "laserTurn", frame: 21 },
                    { key: "laserTurn", frame: 17 },
                    { key: "laserTurn", frame: 13 },
                    { key: "laserTurn", frame: 9 },
                    { key: "laserTurn", frame: 5 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrornw",
                frames: [
                    { key: "laserTurn", frame: 14 },
                    { key: "laserTurn", frame: 10 },
                    { key: "laserTurn", frame: 6 },
                    { key: "laserTurn", frame: 2 },
                    { key: "laserTurn", frame: 30 },
                    { key: "laserTurn", frame: 26 },
                    { key: "laserTurn", frame: 22 },
                    { key: "laserTurn", frame: 18 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorne",
                frames: [
                    { key: "laserTurn", frame: 15 },
                    { key: "laserTurn", frame: 11 },
                    { key: "laserTurn", frame: 7 },
                    { key: "laserTurn", frame: 3 },
                    { key: "laserTurn", frame: 31 },
                    { key: "laserTurn", frame: 27 },
                    { key: "laserTurn", frame: 23 },
                    { key: "laserTurn", frame: 19 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorse",
                frames: [
                    { key: "laserTurn", frame: 28 },
                    { key: "laserTurn", frame: 0 },
                    { key: "laserTurn", frame: 4 },
                    { key: "laserTurn", frame: 8 },
                    { key: "laserTurn", frame: 12 },
                    { key: "laserTurn", frame: 16 },
                    { key: "laserTurn", frame: 20 },
                    { key: "laserTurn", frame: 24 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorws",
                frames: [
                    { key: "laserTurn", frame: 17 },
                    { key: "laserTurn", frame: 21 },
                    { key: "laserTurn", frame: 25 },
                    { key: "laserTurn", frame: 29 },
                    { key: "laserTurn", frame: 1 },
                    { key: "laserTurn", frame: 5 },
                    { key: "laserTurn", frame: 9 },
                    { key: "laserTurn", frame: 13 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirrorwn",
                frames: [
                    { key: "laserTurn", frame: 18 },
                    { key: "laserTurn", frame: 22 },
                    { key: "laserTurn", frame: 26 },
                    { key: "laserTurn", frame: 30 },
                    { key: "laserTurn", frame: 2 },
                    { key: "laserTurn", frame: 6 },
                    { key: "laserTurn", frame: 10 },
                    { key: "laserTurn", frame: 14 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasermirroren",
                frames: [
                    { key: "laserTurn", frame: 31 },
                    { key: "laserTurn", frame: 3 },
                    { key: "laserTurn", frame: 7 },
                    { key: "laserTurn", frame: 11 },
                    { key: "laserTurn", frame: 15 },
                    { key: "laserTurn", frame: 19 },
                    { key: "laserTurn", frame: 23 },
                    { key: "laserTurn", frame: 27 },
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "laserhead",
                frames: [
                    { key: "laserheads", frame: 0 },
                    { key: "laserheads", frame: 1 },
                    { key: "laserheads", frame: 2 },
                    { key: "laserheads", frame: 3 },
                    { key: "laserheads", frame: 4 },
                    { key: "laserheads", frame: 5 },
                    { key: "laserheads", frame: 6 },
                    { key: "laserheads", frame: 7 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "lasertail",
                frames: [
                    { key: "lasertails", frame: 0 },
                    { key: "lasertails", frame: 1 },
                    { key: "lasertails", frame: 2 },
                    { key: "lasertails", frame: 3 },
                    { key: "lasertails", frame: 4 },
                    { key: "lasertails", frame: 5 },
                    { key: "lasertails", frame: 6 },
                    { key: "lasertails", frame: 7 }
                ],
                frameRate: this.animationspeed*1.5,
                repeat: -1
            });
            this.anims.create({
                key: "dooropen",
                frames: [
                    { key: "door", frame: 0 },
                    { key: "door", frame: 1 },
                    { key: "door", frame: 2 },
                    { key: "door", frame: 3 },
                    { key: "door", frame: 4 },
                    { key: "door", frame: 5 },
                    { key: "door", frame: 6 },
                    { key: "door", frame: 7 },
                    { key: "door", frame: 8 },
                    { key: "door", frame: 9 },
                    { key: "door", frame: 10 },
                    { key: "door", frame: 11 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });
            this.anims.create({
                key: "doorclose",
                frames: [
                    { key: "door", frame: 11 },
                    { key: "door", frame: 10 },
                    { key: "door", frame: 9 },
                    { key: "door", frame: 8 },
                    { key: "door", frame: 7 },
                    { key: "door", frame: 6 },
                    { key: "door", frame: 5 },
                    { key: "door", frame: 4 },
                    { key: "door", frame: 3 },
                    { key: "door", frame: 2 },
                    { key: "door", frame: 1 },
                    { key: "door", frame: 0 },
                ],
                frameRate: this.animationspeed*1,
                repeat: 0
            });
        }

        this.qKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.zKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        //MORE TEST STUFF

        this.community = true;
        let level = "";
        if (this.modoTest) {
            level = this.nivelTest;
        } else if (this.nivelDescargado !== null) {
            level = convertirNivel(this.nivelDescargado);
        } else if (this.nivelId !== "") {
            const nivel = obtenerNivel(this.nivelId);

            if (nivel === undefined) {
                return;
            }

            level = convertirNivel(nivel);
        } else {
            this.community = false;
            const textoCarga = this.add.text(
                this.scale.width / 2,
                this.scale.height / 2,
                this.textoOpciones[17][spanish],
                { padding: { top: 6, bottom: 6 }, fontFamily: "Fuente", fontSize: "20px", color: "#cbdbfc" }
            ).setOrigin(0.5);
            try {
                if (this.idsNivelesOficiales.length === 0) {
                    const oficiales = await leerNivelesOriginalesBackend();
                    if (cargaActual !== this.numeroCarga) {
                        return;
                    }
                    for (let i = 0; i < oficiales.length; i++) {
                        this.idsNivelesOficiales.push(oficiales[i].id);
                    }
                }
                const nivel = await leerNivelOriginalBackend(this.levelNumber);
                if (cargaActual !== this.numeroCarga) {
                    return;
                }
                this.nombreNivelOficial = nivel.nombre;
                level = convertirNivel(apiAEditor(nivel));
                textoCarga.destroy();
            } catch (error) {
                if (cargaActual !== this.numeroCarga) {
                    return;
                }
                window.alert(this.textoOpciones[18][spanish] + String(error));
                this.volver();
                return;
            }
        }

        const [staticLayer, dynamicLayer, laserLayer, portalLayer, directionLayer, darkLayer,
            plateControlLayer, emitterControlLayer] = level.split("^");
        this.staticRows = staticLayer.trim().split("\n");
        const dynamicRows = dynamicLayer.trim().split("\n");
        const laserRows = laserLayer.trim().split("\n");
        const portalRows = portalLayer.trim().split("\n");
        const directionRows = directionLayer.trim().split("\n");
        const darkRows = darkLayer.trim().split("\n");
        const plateControlRows = plateControlLayer ? plateControlLayer.trim().split("\n") : [];
        const emitterControlRows = emitterControlLayer ? emitterControlLayer.trim().split("\n") : [];
        
        //CALCULO DE MEDIDAS

        const margen = 12;
        const columnas = this.staticRows[0].length;
        const filas = this.staticRows.length;
        const anchoDisponible = this.scale.width - margen * 2;
        const altoDisponible = this.scale.height - this.altoBarra - margen * 2;
        const extraSuperior = 8;
        this.pixelmultiplier = Math.min(3.33, anchoDisponible / (columnas * 16), altoDisponible / (filas * 16 + extraSuperior));
        this.tilesize = 16 * this.pixelmultiplier;
        const anchoTablero = columnas * this.tilesize;
        const altoTablero = filas * this.tilesize;
        const extra = extraSuperior * this.pixelmultiplier;
        this.offsetX = (this.scale.width - anchoTablero) / 2 + this.tilesize;
        this.offsetY = this.altoBarra + margen + (altoDisponible - altoTablero - extra) / 2 + extra + this.tilesize;

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
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "wallshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                            });
                            break;
                        }
                        else {
                            this.entities.push ({
                            type: "wall",
                            x: x,
                            y: y,
                            pushable: false,
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "wallshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                            });
                            break;
                        }
                        }else {
                            this.entities.push ({
                            type: "wall",
                            x: x,
                            y: y,
                            pushable: false,
                            sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                            shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "wallshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                            });
                            break;
                        }
                    case "1":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 16).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(1.1)
                        });
                        break;
                    case "2":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 17).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(1.1)
                        });
                        break;
                    case "3":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 18).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(1.1)
                        });
                        break;
                    case "4":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 19).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(1.1)
                        });
                        break;
                    case "5":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 20).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-0.5)
                        });
                        break;
                    case "6":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 21).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-0.5)
                        });
                        break;
                    case "7":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 22).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-0.5)
                        });
                        break;
                    case "8":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 23).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(-0.5)
                        });
                        break;
                    case "0": 
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "tileset-fogo", 15).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(1.1)
                        });
                        break;
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
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "door", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "lindsey", 0).setOrigin(1,1.04).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "b":
                        this.entities.push ({
                        type: "box",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                        shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "boxshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                        });
                        break;
                    case "q":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 9).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                        shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "printershadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                        });
                        break;
                    case "w":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 10).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "a":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 7).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "s":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 8).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "x":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 6).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                        });
                        break;
                    case "z":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                        shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "boxshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                        });
                        break;
                    case "c":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 4).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y),
                        shadow: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier - 16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier - 16*this.pixelmultiplier, "sewingshadow",0).setOrigin(0,0).setScale(this.pixelmultiplier).setDepth(1)
                        });
                        break;
                    case "v":
                        this.entities.push ({
                        type: "wall",
                        x: x,
                        y: y,
                        dir: 0,
                        pushable: false,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", 5).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
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
            for (let x = 0; x<portalRows[y].length; x++) {
                let direccion = -1;
                switch (portalRows[y][x]) {
                    case "w": direccion = 0; break;
                    case "d": direccion = 1; break;
                    case "s": direccion = 2; break;
                    case "a": direccion = 3; break;
                }
                if (direccion === -1) continue;

                let entity = this.getAnythingAt(x, y);
                if (!entity) {
                    let frame = 0;
                    if (direccion === 1) frame = 3;
                    entity = {
                        type: "box",
                        x: x,
                        y: y,
                        dir: 0,
                        emitting: 4,
                        group: 0,
                        pushable: true,
                        sprite: this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "spritestall", frame).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(2*y)
                    };
                    this.entities.push(entity);
                }
                entity.portal = direccion;
                this.actualizarPortal(entity);
            }
        }
        for (let y = 0; y<darkRows.length; y++) {
            for (let x = 0; x<darkRows[y].length; x++){
                const thistile = darkRows[y][x];                
                switch(thistile) {
                    case "0":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 0).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "1":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 1).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "2":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 2).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "3":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 3).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "4":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 4).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "5":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 5).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "6":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 6).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "7":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 7).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "8":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 8).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "9":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 9).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "a":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 10).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "b":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 11).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "c":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 12).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "d":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 13).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "e":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 14).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "f":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 15).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "g":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 16).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "h":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 17).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "i":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 18).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "j":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 19).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "k":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 20).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "l":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 21).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "m":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 22).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "n":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 23).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "o":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 24).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "p":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 25).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "q":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 26).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "r":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 27).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "s":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 28).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "t":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 29).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "u":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 30).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "v":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 31).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "w":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 32).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "x":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 33).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "y":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 34).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "z":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 35).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "A":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 36).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "B":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 42).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "C":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 48).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "D":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 54).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "E":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 55).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "F":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 56).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "G":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 57).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "H":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 58).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "I":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 59).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "J":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 60).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "K":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 61).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "L":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 62).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "M":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 63).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "N":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 64).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "O":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 65).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "P":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 72).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "Q":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 73).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "R":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 74).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "S":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 75).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "T":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 76).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "U":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 77).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "V":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 78).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "W":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 79).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "X":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 80).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "Y":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 81).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "Z":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 82).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "!":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 83).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "?":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 90).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                    case "@":
                        this.add.sprite(this.offsetX+x*16*this.pixelmultiplier, this.offsetY+y*16*this.pixelmultiplier, "dark", 96).setOrigin(1,1).setScale(this.pixelmultiplier).setDepth(90);
                        break;
                }
            }
        }
        for (let y = 0; y<directionRows.length; y++) {
            for (let x = 0; x<directionRows[y].length; x++){
                const thistile = directionRows[y][x];
                let entity = this.getAnythingAt(x, y);
                if (entity && thistile !== "." && (entity.portal !== undefined || entity.type === "goal" || entity.type === "laserEmissor")){
                    entity.group = Number(thistile);
                }
            }
        }

        for (let y = 0; y < plateControlRows.length; y++) {
            for (let x = 0; x < plateControlRows[y].length; x++) {
                const code = plateControlRows[y][x];
                if (code === ".") {
                    continue;
                }
                for (let i = 0; i < this.entities.length; i++) {
                    const entity = this.entities[i];
                    if (entity.type === "goal" && entity.x === x && entity.y === y) {
                        entity.controlGroup = code;
                    }
                }
            }
        }

        for (let y = 0; y < emitterControlRows.length; y++) {
            for (let x = 0; x < emitterControlRows[y].length; x++) {
                const code = emitterControlRows[y][x];
                if (code === ".") {
                    continue;
                }
                for (let i = 0; i < this.entities.length; i++) {
                    const entity = this.entities[i];
                    if (entity.type === "laserEmissor" && entity.x === x && entity.y === y) {
                        entity.controlGroup = code;
                    }
                }
            }
        }

        for (let i = 0; i < this.entities.length; i++) {
            this.actualizarPortal(this.entities[i]);
        }
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.crearPantallaMuerte();
        this.crearAyudaMovimiento();
        this.laserFunction();
        this.crearBarraSuperior();
        this.cargandoNivel = false;
        this.flagCheck();
        this.sonidosPreparados = true;
        this.animateEntrance();
    }

    //////////////////////////////
    //INPUT HANDLING STARTS HERE//
    //////////////////////////////

    private doMovement(direction: string) {
        this.movimientoEmpujo = false;
        this.movimientoConPortal = false;
        this.pushTweens = [];
        this.portalTweens = [];
        this.shadowTweens = [];
        const player = this.entities.find(entity => entity.type === "player");
        let movimientoRealizado = false;
        if (direction === "left") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 3;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            movimientoRealizado = this.updatePosition(-1, 0, 1);
            this.playerVertical = false; 
        }

        if (direction === "right") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 1;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            movimientoRealizado = this.updatePosition(1, 0, 3);
            this.playerVertical = false; 
        }

        if (direction === "up") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 0;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            movimientoRealizado = this.updatePosition(0, -1, 2);
            this.playerVertical = true; 
        }

        if (direction === "down") {
            if (!player) {
                console.log("ERROR: COULD NOT FIND PLAYER! THIS MEANS YOU DID NOT PUT A PLAYER IN YOUR LEVEL. MAKE A BETTER LEVEL.");
                return false;
            }
            player.dir = 2;
            this.history.push({entities: this.entities.map(entity => ({type: entity.type, x: entity.x, y: entity.y, dir: entity.dir, portal: entity.portal}))});
            movimientoRealizado = this.updatePosition(0, 1, 0);
            this.playerVertical = true; 
        }
        if (movimientoRealizado) {
            if (this.movimientoEmpujo) {
                this.reproducirSonido("empujar");
            } else {
                this.reproducirSonido("paso");
            }
            if (this.movimientoConPortal) {
                this.reproducirSonido("portal");
            }
        }
        if (movimientoRealizado && this.ayudaPendiente()) {
            this.movimientosAyuda++;
            if (this.ayudaPendiente() === false) {
                this.tweens.add({
                    targets: this.ayudaMovimiento,
                    alpha: 0,
                    duration: 350,
                    ease: "Sine.Out",
                    onComplete: () => {
                        this.ayudaMovimiento.setVisible(false);
                    }
                });
            }
        }
        if (this.saliendoDelNivel || this.cargandoNivel) {
            return;
        }
        for (const laser of this.lasers) {
            this.destroyLaser(laser);
        }
        
        this.lasers = [];
        this.laserFunction();
        this.flagCheck();
        this.updateLaserPositions();
    }

    update() {
        if (this.saliendoDelNivel || this.cargandoNivel || !this.cursors) {
         return;
        }
        const flechaIzquierda = Phaser.Input.Keyboard.JustDown(this.cursors.left!);
        const flechaDerecha = Phaser.Input.Keyboard.JustDown(this.cursors.right!);
        const flechaArriba = Phaser.Input.Keyboard.JustDown(this.cursors.up!);
        const flechaAbajo = Phaser.Input.Keyboard.JustDown(this.cursors.down!);
        const teclaA = Phaser.Input.Keyboard.JustDown(this.aKey);
        const teclaD = Phaser.Input.Keyboard.JustDown(this.dKey);
        const teclaW = Phaser.Input.Keyboard.JustDown(this.wKey);
        const teclaS = Phaser.Input.Keyboard.JustDown(this.sKey);
        const izquierdaSostenida = this.cursors.left!.isDown || this.aKey.isDown;
        const derechaSostenida = this.cursors.right!.isDown || this.dKey.isDown;
        const arribaSostenida = this.cursors.up!.isDown || this.wKey.isDown;
        const abajoSostenida = this.cursors.down!.isDown || this.sKey.isDown;

        const izquierda = (flechaIzquierda || teclaA) && !this.izquierdaPresionada;
        const derecha = (flechaDerecha || teclaD) && !this.derechaPresionada;
        const arriba = (flechaArriba || teclaW) && !this.arribaPresionada;
        const abajo = (flechaAbajo || teclaS) && !this.abajoPresionada;

        this.izquierdaPresionada = izquierdaSostenida;
        this.derechaPresionada = derechaSostenida;
        this.arribaPresionada = arribaSostenida;
        this.abajoPresionada = abajoSostenida;

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
                if (izquierda) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "left";
                    if (!player) return;
                    if (player.dir === -1 && this.playerVertical === false && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (derecha) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "right";
                    if (!player) return;
                    if (player.dir === 1 && this.playerVertical === false && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (arriba) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer ="up";
                    if (!player) return;
                    if (player.dir === -1 && this.playerVertical === true && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }

                else if (abajo) {
                    if (this.movenumber) this.movenumber = false
                    else this.movenumber = true;
                    this.inputBuffer = "down";
                    if (!player) return;
                    if (player.dir === 1 && this.playerVertical === true && this.pushTweens.length === 0) this.playerTween?.setTimeScale(50);
                }
                else if (this.holdBufferOpen && this.inputBuffer === "") {
                    if (izquierdaSostenida){
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer = "left";
                    }

                    else if (derechaSostenida) {
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer = "right";
                    }

                    else if (arribaSostenida) {
                        if (this.movenumber) this.movenumber = false
                        else this.movenumber = true;
                        this.inputBuffer ="up";
                    }

                    else if (abajoSostenida) {
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

        if (izquierda && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("left");
            return;
        }

        if (derecha && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("right");
            return;
        }

        if (arriba && this.menuup == 0) {
            if (this.movenumber) this.movenumber = false
            else this.movenumber = true;
            this.doMovement("up");
            return;
        }

        if (abajo && this.menuup == 0) {
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
