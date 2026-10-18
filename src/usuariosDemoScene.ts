import type Phaser from "phaser";
import { InterfazDemo } from "./interfazDemo";
import { demo, guardarSesion, continuarComoInvitado } from "./datosDemo";
import { crearCampoTexto } from "./camposTexto";
import { autenticarPerfil, registrarPerfil } from "./api";
import { TransitionScene } from "./transitionScene";

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
      grafico.fillRect(izquierda, arriba, ancho, alto);
      grafico.lineStyle(4, 0x171a2e);
      grafico.beginPath();
      grafico.moveTo(izquierda, abajo);
      grafico.lineTo(izquierda, arriba);
      grafico.lineTo(derecha, arriba);
      grafico.lineTo(derecha, abajo);
      grafico.strokePath();
    };

    dibujar(color);

    const zona = this.add.zone(x, y, ancho, alto);

    zona.setInteractive({ useHandCursor: true });

    const textoTab = this.add.text(x, y, texto, {
      fontFamily: "Fuente",
      fontSize: "16px",
      color: "#222034"
    });

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

  crearBotonClave(
    input: HTMLInputElement,
    x: number,
    y: number,
    etiqueta: string
  ) {
    const boton = document.createElement("button");
    let visible = false;

    boton.type = "button";
    boton.style.width = "40px";
    boton.style.height = "40px";
    boton.style.padding = "6px";
    boton.style.boxSizing = "border-box";
    boton.style.display = "flex";
    boton.style.alignItems = "center";
    boton.style.justifyContent = "center";
    boton.style.backgroundColor = "#222034";
    boton.style.color = "#cbdbfc";
    boton.style.border = "2px solid #6f87b0";
    boton.style.cursor = "pointer";

    const actualizarBoton = () => {
      let accion = "Show " + etiqueta;

      if (visible) {
        accion = "Hide " + etiqueta;
      }

      boton.title = accion;
      boton.setAttribute("aria-label", accion);
      boton.setAttribute("aria-pressed", String(visible));

    };

    actualizarBoton();

    boton.addEventListener("mouseenter", () => {
      boton.style.color = "#ffd166";
      boton.style.borderColor = "#ffd166";
    });

    boton.addEventListener("mouseleave", () => {
      boton.style.color = "#cbdbfc";
      boton.style.borderColor = "#6f87b0";
    });

    boton.addEventListener("mousedown", evento => {
      evento.preventDefault();
    });

    boton.addEventListener("keydown", evento => {
      evento.stopPropagation();
    });

    boton.addEventListener("click", () => {
      if (this.entrando) {
        return;
      }

      visible = !visible;

      if (visible) {
        input.type = "text";
      } else {
        input.type = "password";
      }

      actualizarBoton();
    });

    input.style.height = "40px";
    input.style.boxSizing = "border-box";

    for (let i = 0; i < this.children.list.length; i++) {
      const objeto = this.children.list[i];

      if (objeto.type === "DOMElement") {
        const campo = objeto as Phaser.GameObjects.DOMElement;

        if (campo.node === input) {
          campo.updateSize();
          x = campo.x + (1 - campo.originX) * campo.width + 8 + 20;
          y = campo.y + (0.5 - campo.originY) * campo.height;
          break;
        }
      }
    }

    this.add.dom(x, y, boton).setOrigin(0.5);

    return boton;
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

    const anchoPanel = 600;
    const arribaPanel = 168;
    const xCampo = 200;
    const anchoCampo = 400;
    const anchoClave = anchoCampo - 40 - 8;
    const xIconoClave = xCampo + anchoCampo - 20;
    const yNombre = 272;
    const yClave = yNombre + 76;
    const yConfirmacion = yClave + 76;

    const titulo = this.texto(400, 70, "USERS", 30);
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
      "SIGN IN",
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
      "CREATE ACCOUNT",
      colorRegistro,
      VERDE_HOVER,
      this.registro,
      () => {
        this.registro = true;
        this.dibujar();
      }
    );

    let yUltimoCampo = yClave;

    if (this.registro) {
      yUltimoCampo = yConfirmacion;
    }

    const yAviso = yUltimoCampo + 50;
    const yBoton = yUltimoCampo + 104;
    const abajoPanel = yBoton + 40;
    const altoPanel = abajoPanel - arribaPanel;
    const centroPanel = arribaPanel + altoPanel / 2;

    this.add.rectangle(
      400,
      centroPanel,
      anchoPanel,
      altoPanel,
      0x171a2e
    ).setStrokeStyle(4, colorActual);

    let tituloFormulario = "SIGN IN";

    if (this.registro) {
      tituloFormulario = "CREATE AN ACCOUNT";
    }

    const textoTitulo = this.texto(400, arribaPanel + 38, tituloFormulario, 20);
    textoTitulo.setOrigin(0.5);

    if (this.registro) {
      textoTitulo.setColor("#9ccc65");
    } else {
      textoTitulo.setColor("#95add6");
    }

    this.texto(xCampo, yNombre - 40, "Username", 16);

    const campoNombre = crearCampoTexto(
      this,
      xCampo,
      yNombre,
      anchoCampo,
      "Username",
      40,
      () => {}
    );

    const nombre = campoNombre.input;
    nombre.style.width = anchoCampo + "px";
    nombre.autocomplete = "username";
    nombre.spellcheck = false;
    nombre.setAttribute("autocapitalize", "none");
    nombre.setAttribute("aria-label", "Username");

    this.texto(xCampo, yClave - 40, "Password", 16);

    const campoClave = crearCampoTexto(
      this,
      xCampo,
      yClave,
      anchoClave,
      "Password",
      40,
      () => {}
    );

    const clave = campoClave.input;
    clave.style.width = anchoClave + "px";
    clave.type = "password";
    clave.autocomplete = "current-password";
    clave.spellcheck = false;
    clave.setAttribute("autocapitalize", "none");
    clave.setAttribute("aria-label", "Password");

    const campos: HTMLInputElement[] = [nombre, clave];
    const botonesClave: HTMLButtonElement[] = [];

    botonesClave.push(this.crearBotonClave(clave, xIconoClave, yClave, "password"));

    let confirmacion: HTMLInputElement | undefined;

    if (this.registro) {
      clave.autocomplete = "new-password";
      this.texto(xCampo, yConfirmacion - 40, "Confirm password", 16);

      const campoConfirmacion = crearCampoTexto(
        this,
        xCampo,
        yConfirmacion,
        anchoClave,
        "Repeat your password",
        40,
        () => {}
      );

      confirmacion = campoConfirmacion.input;
      confirmacion.style.width = anchoClave + "px";
      confirmacion.type = "password";
      confirmacion.autocomplete = "new-password";
      confirmacion.spellcheck = false;
      confirmacion.setAttribute("autocapitalize", "none");
      confirmacion.setAttribute("aria-label", "Confirm password");

      campos.push(confirmacion);
      botonesClave.push(this.crearBotonClave(
        confirmacion,
        xIconoClave,
        yConfirmacion,
        "password confirmation"
      ));
    }

    for (let i = 0; i < campos.length; i++) {
      campos[i].style.height = "40px";
      campos[i].style.boxSizing = "border-box";
    }

    const aviso = this.texto(400, yAviso, "", 14);
    aviso.setOrigin(0.5);
    aviso.setAlign("center");
    aviso.setWordWrapWidth(520);

    const enviar = async () => {
      if (this.entrando) {
        return;
      }

      const nombreEscrito = nombre.value.trim();
      const claveEscrita = clave.value;

      aviso.setColor("#e57373");

      if (nombreEscrito === "") {
        aviso.setText("Enter your username.");
        nombre.focus();
        return;
      }

      if (claveEscrita === "") {
        aviso.setText("Enter your password.");
        clave.focus();
        return;
      }

      if (this.registro && confirmacion) {
        if (confirmacion.value === "") {
          aviso.setText("Please confirm your password.");
          confirmacion.focus();
          return;
        }

        if (claveEscrita !== confirmacion.value) {
          aviso.setText("Passwords do not match.");
          confirmacion.focus();
          return;
        }
      }

      this.entrando = true;
      let cuentaCreada = false;

      for (let i = 0; i < campos.length; i++) {
        campos[i].disabled = true;
      }

      for (let i = 0; i < botonesClave.length; i++) {
        botonesClave[i].disabled = true;
      }

      aviso.setColor("#cbdbfc");

      try {
        if (this.registro) {
          aviso.setText("Creating account...");
          await registrarPerfil(nombreEscrito, claveEscrita);
          cuentaCreada = true;
        }

        aviso.setText("Signing in...");

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

        for (let i = 0; i < campos.length; i++) {
          campos[i].blur();
        }

        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(this.sys.settings.key, "menu");
      } catch (error) {
        this.entrando = false;
        demo.usuarioActual = null;

        for (let i = 0; i < campos.length; i++) {
          campos[i].disabled = false;
        }

        for (let i = 0; i < botonesClave.length; i++) {
          botonesClave[i].disabled = false;
        }

        let mensaje = "Could not sign in. Please try again.";

        if (this.registro && !cuentaCreada) {
          mensaje = "Could not create the account. Please try again.";
        }

        if (error instanceof TypeError) {
          mensaje = "Could not connect to the server.";
        }

        let codigo = "";

        if (error instanceof Error) {
          codigo = error.message;
        } else if (typeof error === "string") {
          codigo = error;
        }

        if (codigo.indexOf("Perfil-ya-existe") !== -1) {
          mensaje = "That username is already taken. Choose another one.";
          nombre.focus();
        }

        if (
          codigo.indexOf("Perfil-no-existe") !== -1 ||
          codigo.indexOf("Usuario-no-existe") !== -1 ||
          codigo.indexOf("Perfil-no-encontrado") !== -1 ||
          codigo.indexOf("Usuario-no-encontrado") !== -1 ||
          codigo.indexOf("No-se-ha-encontrado-el-usuario-marcado") !== -1
        ) {
          mensaje = "That username does not exist. Create an account first.";
          nombre.focus();
        }

        if (codigo.indexOf("Contraseña-incorrecta") !== -1) {
          mensaje = "Incorrect password. Please try again.";
          clave.focus();
        }

        if (codigo.indexOf("Usuario-y/o-contraseña-incorrecta") !== -1) {
          mensaje = "Incorrect username or password.";
          clave.focus();
        }

        if (cuentaCreada) {
          mensaje = "Account created. " + mensaje + " Use the Sign In tab.";
        }

        aviso.setColor("#e57373");
        aviso.setText(mensaje);
      }
    };

    let textoBoton = "SIGN IN";
    let colorBoton = AZUL;

    if (this.registro) {
      textoBoton = "CREATE ACCOUNT";
      colorBoton = VERDE;
    }

    this.boton(400, yBoton, 260, textoBoton, enviar, colorBoton);

    if (!this.registro) {
      const accesoInvitado = this.texto(
        400,
        abajoPanel + 36,
        "Continue as guest",
        16
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });

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

        for (let i = 0; i < campos.length; i++) {
          campos[i].blur();
        }

        const transition = this.scene.get("transition") as TransitionScene;
        transition.changeScene(this.sys.settings.key, "menu");
      });
    }

    for (let i = 0; i < campos.length; i++) {
      campos[i].addEventListener("keydown", evento => {
        if (evento.key === "Enter" && !evento.isComposing) {
          evento.preventDefault();
          evento.stopPropagation();
          enviar();
        }
      });
    }
  }
}
