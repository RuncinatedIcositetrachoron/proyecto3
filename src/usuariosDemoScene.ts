import { InterfazDemo } from "./interfazDemo";
import { demo, guardarSesion, continuarComoInvitado } from "./datosDemo";
import { crearCampoTexto } from "./camposTexto";
import { autenticarPerfil, registrarPerfil } from "./api";

export class UsuariosDemoScene extends InterfazDemo {

  registro = false;
  entrando = false;

  constructor() {
    super("usuariosDemo");
  }

  create() {
    this.entrando = false;

    if (
      demo.usuarioActual !== null &&
      demo.usuarioActual !== undefined
    ) {
      this.scene.start("menu");
      return;
    }

    this.registro = false;
    this.dibujar();
  }

  crearTab(
    x: number,
    y: number,
    ancho: number,
    alto: number,
    texto: string,
    color: number,
    colorHover: number,
    activa: boolean,
    accion: () => void
  ) {

    const grafico = this.add.graphics();

    const izquierda = x - ancho / 2;
    const derecha = x + ancho / 2;
    const arriba = y - alto / 2;
    const abajo = y + alto / 2;

    const dibujar = (colorActual: number) => {

      grafico.clear();

      grafico.fillStyle(colorActual);
      grafico.fillRect(
        izquierda,
        arriba,
        ancho,
        alto
      );

      grafico.lineStyle(
        4,
        0x171a2e
      );

      grafico.beginPath();

      grafico.moveTo(
        izquierda,
        abajo
      );

      grafico.lineTo(
        izquierda,
        arriba
      );

      grafico.lineTo(
        derecha,
        arriba
      );

      grafico.lineTo(
        derecha,
        abajo
      );

      grafico.strokePath();
    };

    dibujar(color);

    const zona = this.add.zone(
      x,
      y,
      ancho,
      alto
    );

    zona.setInteractive({
      useHandCursor: true
    });

    const textoTab = this.add.text(
      x,
      y,
      texto,
      {
        fontFamily: "Fuente",
        fontSize: "16px",
        color: "#222034"
      }
    );

    textoTab.setOrigin(0.5);

    zona.on("pointerover", () => {

      if (!activa) {
        dibujar(colorHover);
      }
    });

    zona.on("pointerout", () => {

      if (!activa) {
        dibujar(color);
      }
    });

    zona.on("pointerdown", () => {

      if (this.entrando) {
        return;
      }

      if (!activa) {
        accion();
      }
    });
  }

  dibujar() {

    this.limpiar();

    const AZUL = 0x95add6;
    const AZUL_HOVER = 0xaec1e1;
    const AZUL_INACTIVO = 0x6f87b0;

    const VERDE = 0x9ccc65;
    const VERDE_HOVER = 0xb0d782;
    const VERDE_INACTIVO = 0x73994b;

    let colorActual = AZUL;

    if (this.registro) {
      colorActual = VERDE;
    }

    const titulo = this.texto(
      400,
      70,
      "USUARIOS",
      30
    );

    titulo.setOrigin(0.5);

    let yLogin = 141;
    let altoLogin = 54;
    let colorLogin = AZUL;

    if (this.registro) {
      yLogin = 146;
      altoLogin = 44;
      colorLogin = AZUL_INACTIVO;
    }

    this.crearTab(
      275,
      yLogin,
      250,
      altoLogin,
      "INICIAR SESIÓN",
      colorLogin,
      AZUL_HOVER,
      !this.registro,
      () => {
        this.registro = false;
        this.dibujar();
      }
    );

    let yRegistro = 141;
    let altoRegistro = 54;
    let colorRegistro = VERDE;

    if (!this.registro) {
      yRegistro = 146;
      altoRegistro = 44;
      colorRegistro = VERDE_INACTIVO;
    }

    this.crearTab(
      525,
      yRegistro,
      250,
      altoRegistro,
      "CREAR CUENTA",
      colorRegistro,
      VERDE_HOVER,
      this.registro,
      () => {
        this.registro = true;
        this.dibujar();
      }
    );

    this.add.rectangle(
      400,
      338,
      600,
      340,
      0x171a2e
    ).setStrokeStyle(
      4,
      colorActual
    );

    let tituloFormulario = "INICIAR SESIÓN";

    if (this.registro) {
      tituloFormulario = "CREAR UNA CUENTA";
    }

    const textoTitulo = this.texto(
      400,
      208,
      tituloFormulario,
      20
    );

    textoTitulo.setOrigin(0.5);

    if (this.registro) {
      textoTitulo.setColor("#9ccc65");
    } else {
      textoTitulo.setColor("#95add6");
    }

    this.texto(
      200,
      243,
      "Nombre de usuario",
      16
    );

    const campoNombre = crearCampoTexto(
      this,
      200,
      283,
      400,
      "Usuario",
      40,
      () => {}
    );

    const nombre = campoNombre.input;

    this.texto(
      200,
      318,
      "Contraseña",
      16
    );

    const campoClave = crearCampoTexto(
      this,
      200,
      358,
      400,
      "Contraseña",
      40,
      () => {}
    );

    const clave = campoClave.input;

    clave.type = "password";

    const aviso = this.texto(
      400,
      398,
      "",
      15
    );

    aviso.setOrigin(0.5);

    const enviar = async () => {
      if (this.entrando) {
        return;
      }

      const nombreEscrito = nombre.value.trim();
      const claveEscrita = clave.value;

      if (
        nombreEscrito === "" ||
        claveEscrita === ""
      ) {

        aviso.setText(
          "Completá usuario y contraseña."
        );

        return;
      }

      this.entrando = true;
      let cuentaCreada = false;

      try {
        if (this.registro) {
          aviso.setText("Creando cuenta...");
          await registrarPerfil(nombreEscrito, claveEscrita);
          cuentaCreada = true;
        }

        aviso.setText("Iniciando sesión...");

        const perfil = await autenticarPerfil(
          nombreEscrito,
          claveEscrita
        );

        demo.usuarioActual = {
          id: perfil.profileID,
          nombre: perfil.username,
          contrasena: ""
        };

        guardarSesion();

        nombre.blur();
        clave.blur();

        this.scene.start("menu");
      } catch (error) {
        this.entrando = false;
        demo.usuarioActual = null;

        let mensaje = "No se pudo completar la operación.";

        if (error instanceof TypeError) {
          mensaje = "No se pudo conectar con la API.";
        }

        if (error instanceof Error) {
          if (error.message === "Perfil-ya-existe") {
            mensaje = "Ese nombre de usuario ya está ocupado.";
          }

          if (
            error.message === "Contraseña-incorrecta" ||
            error.message === "Usuario-y/o-contraseña-incorrecta"
          ) {
            mensaje = "Usuario o contraseña incorrectos.";
          }
        }

        if (cuentaCreada) {
          mensaje = "Cuenta creada. Probá la pestaña Iniciar sesión.";
        }

        aviso.setText(mensaje);
      }
    };

    let textoBoton = "ENTRAR";
    let colorBoton = AZUL;

    if (this.registro) {
      textoBoton = "CREAR CUENTA";
      colorBoton = VERDE;
    }

    this.boton(
      400,
      453,
      260,
      textoBoton,
      enviar,
      colorBoton
    );

    const accesoInvitado = this.texto(
      400,
      542,
      "Continuar como invitado",
      16
    ).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    accesoInvitado.on("pointerover", () => {
      accesoInvitado.setColor("#ffd166");
    });

    accesoInvitado.on("pointerout", () => {
      accesoInvitado.setColor("#cbdbfc");
    });

    accesoInvitado.on("pointerdown", () => {
      if (this.entrando) {
        return;
      }

      continuarComoInvitado();
      this.entrando = true;
      nombre.blur();
      clave.blur();
      this.scene.start("menu");
    });

    nombre.addEventListener(
      "keydown",
      evento => {

        if (evento.key === "Enter") {
          evento.preventDefault();
          enviar();
        }
      }
    );

    clave.addEventListener(
      "keydown",
      evento => {

        if (evento.key === "Enter") {
          evento.preventDefault();
          enviar();
        }
      }
    );
  }
}
