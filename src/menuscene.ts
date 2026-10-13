import Phaser from "phaser";
import { crearBoton } from "./niveles";
import { demo, cerrarSesion, esInvitado } from "./datosDemo";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("menu");
  }

  preload() {
    this.load.image("logo", "assets/logo.png");
    this.load.bitmapFont(
      "FuenteBitmap",
      "./laserfont_0.png",
      "./laserfont.fnt"
    );
    this.load.font("Fuente", "./font.ttf", "truetype");
  }

  create() {
    this.cameras.main.setBackgroundColor("#222034");

    const usuario = demo.usuarioActual;

    if (usuario === null || usuario === undefined) {
      this.scene.start("usuariosDemo");
      return;
    }

    const invitado = esInvitado();

    this.crearUsuario(usuario.nombre, invitado);

    const centroMenu = 230;

    const logo = this.add.image(centroMenu, 135, "logo");
    const escala = Math.min(2, 380 / logo.width, 140 / logo.height);
    logo.setScale(escala);

    const opciones = [
      "JUGAR",
      "COMMUNITY",
      "LEVEL EDITOR",
      "CRÉDITOS"
    ];

    const colores = [
      0x9ccc65,
      0x95add6,
      0xb39ddb,
      0xe6c56a
    ];

    for (let i = 0; i < opciones.length; i++) {
      const boton = crearBoton(
        this,
        centroMenu - 1.5,
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

      if (invitado && i !== 0 && i !== 3) {
        boton.setFillStyle(0x777784);
        boton.disableInteractive();
      } else {
        boton.on("pointerover", () => {
          boton.setAlpha(0.8);
        });

        boton.on("pointerout", () => {
          boton.setAlpha(1);
        });
      }
    }

    if (invitado) {
      this.add.text(
        centroMenu,
        510,
        "Iniciá sesión para acceder a las demás opciones.",
        {
          fontFamily: "Fuente",
          fontSize: "14px",
          color: "#a9a3bc",
          align: "center",
          wordWrap: { width: 340 },
          resolution: 4
        }
      ).setOrigin(0.5, 0);
    }
  }

  crearUsuario(nombre: string, invitado: boolean) {
    const derechaUsuario = this.scale.width - 32;

    const textoUsuario = this.add.text(
      derechaUsuario,
      36,
      nombre,
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#cbdbfc",
        resolution: 4
      }
    ).setOrigin(1, 0.5);

    let nombreVisible = nombre;

    while (textoUsuario.width > 220 && nombreVisible.length > 0) {
      nombreVisible = nombreVisible.slice(0, -1);
      textoUsuario.setText(nombreVisible + "...");
    }

    let accionCuenta = "Cerrar sesión";

    if (invitado) {
      accionCuenta = "Iniciar sesión";
    }

    const enlaceCuenta = this.add.text(
      derechaUsuario,
      66,
      accionCuenta,
      {
        fontFamily: "Fuente",
        fontSize: "14px",
        color: "#b39ddb",
        padding: { left: 0, right: 0, top: 5, bottom: 5 },
        resolution: 4
      }
    ).setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    enlaceCuenta.on("pointerover", () => {
      enlaceCuenta.setColor("#ffd166");
    });

    enlaceCuenta.on("pointerout", () => {
      enlaceCuenta.setColor("#b39ddb");
    });

    enlaceCuenta.on("pointerdown", () => {
      cerrarSesion();
      this.scene.start("usuariosDemo");
    });
  }

  abrirOpcion(opcion: number) {
    if (demo.usuarioActual === null || demo.usuarioActual === undefined) {
      this.scene.start("usuariosDemo");
      return;
    }

    if (esInvitado() && opcion !== 0) {
      return;
    }

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
        this.scene.start("credits");
        break;
    }
  }
}
