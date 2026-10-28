import Phaser from "phaser";
import { COLORES } from "./colores";

export class LoadingScene extends Phaser.Scene {
  private barra!: Phaser.GameObjects.Rectangle;
  private progreso = 0;
  private progresoVisible = 0;
  private cargaTerminada = false;
  private entradaTerminada = false;
  private saliendo = false;

  constructor() {
    super("loading");
  }

  preload() {
    if (!this.textures.exists("logoMenu")) {
      this.load.image("logoMenu", "assets/logo.png");
    }
  }

  create() {
    this.progreso = 0;
    this.progresoVisible = 0;
    this.cargaTerminada = false;
    this.entradaTerminada = false;
    this.saliendo = false;
    this.cameras.main.setBackgroundColor(COLORES.fondoMenu);

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, COLORES.fondoMenu)
      .setOrigin(0).setInteractive();

    const logo = this.add.image(this.scale.width / 2, this.scale.height / 2, "logoMenu");
    logo.setScale(440 / logo.width).setAlpha(0);

    const ancho = 360;
    const alto = 24;
    const borde = 2;
    const margen = 4;
    const x = Math.round((this.scale.width - ancho) / 2);
    const y = Math.round(logo.y + logo.displayHeight / 2) + 32;
    const espacio = borde + margen;

    const bordeBarra = this.add.rectangle(x, y, ancho, alto, COLORES.bordeMenu)
      .setOrigin(0).setAlpha(0);

    const fondoBarra = this.add.rectangle(
      x + borde, y + borde,
      ancho - borde * 2, alto - borde * 2,
      COLORES.panel
    ).setOrigin(0).setAlpha(0);

    this.barra = this.add.rectangle(
      x + espacio, y + espacio,
      ancho - espacio * 2, alto - espacio * 2,
      COLORES.violeta
    );
    this.barra.setOrigin(0);
    this.barra.setScale(0, 1).setAlpha(0);

    this.tweens.add({
      targets: [logo, bordeBarra, fondoBarra, this.barra],
      alpha: 1,
      duration: 300,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.entradaTerminada = true;
      }
    });

    const contenedorDOM = this.game.domContainer;
    let visibilidadAnterior = "";

    if (contenedorDOM) {
      visibilidadAnterior = contenedorDOM.style.visibility;
      contenedorDOM.style.visibility = "hidden";
    }

    const menu = this.scene.get("menu");

    const actualizarBarra = () => {
      let progreso = menu.load.progress;
      const archivos = menu.load.inflight.entries;

      if (menu.load.totalToLoad > 0) {
        for (let i = 0; i < archivos.length; i++) {
          progreso += Math.max(0, archivos[i].percentComplete) / menu.load.totalToLoad;
        }
      }

      this.progreso = Math.max(this.progreso, Math.min(progreso, 1) * 0.95);
    };

    const terminarCarga = () => {
      this.cargaTerminada = true;
      this.progreso = 1;
      menu.load.off(Phaser.Loader.Events.PROGRESS, actualizarBarra);
      menu.load.off(Phaser.Loader.Events.FILE_PROGRESS, actualizarBarra);
    };

    menu.load.on(Phaser.Loader.Events.PROGRESS, actualizarBarra);
    menu.load.on(Phaser.Loader.Events.FILE_PROGRESS, actualizarBarra);
    menu.events.once(Phaser.Scenes.Events.CREATE, terminarCarga);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      menu.load.off(Phaser.Loader.Events.PROGRESS, actualizarBarra);
      menu.load.off(Phaser.Loader.Events.FILE_PROGRESS, actualizarBarra);
      menu.events.off(Phaser.Scenes.Events.CREATE, terminarCarga);

      if (contenedorDOM) {
        contenedorDOM.style.visibility = visibilidadAnterior;
      }
    });

    this.scene.launch("menu");
    this.scene.bringToTop();
  }

  update(_tiempo: number, delta: number) {
    this.scene.bringToTop();

    const suavizado = 1 - Math.exp(-Math.min(delta, 50) / 100);
    this.progresoVisible += (this.progreso - this.progresoVisible) * suavizado;

    if (this.progreso - this.progresoVisible < 0.001) {
      this.progresoVisible = this.progreso;
    }

    this.barra.setScale(this.progresoVisible, 1);

    if (this.cargaTerminada && this.progresoVisible === 1 && this.entradaTerminada && !this.saliendo) {
      this.saliendo = true;
      this.cameras.main.setBackgroundColor("rgba(0, 0, 0, 0)");

      this.tweens.add({
        targets: this.children.list,
        alpha: 0,
        duration: 300,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.scene.stop();
        }
      });
    }
  }
}