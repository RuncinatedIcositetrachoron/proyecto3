import Phaser from "phaser";
import { demo } from "./datosDemo";
import { obtenerNiveles, crearNivel, crearBoton } from "./niveles";
import type { LevelsScene } from "./levelsscene";
import type { NivelBackend } from "./api";
import { editorAApi } from "./parserApi";
import type { NivelEditor } from "./parserApi";

export function prepararNivelesOficiales(elegidos: NivelEditor[], usuario: string): NivelBackend[] {
  const resultado: NivelBackend[] = [];

  for (let i = 0; i < elegidos.length; i++) {
    const datos = editorAApi(elegidos[i], usuario);
    resultado.push({
      id: i + 1,
      nombre: datos.nombre,
      usuario: datos.usuario,
      elementos: datos.elementos,
      publicado: false,
      version: 0,
      usuariosQueCompletaron: [],
      descargas: [],
      cantidadDescargas: 0
    });
  }

  return resultado;
}

export function abrirExportacionOficiales(escena: LevelsScene): void {
  if (escena.exportacionAbierta) {
    return;
  }
  escena.exportacionAbierta = true;

  const usuario = demo.usuarioActual.nombre;
  const objetos: Phaser.GameObjects.GameObject[] = [];
  const activos: Phaser.GameObjects.GameObject[] = [];
  const campos: Phaser.GameObjects.DOMElement[] = [];
  const teclado = escena.input.keyboard;
  const centroX = escena.scale.width / 2;
  const centroY = escena.scale.height / 2;
  const ancho = Math.min(540, escena.scale.width - 40);
  const margen = 32;
  const anchoTexto = ancho - margen * 2;
  const nivelesPorPagina = 4;

  let niveles: NivelEditor[] = [];
  let seleccion: string[] = [];
  let linksNiveles: Phaser.GameObjects.Text[] = [];
  let paginaActual = 0;
  let abierto = true;
  let ocupado = false;

  for (const objeto of escena.children.list) {
    objeto.emit("ocultarTooltip");
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

  const titulo = texto(centroX, 0, "EXPORTAR NIVELES", 24, "#ffd166");
  const altoLista = nivelesPorPagina * 32;
  const alto = margen + titulo.displayHeight + 20 + altoLista +
    20 + 44 + 20 + 32 + 20 + 44 + margen;
  const arriba = centroY - alto / 2;
  titulo.setY(arriba + margen);
  const arribaLista = titulo.y + titulo.displayHeight + 20;

  objetos.push(titulo);
  objetos.push(escena.add.rectangle(centroX, centroY,
    escena.scale.width, escena.scale.height, 0x080b17, 0.72).setDepth(1000).setInteractive());
  objetos.push(escena.add.rectangle(centroX + 6, centroY + 6,
    ancho + 4, alto + 4, 0x080b17).setDepth(1001));
  objetos.push(escena.add.rectangle(centroX, centroY,
    ancho, alto, 0x171a2e).setStrokeStyle(4, 0xffd166).setDepth(1002));

  const anchoPagina = 124;
  const yPagina = arribaLista + altoLista + 20 + 22;
  const izquierda = centroX - anchoTexto / 2;
  const derecha = centroX + anchoTexto / 2;
  const botonAnterior = boton(izquierda + anchoPagina / 2, yPagina, anchoPagina - 4,
    "Anterior", () => {
      paginaActual--;
      mostrarNiveles();
    }, 0x95add6);
  const textoPagina = texto(centroX, yPagina, "", 16).setOrigin(0.5);
  const botonSiguiente = boton(derecha - anchoPagina / 2, yPagina, anchoPagina - 4,
    "Siguiente", () => {
      paginaActual++;
      mostrarNiveles();
    }, 0x95add6);

  const estado = texto(centroX, yPagina + 22 + 20, "", 14);
  objetos.push(textoPagina, estado);
  const anchoBoton = (anchoTexto - 40) / 3;
  const separacion = anchoBoton + 20;
  const y = arriba + alto - margen - 22;
  boton(centroX - separacion, y, anchoBoton - 4,
    "Cerrar", cerrar, 0xe57373);
  const botonCrear = boton(centroX, y, anchoBoton - 4,
    "Crear nivel", crear, 0x9ccc65);
  const botonExportar = boton(centroX + separacion, y, anchoBoton - 4,
    "Guardar", exportarJson, 0xffd166);

  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, cerrar);
  if (teclado) {
    teclado.on("keydown-ESC", cerrar);
  }

  try {
    niveles = obtenerNiveles();
    cargarSeleccion();
  } catch (error) {
    mostrarNiveles();
    estado.setText("No se pudieron cargar tus niveles: " + String(error));
    return;
  }
  if (niveles.length === 0) {
    objetos.push(texto(centroX, arribaLista + 64,
      "Todavia no tenes niveles.", 18).setOrigin(0.5));
  }
  mostrarNiveles();

  function texto(x: number, y: number, valor: string, tamano: number, color = "#cbdbfc") {
    return escena.add.text(x, y, valor, {
      fontFamily: "Fuente", fontSize: tamano + "px", color: color,
      align: "center", wordWrap: { width: anchoTexto }
    }).setOrigin(0.5, 0).setDepth(1003);
  }

  function boton(x: number, y: number, ancho: number, titulo: string,
    accion: () => void, color: number) {
    const inicio = escena.children.list.length;
    const fondo = crearBoton(escena, x, y, ancho, titulo, accion);
    // crearBoton agrega sombra, fondo y texto en ese orden.
    const sombra = escena.children.list[inicio] as Phaser.GameObjects.Rectangle;
    const etiqueta = escena.children.list[inicio + 2] as Phaser.GameObjects.Text;
    objetos.push(sombra, fondo, etiqueta);
    sombra.setFillStyle(0x080b17);
    sombra.setDepth(1003);
    fondo.setDepth(1004);
    fondo.removeAllListeners("pointerover");
    fondo.removeAllListeners("pointerout");
    fondo.setFillStyle(color);
    fondo.on("pointerover", () => { fondo.setAlpha(0.8); });
    fondo.on("pointerout", () => { fondo.setAlpha(1); });

    etiqueta.setFontSize(18).setWordWrapWidth(ancho - 16).setAlign("center").setDepth(1005);
    return fondo;
  }

  function cargarSeleccion() {
    try {
      const ids = JSON.parse(localStorage.getItem("seleccionOficiales:" + usuario) || "[]");
      if (!Array.isArray(ids)) {
        return;
      }
      for (const id of ids) {
        const nivel = niveles.find(nivel => nivel.id === id);
        if (nivel && seleccion.indexOf(id) === -1) {
          seleccion.push(id);
        }
      }
    } catch {
      seleccion = [];
    }
  }

  function mostrarNiveles() {
    for (const link of linksNiveles) {
      link.destroy();
    }
    linksNiveles = [];

    const primero = paginaActual * nivelesPorPagina;
    const ultimo = Math.min(primero + nivelesPorPagina, niveles.length);
    for (let i = primero; i < ultimo; i++) {
      const nivel = niveles[i];
      const posicion = seleccion.indexOf(nivel.id);
      let titulo = nivel.nombre;
      let color = "#cbdbfc";
      if (posicion !== -1) {
        titulo = "Nivel " + (posicion + 1) + " - " + nivel.nombre;
        color = "#9ccc65";
      }
      const x = centroX - ancho / 2 + margen;
      const y = arribaLista + 16 + (i - primero) * 32;
      const link = texto(x, y, titulo, 18, color);
      link.setOrigin(0, 0.5);
      link.setAlign("left");
      link.setInteractive({ useHandCursor: true });
      link.on("pointerover", () => { link.setColor("#ffd166"); });
      link.on("pointerout", () => { link.setColor(color); });
      link.on("pointerdown", () => { cambiarSeleccion(nivel.id); });
      linksNiveles.push(link);
    }

    const paginas = Math.max(1, Math.ceil(niveles.length / nivelesPorPagina));
    textoPagina.setText((paginaActual + 1) + " / " + paginas);
    estado.setText(seleccion.length + " niveles seleccionados.");
    actualizarBotones();
  }

  function cambiarSeleccion(id: string) {
    if (ocupado) {
      return;
    }
    if (seleccion.indexOf(id) === -1) {
      seleccion.push(id);
    } else {
      seleccion = seleccion.filter(nivelId => nivelId !== id);
    }
    mostrarNiveles();
  }

  function habilitar(boton: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text, activo: boolean) {
    if (activo) {
      boton.setInteractive({ useHandCursor: true });
      boton.setAlpha(1);
    } else {
      boton.disableInteractive();
      boton.setAlpha(0.35);
    }
  }

  function actualizarBotones() {
    const activo = !ocupado;
    habilitar(botonExportar, activo && seleccion.length > 0);
    habilitar(botonCrear, activo);
    habilitar(botonAnterior, activo && paginaActual > 0);
    const hayMas = (paginaActual + 1) * nivelesPorPagina < niveles.length;
    habilitar(botonSiguiente, activo && hayMas);
    for (const link of linksNiveles) {
      habilitar(link, activo);
    }
  }

  function generarJson(): string {
    const elegidos: NivelEditor[] = [];
    for (const id of seleccion) {
      for (const nivel of niveles) {
        if (nivel.id === id) {
          elegidos.push(nivel);
          break;
        }
      }
    }
    const oficiales = prepararNivelesOficiales(elegidos, usuario);
    return JSON.stringify(oficiales, null, 2) + "\n";
  }

  async function exportarJson() {
    if (ocupado || seleccion.length === 0) {
      return;
    }
    const navegador: any = window;
    if (typeof navegador.showSaveFilePicker !== "function") {
      estado.setText("Este navegador no permite exportar archivos.");
      return;
    }

    ocupado = true;
    actualizarBotones();
    let mensaje = "JSON exportado.";
    try {
      const contenido = generarJson();
      const archivo = await navegador.showSaveFilePicker({
        suggestedName: "nivelesExportados.json",
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
      });
      if (!abierto) {
        return;
      }
      const escritura = await archivo.createWritable();
      await escritura.write(contenido);
      await escritura.close();
      if (!abierto) {
        return;
      }
      localStorage.setItem("seleccionOficiales:" + usuario, JSON.stringify(seleccion));
    } catch (error: any) {
      if (error.name === "AbortError") {
        mensaje = "Exportacion cancelada.";
      } else {
        mensaje = "No se pudo exportar: " + String(error);
      }
    }
    if (!abierto) {
      return;
    }
    estado.setText(mensaje);
    ocupado = false;
    actualizarBotones();
  }

  async function crear() {
    if (ocupado) {
      return;
    }
    try {
      const nivel = await crearNivel(9, 15);
      cerrar();
      escena.scene.start("editor", { nivelId: nivel.id });
    } catch (error: any) {
      estado.setText("No se pudo crear el nivel: " + String(error));
    }
  }

  function cerrar() {
    if (!abierto) {
      return;
    }
    abierto = false;
    escena.exportacionAbierta = false;
    escena.events.off(Phaser.Scenes.Events.SHUTDOWN, cerrar);
    if (teclado) {
      teclado.off("keydown-ESC", cerrar);
    }
    for (const objeto of activos) {
      if (objeto.scene && objeto.input) {
        objeto.input.enabled = true;
      }
    }
    for (const campo of campos) {
      if (campo.scene) {
        campo.setVisible(true);
      }
    }
    for (const link of linksNiveles) {
      link.destroy();
    }
    for (const objeto of objetos) {
      if (objeto.scene) {
        objeto.destroy();
      }
    }
  }
}
