import { COLORES, colorTexto as textoColor, oscurecerColor } from "./colores";
import Phaser from "phaser";
import { InterfazDemo } from "./interfazDemo";
import { crearBoton } from "./niveles";
import { spanish } from "./configs";
import { TransitionScene } from "./transitionScene";

export class CreditsScene extends InterfazDemo {
  textoOpciones: string[][] = [
    ["CREDITS", "CRÉDITOS"],
    ["Back", "Volver"],
    ["Backend", "Backend"],
    ["Frontend", "Frontend"],
    ["Programming", "Programación"],
    ["Art and Design", "Arte y diseño"]
  ];

  constructor() {
    super("credits");
  }

  preload() {
    if (!this.textures.exists("creditsLogo")) {
      this.load.image("creditsLogo", "/assets/logo.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(textoColor(COLORES.fondo));

    const centroX = 400;
    const panelY = 330;
    const panelAncho = 720;
    const panelAlto = 450;

    const titulo = this.texto(
      centroX,
      25,
      this.textoOpciones[0][spanish],
      26
    ).setOrigin(0.5, 0);

    const centroTitulo = titulo.y + titulo.displayHeight / 2;

    const volver = crearBoton(
      this,
      100,
      centroTitulo,
      120,
      this.textoOpciones[1][spanish],
      () => {
        this.volver();
      }
    );

    volver.removeAllListeners("pointerover");
    volver.removeAllListeners("pointerout");
    volver.setFillStyle(COLORES.violeta);

    volver.on("pointerover", () => {
      volver.setFillStyle(oscurecerColor(COLORES.violeta));
    });

    volver.on("pointerout", () => {
      volver.setFillStyle(COLORES.violeta);
    });

    this.add.rectangle(
      centroX + 5,
      panelY + 5,
      panelAncho + 4,
      panelAlto + 4,
      COLORES.sombra
    );

    this.add.rectangle(
      centroX,
      panelY,
      panelAncho,
      panelAlto,
      COLORES.panel
    ).setStrokeStyle(4, COLORES.violeta);

    const logo = this.add.image(
      centroX,
      185,
      "creditsLogo"
    );

    const escala = Math.min(
      360 / logo.width,
      100 / logo.height
    );

    logo.setScale(escala);

    this.add.rectangle(
      centroX,
      260,
      640,
      2,
      COLORES.separador
    );

    const creditos = [
      { nombre: "Tomás Groppo", rol: this.textoOpciones[2][spanish] },
      { nombre: "Bruno Fiszelew", rol: this.textoOpciones[3][spanish] },
      { nombre: "Lucas Cerruti", rol: this.textoOpciones[4][spanish] },
      { nombre: "Facundo Fogolin", rol: this.textoOpciones[5][spanish] }
    ];

    const anchoTarjeta = 316;
    const altoTarjeta = 100;
    const separacionHorizontal = 24;
    const separacionVertical = 24;

    const inicioX =
      centroX - separacionHorizontal / 2 - anchoTarjeta / 2;

    const inicioY = 340;

    for (let i = 0; i < creditos.length; i++) {
      const credito = creditos[i];

      const columna = i % 2;
      const fila = Math.floor(i / 2);

      const x =
        inicioX +
        columna * (anchoTarjeta + separacionHorizontal);

      const y =
        inicioY +
        fila * (altoTarjeta + separacionVertical);

      this.add.rectangle(
        x + 4,
        y + 4,
        anchoTarjeta,
        altoTarjeta,
        COLORES.sombraPopup
      );

      this.add.rectangle(
        x,
        y,
        anchoTarjeta,
        altoTarjeta,
        COLORES.fondo
      ).setStrokeStyle(2, COLORES.borde);

      const nombre = this.texto(
        x,
        y - 17,
        credito.nombre,
        19
      );

      nombre.setPadding(0, 10, 0, 4);
      nombre.setOrigin(0.5);
      nombre.setColor(textoColor(COLORES.blanco));

      if (nombre.width > anchoTarjeta - 28) {
        nombre.setScale(
          (anchoTarjeta - 28) / nombre.width
        );
      }

      const rol = this.texto(
        x,
        y + 19,
        credito.rol,
        14
      );

      rol.setPadding(0, 8, 0, 4);
      rol.setOrigin(0.5);
      rol.setColor(textoColor(COLORES.textoSecundario));

      if (rol.width > anchoTarjeta - 28) {
        rol.setScale(
          (anchoTarjeta - 28) / rol.width
        );
      }
    }

    this.input.keyboard?.on(
      "keydown-ESC",
      this.volver,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        this.input.keyboard?.off(
          "keydown-ESC",
          this.volver,
          this
        );
      }
    );
  }

  volver() {
    const transition = this.scene.get("transition") as TransitionScene;
    
    transition.changeScene(
      this.sys.settings.key,
      "menu"
    );
  }
}
