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
    {capa: -1, caracter: ""}, // 1
    {capa: -1, caracter: ""}, // 2
  
    {capa: 2, caracter: "t"}, // 3 Espejo arriba
    {capa: 2, caracter: "g"}, // 4 Espejo abajo
    {capa: 2, caracter: "f"}, // 5 Espejo izquierda
    {capa: 2, caracter: "h"}, // 6 Espejo derecha
  
    {capa: -1, caracter: ""}, // 7
    {capa: -1, caracter: ""}, // 8
    {capa: -1, caracter: ""}, // 9
    {capa: -1, caracter: ""}, // 10
  
    {capa: 2, caracter: "w"}, // 11 Emisor arriba
    {capa: 2, caracter: "s"}, // 12 Emisor abajo
    {capa: 2, caracter: "a"}, // 13 Emisor izquierda
    {capa: 2, caracter: "d"}, // 14 Emisor derecha
  
    {capa: -1, caracter: ""}, // 15
    {capa: -1, caracter: ""}, // 16
    {capa: -1, caracter: ""}, // 17
    {capa: -1, caracter: ""}, // 18
    {capa: -1, caracter: ""}, // 19
    {capa: -1, caracter: ""}, // 20
    {capa: -1, caracter: ""}, // 21
    {capa: -1, caracter: ""}, // 22
    {capa: -1, caracter: ""}, // 23
  
    {capa: 1, caracter: "p"}, // 24 Jugador
    {capa: 0, caracter: "f"}, // 25 Exit gate
    {capa: -1, caracter: ""}, // 26
  
    {capa: 2, caracter: "i"}, // 27 Receptor arriba
    {capa: 2, caracter: "k"}, // 28 Receptor abajo
    {capa: 2, caracter: "j"}, // 29 Receptor izquierda
    {capa: 2, caracter: "l"}, // 30 Receptor derecha
  
    {capa: -1, caracter: ""}, // 31
    {capa: -1, caracter: ""}, // 32
    {capa: -1, caracter: ""}, // 33
    {capa: -1, caracter: ""}, // 34
    {capa: -1, caracter: ""}, // 35
    {capa: -1, caracter: ""}, // 36
  
    {capa: 1, caracter: "b"}, // 37 Caja
    {capa: -1, caracter: ""}, // 38
    {capa: 0, caracter: "#"}, // 39 Pared
    {capa: -1, caracter: ""}, // 40
  
    {capa: -1, caracter: ""}, // 41
    {capa: -1, caracter: ""}, // 42
    {capa: -1, caracter: ""}, // 43
    {capa: -1, caracter: ""}, // 44
    {capa: -1, caracter: ""}, // 45
    {capa: -1, caracter: ""}, // 46
    {capa: -1, caracter: ""}, // 47
    {capa: -1, caracter: ""}, // 48
    {capa: -1, caracter: ""}, // 49
  
    {capa: -1, caracter: ""}, // 50 Portal arriba
    {capa: -1, caracter: ""}, // 51 Portal abajo
    {capa: -1, caracter: ""}, // 52
    {capa: -1, caracter: ""}, // 53 Portal izquierda
    {capa: -1, caracter: ""}, // 54
    {capa: -1, caracter: ""}, // 55 Portal derecha
    {capa: -1, caracter: ""}  // 56
  ];
  
  const tablaPortales: string[] = [];
  
  tablaPortales[50] = "w";
  tablaPortales[51] = "s";
  tablaPortales[53] = "a";
  tablaPortales[55] = "d";
  
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
  
  if (filas === 0) {
      return "";
  }
  
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
  
          grupos[y1][x1] = String(i + 1);
          grupos[y2][x2] = String(i + 1);
      }
  }
  
  return capaATexto(estatica) +
      "\n^\n" +
      capaATexto(dinamica) +
      "\n^\n" +
      capaATexto(laser) +
      "\n^\n" +
      capaATexto(portales) +
      "\n^\n" +
      capaATexto(grupos);
  
  }
  