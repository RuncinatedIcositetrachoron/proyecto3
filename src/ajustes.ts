import type Phaser from "phaser";
import { obtenerConfiguracion, guardarConfiguracion } from "./api";
import { spanish, establecerIdioma } from "./idioma";
export const ajustes = { musica: 1, efectos: 1 };
const PREFIJO = "LindseysLasersOptions1:";
const CLAVE_INVITADO = "LindseysLasersOpcionesInvitado";
let usuarioCargado = "";
let numeroCarga = 0;
export function aplicarVolumenMusica(escena: Phaser.Scene): void {
  const musica = escena.sound.get("menuMusic") as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  const musica2 = escena.sound.get("menuMusic2") as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  if (musica) musica.setVolume(0.4 * ajustes.musica);
  if (musica2) musica2.setVolume(0.2 * ajustes.musica);
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
      if (typeof config.volume === "number") {
        ajustes.efectos = config.volume > 1 ? config.volume / 100 : config.volume;
      }
      if (typeof config.theme === "string") {
        if (config.theme.startsWith(PREFIJO)) {
          const datos = JSON.parse(config.theme.substring(PREFIJO.length));
          if (typeof config.volume === "number") ajustes.efectos = config.volume / 100;
          if (typeof datos.musica === "number") ajustes.musica = datos.musica;
          if (datos.idioma === 0 || datos.idioma === 1) establecerIdioma(datos.idioma);
        } else if (config.theme === "es") {
          establecerIdioma(1);
        }
      }
    } catch (error) {
      console.error("Could not load settings:", error);
    }
  }
  if (cargaActual !== numeroCarga) return;
  ajustes.musica = Math.max(0, Math.min(1, ajustes.musica));
  ajustes.efectos = Math.max(0, Math.min(1, ajustes.efectos));
  usuarioCargado = clave;
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
  const tema = PREFIJO + JSON.stringify({
    idioma: spanish,
    musica: ajustes.musica
  });
  await guardarConfiguracion(nombre, tema, Math.round(ajustes.efectos * 100), null);
}
export function olvidarAjustes(): void {
  numeroCarga++;
  usuarioCargado = "";
  ajustes.musica = 1;
  ajustes.efectos = 1;
  establecerIdioma(0);
}
