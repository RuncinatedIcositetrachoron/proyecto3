
import Phaser from "phaser";
import { InterfazDemo } from "./interfazDemo";
import { crearBoton } from "./niveles";

export class CreditsScene extends InterfazDemo {
  constructor() {
    super("credits");
  }

  preload() {
    if (!this.textures.exists("creditsLogo")) {
      this.load.image("creditsLogo", "/assets/logo.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#222034");

    const centroX = 400;
    const panelY = 330;
    const panelAncho = 720;
    const panelAlto = 450;

    const titulo = this.texto(
      centroX,
      25,
      "CREDITS",
      26
    ).setOrigin(0.5, 0);

    const centroTitulo = titulo.y + titulo.displayHeight / 2;

    const volver = crearBoton(
      this,
      100,
      centroTitulo,
      120,
      "Back",
      () => {
        this.volver();
      }
    );

    volver.removeAllListeners("pointerover");
    volver.removeAllListeners("pointerout");
    volver.setFillStyle(0xb39ddb);

    volver.on("pointerover", () => {
      volver.setFillStyle(0x957bc1);
    });

    volver.on("pointerout", () => {
      volver.setFillStyle(0xb39ddb);
    });

    this.add.rectangle(
      centroX + 5,
      panelY + 5,
      panelAncho + 4,
      panelAlto + 4,
      0x14121e
    );

    this.add.rectangle(
      centroX,
      panelY,
      panelAncho,
      panelAlto,
      0x171a2e
    ).setStrokeStyle(4, 0xb39ddb);

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
      0x303653
    );

    const creditos = [
      { nombre: "Name 1", rol: "Programming" },
      { nombre: "Name 2", rol: "Design" },
      { nombre: "Name 3", rol: "Backend" },
      { nombre: "Name 4", rol: "Frontend" }
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
        0x080b17
      );

      this.add.rectangle(
        x,
        y,
        anchoTarjeta,
        altoTarjeta,
        0x222034
      ).setStrokeStyle(2, 0x6f87b0);

      const nombre = this.texto(
        x,
        y - 17,
        credito.nombre,
        19
      );

      nombre.setPadding(0, 10, 0, 4);
      nombre.setOrigin(0.5);
      nombre.setColor("#ffffff");

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
      rol.setColor("#95add6");

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
    this.scene.start("menu");
  }
}
