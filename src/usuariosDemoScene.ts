import { InterfazDemo, VERDE, NORMAL } from "./interfazDemo";
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

  dibujar() {

    this.limpiar();

    this.texto(
      70,
      50,
      "USUARIOS",
      30
    );

    // RECTANGULO PRINCIPAL

    this.add.rectangle(
      400,
      355,
      600,
      330,
      0x171a2e
    ).setStrokeStyle(
      4,
      0xcbdbfc
    );

    // COLORES DE LAS PESTAÑAS

    let colorEntrar = NORMAL;
    let colorCrear = NORMAL;

    if (this.registro) {
      colorCrear = VERDE;
    } else {
      colorEntrar = VERDE;
    }

    // PESTAÑA INICIAR SESION

    this.boton(
      275,
      175,
      250,
      "Iniciar sesión",
      () => {

        this.registro = false;
        this.dibujar();
      },
      colorEntrar
    );

    // PESTAÑA CREAR CUENTA

    this.boton(
      525,
      175,
      250,
      "Crear cuenta",
      () => {

        this.registro = true;
        this.dibujar();
      },
      colorCrear
    );

    // NOMBRE

    this.texto(
      200,
      230,
      "Nombre de usuario",
      16
    );

    const campoNombre = crearCampoTexto(
      this,
      200,
      275,
      400,
      "Usuario",
      40,
      () => {}
    );

    const nombre = campoNombre.input;

    // CONTRASEÑA

    this.texto(
      200,
      315,
      "Contraseña",
      16
    );

    const campoClave = crearCampoTexto(
      this,
      200,
      360,
      400,
      "Contraseña",
      40,
      () => {}
    );

    const clave = campoClave.input;

    clave.type = "password";

    // MENSAJE

    const aviso = this.texto(
      200,
      405,
      "",
      16
    );

    // ENVIAR

    const enviar = () => {

      const nombreEscrito =
        nombre.value.trim();

      const claveEscrita =
        clave.value;

      if (
        nombreEscrito === "" ||
        claveEscrita === ""
      ) {

        aviso.setText(
          "Completá usuario y contraseña."
        );

        return;
      }

      const encontrado =
        demo.usuarios.find(usuario => {

          return usuario.nombre.toLowerCase() ===
            nombreEscrito.toLowerCase();
        });

      // CREAR CUENTA

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
      }

      // INICIAR SESION

      else {

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

    // TEXTO DEL BOTON

    let textoBoton = "Entrar";

    if (this.registro) {
      textoBoton = "Crear y entrar";
    }

    this.boton(
      400,
      470,
      260,
      textoBoton,
      enviar,
      VERDE
    );

    // ENTER

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