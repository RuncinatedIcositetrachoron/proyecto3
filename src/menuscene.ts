import { COLORES, colorTexto as textoColor } from "./colores";

import Phaser from "phaser";
import {
  demo,
  cerrarSesion,
  esInvitado,
  leerProgresoInvitado
} from "./datosDemo";
import { TransitionScene } from "./transitionScene";
import { mostrarConfirmacion } from "./popup";
import {
  leerNivelesOriginalesBackend,
  leerProgresoOriginalBackend
} from "./api";
import { spanish } from "./configs";
import { cargarMusica, fadeInMusica } from "./music";
import { ajustes, ajustesCargados, cargarAjustes, olvidarAjustes, aplicarVolumenMusica } from "./ajustes";

export class MenuScene extends Phaser.Scene {
  private menuMusic: HTMLAudioElement | undefined;
  abriendoPartida = false;
  numeroCarga = 0;
  abajoLogo = 0;
  cargandoProgreso = false;
  progresoCargado = false;
  primerNivelCompletado = false;
  hayProgreso = false;
  mensajeProgreso = "";
  idsNiveles: number[] = [];
  progreso: boolean[] = [];
  opcionesMenu: Phaser.GameObjects.Container | null = null;
  textoOpciones: string[][] = [
    ["Log Out", "Cerrar Sesión"],
    ["Resume", "Continuar"],
    ["New Game", "Nueva Partida"],
    ["Level Selector", "Selector De Niveles"],
    ["Community Levels", "Niveles De Comunidad"],
    ["Level Editor", "Editor De Niveles"],
    ["Credits", "Créditos"],
    ["Exit", "Salir"],
    ["Options", "Opciones"],
    ["Retry", "Reintentar"],
    ["Could not load progress", "No se logró cargar el progreso"],
    ["Loading progress...", "Cargando el progreso..."],
    ["Start Again?", "Reiniciar?"],
    ["You will return to the first level. Your completed levels will stay saved.", "Volverás al primer nivel. Tus niveles completados se mantendrán guardados."],
    ["Start Again", "Reiniciar"],
    ["Log In", "Iniciar Sesión"]
  ];


  constructor() {
    super("menu");
  }

  preload() {
    this.load.image("logoMenu", "assets/logo.png");
    this.load.image("iconosMenu", "assets/icons.png");
    this.load.spritesheet("arteMenu", "assets/start menu art.png", {
      frameWidth: 139,
      frameHeight: 123,
      endFrame: 14
    });

    this.load.bitmapFont(
      "FuenteBitmap",
      "./laserfont_0.png",
      "./laserfont.fnt"
    );
    this.load.font("Fuente", "./font.ttf", "truetype");

    cargarMusica(this);

  }

  create() {
    this.abriendoPartida = false;
    this.numeroCarga++;
    this.cargandoProgreso = false;
    this.progresoCargado = false;
    this.primerNivelCompletado = false;
    this.hayProgreso = false;
    this.mensajeProgreso = "";
    this.idsNiveles = [];
    this.progreso = [];
    this.opcionesMenu = null;
    let ambienteConFoco = true;
    const iniciarAmbiente = () => {
      if (!ambienteConFoco) return;
      if (!this.menuMusic) {
        this.menuMusic = new Audio();
        this.menuMusic.preload = "metadata";
        this.menuMusic.loop = true;
        this.menuMusic.src = "assets/music/mainmenucicadas.opus";
      }
      const audio = this.menuMusic;
      audio.volume = 0.4 * ajustes.efectos;
      if (!audio.paused) return;
      audio.play().catch((error: unknown) => {
        if (this.menuMusic !== audio) return;
        if (error instanceof DOMException &&
            (error.name === "NotAllowedError" || error.name === "AbortError")) return;
        console.warn("Could not play menu ambience:", error);
      });
    };

    const pausarAmbiente = () => {
      ambienteConFoco = false;
      if (this.menuMusic) this.menuMusic.pause();
    };
    const reanudarAmbiente = () => {
      ambienteConFoco = true;
      iniciarAmbiente();
    };
    this.game.events.on("blur", pausarAmbiente);
    this.game.events.on("focus", reanudarAmbiente);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.numeroCarga++;

      this.sound.off(
        Phaser.Sound.Events.UNLOCKED,
        iniciarAmbiente
      );

      this.input.off("pointerdown", iniciarAmbiente);
      this.input.keyboard?.off("keydown", iniciarAmbiente);
      this.game.events.off("blur", pausarAmbiente);
      this.game.events.off("focus", reanudarAmbiente);

      if (this.menuMusic) {
        this.menuMusic.pause();
        this.menuMusic.removeAttribute("src");
        this.menuMusic.load();
        this.menuMusic = undefined;
      }
    });

    this.cameras.main.setBackgroundColor(textoColor(COLORES.fondoMenu));

    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      this.scene.start("usuariosDemo");
      return;
    }
    if (ajustesCargados(usuario.nombre, esInvitado()) === false) {
      this.add.text(400, 300, "Loading...", {
        fontFamily: "Fuente",
        fontSize: "24px",
        color: textoColor(COLORES.blanco)
      }).setOrigin(0.5);

      cargarAjustes(usuario.nombre, esInvitado()).then(() => {
        if (this.scene.isActive("menu") && demo.usuarioActual === usuario) {
          this.scene.restart();
        }
      });

      return;
    }

    aplicarVolumenMusica(this);

    const transition = this.scene.get("transition") as TransitionScene;

    if (!transition.estaCambiando()) {
      fadeInMusica(this, "mainmenu", 500);
    }

    this.input.on("pointerdown", iniciarAmbiente);
    this.input.keyboard?.on("keydown", iniciarAmbiente);

    if (this.sound.locked) {
      this.sound.once(
        Phaser.Sound.Events.UNLOCKED,
        iniciarAmbiente
      );
    } else {
      iniciarAmbiente();
    }

    const ancho = this.scale.width;
    const alto = this.scale.height;
    const escalaX = ancho / 1600;
    const escalaY = alto / 900;
    const escalaTexto = Math.min(escalaX, escalaY);
    const anchoMenu = Math.round(583 * escalaX);

    this.crearIconos();
    this.textures.get("logoMenu").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("iconosMenu").setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get("arteMenu").setFilter(Phaser.Textures.FilterMode.NEAREST);

    if (!this.anims.exists("arteMenuAnimado")) {
      this.anims.create({
        key: "arteMenuAnimado",
        frames: this.anims.generateFrameNumbers("arteMenu", {
          start: 0,
          end: 14
        }),
        frameRate: 8,
        repeat: -1
      });
    }

    const arte = this.add.sprite(anchoMenu, 0, "arteMenu", 0);
    arte.setOrigin(0, 0);
    arte.setScale(Math.max((ancho - anchoMenu) / 139, alto / 123));
    arte.play("arteMenuAnimado");

    this.add.rectangle(0, 0, anchoMenu, alto, COLORES.fondoMenu).setOrigin(0);

    this.add.rectangle(
      anchoMenu, 0, 8 * escalaTexto, alto, COLORES.sombraPopup, 0.2
    ).setOrigin(0);

    const anchoBorde = Math.max(2, Math.round(8 * escalaTexto));
    this.add.rectangle(anchoMenu - anchoBorde, 0, anchoBorde, alto, COLORES.bordeMenu, 0.28).setOrigin(0);

    const logo = this.add.image(anchoMenu / 2, Math.round(alto * 0.055), "logoMenu");
    logo.setOrigin(0.5, 0);
    logo.setScale((anchoMenu - 96 * escalaX) / logo.width);
    this.abajoLogo = logo.y + logo.displayHeight;

    this.crearUsuario(usuario.nombre, esInvitado());
    this.cargarProgreso();
  }

  nivelCompletado(id: number) {
    let indice = id;

    if (!esInvitado()) {
      indice = id - 1;
    }

    return this.progreso[indice] === true;
  }

  async cargarProgreso() {
    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined || this.cargandoProgreso) {
      return;
    }

    const cargaActual = ++this.numeroCarga;
    this.cargandoProgreso = true;
    this.progresoCargado = false;
    this.mensajeProgreso = "";
    this.dibujarOpciones();

    try {
      const niveles = await leerNivelesOriginalesBackend();

      niveles.sort(function (a, b) {
        return a.id - b.id;
      });

      if (niveles.length === 0) {
        throw new Error("No official levels available yet.");
      }

      let progreso: boolean[] = [];

      if (esInvitado()) {
        progreso = leerProgresoInvitado(1);
      } else {
        progreso = await leerProgresoOriginalBackend(usuario.nombre, 1);
      }

      if (
        cargaActual !== this.numeroCarga ||
        this.scene.isActive("menu") === false ||
        demo.usuarioActual !== usuario
      ) {
        return;
      }

      this.idsNiveles = [];
      this.progreso = progreso;
      this.hayProgreso = false;

      for (let i = 0; i < niveles.length; i++) {
        this.idsNiveles.push(niveles[i].id);

        if (this.nivelCompletado(niveles[i].id)) {
          this.hayProgreso = true;
        }
      }

      this.primerNivelCompletado = this.nivelCompletado(this.idsNiveles[0]);
      this.progresoCargado = true;
    } catch (error) {
      if (
        cargaActual === this.numeroCarga &&
        this.scene.isActive("menu") &&
        demo.usuarioActual === usuario
      ) {
        this.mensajeProgreso = this.textoOpciones[10][spanish];
      }
    } finally {
      if (
        cargaActual === this.numeroCarga &&
        this.scene.isActive("menu") &&
        demo.usuarioActual === usuario
      ) {
        this.cargandoProgreso = false;
        this.dibujarOpciones();
      }
    }
  }

  dibujarOpciones() {
    if (this.opcionesMenu !== null) {
      this.opcionesMenu.destroy();
    }

    const grupo = this.add.container(0, 0);
    this.opcionesMenu = grupo;

    const escalaX = this.scale.width / 1600;
    const escalaY = this.scale.height / 900;
    const escalaTexto = Math.min(escalaX, escalaY);
    const anchoMenu = Math.round(583 * escalaX);
    const centroMenu = anchoMenu / 2;
    const margenLateral = 48 * escalaX;
    const anchoBoton = anchoMenu - 2 * margenLateral;

    if (this.cargandoProgreso) {
      const textoCarga = this.add.text(
        centroMenu,
        this.abajoLogo + (this.scale.height - this.abajoLogo) / 2,
        this.textoOpciones[11][spanish],
        {
          padding: { top: 6, bottom: 6 },
          fontFamily: "Fuente",
          fontSize: 28 * escalaTexto + "px",
          color: textoColor(COLORES.textoSecundario),
          resolution: 4
        }
      ).setOrigin(0.5);
      grupo.add(textoCarga);
      return;
    }

    const acciones: number[] = [];

    if (this.primerNivelCompletado) {
      acciones.push(0);
    }

    acciones.push(1);
    acciones.push(2);
    acciones.push(3);
    acciones.push(4);
    acciones.push(7);
    acciones.push(5);
    acciones.push(6);

    const nombres = [
      this.textoOpciones[1][spanish],
      this.textoOpciones[2][spanish],
      this.textoOpciones[3][spanish],
      this.textoOpciones[4][spanish],
      this.textoOpciones[5][spanish],
      this.textoOpciones[6][spanish],
      this.textoOpciones[7][spanish],
      this.textoOpciones[8][spanish]
    ];

    const iconos = [
      "RESUME",
      "Start New Game",
      "Level Selector",
      "Community Levels",
      "Level Editor",
      "Credits",
      "Exit",
      "Options"
    ];

    const medida = this.add.text(0, 0, this.textoOpciones[4][spanish], {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: 42 * escalaTexto + "px",
      resolution: 4
    }).setVisible(false);

    const anchoIcono = 48 * escalaTexto;
    const espacioIcono = 20 * escalaTexto;
    const anchoContenido = anchoIcono + espacioIcono + medida.width * 0.99;
    const escalaContenido = Math.min(1, anchoBoton / anchoContenido);
    const izquierdaContenido = centroMenu - anchoContenido * escalaContenido / 2;
    const xIcono = izquierdaContenido + anchoIcono * escalaContenido / 2;
    const xTexto = izquierdaContenido + (anchoIcono + espacioIcono) * escalaContenido;
    medida.destroy();

    let reservaMensaje = 0;

    if (this.mensajeProgreso !== "") {
      reservaMensaje = 100 * escalaY;
    }

    const altoBoton = 60 * escalaY;
    const altoArea = this.scale.height - this.abajoLogo - reservaMensaje;
    const altoGrupo = Math.min(516 * escalaY, altoArea - 80 * escalaY);
    const primeraY = this.abajoLogo + (altoArea - altoGrupo) / 2 + altoBoton / 2;
    const separacion = (altoGrupo - altoBoton) / (acciones.length - 1);

    for (let i = 0; i < acciones.length; i++) {
      const accion = acciones[i];
      const y = primeraY + i * separacion;
      let habilitado = true;

      if (accion <= 2 && this.progresoCargado === false) {
        habilitado = false;
      }

      if (accion === 2 && this.primerNivelCompletado === false) {
        habilitado = false;
      }

      if (esInvitado() && (accion === 3 || accion === 4)) {
        habilitado = false;
      }

      let colorTexto = textoColor(COLORES.blanco);
      let colorIcono = COLORES.blanco;

      if (habilitado === false) {
        colorTexto = textoColor(COLORES.desactivadoMenu);
        colorIcono = COLORES.desactivadoMenu;
      }

      const icono = this.add.image(
        xIcono,
        y,
        "iconosMenu",
        iconos[accion]
      ).setOrigin(0.5)
        .setScale(3 * escalaTexto * escalaContenido)
        .setTint(colorIcono);

      const texto = this.add.text(
        xTexto,
        y,
        nombres[accion],
        {
          padding: { top: 6, bottom: 6 },
          fontFamily: "Fuente",
          fontSize: 42 * escalaTexto + "px",
          color: colorTexto,
          resolution: 4
        }
      ).setOrigin(0, 0.5).setScale(0.99 * escalaContenido, escalaContenido);

      grupo.add([icono, texto]);

      if (habilitado === false) {
        continue;
      }

      const boton = this.add.zone(
        centroMenu,
        y,
        anchoBoton,
        altoBoton
      ).setInteractive({ useHandCursor: true });
      grupo.add(boton);

      boton.on("pointerover", () => {
        texto.setColor(textoColor(COLORES.amarillo));
        icono.setTint(COLORES.amarillo);
      });

      boton.on("pointerout", () => {
        texto.setColor(colorTexto);
        icono.setTint(colorIcono);
      });

      boton.on("pointerdown", () => {
        texto.setColor(colorTexto);
        icono.setTint(colorIcono);
        this.abrirOpcion(accion);
      });
    }

    if (this.mensajeProgreso !== "") {
      const mensaje = this.add.text(
        centroMenu,
        this.scale.height - 76 * escalaY,
        this.mensajeProgreso,
        {
          padding: { top: 6, bottom: 6 },
          fontFamily: "Fuente",
          fontSize: 22 * escalaTexto + "px",
          color: textoColor(COLORES.rojo),
          resolution: 4
        }
      ).setOrigin(0.5, 0);
      grupo.add(mensaje);

      const reintentar = this.add.text(
        centroMenu,
        this.scale.height - 37 * escalaY,
        this.textoOpciones[9][spanish],
        {
          padding: { top: 6, bottom: 6 },
          fontFamily: "Fuente",
          fontSize: 24 * escalaTexto + "px",
          color: textoColor(COLORES.amarillo),
          resolution: 4
        }
      ).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });

      reintentar.on("pointerdown", () => {
        this.cargarProgreso();
      });

      grupo.add(reintentar);
    }
  }

  crearIconos() {
    const textura = this.textures.get("iconosMenu");

    if (textura.has("Language") === false) {
      textura.add("Language", 0, 16, 64, 16, 16);
    }

    if (textura.has("Options") === false) {
      textura.add("Options", 0, 16, 48, 16, 16);
    }

    if (textura.has("Start New Game")) {
      return;
    }

    textura.add("RESUME", 0, 16, 32, 16, 16);
    textura.add("Start New Game", 0, 16, 48, 16, 16);
    textura.add("Level Selector", 0, 16, 0, 16, 16);
    textura.add("Community Levels", 0, 32, 0, 15, 16);
    textura.add("Level Editor", 0, 0, 16, 16, 16);
    textura.add("Credits", 0, 16, 16, 16, 16);
    textura.add("Exit", 0, 32, 16, 15, 16);
  }

  crearUsuario(nombre: string, invitado: boolean) {
    const margenUsuario = 18;
    const grosorBordeUsuario = 2;
    const derechaUsuario = this.scale.width - margenUsuario - grosorBordeUsuario / 2 - 14;
    const recuadroUsuario = this.add.rectangle(
      derechaUsuario + 14,
      51,
      1,
      1,
      COLORES.fondoMenu,
      0.72
    ).setOrigin(1, 0.5).setStrokeStyle(grosorBordeUsuario, COLORES.violeta, 0.35);

    const textoUsuario = this.add.text(derechaUsuario, 36, nombre, {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "16px",
      color: textoColor(COLORES.blanco),
      resolution: 4
    }).setOrigin(1, 0.5);

    let nombreVisible = nombre;

    while (textoUsuario.width > 220 && nombreVisible.length > 0) {
      nombreVisible = nombreVisible.slice(0, -1);
      textoUsuario.setText(nombreVisible + "...");
    }

    let accionCuenta = this.textoOpciones[0][spanish];

    if (invitado) {
      accionCuenta = this.textoOpciones[15][spanish];
    }

    const enlaceCuenta = this.add.text(derechaUsuario, 66, accionCuenta, {
      fontFamily: "Fuente",
      fontSize: "14px",
      color: textoColor(COLORES.violeta),
      padding: { left: 0, right: 0, top: 5, bottom: 5 },
      resolution: 4
    }).setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    const arribaUsuario = textoUsuario.y - textoUsuario.displayHeight / 2 - 10;
    const abajoUsuario = enlaceCuenta.y + enlaceCuenta.displayHeight / 2 + 10;
    const anchoUsuario = Math.max(textoUsuario.displayWidth, enlaceCuenta.displayWidth) + 28;

    const desplazamientoUsuario = margenUsuario + grosorBordeUsuario / 2 - arribaUsuario;
    textoUsuario.setY(textoUsuario.y + desplazamientoUsuario);
    enlaceCuenta.setY(enlaceCuenta.y + desplazamientoUsuario);

    recuadroUsuario.setPosition(
      derechaUsuario + 14,
      (arribaUsuario + abajoUsuario) / 2 + desplazamientoUsuario
    );
    recuadroUsuario.setSize(anchoUsuario, abajoUsuario - arribaUsuario);

    enlaceCuenta.on("pointerover", () => {
      enlaceCuenta.setColor(textoColor(COLORES.amarillo));
    });

    enlaceCuenta.on("pointerout", () => {
      enlaceCuenta.setColor(textoColor(COLORES.violeta));
    });

    enlaceCuenta.on("pointerdown", () => {
      this.abrirOpcion(6);
    });
  }

  abrirOpcion(opcion: number) {
    if (this.abriendoPartida && opcion !== 6) {
      return;
    }

    const transition = this.scene.get("transition") as TransitionScene;

    if (demo.usuarioActual === null || demo.usuarioActual === undefined) {
      transition.changeScene("menu", "usuariosDemo");
      return;
    }

    if (opcion <= 2 && this.progresoCargado === false) {
      return;
    }

    if ((opcion === 0 || opcion === 2) && this.primerNivelCompletado === false) {
      return;
    }

    if (esInvitado() && (opcion === 3 || opcion === 4)) {
      return;
    }

    switch (opcion) {
      case 0:
        this.abrirPartida(false);
        break;
      case 1:
        if (this.hayProgreso) {
          mostrarConfirmacion(
            this,
            this.textoOpciones[12][spanish],
            this.textoOpciones[13][spanish],
            this.textoOpciones[14][spanish],
            COLORES.amarillo,
            () => {
              this.abrirPartida(true);
            }
          );
        } else {
          this.abrirPartida(true);
        }
        break;
      case 2:
        transition.changeScene("menu", "selectscene");
        break;
      case 3:
        transition.changeScene("menu", "communityDemo");
        break;
      case 4:
        transition.changeScene("menu", "LevelsScene", { escenaAnterior: "menu" });
        break;
      case 5:
        transition.changeScene("menu", "credits");
        break;
      case 6:
        olvidarAjustes();
        cerrarSesion();
        transition.changeScene("menu", "usuariosDemo");
        break;
      case 7:
        transition.changeScene("menu", "options");
        break;
    }
  }

  abrirPartida(nueva: boolean) {
    const usuario = demo.usuarioActual;

    if (
      usuario === null ||
      usuario === undefined ||
      this.abriendoPartida ||
      this.progresoCargado === false ||
      this.idsNiveles.length === 0
    ) {
      return;
    }

    this.abriendoPartida = true;
    let indiceNivel = 0;

    if (nueva === false) {
      indiceNivel = this.idsNiveles.length - 1;

      for (let i = 0; i < this.idsNiveles.length; i++) {
        if (!this.nivelCompletado(this.idsNiveles[i])) {
          indiceNivel = i;
          break;
        }
      }
    }

    const transition = this.scene.get("transition") as TransitionScene;
    transition.changeScene("menu", "game", {
      level: this.idsNiveles[indiceNivel],
      escenaAnterior: "menu",
      idsNivelesOficiales: this.idsNiveles.slice()
    });
  }
}
