import { InterfazDemo } from "./interfazDemo";
import { demo } from "./datosDemo";
import { crearCampoTexto } from "./camposTexto";

export class UsuariosDemoScene extends InterfazDemo {

  registro = false;

  constructor() {
    super("usuariosDemo");
  }

  create() {
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

    let yLogin = 173;
    let altoLogin = 54;
    let colorLogin = AZUL;

    if (this.registro) {
      yLogin = 178;
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

    let yRegistro = 173;
    let altoRegistro = 54;
    let colorRegistro = VERDE;

    if (!this.registro) {
      yRegistro = 178;
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
      360,
      600,
      320,
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
      240,
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
      275,
      "Nombre de usuario",
      16
    );

    const campoNombre = crearCampoTexto(
      this,
      200,
      315,
      400,
      "Usuario",
      40,
      () => {}
    );

    const nombre = campoNombre.input;

    this.texto(
      200,
      350,
      "Contraseña",
      16
    );

    const campoClave = crearCampoTexto(
      this,
      200,
      390,
      400,
      "Contraseña",
      40,
      () => {}
    );

    const clave = campoClave.input;

    clave.type = "password";

    const aviso = this.texto(
      400,
      430,
      "",
      15
    );

    aviso.setOrigin(0.5);

    const enviar = () => {

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

      const encontrado = demo.usuarios.find(usuario => {

        return usuario.nombre.toLowerCase() ===
          nombreEscrito.toLowerCase();
      });

      if (this.registro) {

        if (encontrado) {

          aviso.setText(
            "Ese nombre de usuario ya está ocupado."
          );

          return;
        }

        let nuevoId = 1;

        for (const usuario of demo.usuarios) {

          if (usuario.id >= nuevoId) {
            nuevoId = usuario.id + 1;
          }
        }

        const usuario = {
          id: nuevoId,
          nombre: nombreEscrito,
          contrasena: claveEscrita
        };

        demo.usuarios.push(usuario);
        demo.usuarioActual = usuario;

      } else {

        if (!encontrado) {

          aviso.setText(
            "Usuario o contraseña incorrectos."
          );

          return;
        }

        if (
          encontrado.contrasena !==
          claveEscrita
        ) {

          aviso.setText(
            "Usuario o contraseña incorrectos."
          );

          return;
        }

        demo.usuarioActual = encontrado;
      }

      this.scene.start(
        "communityDemo"
      );
    };

    let textoBoton = "ENTRAR";
    let colorBoton = AZUL;

    if (this.registro) {
      textoBoton = "CREAR CUENTA";
      colorBoton = VERDE;
    }

    this.boton(
      400,
      485,
      260,
      textoBoton,
      enviar,
      colorBoton
    );

    nombre.addEventListener(
      "keydown",
      evento => {

        if (evento.key === "Enter") {
          enviar();
        }
      }
    );

    clave.addEventListener(
      "keydown",
      evento => {

        if (evento.key === "Enter") {
          enviar();
        }
      }
    );
  }
}