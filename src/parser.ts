interface NivelParseable {
  tablero: number[][];
  portales?: number[][];
  links?: number[][];
  darkLayer?: number[][];
}

export type GameTypeEntity = [
  string, // type
  number, // x
  number, // y
  number, // dir (-1 if none)
  number, // portal (-1 if none)
  number, // groups bitmap
  number  // variant
];

export type GameTypeLevel = GameTypeEntity[];

function buscarEntidad(
  level: GameTypeLevel,
  x: number,
  y: number
): GameTypeEntity | undefined {
  for (let i = 0; i < level.length; i++) {
    if (level[i][1] === x && level[i][2] === y) {
      return level[i];
    }
  }
}

function direccionPortal(tile: number): number {
  if (tile === 50) return 0;
  if (tile === 55) return 1;
  if (tile === 51) return 2;
  if (tile === 53) return 3;

  return -1;
}

function mismoPunto(punto1: number[], punto2: number[]): boolean {
  return (
    punto1[0] === punto2[0] &&
    punto1[1] === punto2[1]
  );
}

function asignarGrupos(nivelEditor: NivelParseable, nivelJuego: GameTypeLevel): void {
  if (nivelEditor.links === undefined) {
    return;
  }

  const linksUsados: boolean[] = [];

  for (let i = 0; i < nivelEditor.links.length; i++) {
    linksUsados.push(false);
  }

  let numeroGrupo = 0;

  for (let i = 0; i < nivelEditor.links.length; i++) {
    if (linksUsados[i]) {
      continue;
    }

    const grupo = 1 << numeroGrupo;
    numeroGrupo++;

    const puntos: number[][] = [];

    const primerLink = nivelEditor.links[i];

    puntos.push([
      primerLink[0],
      primerLink[1]
    ]);

    puntos.push([
      primerLink[2],
      primerLink[3]
    ]);

    linksUsados[i] = true;


    // Buscar links conectados a cualquiera
    // de los puntos que ya tenemos

    let agregoAlgo = true;

    while (agregoAlgo) {
      agregoAlgo = false;

      for (let j = 0; j < nivelEditor.links.length; j++) {
        if (linksUsados[j]) {
          continue;
        }

        const link = nivelEditor.links[j];

        const punto1 = [link[0], link[1]];
        const punto2 = [link[2], link[3]];

        let conectado = false;

        for (let k = 0; k < puntos.length; k++) {
          if (
            mismoPunto(puntos[k], punto1) ||
            mismoPunto(puntos[k], punto2)
          ) {
            conectado = true;
          }
        }

        if (!conectado) {
          continue;
        }

        linksUsados[j] = true;
        agregoAlgo = true;

        let existe1 = false;
        let existe2 = false;

        for (let k = 0; k < puntos.length; k++) {
          if (mismoPunto(puntos[k], punto1)) {
            existe1 = true;
          }

          if (mismoPunto(puntos[k], punto2)) {
            existe2 = true;
          }
        }

        if (!existe1) {
          puntos.push(punto1);
        }

        if (!existe2) {
          puntos.push(punto2);
        }
      }
    }


    // Ahora todos esos puntos pertenecen
    // al mismo grupo

    for (let j = 0; j < puntos.length; j++) {
      const x = puntos[j][0];
      const y = puntos[j][1];

      for (let k = 0; k < nivelJuego.length; k++) {
        const entity = nivelJuego[k];

        if (
          entity[1] === x &&
          entity[2] === y
        ) {
          entity[5] |= grupo;
        }
      }
    }
  }
}

export function convertirNivel(nivel: NivelParseable): GameTypeLevel {
  const level: GameTypeLevel = [];

  for (let y = 0; y < nivel.tablero.length; y++) {
    for (let x = 0; x < nivel.tablero[y].length; x++) {
      let tile = nivel.tablero[y][x];

      if (tile >= 1000 && tile < 2000) {
        level.push(["goal", x, y, -1, -1, 0, tile]);
        tile -= 1000;
      }

      switch (tile) {
        case 2:
          level.push(["goal", x, y, -1, -1, 0, tile]);
          break;

        case 3:
          level.push(["mirror", x, y, 2, -1, 0, tile]);
          break;

        case 4:
          level.push(["mirror", x, y, 3, -1, 0, tile]);
          break;

        case 5:
          level.push(["mirror", x, y, 0, -1, 0, tile]);
          break;

        case 6:
          level.push(["mirror", x, y, 1, -1, 0, tile]);
          break;

        case 11:
          level.push(["laserEmissor", x, y, 0, -1, 0, tile]);
          break;

        case 12:
          level.push(["laserEmissor", x, y, 2, -1, 0, tile]);
          break;

        case 13:
          level.push(["laserEmissor", x, y, 3, -1, 0, tile]);
          break;

        case 14:
          level.push(["laserEmissor", x, y, 1, -1, 0, tile]);
          break;

        case 27:
          level.push(["laserReciever", x, y, 0, -1, 0, tile]);
          break;

        case 28:
          level.push(["laserReciever", x, y, 2, -1, 0, tile]);
          break;

        case 29:
          level.push(["laserReciever", x, y, 3, -1, 0, tile]);
          break;

        case 30:
          level.push(["laserReciever", x, y, 1, -1, 0, tile]);
          break;

        case 37:
          level.push(["box", x, y, 0, -1, 0, tile]);
          break;

        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 21:
        case 22:
        case 23:
        case 24:
        case 39:
        case 64:
          level.push(["wall", x, y, -1, -1, 0, tile]);
          break;

        case 33:
        case 34:
        case 41:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          level.push(["machine", x, y, -1, -1, 0, tile]);
          break;

        case 66:
          level.push(["player", x, y, 0, -1, 0,tile]);
          break;

        case 68:
          level.push(["exit", x, y, -1, -1, 0, tile]);
          break;
      }
    }
  }

  if (nivel.portales !== undefined) {
    for (let y = 0; y < nivel.portales.length; y++) {
      for (let x = 0; x < nivel.portales[y].length; x++) {

        const dir = direccionPortal(
          nivel.portales[y][x]
        );

        if (dir === -1) {
          continue;
        }

        const entity = buscarEntidad(
          level,
          x,
          y
        );

        if (entity !== undefined) {
          entity[4] = dir;
        }
      }
    }
  }

  asignarGrupos(nivel, level);

  return level;
}