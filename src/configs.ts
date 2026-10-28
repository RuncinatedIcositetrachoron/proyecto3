export let spanish = 0;

export function cambiarIdioma() {
    if (spanish === 0) {
        spanish = 1;
    } else {
        spanish = 0;
    }
}

export let configvolumenmusica = 1;
export let configvolumensfx = 0.9;
export let volumenmaster = 2;
export let volumensfx = configvolumensfx * volumenmaster;
export let volumenmusica = configvolumenmusica * volumenmaster;