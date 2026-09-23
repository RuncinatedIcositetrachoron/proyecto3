import Phaser from 'phaser';
import { crearBoton } from './niveles';

export const VERDE = 0x9ccc65;
export const ROJO = 0xe57373;
export const NORMAL = 0xcbdbfc;

export class InterfazDemo extends Phaser.Scene {
  limpiar() {

    for (let i = this.children.list.length - 1; i >= 0; i--) {
      const objeto = this.children.list[i];
      if (objeto.type === 'DOMElement') {
        objeto.destroy();
      }
    }
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#222034');
  }
  texto(
    x: number,
    y: number,
    valor: string,
    tamano = 18
  ) {
    const texto = this.add.text(x, y, valor, {
      fontFamily: 'Fuente',
      fontSize: tamano + 'px',
      color: '#cbdbfc',
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
      fondo.setFillStyle(0x999999);
    }
  
    return fondo;
  }
  confirmar(
    titulo: string,
    mensaje: string,
    aceptar: () => void,
    cancelar: () => void
  ) {
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
      0x000000,
      0.7
    ).setInteractive();
    this.add.rectangle(
      400,
      300,
      710,
      250,
      0x171a2e
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
      'Cancelar',
      cancelar
    );
    this.boton(
      550,
      365,
      220,
      'Aceptar',
      aceptar,
      VERDE
    );
  }
}