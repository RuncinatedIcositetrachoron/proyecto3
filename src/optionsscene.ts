import Phaser from "phaser";
import { COLORES, colorTexto } from "./colores";
import { crearBoton } from "./niveles";
import { spanish, establecerIdioma } from "./idioma";
import { demo, esInvitado } from "./datosDemo";
import { ajustes, guardarAjustes, aplicarVolumenMusica } from "./ajustes";
import { TransitionScene } from "./transitionScene";

export class OptionsScene extends Phaser.Scene {
  private guardando = false;
  private aviso: Phaser.GameObjects.Text | undefined;

  constructor() {
    super("options");
  }

  preload() {
    if (this.textures.exists("iconosMenu") === false) {
      this.load.image("iconosMenu", "assets/icons.png");
    }
  }

  create() {
    this.guardando = false;
    this.cameras.main.setBackgroundColor(colorTexto(COLORES.fondo));
    this.crearCabecera();
    this.crearPanel();
    this.crearVolumen("musica", 152, ["Music", "Música"][spanish]);
    this.crearVolumen("efectos", 280, ["Sound Effects", "Efectos de sonido"][spanish]);
    this.crearIdioma();
    this.crearGuardado();
    this.configurarTeclado();
  }

  private crearCabecera() {
    const titulo = this.texto(400, 25, ["OPTIONS", "OPCIONES"][spanish], 26).setOrigin(0.5, 0);
    const centroTitulo = titulo.y + titulo.displayHeight / 2;
    this.boton(100, centroTitulo, 120, ["Back", "Volver"][spanish], () => {
      this.guardarYVolver();
    }, COLORES.violeta);
  }

  private crearPanel() {
    this.add.rectangle(405, 335, 724, 454, COLORES.sombra);
    this.add.rectangle(400, 330, 720, 450, COLORES.panel).setStrokeStyle(4, COLORES.violeta);
    this.add.rectangle(400, 244, 640, 1, COLORES.separador, 0.45);
    this.add.rectangle(400, 372, 640, 1, COLORES.separador, 0.45);
  }

  private crearIdioma() {
    const textura = this.textures.get("iconosMenu");
    if (textura.has("Language") === false) {
      textura.add("Language", 0, 16, 64, 16, 16);
    }
    textura.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(96, 416, "iconosMenu", "Language")
      .setScale(2)
      .setTint(COLORES.blanco)
      .setDepth(1);
    this.texto(128, 416, ["Language", "Idioma"][spanish], 18).setOrigin(0, 0.5);
    this.boton(470, 416, 144, "English", () => {
      this.cambiarIdioma(0);
    }, spanish === 0 ? COLORES.verde : COLORES.normal);
    this.boton(638, 416, 144, "Español", () => {
      this.cambiarIdioma(1);
    }, spanish === 1 ? COLORES.verde : COLORES.normal);
  }

  private crearGuardado() {
    this.aviso = this.texto(400, 470, "", 14).setOrigin(0.5);
    this.boton(400, 508, 224, ["Save and return", "Guardar y volver"][spanish], () => {
      this.guardarYVolver();
    }, COLORES.amarillo);
  }

  private configurarTeclado() {
    if (this.input.keyboard) {
      this.input.keyboard.on("keydown-ESC", this.guardarYVolver, this);
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input.keyboard) {
        this.input.keyboard.off("keydown-ESC", this.guardarYVolver, this);
      }
    });
  }

  private texto(x: number, y: number, valor: string, tamano: number) {
    return this.add.text(x, y, valor, {
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: tamano + "px",
      color: colorTexto(COLORES.blanco)
    });
  }

  private boton(
    x: number,
    y: number,
    ancho: number,
    texto: string,
    accion: () => void,
    color = COLORES.normal
  ) {
    return crearBoton(this, x, y, ancho, texto, () => {
      if (this.guardando === false) {
        accion();
      }
    }).setFillStyle(color);
  }

  private crearVolumen(tipo: "musica" | "efectos", yEtiqueta: number, nombre: string) {
    const inicioBarra = 148;
    const anchoBarra = 504;
    const yBarra = yEtiqueta + 48;
    let arrastrando = false;
    let desfaseArrastre = 0;

    this.texto(80, yEtiqueta, nombre, 18).setOrigin(0, 0.5);
    const textoPorcentaje = this.texto(720, yEtiqueta, "", 18).setOrigin(1, 0.5);

    this.add.rectangle(403, yBarra + 3, 516, 28, COLORES.sombra);
    this.add.rectangle(400, yBarra, 512, 24, COLORES.separador).setStrokeStyle(4, COLORES.fondo);
    const relleno = this.add.rectangle(inicioBarra, yBarra, 1, 16, COLORES.violeta).setOrigin(0, 0.5);
    for (let i = 1; i < 18; i++) {
      this.add.rectangle(inicioBarra + i * 28, yBarra, 2, 20, COLORES.fondo, 0.35);
    }

    const sombraTirador = this.add.rectangle(inicioBarra + 3, yBarra + 3, 28, 40, COLORES.sombra);
    const tirador = this.add.rectangle(inicioBarra, yBarra, 24, 36, COLORES.normal).setStrokeStyle(4, COLORES.fondo);
    const marcaTirador = this.add.rectangle(inicioBarra, yBarra, 4, 16, COLORES.borde);

    const actualizarVolumen = (valor: number) => {
      if (this.guardando) {
        return;
      }
      ajustes[tipo] = Math.round(Math.max(0, Math.min(1, valor)) * 100) / 100;
      if (tipo === "musica") {
        aplicarVolumenMusica(this);
      }
      const anchoRelleno = Math.round(anchoBarra * ajustes[tipo]);
      const posicionTirador = inicioBarra + anchoRelleno;
      relleno.setSize(anchoRelleno, 16).setVisible(ajustes[tipo] > 0);
      sombraTirador.setX(posicionTirador + 3);
      tirador.setX(posicionTirador);
      marcaTirador.setX(posicionTirador);
      textoPorcentaje.setText(Math.round(ajustes[tipo] * 100) + "%");
    };

    this.boton(100, yBarra, 40, "-", () => {
      actualizarVolumen(ajustes[tipo] - 0.05);
    });
    this.boton(700, yBarra, 40, "+", () => {
      actualizarVolumen(ajustes[tipo] + 0.05);
    });

    const zonaArrastre = this.add.zone(400, yBarra, 544, 48).setInteractive({ useHandCursor: true });
    this.input.setDraggable(zonaArrastre);
    zonaArrastre.on("pointerover", () => {
      if (this.guardando === false) {
        tirador.setFillStyle(COLORES.hover);
      }
    });
    zonaArrastre.on("pointerout", () => {
      if (arrastrando === false) {
        tirador.setFillStyle(COLORES.normal);
      }
    });
    zonaArrastre.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.guardando) {
        return;
      }
      arrastrando = true;
      desfaseArrastre = 0;
      if (Math.abs(pointer.x - tirador.x) <= 14) {
        desfaseArrastre = pointer.x - tirador.x;
      }
      tirador.setFillStyle(COLORES.hover);
      actualizarVolumen((pointer.x - desfaseArrastre - inicioBarra) / anchoBarra);
    });
    zonaArrastre.on("drag", (pointer: Phaser.Input.Pointer) => {
      actualizarVolumen((pointer.x - desfaseArrastre - inicioBarra) / anchoBarra);
    });
    const terminarArrastre = () => {
      arrastrando = false;
      tirador.setFillStyle(COLORES.normal);
    };
    zonaArrastre.on("dragend", terminarArrastre);
    zonaArrastre.on("pointerup", terminarArrastre);
    actualizarVolumen(ajustes[tipo]);
  }

  private cambiarIdioma(idioma: number) {
    if (this.guardando || spanish === idioma) {
      return;
    }
    establecerIdioma(idioma);
    this.scene.restart();
  }

  private async guardarYVolver() {
    if (this.guardando || demo.usuarioActual === null || this.aviso === undefined) {
      return;
    }
    const aviso = this.aviso;
    this.guardando = true;
    aviso.setColor(colorTexto(COLORES.blanco));
    aviso.setText(["Saving...", "Guardando..."][spanish]);
    try {
      await guardarAjustes(demo.usuarioActual.nombre, esInvitado());
      if (this.scene.isActive("options") === false) {
        return;
      }
      const transicion = this.scene.get("transition") as TransitionScene;
      transicion.changeScene("options", "menu");
    } catch (error) {
      this.guardando = false;
      aviso.setColor(colorTexto(COLORES.rojo));
      aviso.setText(["Could not save settings.", "No se pudieron guardar los ajustes."][spanish]);
      console.error(error);
    }
  }
}
