export let spanish = 0;

export function establecerIdioma(idioma: number) {
    spanish = idioma === 1 ? 1 : 0;
}

export function cambiarIdioma() {
    establecerIdioma(1 - spanish);
}

export let configvolumenmusica = 1;
export let configvolumensfx = 0.9;
export let volumenmaster = 2;
export let volumensfx = configvolumensfx * volumenmaster;
export let volumenmusica = configvolumenmusica * volumenmaster;