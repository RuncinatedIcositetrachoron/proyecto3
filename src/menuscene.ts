import Phaser from "phaser";
import { crearBoton } from "./niveles";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  preload() {
    this.load.image("logo", "assets/logo.png");
    this.load.font("Fuente", "./font.ttf");
  }

  create() {
    this.cameras.main.setBackgroundColor("#222034");

    const logo = this.add.image(400, 120, "logo");
    const escala = Math.min(2, 540 / logo.width, 160 / logo.height);
    logo.setScale(escala);

    this.add.rectangle(400, 400, 380, 340, 0x171a2e)
      .setStrokeStyle(4, 0x95add6);

    const opciones = [
      "START",
      "COMMUNITY",
      "LEVELS",
      "OPTIONS",
      "CREDITS"
    ];

    const colores = [
      0x9ccc65,
      0x95add6,
      0xb39ddb,
      0xcbdbfc,
      0xe6c56a
    ];

    for (let i = 0; i < opciones.length; i++) {
      const boton = crearBoton(
        this,
        398.5,
        278.5 + i * 60,
        320,
        opciones[i],
        () => {
          this.abrirOpcion(i);
        }
      );

      boton.removeAllListeners("pointerover");
      boton.removeAllListeners("pointerout");
      boton.setFillStyle(colores[i]);

      boton.on("pointerover", () => {
        boton.setAlpha(0.8);
      });

      boton.on("pointerout", () => {
        boton.setAlpha(1);
      });
    }
  }

  abrirOpcion(opcion: number) {
    switch (opcion) {
      case 0:
        this.scene.start("selectscene");
        break;

      case 1:
        this.scene.start("communityDemo");
        break;

      case 2:
        this.scene.start("LevelsScene", {
          escenaAnterior: "menu"
        });
        break;

      case 3:
        this.scene.start("options");
        break;

      case 4:
        this.scene.start("credits");
        break;
    }
  }
}