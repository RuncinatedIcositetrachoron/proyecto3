import type Phaser from "phaser";

type Musica = {
    nombre: string;
    archivo: string;
    volumen: number;
};

const musicas: Musica[] = [
    { nombre: "mainmenu", archivo: "assets/music/mainmenumusic.ogg", volumen: 0.4 },
    { nombre: "menu", archivo: "assets/music/menumusic.ogg", volumen: 0.4 },
    { nombre: "game", archivo: "assets/music/gamemusic.ogg", volumen: 0.35 },
    { nombre: "editor", archivo: "assets/music/editormusic.ogg", volumen: 0.35 }
];

let musicaActual: HTMLAudioElement | undefined;
let nombreActual = "";
let volumenGeneral = 1;
let volumenFade = 0;
let reproduccionDeseada = false;
let numeroReproduccion = 0;
let frameFade: number | undefined;
let resolverFade: (() => void) | undefined;
let eventosPreparados = false;
let ventanaActiva = true;

function buscarMusica(nombre: string): Musica | undefined {
    for (let i = 0; i < musicas.length; i++) {
        if (musicas[i].nombre === nombre) return musicas[i];
    }
    return undefined;
}

function aplicarVolumen(): void {
    if (!musicaActual) return;
    const musica = buscarMusica(nombreActual);
    const base = musica ? musica.volumen : 0;
    musicaActual.volume = Math.max(0, Math.min(1, base * volumenGeneral * volumenFade));
}

function cancelarFade(): void {
    if (frameFade !== undefined) {
        cancelAnimationFrame(frameFade);
        frameFade = undefined;
    }
    const resolver = resolverFade;
    resolverFade = undefined;
    if (resolver) resolver();
}

function cambiarVolumenFade(destino: number, duracion: number): Promise<void> {
    cancelarFade();
    const inicial = volumenFade;
    if (duracion <= 0 || Math.abs(inicial - destino) < 0.001) {
        volumenFade = destino;
        aplicarVolumen();
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        resolverFade = resolve;
        const inicio = performance.now();
        const actualizar = (ahora: number) => {
            const progreso = Math.max(0, Math.min(1, (ahora - inicio) / duracion));
            volumenFade = inicial + (destino - inicial) * progreso;
            aplicarVolumen();
            if (progreso >= 1) {
                frameFade = undefined;
                resolverFade = undefined;
                resolve();
            } else {
                frameFade = requestAnimationFrame(actualizar);
            }
        };
        frameFade = requestAnimationFrame(actualizar);
    });
}

function reproducirMusica(): void {
    if (!musicaActual || !reproduccionDeseada || !ventanaActiva || !musicaActual.paused) return;
    const audio = musicaActual;
    const reproduccion = numeroReproduccion;
    audio.play().catch((error: unknown) => {
        if (audio !== musicaActual || reproduccion !== numeroReproduccion) return;
        if (error instanceof DOMException &&
            (error.name === "NotAllowedError" || error.name === "AbortError")) return;
        reproduccionDeseada = false;
        console.warn("Could not play music:", error);
    });
}

function reintentarMusica(): void {
    if (reproduccionDeseada) reproducirMusica();
}

function prepararMusica(): HTMLAudioElement {
    if (!musicaActual) {
        musicaActual = new Audio();
        musicaActual.preload = "metadata";
        musicaActual.loop = true;
        musicaActual.volume = 0;
    }
    if (!eventosPreparados) {
        eventosPreparados = true;
        window.addEventListener("pointerdown", reintentarMusica, true);
        window.addEventListener("keydown", reintentarMusica, true);
        window.addEventListener("blur", () => {
            ventanaActiva = false;
            if (musicaActual) musicaActual.pause();
        });
        window.addEventListener("focus", () => {
            ventanaActiva = true;
            reintentarMusica();
        });
    }
    return musicaActual;
}

export function cargarMusica(_escena: Phaser.Scene): void {
    prepararMusica();
}

export function musicaEscena(escena: string): string {
    switch (escena) {
        case "menu": return "mainmenu";
        case "game": return "game";
        case "editor": return "editor";
        default: return "menu";
    }
}

export function setVolumenMusica(volumen: number): void {
    volumenGeneral = Math.max(0, Math.min(1, volumen));
    aplicarVolumen();
    if (volumenGeneral > 0 && volumenFade > 0) reproducirMusica();
}

export function fadeInMusica(
    _escena: Phaser.Scene,
    nombre: string,
    duracion: number = 500
): Promise<void> {
    const musica = buscarMusica(nombre);
    if (!musica) return Promise.resolve();

    const audio = prepararMusica();
    if (nombreActual !== nombre) {
        cancelarFade();
        numeroReproduccion++;
        audio.pause();
        nombreActual = nombre;
        volumenFade = 0;
        audio.src = musica.archivo;
        audio.load();
    } else if (audio.error) {
        numeroReproduccion++;
        audio.load();
    }

    reproduccionDeseada = true;
    aplicarVolumen();
    reproducirMusica();
    return cambiarVolumenFade(1, duracion);
}

export function fadeOutMusica(
    _escena: Phaser.Scene,
    duracion: number = 500
): Promise<void> {
    if (!musicaActual || nombreActual === "") return Promise.resolve();
    return cambiarVolumenFade(0, duracion);
}

export function stopMusica(): void {
    numeroReproduccion++;
    reproduccionDeseada = false;
    cancelarFade();
    volumenFade = 0;
    nombreActual = "";
    if (musicaActual) {
        musicaActual.pause();
        musicaActual.volume = 0;
        musicaActual.removeAttribute("src");
        musicaActual.load();
    }
}

export function getMusicaActual(): string {
    return nombreActual;
}
