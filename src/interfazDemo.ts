import { COLORES, colorTexto } from "./colores";
import Phaser from 'phaser';
import { spanish } from "./configs";
import { crearBoton } from './niveles';

export const VERDE = COLORES.verde;
export const ROJO = COLORES.rojo;
export const NORMAL = COLORES.normal;

export class InterfazDemo extends Phaser.Scene {
  limpiar() {

    for (let i = this.children.list.length - 1; i >= 0; i--) {
      const objeto = this.children.list[i];
      if (objeto.type === 'DOMElement') {
        objeto.destroy();
      }
    }
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor(colorTexto(COLORES.fondo));
  }
  texto(
    x: number,
    y: number,
    valor: string,
    tamano = 18
  ) {
    const texto = this.add.text(x, y, valor, {
      padding: { top: 6, bottom: 6 },
      fontFamily: 'Fuente',
      fontSize: tamano + 'px',
      color: colorTexto(COLORES.blanco),
      wordWrap: { width: 730 }
    });
    return texto;
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
    const fondo = crearBoton(
      this,
      x,
      y,
      ancho,
      titulo,
      accion,
    );
  
    if (!habilitado) {
      fondo.disableInteractive();
      fondo.setFillStyle(COLORES.desactivadoAlternativo);
    }
  
    return fondo;
  }
  confirmar(
    titulo: string,
    mensaje: string,
    aceptar: () => void,
    cancelar: () => void
  ) {
    const textoOpciones: string[][] = [
      ["Cancel", "Cancelar"],
      ["Confirm", "Confirmar"]
    ];
    for (const objeto of this.children.list) {
      objeto.emit('ocultarTooltip');
      if (objeto.input) {
        objeto.disableInteractive();
      }
      if (objeto.type === 'DOMElement') {
        objeto.setVisible(false);
      }
    }
    this.add.rectangle(
      400,
      300,
      800,
      600,
      COLORES.negro,
      0.7
    ).setInteractive();
    this.add.rectangle(
      400,
      300,
      710,
      250,
      COLORES.panel
    ).setStrokeStyle(3, NORMAL);
    this.texto(
      75,
      200,
      titulo,
      24
    );
    const textoMensaje = this.texto(
      75,
      252,
      mensaje,
      17
    );
    textoMensaje.setWordWrapWidth(650);
    this.boton(
      250,
      365,
      220,
      textoOpciones[0][spanish],
      cancelar
    );
    this.boton(
      550,
      365,
      220,
      textoOpciones[1][spanish],
      aceptar,
      VERDE
    );
  }
}