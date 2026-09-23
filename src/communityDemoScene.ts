import Phaser from "phaser";

import { InterfazDemo, VERDE, ROJO, NORMAL } from "./interfazDemo";
import { demo } from "./datosDemo";
import { obtenerNiveles, crearBoton } from "./niveles";
import { crearCampoTexto, MAX_BUSQUEDA } from "./camposTexto";

type Pestana = "Community" | "Creados" | "Publicados" | "Descargados";

export class CommunityDemoScene extends InterfazDemo {

  pestana: Pestana = "Community";
  busqueda = "";
  pagina = 0;

  filas: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("communityDemo");
  }

  boton(
    x: number,
    y: number,
    ancho: number,
    titulo: string,
    accion: () => void,
    color = NORMAL,
    habilitado = true
  ) {

    const fondo = crearBoton(this, x, y, ancho, titulo, accion);

    fondo.removeAllListeners("pointerover");
    fondo.removeAllListeners("pointerout");
    fondo.setFillStyle(color);

    if (habilitado === false) {
      fondo.disableInteractive(true);
      fondo.removeAllListeners("pointermove");
      fondo.removeAllListeners("pointerdown");
      fondo.removeAllListeners("pointerup");
      fondo.setAlpha(0.35);
      return;
    }

    fondo.on("pointerover", () => fondo.setAlpha(0.8));
    fondo.on("pointerout", () => fondo.setAlpha(1));
  }

  create() {

    if (!demo.usuarioActual) {
      this.scene.start("usuariosDemo");
      return;
    }

    this.pestana = "Community";
    this.busqueda = "";
    this.pagina = 0;

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

    const objetos = [...this.children.list];

    for (const objeto of objetos) {

      if (objeto.scene) {
        objeto.disableInteractive(true);
        objeto.destroy();
      }
    }

    this.limpiar();
    this.filas = [];

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    this.texto(
      400,
      25,
      "COMMUNITY LEVELS",
      26
    ).setOrigin(0.5, 0);

    const pestanas: {
      nombre: Pestana;
      color: number;
      colorHover: number;
      colorInactivo: number;
    }[] = [
      {
        nombre: "Community",
        color: 0x95add6,
        colorHover: 0xaec1e1,
        colorInactivo: 0x6f87b0
      },
      {
        nombre: "Creados",
        color: 0x9ccc65,
        colorHover: 0xb0d782,
        colorInactivo: 0x73994b
      },
      {
        nombre: "Publicados",
        color: 0xe6c56a,
        colorHover: 0xf0d58b,
        colorInactivo: 0xad934d
      },
      {
        nombre: "Descargados",
        color: 0xb39ddb,
        colorHover: 0xc7b5e7,
        colorInactivo: 0x8573a6
      }
    ];

    let colorActual = 0x95add6;

    for (let i = 0; i < pestanas.length; i++) {

      const pestana = pestanas[i];
      const activa = this.pestana === pestana.nombre;

      let y = 108;
      let alto = 44;
      let color = pestana.colorInactivo;

      if (activa) {
        y = 103;
        alto = 54;
        color = pestana.color;
        colorActual = pestana.color;
      }

      this.crearTab(
        145 + i * 170,
        y,
        170,
        alto,
        pestana.nombre,
        color,
        pestana.colorHover,
        activa,
        () => {
          this.pestana = pestana.nombre;
          this.pagina = 0;
          this.dibujar();
        }
      );
    }

    this.add.rectangle(
      400,
      345,
      720,
      430,
      0x171a2e
    ).setStrokeStyle(
      4,
      colorActual
    );

    const campo = crearCampoTexto(
      this,
      60,
      170,
      680,
      "Buscar por ID, autor o nombre",
      MAX_BUSQUEDA,
      (valor) => {
        this.busqueda = valor;
        this.pagina = 0;
        this.dibujarFilas();
      }
    );

    campo.input.value = this.busqueda;

    this.dibujarFilas();
  }

  dibujarFilas() {

    for (const objeto of this.filas) {

      if (objeto.scene) {
        objeto.emit("ocultarTooltip");
        objeto.disableInteractive(true);
        objeto.destroy();
      }
    }

    this.filas = [];

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    const objetosAntes = new Set(this.children.list);

    if (this.pestana === "Creados") {
      this.mostrarCreados();
    }

    if (this.pestana === "Community") {
      this.mostrarCommunity();
    }

    if (this.pestana === "Publicados") {
      this.mostrarPublicados();
    }

    if (this.pestana === "Descargados") {
      this.mostrarDescargados();
    }

    this.filas = this.children.list.filter(objeto => {
      return objetosAntes.has(objeto) === false;
    });
  }

  mostrarCreados() {

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    let niveles = obtenerNiveles();

    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta !== "") {

      niveles = niveles.filter(nivel => {

        if (nivel.nombre.toLowerCase().includes(consulta)) {
          return true;
        }

        if (String(nivel.id) === consulta) {
          return true;
        }

        return false;
      });
    }

    const paginas = this.calcularPaginas(niveles.length);

    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;

    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No hay niveles creados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(
        400,
        y + 7,
        680,
        80,
        0x171a2e
      );

      this.texto(
        80,
        y - 20,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y + 8,
        "ID " + nivel.id,
        14
      ).setColor("#a5b4ce");

      const publicado = demo.niveles.some(publicacion => {

        if (publicacion.autorId !== usuario.id) {
          return false;
        }

        if (!publicacion.publicado) {
          return false;
        }

        return publicacion.nombre === nivel.nombre;
      });

      if (publicado) {

        this.boton(
          630,
          y + 7,
          180,
          "Publicado",
          () => {},
          NORMAL,
          false
        );

      } else {

        this.boton(
          630,
          y + 7,
          180,
          "Publicar",
          () => {

            this.confirmar(
              "¿Publicar este nivel?",
              "Aparecerá en Community y en Publicados.",
              () => {

                let nuevoId = 1;

                for (const publicacion of demo.niveles) {

                  if (publicacion.id >= nuevoId) {
                    nuevoId = publicacion.id + 1;
                  }
                }

                demo.niveles.push({
                  id: nuevoId,
                  nombre: nivel.nombre,
                  autorId: usuario.id,
                  autor: usuario.nombre,
                  version: 1,
                  publicado: true,
                  descargas: 0
                });

                this.pestana = "Publicados";
                this.pagina = 0;

                this.dibujar();
              },
              () => {
                this.dibujar();
              }
            );
          },
          VERDE
        );
      }
    }

    this.paginacion(paginas);
  }

  mostrarCommunity() {

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    let niveles = demo.niveles.filter(nivel => {
      return nivel.publicado;
    });

    niveles = this.buscarPublicaciones(niveles);

    niveles.sort((a, b) => {

      if (a.descargas > b.descargas) {
        return -1;
      }

      if (a.descargas < b.descargas) {
        return 1;
      }

      return 0;
    });

    const paginas = this.calcularPaginas(niveles.length);

    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;

    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No hay niveles publicados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(
        400,
        y + 7,
        680,
        80,
        0x171a2e
      );

      this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y,
        "ID " + nivel.id +
        " · " + nivel.autor,
        14
      ).setColor("#a5b4ce");

      this.texto(
        80,
        y + 23,
        nivel.descargas + " descargas",
        14
      ).setColor("#a5b4ce");

      const descargado = demo.descargas.some(descarga => {

        return descarga.usuarioId === usuario.id &&
          descarga.nivelId === nivel.id;
      });

      let textoBoton = "Descargar";

      if (descargado) {
        textoBoton = "Descargado";
      }

      this.boton(
        630,
        y + 7,
        180,
        textoBoton,
        () => {

          demo.descargas.push({
            usuarioId: usuario.id,
            nivelId: nivel.id,
            nombre: nivel.nombre,
            autor: nivel.autor,
            version: nivel.version,
            completado: false
          });

          nivel.descargas++;

          this.dibujarFilas();
        },
        VERDE,
        !descargado
      );
    }

    this.paginacion(paginas);
  }

  mostrarPublicados() {

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    let niveles = demo.niveles.filter(nivel => {

      return nivel.autorId === usuario.id &&
        nivel.publicado;
    });

    niveles = this.buscarPublicaciones(niveles);

    const paginas = this.calcularPaginas(niveles.length);

    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;

    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No tenés niveles publicados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(
        400,
        y + 7,
        680,
        80,
        0x171a2e
      );

      this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y,
        "ID " + nivel.id,
        14
      ).setColor("#a5b4ce");

      this.texto(
        80,
        y + 23,
        nivel.descargas + " descargas",
        14
      ).setColor("#a5b4ce");

      this.boton(
        630,
        y + 7,
        180,
        "Despublicar",
        () => {

          nivel.publicado = false;

          this.pestana = "Creados";
          this.pagina = 0;

          this.dibujar();
        },
        ROJO
      );
    }

    this.paginacion(paginas);
  }

  mostrarDescargados() {

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    let niveles = demo.descargas.filter(descarga => {
      return descarga.usuarioId === usuario.id;
    });

    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta !== "") {

      niveles = niveles.filter(nivel => {

        if (String(nivel.nivelId) === consulta) {
          return true;
        }

        if (nivel.nombre.toLowerCase().includes(consulta)) {
          return true;
        }

        if (nivel.autor.toLowerCase().includes(consulta)) {
          return true;
        }

        return false;
      });
    }

    const paginas = this.calcularPaginas(niveles.length);

    this.corregirPagina(paginas);

    const inicio = this.pagina * 3;
    const fin = inicio + 3;

    const visibles = niveles.slice(inicio, fin);

    if (visibles.length === 0) {
      this.texto(
        400,
        345,
        "No tenés niveles descargados."
      ).setOrigin(0.5);
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 238 + i * 100;

      this.add.rectangle(
        400,
        y + 7,
        680,
        80,
        0x171a2e
      );

      this.texto(
        80,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        80,
        y,
        "ID " + nivel.nivelId +
        " · " + nivel.autor,
        14
      ).setColor("#a5b4ce");

      let estado = "Sin completar";

      if (nivel.completado) {
        estado = "Completado";
      }

      this.texto(
        80,
        y + 23,
        estado,
        14
      ).setColor("#a5b4ce");

      const original = demo.niveles.find(publicacion => {

        return publicacion.id === nivel.nivelId &&
          publicacion.publicado;
      });

      let hayActualizacion = false;

      if (original) {

        if (original.version > nivel.version) {
          hayActualizacion = true;
        }
      }

      let textoBoton = "Jugar";

      if (hayActualizacion) {
        textoBoton = "Actualizar";
      }

      this.boton(
        475,
        y + 7,
        150,
        textoBoton,
        () => {

          if (hayActualizacion && original) {

            nivel.nombre = original.nombre;
            nivel.autor = original.autor;
            nivel.version = original.version;
            nivel.completado = false;

            this.dibujarFilas();

            return;
          }

          this.confirmar(
            "Partida de prueba",
            "¿Querés marcar este nivel como completado?",
            () => {

              nivel.completado = true;

              this.dibujar();
            },
            () => {
              this.dibujar();
            }
          );
        },
        VERDE
      );

      this.boton(
        640,
        y + 7,
        160,
        "Desinstalar",
        () => {

          demo.descargas = demo.descargas.filter(descarga => {

            return descarga.usuarioId !== usuario.id ||
              descarga.nivelId !== nivel.nivelId;
          });

          this.dibujarFilas();
        },
        ROJO
      );
    }

    this.paginacion(paginas);
  }

  buscarPublicaciones(niveles: typeof demo.niveles) {

    const consulta = this.busqueda.trim().toLowerCase();

    if (consulta === "") {
      return niveles;
    }

    return niveles.filter(nivel => {

      if (String(nivel.id) === consulta) {
        return true;
      }

      if (nivel.nombre.toLowerCase().includes(consulta)) {
        return true;
      }

      if (nivel.autor.toLowerCase().includes(consulta)) {
        return true;
      }

      return false;
    });
  }

  calcularPaginas(cantidad: number) {

    let paginas = Math.ceil(cantidad / 3);

    if (paginas === 0) {
      paginas = 1;
    }

    return paginas;
  }

  corregirPagina(paginas: number) {

    if (this.pagina < 0) {
      this.pagina = 0;
    }

    if (this.pagina >= paginas) {
      this.pagina = paginas - 1;
    }
  }

  paginacion(paginas: number) {

    this.boton(
      150,
      520,
      180,
      "Anterior",
      () => {
        this.pagina--;
        this.dibujarFilas();
      },
      NORMAL,
      this.pagina > 0
    );

    this.texto(
      400,
      520,
      "Página " + (this.pagina + 1) + " / " + paginas,
      16
    ).setOrigin(0.5);

    this.boton(
      650,
      520,
      180,
      "Siguiente",
      () => {
        this.pagina++;
        this.dibujarFilas();
      },
      NORMAL,
      this.pagina < paginas - 1
    );
  }
}
