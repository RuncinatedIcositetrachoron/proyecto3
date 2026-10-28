import type Phaser from "phaser";
import { obtenerConfiguracion, guardarConfiguracion } from "./api";
import { spanish, establecerIdioma } from "./configs";
import { setVolumenMusica } from "./music";

export const ajustes = { musica: 1, efectos: 1 };
const CLAVE_INVITADO = "LindseysLasersOpcionesInvitado";
let temaCargado = "Dark";
let usuarioCargado = "";
let numeroCarga = 0;

export function aplicarVolumenMusica(_escena: Phaser.Scene): void {
  setVolumenMusica(ajustes.musica);
}

export function ajustesCargados(nombre: string, invitado: boolean): boolean {
  const clave = (invitado ? "invitado:" : "usuario:") + nombre;
  return usuarioCargado === clave;
}

export async function cargarAjustes(nombre: string, invitado: boolean): Promise<void> {
  const clave = (invitado ? "invitado:" : "usuario:") + nombre;
  if (usuarioCargado === clave) return;

  const cargaActual = ++numeroCarga;
  ajustes.musica = 1;
  ajustes.efectos = 1;
  temaCargado = "Dark";
  establecerIdioma(0);

  if (invitado) {
    const guardado = localStorage.getItem(CLAVE_INVITADO);

    if (guardado !== null) {
      const datos = JSON.parse(guardado);
      if (typeof datos.musica === "number") ajustes.musica = datos.musica;
      if (typeof datos.efectos === "number") ajustes.efectos = datos.efectos;
      if (datos.idioma === 0 || datos.idioma === 1) establecerIdioma(datos.idioma);
    }
  } else {
    try {
      const config = await obtenerConfiguracion(nombre);
      if (cargaActual !== numeroCarga) return;

      if (typeof config.volumeMusic === "number") {
        ajustes.musica = config.volumeMusic / 100;
      }

      if (typeof config.volumeSFX === "number") {
        ajustes.efectos = config.volumeSFX / 100;
      }

      if (typeof config.theme === "string") temaCargado = config.theme;
      establecerIdioma(config.language === "spanish" ? 1 : 0);
    } catch (error) {
      console.error("Could not load settings:", error);
    }
  }

  if (cargaActual !== numeroCarga) return;

  ajustes.musica = Math.max(0, Math.min(1, ajustes.musica));
  ajustes.efectos = Math.max(0, Math.min(1, ajustes.efectos));
  usuarioCargado = clave;
  setVolumenMusica(ajustes.musica);
}

export async function guardarAjustes(nombre: string, invitado: boolean): Promise<void> {
  if (invitado) {
    localStorage.setItem(CLAVE_INVITADO, JSON.stringify({
      idioma: spanish,
      musica: ajustes.musica,
      efectos: ajustes.efectos
    }));
    return;
  }

  await guardarConfiguracion(
    nombre,
    temaCargado,
    Math.round(ajustes.musica * 100),
    Math.round(ajustes.efectos * 100),
    spanish === 1 ? "spanish" : "english"
  );
}

export function olvidarAjustes(): void {
  numeroCarga++;
  usuarioCargado = "";
  ajustes.musica = 1;
  ajustes.efectos = 1;
  temaCargado = "Dark";
  establecerIdioma(0);
  setVolumenMusica(1);
}
