interface NivelParseable {
    tablero: number[][];
    portales?: number[][];
    links?: number[][];
}
interface ConversionTile {
    capa: number;
    caracter: string;
}

// Capa:
// 0 = estatica
// 1 = dinamica
// 2 = laser
// -1 = ignorar
  
const tablaTiles: ConversionTile[] = [
    {capa: -1, caracter: ""}, // 0
    {capa: -1, caracter: ""}, // 1 Vacio
    {capa: -1, caracter: ""}, // 2
    {capa: -1, caracter: ""}, // 3
    {capa: -1, caracter: ""}, // 4
    {capa: -1, caracter: ""}, // 5
    {capa: 1, caracter: "p"}, // 6 Jugador
    {capa: 0, caracter: "f"}, // 7 Bandera
    {capa: -1, caracter: ""}, // 8
    {capa: -1, caracter: ""}, // 9
    {capa: -1, caracter: ""}, // 10
    {capa: -1, caracter: ""}, // 11
    {capa: -1, caracter: ""}, // 12
    {capa: -1, caracter: ""}, // 13
    {capa: -1, caracter: ""}, // 14
    {capa: -1, caracter: ""}, // 15
    {capa: -1, caracter: ""}, // 16
    {capa: -1, caracter: ""}, // 17
    {capa: -1, caracter: ""}, // 18
    {capa: -1, caracter: ""}, // 19
    {capa: -1, caracter: ""}, // 20
    {capa: -1, caracter: ""}, // 21
    {capa: -1, caracter: ""}, // 22
    {capa: -1, caracter: ""}, // 23
    {capa: -1, caracter: ""} // 24
  ];
  const tablaPortales: string[] = [];
  tablaPortales[25] = "w";
  tablaPortales[26] = "d";
  tablaPortales[27] = "a";
  tablaPortales[28] = "s";
  
  function crearCapa(filas: number, columnas: number): string[][] {
    const capa: string[][] = [];
    for (let y = 0; y < filas; y++) {
      const fila: string[] = [];
      for (let x = 0; x < columnas; x++) {
        fila.push(".");
      }
      capa.push(fila);
    }
    return capa;
  }
  
  function capaATexto(capa: string[][]): string {
    let texto = "";
    for (let y = 0; y < capa.length; y++) {
      texto += capa[y].join("");
      if (y < capa.length - 1) {
        texto += "\n";
      }
    }
    return texto;
  }
  
  export function convertirNivel(nivel: NivelParseable): string {
    const filas = nivel.tablero.length;
    const columnas = nivel.tablero[0].length;
    const estatica = crearCapa(filas, columnas);
    const dinamica = crearCapa(filas, columnas);
    const laser = crearCapa(filas, columnas);
    const portales = crearCapa(filas, columnas);
    const grupos = crearCapa(filas, columnas);
    for (let y = 0; y < filas; y++) {
      for (let x = 0; x < columnas; x++) {
        const tile = nivel.tablero[y][x];
        const conversion = tablaTiles[tile];
        if (conversion !== undefined && conversion.caracter !== "") {
          if (conversion.capa === 0) {
            estatica[y][x] = conversion.caracter;
          }
          if (conversion.capa === 1) {
            dinamica[y][x] = conversion.caracter;
          }
          if (conversion.capa === 2) {
            laser[y][x] = conversion.caracter;
          }
        }
      }
    }
  
    if (nivel.portales !== undefined) {
      for (let y = 0; y < filas; y++) {
        for (let x = 0; x < columnas; x++) {
          const portal = nivel.portales[y][x];
          if (tablaPortales[portal] !== undefined) {
            portales[y][x] = tablaPortales[portal];
          }
        }
      }
    }
  
    if (nivel.links !== undefined) {
      for (let i = 0; i < nivel.links.length; i++) {
        const link = nivel.links[i];
        const x1 = link[0];
        const y1 = link[1];
        const x2 = link[2];
        const y2 = link[3];
  
        grupos[y1][x1] = String(i);
        grupos[y2][x2] = String(i);
      }
    }
  
    return capaATexto(estatica) + "\n^\n" + capaATexto(dinamica) + "\n^\n" + capaATexto(laser) + "\n^\n" + capaATexto(portales) + "\n^\n" + capaATexto(grupos);
  }