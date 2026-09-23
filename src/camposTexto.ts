import Phaser from "phaser";

export const MAX_NOMBRE_NIVEL = 24;
export const MAX_BUSQUEDA = 40;

const CARACTERES_PERMITIDOS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
  "ÑñÁáÉéÍíÓóÚúÝý" +
    "0123456789" +
  " <>.,/?'\":;{}[]()|\\+=-_*&^%$#@!~`";

export function filtrarTexto(texto: string, limite: number): string {
  texto = texto.normalize("NFC");
  let resultado = "";
  for (let i = 0; i < texto.length; i++) {
    if (resultado.length >= limite) {
      break;
    }
    const caracter = texto[i];
    if (CARACTERES_PERMITIDOS.includes(caracter)) {
      resultado = resultado + caracter;
    }
  }
  return resultado;
}

export function crearCampoTexto(
  escena: Phaser.Scene,
  x: number,
  y: number,
  ancho: number,
  etiqueta: string,
  limite: number,
  cambiar: (valor: string) => void): {
  input: HTMLInputElement;
  objeto: Phaser.GameObjects.DOMElement;
} {
  const input = document.createElement("input");

  input.type = "text";
  input.maxLength = limite;
  input.placeholder = etiqueta;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.title = "Maximo " + limite + " caracteres de la fuente";

  input.setAttribute("aria-label", etiqueta);
  input.setAttribute("autocapitalize", "off");

  input.style.boxSizing = "border-box";
  input.style.width = ancho + "px";
  input.style.height = "38px";
  input.style.border = "2px solid #cbdbfc";
  input.style.backgroundColor = "#171a2e";
  input.style.color = "#cbdbfc";
  input.style.fontFamily = "Fuente, monospace";
  input.style.fontSize = "16px";
  input.style.paddingLeft = "8px";
  input.style.paddingRight = "8px";
  input.style.outline = "none";

  const objeto = escena.add.dom(x, y, input);

  objeto.setOrigin(0, 0.5);
  objeto.setDepth(50);

  let componiendo = false;

  function limpiar(): void {
    const original = input.value;

    let posicion = original.length;

    if (input.selectionStart !== null) {
      posicion = input.selectionStart;
    }

    const limpio = filtrarTexto(original, limite);

    if (limpio !== original) {
      const antesDelCursor = original.substring(0, posicion);
      const textoAnteriorLimpio = filtrarTexto(antesDelCursor, limite);
      const nuevaPosicion = textoAnteriorLimpio.length;

      input.value = limpio;
      input.setSelectionRange(nuevaPosicion, nuevaPosicion);
    }

    cambiar(input.value);
  }

  input.addEventListener("compositionstart", () => {
    componiendo = true;
  });

  input.addEventListener("compositionend", () => {
    componiendo = false;
    limpiar();
  });

  input.addEventListener("input", () => {
    if (componiendo === false) {
      limpiar();
    }
  });

  input.addEventListener("focus", () => {
    input.style.borderColor = "#ffd166";
  });

  input.addEventListener("blur", () => {
    input.style.borderColor = "#cbdbfc";
  });

  const eventos = [
    "keydown",
    "keyup",
    "keypress",
    "pointerdown",
    "pointerup",
    "pointermove",
  ];

  for (const nombreEvento of eventos) {
    input.addEventListener(nombreEvento, (evento) => {
      evento.stopPropagation();
    });
  }

  return {
    input: input,
    objeto: objeto,
  };
}