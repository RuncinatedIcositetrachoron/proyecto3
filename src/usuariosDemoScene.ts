import { COLORES, colorTexto as textoColor, oscurecerColor } from "./colores";
import type Phaser from "phaser";
import { spanish } from "./idioma";
import { InterfazDemo } from "./interfazDemo";
import { demo, guardarSesion, continuarComoInvitado } from "./datosDemo";
import { crearCampoTexto } from "./camposTexto";
import { autenticarPerfil, registrarPerfil } from "./api";
import { TransitionScene } from "./transitionScene";

export class UsuariosDemoScene extends InterfazDemo {
  textoOpciones: string[][] = [
    ["Show ", "Mostrar "],
    ["Hide ", "Ocultar "],
    ["USERS", "USUARIOS"],
    ["SIGN IN", "INICIAR SESIÓN"],
    ["CREATE ACCOUNT", "CREAR CUENTA"],
    ["CREATE AN ACCOUNT", "CREAR UNA CUENTA"],
    ["Username", "Usuario"],
    ["Password", "Contraseña"],
    ["password", "contraseña"],
    ["Confirm password", "Confirmar contraseña"],
    ["Repeat your password", "Repetí tu contraseña"],
    ["password confirmation", "confirmación de contraseña"],
    ["Enter your username.", "Ingresá tu usuario."],
    ["Enter your password.", "Ingresá tu contraseña."],
    ["Please confirm your password.", "Confirmá tu contraseña."],
    ["Passwords do not match.", "Las contraseñas no coinciden."],
    ["Creating account...", "Creando cuenta..."],
    ["Signing in...", "Iniciando sesión..."],
    ["Could not sign in. Please try again.", "No se pudo iniciar sesión. Intentá de nuevo."],
    ["Could not create the account. Please try again.", "No se pudo crear la cuenta. Intentá de nuevo."],
    ["Could not connect to the server.", "No se pudo conectar con el servidor."],
    ["That username is already taken. Choose another one.", "Ese usuario ya está en uso. Elegí otro."],
    ["That username does not exist. Create an account first.", "Ese usuario no existe. Creá una cuenta primero."],
    ["Incorrect password. Please try again.", "Contraseña incorrecta. Intentá de nuevo."],
    ["Incorrect username or password.", "Usuario o contraseña incorrectos."],
    ["Account created. ", "Cuenta creada. "],
    [" Use the Sign In tab.", " Usá la pestaña Iniciar sesión."],
    ["Continue as guest", "Continuar como invitado"]
  ];

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
    colorHover = oscurecerColor(color);
    const grafico = this.add.graphics();

    const izquierda = x - ancho / 2;
    const derecha = x + ancho / 2;
    const arriba = y - alto / 2;
    const abajo = y + alto / 2;

    const dibujar = (colorActual: number) => {
      grafico.clear();
      grafico.fillStyle(colorActual);
      grafico.fillRect(izquierda, arriba, ancho, alto);
      grafico.lineStyle(4, COLORES.panel);
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
      padding: { top: 6, bottom: 6 },
      fontFamily: "Fuente",
      fontSize: "16px",
      color: textoColor(COLORES.fondo)
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
    boton.style.padding = "2px";
    boton.style.boxSizing = "border-box";
    boton.style.display = "flex";
    boton.style.alignItems = "center";
    boton.style.justifyContent = "center";
    boton.style.backgroundColor = textoColor(COLORES.fondo);
    boton.style.color = textoColor(COLORES.blanco);
    boton.style.border = "2px solid " + textoColor(COLORES.borde);
    boton.style.cursor = "pointer";

    const icono = document.createElement("span");
    icono.style.display = "block";
    icono.style.width = "32px";
    icono.style.height = "32px";
    icono.style.backgroundImage = 'url("assets/icons.png")';
    icono.style.backgroundSize = "96px 160px";
    icono.style.backgroundPosition = "-64px -96px";
    icono.style.imageRendering = "pixelated";
    icono.style.pointerEvents = "none";
    icono.setAttribute("aria-hidden", "true");
    boton.appendChild(icono);

    const actualizarBoton = () => {
      let accion = this.textoOpciones[0][spanish] + etiqueta;

      if (visible) {
        accion = this.textoOpciones[1][spanish] + etiqueta;
      }

      boton.title = accion;
      boton.setAttribute("aria-label", accion);
      boton.setAttribute("aria-pressed", String(visible));
      icono.style.opacity = "0.7";
      icono.style.backgroundPosition = "0px -128px";

      if (visible) {
        icono.style.opacity = "1";
        icono.style.backgroundPosition = "-64px -96px";
      }

    };

    actualizarBoton();

    boton.addEventListener("mouseenter", () => {
      boton.style.color = textoColor(COLORES.amarillo);
      boton.style.borderColor = textoColor(COLORES.amarillo);
    });

    boton.addEventListener("mouseleave", () => {
      boton.style.color = textoColor(COLORES.blanco);
      boton.style.borderColor = textoColor(COLORES.borde);
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

    const AZUL = COLORES.azul;
    const AZUL_HOVER = COLORES.azulHover;
    const AZUL_INACTIVO = COLORES.borde;
    const VERDE = COLORES.verde;
    const VERDE_HOVER = COLORES.verdeHover;
    const VERDE_INACTIVO = COLORES.verdeInactivo;

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
    const yNombre = 280;
    const yClave = yNombre + 76;
    const yConfirmacion = yClave + 76;

    const titulo = this.texto(400, 70, this.textoOpciones[2][spanish], 30);
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
      this.textoOpciones[3][spanish],
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
      this.textoOpciones[4][spanish],
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
      COLORES.panel
    ).setStrokeStyle(4, colorActual);

    let tituloFormulario = this.textoOpciones[3][spanish];

    if (this.registro) {
      tituloFormulario = this.textoOpciones[5][spanish];
    }

    const textoTitulo = this.texto(400, arribaPanel + 38, tituloFormulario, 20);
    textoTitulo.setOrigin(0.5);

    if (this.registro) {
      textoTitulo.setColor(textoColor(COLORES.verde));
    } else {
      textoTitulo.setColor(textoColor(COLORES.blanco));
    }

    const etiquetaNombre = this.texto(xCampo, yNombre - 40, this.textoOpciones[6][spanish], 16);

    const campoNombre = crearCampoTexto(
      this,
      xCampo,
      yNombre,
      anchoCampo,
      this.textoOpciones[6][spanish],
      40,
      () => {}
    );

    const nombre = campoNombre.input;
    nombre.style.width = anchoCampo + "px";
    nombre.autocomplete = "username";
    nombre.spellcheck = false;
    nombre.setAttribute("autocapitalize", "none");
    nombre.setAttribute("aria-label", this.textoOpciones[6][spanish]);

    const etiquetaClave = this.texto(xCampo, yClave - 40, this.textoOpciones[7][spanish], 16);

    const campoClave = crearCampoTexto(
      this,
      xCampo,
      yClave,
      anchoClave,
      this.textoOpciones[7][spanish],
      40,
      () => {}
    );

    const clave = campoClave.input;
    clave.style.width = anchoClave + "px";
    clave.type = "password";
    clave.autocomplete = "current-password";
    clave.spellcheck = false;
    clave.setAttribute("autocapitalize", "none");
    clave.setAttribute("aria-label", this.textoOpciones[7][spanish]);

    const campos: HTMLInputElement[] = [nombre, clave];
    const etiquetas: Phaser.GameObjects.Text[] = [etiquetaNombre, etiquetaClave];
    const botonesClave: HTMLButtonElement[] = [];

    botonesClave.push(this.crearBotonClave(clave, xIconoClave, yClave, this.textoOpciones[8][spanish]));

    let confirmacion: HTMLInputElement | undefined;

    if (this.registro) {
      clave.autocomplete = "new-password";
      const etiquetaConfirmacion = this.texto(xCampo, yConfirmacion - 40, this.textoOpciones[9][spanish], 16);

      const campoConfirmacion = crearCampoTexto(
        this,
        xCampo,
        yConfirmacion,
        anchoClave,
        this.textoOpciones[10][spanish],
        40,
        () => {}
      );

      confirmacion = campoConfirmacion.input;
      confirmacion.style.width = anchoClave + "px";
      confirmacion.type = "password";
      confirmacion.autocomplete = "new-password";
      confirmacion.spellcheck = false;
      confirmacion.setAttribute("autocapitalize", "none");
      confirmacion.setAttribute("aria-label", this.textoOpciones[9][spanish]);

      campos.push(confirmacion);
      etiquetas.push(etiquetaConfirmacion);
      botonesClave.push(this.crearBotonClave(
        confirmacion,
        xIconoClave,
        yConfirmacion,
        this.textoOpciones[11][spanish]
      ));
    }

    for (let i = 0; i < campos.length; i++) {
      campos[i].style.height = "40px";
      campos[i].style.boxSizing = "border-box";

      for (let j = 0; j < this.children.list.length; j++) {
        const objeto = this.children.list[j];

        if (objeto.type === "DOMElement") {
          const campo = objeto as Phaser.GameObjects.DOMElement;

          if (campo.node === campos[i]) {
            campo.updateSize();
            etiquetas[i].setPadding(0, 6, 0, 0);
            etiquetas[i].setOrigin(0, 1);
            etiquetas[i].setPosition(
              campo.x - campo.originX * campo.width,
              campo.y - campo.originY * campo.height - 6
            );
            break;
          }
        }
      }
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

      aviso.setColor(textoColor(COLORES.rojo));

      if (nombreEscrito === "") {
        aviso.setText(this.textoOpciones[12][spanish]);
        nombre.focus();
        return;
      }

      if (claveEscrita === "") {
        aviso.setText(this.textoOpciones[13][spanish]);
        clave.focus();
        return;
      }

      if (this.registro && confirmacion) {
        if (confirmacion.value === "") {
          aviso.setText(this.textoOpciones[14][spanish]);
          confirmacion.focus();
          return;
        }

        if (claveEscrita !== confirmacion.value) {
          aviso.setText(this.textoOpciones[15][spanish]);
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

      aviso.setColor(textoColor(COLORES.blanco));

      try {
        if (this.registro) {
          aviso.setText(this.textoOpciones[16][spanish]);
          await registrarPerfil(nombreEscrito, claveEscrita);
          cuentaCreada = true;
        }

        aviso.setText(this.textoOpciones[17][spanish]);

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

        let mensaje = this.textoOpciones[18][spanish];

        if (this.registro && !cuentaCreada) {
          mensaje = this.textoOpciones[19][spanish];
        }

        if (error instanceof TypeError) {
          mensaje = this.textoOpciones[20][spanish];
        }

        let codigo = "";

        if (error instanceof Error) {
          codigo = error.message;
        } else if (typeof error === "string") {
          codigo = error;
        }

        if (codigo.indexOf("Perfil-ya-existe") !== -1) {
          mensaje = this.textoOpciones[21][spanish];
          nombre.focus();
        }

        if (
          codigo.indexOf("Perfil-no-existe") !== -1 ||
          codigo.indexOf("Usuario-no-existe") !== -1 ||
          codigo.indexOf("Perfil-no-encontrado") !== -1 ||
          codigo.indexOf("Usuario-no-encontrado") !== -1 ||
          codigo.indexOf("No-se-ha-encontrado-el-usuario-marcado") !== -1
        ) {
          mensaje = this.textoOpciones[22][spanish];
          nombre.focus();
        }

        if (codigo.indexOf("Contraseña-incorrecta") !== -1) {
          mensaje = this.textoOpciones[23][spanish];
          clave.focus();
        }

        if (codigo.indexOf("Usuario-y/o-contraseña-incorrecta") !== -1) {
          mensaje = this.textoOpciones[24][spanish];
          clave.focus();
        }

        if (cuentaCreada) {
          mensaje = this.textoOpciones[25][spanish] + mensaje + this.textoOpciones[26][spanish];
        }

        aviso.setColor(textoColor(COLORES.rojo));
        aviso.setText(mensaje);
      }
    };

    let textoBoton = this.textoOpciones[3][spanish];
    let colorBoton = AZUL;

    if (this.registro) {
      textoBoton = this.textoOpciones[4][spanish];
      colorBoton = VERDE;
    }

    this.boton(400, yBoton, 260, textoBoton, enviar, colorBoton);

    if (!this.registro) {
      const accesoInvitado = this.texto(
        400,
        abajoPanel + 36,
        this.textoOpciones[27][spanish],
        16
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });

      accesoInvitado.on("pointerover", () => {
        accesoInvitado.setColor(textoColor(COLORES.amarillo));
      });

      accesoInvitado.on("pointerout", () => {
        accesoInvitado.setColor(textoColor(COLORES.blanco));
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
