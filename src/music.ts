import Phaser from "phaser";

type Musica = {
    nombre: string;
    archivo: string;
    volumen: number;
};

const musicas: Musica[] = [
    {
        nombre: "mainmenu",
        archivo: "assets/music/mainmenumusic.ogg",
        volumen: 0.4
    },
    {
        nombre: "menu",
        archivo: "assets/music/menumusic.ogg",
        volumen: 0.4
    },
    {
        nombre: "game",
        archivo: "assets/music/gamemusic.ogg",
        volumen: 0.35
    },
    {
        nombre: "editor",
        archivo: "assets/music/editormusic.ogg",
        volumen: 0.35
    }
];

let musicaActual: any;
let nombreActual = "";
let volumenGeneral = 1;

function buscarMusica(nombre: string): Musica | undefined {
    for (let i = 0; i < musicas.length; i++) {
        if (musicas[i].nombre === nombre) {
            return musicas[i];
        }
    }

    return undefined;
}


export function cargarMusica(escena: Phaser.Scene) {
    for (let i = 0; i < musicas.length; i++) {
        const musica = musicas[i];
        const clave = "music-" + musica.nombre;

        if (!escena.cache.audio.exists(clave)) {
            escena.load.audio(clave, musica.archivo);
        }
    }
}

export function musicaEscena(escena: string): string {
    switch (escena) {
        case "menu":
            return "mainmenu";

        case "game":
            return "game";

        case "editor":
            return "editor";

        default:
            return "menu";
    }
}

export function setVolumenMusica(volumen: number) {
    if (volumen < 0) volumen = 0;
    if (volumen > 1) volumen = 1;

    volumenGeneral = volumen;

    if (musicaActual && musicaActual.volume > 0) {
        const musica = buscarMusica(nombreActual);

        if (musica) {
            musicaActual.setVolume(musica.volumen * volumenGeneral);
        }
    }
}

export function fadeInMusica(
    escena: Phaser.Scene,
    nombre: string,
    duracion: number = 500
): Promise<void> {
    if (nombre === "") {
        return Promise.resolve();
    }

    const musica = buscarMusica(nombre);

    if (!musica) {
        return Promise.resolve();
    }

    const clave = "music-" + nombre;

    if (!escena.cache.audio.exists(clave)) {
        console.log("Music not loaded: " + nombre);
        return Promise.resolve();
    }

    if (!musicaActual || nombreActual !== nombre) {
        musicaActual = escena.sound.add(clave, {
            volume: 0,
            loop: true
        });

        nombreActual = nombre;
    }

    if (!musicaActual.isPlaying) {
        musicaActual.setVolume(0);
        musicaActual.play();
    }

    const volumenFinal =
        musica.volumen * volumenGeneral;

    return new Promise((resolve) => {
        escena.tweens.add({
            targets: musicaActual,
            volume: volumenFinal,
            duration: duracion,
            ease: "Linear",
            onComplete: () => {
                resolve();
            }
        });
    });
}

export function fadeOutMusica(
    escena: Phaser.Scene,
    duracion: number = 500
): Promise<void> {
    if (!musicaActual || !musicaActual.isPlaying) {
        return Promise.resolve();
    }

    if (duracion <= 0) {
        musicaActual.setVolume(0);
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        escena.tweens.add({
            targets: musicaActual,
            volume: 0,
            duration: duracion,
            ease: "Linear",
            onComplete: () => {
                resolve();
            }
        });
    });
}

export function stopMusica() {
    if (!musicaActual) {
        return;
    }

    musicaActual.stop();
    musicaActual.destroy();

    musicaActual = undefined;
    nombreActual = "";
}

export function getMusicaActual(): string {
    return nombreActual;
}

function esperarAudio(
    escena: Phaser.Scene
): Promise<void> {
    if (!escena.sound.locked) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        escena.sound.once(
            Phaser.Sound.Events.UNLOCKED,
            () => {
                resolve();
            }
        );
    });
}