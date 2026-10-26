export let spanish = 0;
export function establecerIdioma(idioma: number) {
    spanish = idioma === 1 ? 1 : 0;
}
export function cambiarIdioma() {
    establecerIdioma(1 - spanish);
}
