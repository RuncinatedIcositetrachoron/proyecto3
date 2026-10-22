export const COLORES = {
  fondo: 0x222034,
  fondoMenu: 0x0f102e,
  bordeMenu: 0x80759d,
  desactivadoMenu: 0x51515f,
  nivelBloqueado: 0x4e566b,
  tecla: 0x2c344c,
  bordeTecla: 0x7c8eaf,
  panel: 0x171a2e,
  sombra: 0x14121e,
  sombraPopup: 0x080b17,
  negro: 0x000000,
  normal: 0xcbdbfc,
  hover: 0xb3c1de,
  azul: 0x95add6,
  desactivado: 0x79869e,
  desactivadoAlternativo: 0x999999,
  azulHover: 0x8398bc,
  borde: 0x6f87b0,
  separador: 0x303653,
  panelVariantes: 0x302641,
  casilla: 0x303038,
  casillaHover: 0x3d3d48,
  bordeCasilla: 0x62626e,
  blanco: 0xffffff,
  textoSecundario: 0xc5c6d9,
  violeta: 0xca9ddb,
  violetaInactivo: 0x8f5aba,
  violetaHover: 0xb28ac1,
  naranja: 0xfe7d59,
  naranjaHover: 0xe06e4e,
  rojo: 0xf08080,
  rojoHover: 0xd37171,
  verde: 0x63c05f,
  verdeInactivo: 0x4e8f46,
  verdeHover: 0x57a954,
  amarillo: 0xe6c56a,
  amarilloHover: 0xcaad5d,
  amarilloInactivo: 0xb09550
};

export function colorTexto(color: number): string {
  return "#" + ("000000" + color.toString(16)).slice(-6);
}

export function oscurecerColor(color: number): number {
  const rojo = Math.floor(color / 65536);
  const verde = Math.floor(color / 256) % 256;
  const azul = color % 256;
  return Math.round(rojo * 0.88) * 65536 + Math.round(verde * 0.88) * 256 + Math.round(azul * 0.88);
}
