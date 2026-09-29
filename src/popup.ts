import Phaser from "phaser";

export function mostrarConfirmacion(
  escena: Phaser.Scene,
  titulo: string,
  mensaje: string,
  textoAccion: string,
  colorAccion: number,
  accion: () => void
) {
  const activos: Phaser.GameObjects.GameObject[] = [];
  const campos: Phaser.GameObjects.GameObject[] = [];
  const objetos: Phaser.GameObjects.GameObject[] = [];

  for (let i = 0; i < escena.children.list.length; i++) {
    const objeto = escena.children.list[i];

    if (objeto.input && objeto.input.enabled) {
      activos.push(objeto);
      objeto.disableInteractive();
    }

    if (objeto.type === "DOMElement") {
      const campo = objeto as Phaser.GameObjects.DOMElement;

      if (campo.visible) {
        campos.push(campo);
        campo.setVisible(false);
      }
    }
  }

  const centroX = escena.scale.width / 2;
  const centroY = escena.scale.height / 2;

  const ancho = 540;
  const margen = 32;
  const anchoTexto = ancho - margen * 2;

  const capa = escena.add.rectangle(
    centroX,
    centroY,
    escena.scale.width,
    escena.scale.height,
    0x080b17,
    0.72
  );

  capa.setDepth(1000);
  capa.setInteractive();
  objetos.push(capa);

  const textoTitulo = escena.add.text(
    centroX,
    0,
    titulo,
    {
      fontFamily: "Fuente",
      fontSize: "24px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: anchoTexto }
    }
  );

  textoTitulo.setOrigin(0.5, 0);
  textoTitulo.setDepth(1003);
  objetos.push(textoTitulo);

  const textoMensaje = escena.add.text(
    centroX,
    0,
    mensaje,
    {
      fontFamily: "Fuente",
      fontSize: "18px",
      color: "#cbdbfc",
      align: "center",
      lineSpacing: 6,
      wordWrap: { width: anchoTexto }
    }
  );

  textoMensaje.setOrigin(0.5, 0);
  textoMensaje.setDepth(1003);
  objetos.push(textoMensaje);

  const alto =
    margen +
    textoTitulo.displayHeight +
    20 +
    textoMensaje.displayHeight +
    32 +
    44 +
    margen;

  const arriba = centroY - alto / 2;

  const sombra = escena.add.rectangle(
    centroX + 6,
    centroY + 6,
    ancho + 4,
    alto + 4,
    0x080b17
  );

  sombra.setDepth(1001);
  objetos.push(sombra);

  const panel = escena.add.rectangle(
    centroX,
    centroY,
    ancho,
    alto,
    0x171a2e
  );

  panel.setStrokeStyle(4, colorAccion);
  panel.setDepth(1002);
  objetos.push(panel);

  textoTitulo.setY(arriba + margen);

  textoMensaje.setY(
    textoTitulo.y + textoTitulo.displayHeight + 20
  );

  let abierto = true;

  const teclado = escena.input.keyboard;

  const cerrar = () => {
    if (abierto === false) {
      return;
    }

    abierto = false;

    escena.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      cerrar
    );

    if (teclado) {
      teclado.off("keydown-ESC", cerrar);
    }

    for (let i = 0; i < activos.length; i++) {
      const objeto = activos[i];

      if (objeto.scene && objeto.input) {
        objeto.input.enabled = true;
      }
    }

    for (let i = 0; i < campos.length; i++) {
      const campo = campos[i] as Phaser.GameObjects.DOMElement;

      if (campo.scene) {
        campo.setVisible(true);
      }
    }

    for (let i = 0; i < objetos.length; i++) {
      if (objetos[i].scene) {
        objetos[i].destroy();
      }
    }
  };

  const crearBotonPopup = (
    x: number,
    etiqueta: string,
    color: number,
    ejecutar: () => void
  ) => {
    const y = arriba + alto - margen - 22;
    const anchoBoton = (anchoTexto - 20) / 2;

    const sombraBoton = escena.add.rectangle(
      x + 3,
      y + 3,
      anchoBoton,
      44,
      0x080b17
    );

    sombraBoton.setDepth(1003);
    objetos.push(sombraBoton);

    const fondo = escena.add.rectangle(
      x,
      y,
      anchoBoton - 4,
      40,
      color
    );

    fondo.setStrokeStyle(4, 0x222034);
    fondo.setDepth(1004);

    fondo.setInteractive({
      useHandCursor: true
    });

    objetos.push(fondo);

    const texto = escena.add.text(
      x,
      y,
      etiqueta,
      {
        fontFamily: "Fuente",
        fontSize: "18px",
        color: "#222034"
      }
    );

    texto.setOrigin(0.5);
    texto.setDepth(1005);
    objetos.push(texto);

    fondo.on("pointerover", () => {
      fondo.setAlpha(0.8);
    });

    fondo.on("pointerout", () => {
      fondo.setAlpha(1);
    });

    fondo.on(
      "pointerdown",
      (
        _puntero: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        evento: Phaser.Types.Input.EventData
      ) => {
        evento.stopPropagation();

        if (abierto === false) {
          return;
        }

        cerrar();
        ejecutar();
      }
    );
  };

  const separacionCentros = (anchoTexto + 20) / 4;

  crearBotonPopup(
    centroX - separacionCentros,
    "Cancelar",
    0x95add6,
    () => {}
  );

  crearBotonPopup(
    centroX + separacionCentros,
    textoAccion,
    colorAccion,
    accion
  );

  if (teclado) {
    teclado.on("keydown-ESC", cerrar);
  }

  escena.events.once(
    Phaser.Scenes.Events.SHUTDOWN,
    cerrar
  );
}