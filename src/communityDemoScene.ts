import Phaser from "phaser";

import { InterfazDemo, VERDE, ROJO, NORMAL } from "./interfazDemo";
import { demo } from "./datosDemo";
import { obtenerNiveles } from "./niveles";
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

  dibujar() {

    this.limpiar();
    this.filas = [];

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    this.texto(
      30,
      25,
      "COMMUNITY LEVELS",
      26
    );

    this.texto(
      30,
      64,
      "Usuario: " + usuario.nombre,
      16
    );

    this.boton(
      685,
      50,
      180,
      "Cerrar sesión",
      () => {
        demo.usuarioActual = null;
        this.scene.start("usuariosDemo");
      },
      ROJO
    );

    const pestanas: Pestana[] = [
      "Community",
      "Creados",
      "Publicados",
      "Descargados"
    ];

    for (let i = 0; i < pestanas.length; i++) {

      const pestana = pestanas[i];

      let color = NORMAL;

      if (this.pestana === pestana) {
        color = VERDE;
      }

      this.boton(
        105 + i * 196,
        125,
        180,
        pestana,
        () => {
          this.pestana = pestana;
          this.pagina = 0;
          this.dibujar();
        },
        color
      );
    }

    const campo = crearCampoTexto(
      this,
      30,
      183,
      740,
      "Buscar por ID, autor o nombre",
      MAX_BUSQUEDA,
      (valor) => {
        this.busqueda = valor;
        this.pagina = 0;
        this.dibujarFilas();
      }
    );

    campo.input.value = this.busqueda;

    this.texto(
      30,
      570,
      "Demo: recargar reinicia usuarios, publicaciones y descargas.",
      14
    );

    this.dibujarFilas();
  }

  dibujarFilas() {

    for (const objeto of this.filas) {
      objeto.destroy();
    }

    this.filas = [];

    const usuario = demo.usuarioActual;

    if (!usuario) {
      return;
    }

    const cantidadAntes = this.children.list.length;

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

    this.filas = this.children.list.slice(cantidadAntes);
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
        40,
        260,
        "No hay niveles creados."
      );
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 260 + i * 96;

      this.add.rectangle(
        400,
        y + 7,
        740,
        86,
        0x171a2e
      );

      this.texto(
        42,
        y - 20,
        nivel.nombre,
        19
      );

      this.texto(
        42,
        y + 8,
        "ID " + nivel.id,
        14
      );

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
          655,
          y + 7,
          200,
          "Publicado",
          () => {},
          NORMAL,
          false
        );

      } else {

        this.boton(
          655,
          y + 7,
          200,
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
        40,
        260,
        "No hay niveles publicados."
      );
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 260 + i * 96;

      this.add.rectangle(
        400,
        y + 7,
        740,
        86,
        0x171a2e
      );

      this.texto(
        42,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        42,
        y,
        "ID " + nivel.id +
        " · " + nivel.autor +
        " · v" + nivel.version,
        14
      );

      this.texto(
        42,
        y + 23,
        nivel.descargas + " descargas",
        14
      );

      const descargado = demo.descargas.some(descarga => {

        return descarga.usuarioId === usuario.id &&
          descarga.nivelId === nivel.id;
      });

      let textoBoton = "Descargar";

      if (descargado) {
        textoBoton = "Descargado";
      }

      this.boton(
        655,
        y + 7,
        200,
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
        40,
        260,
        "No tenés niveles publicados."
      );
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 260 + i * 96;

      this.add.rectangle(
        400,
        y + 7,
        740,
        86,
        0x171a2e
      );

      this.texto(
        42,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        42,
        y,
        "ID " + nivel.id +
        " · v" + nivel.version,
        14
      );

      this.texto(
        42,
        y + 23,
        nivel.descargas + " descargas",
        14
      );

      this.boton(
        655,
        y + 7,
        200,
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
        40,
        260,
        "No tenés niveles descargados."
      );
    }

    for (let i = 0; i < visibles.length; i++) {

      const nivel = visibles[i];
      const y = 260 + i * 96;

      this.add.rectangle(
        400,
        y + 7,
        740,
        86,
        0x171a2e
      );

      this.texto(
        42,
        y - 26,
        nivel.nombre,
        19
      );

      this.texto(
        42,
        y,
        "ID " + nivel.nivelId +
        " · " + nivel.autor +
        " · v" + nivel.version,
        14
      );

      let estado = "Sin completar";

      if (nivel.completado) {
        estado = "Completado";
      }

      this.texto(
        42,
        y + 23,
        estado,
        14
      );

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
        655,
        y + 7,
        200,
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
      120,
      535,
      170,
      "Anterior",
      () => {
        this.pagina--;
        this.dibujarFilas();
      },
      NORMAL,
      this.pagina > 0
    );

    this.texto(
      310,
      526,
      "Página " + (this.pagina + 1) + " / " + paginas,
      16
    );

    this.boton(
      680,
      535,
      170,
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