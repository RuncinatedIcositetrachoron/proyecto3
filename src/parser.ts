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
  number[][], // links ([[linked object 1 x, linked object 1 y, NOT?], [linked object 2 x, linked object 2 y, NOT?], ...]) (empty if none)
  number  // variant
];

export type GameTypeLevel = GameTypeEntity[];

function direccionPortal(tile: number): number {
  if (tile === 50) return 0;
  if (tile === 55) return 1;
  if (tile === 51) return 2;
  if (tile === 53) return 3;

  return -1;
}

function assignLinks(levelin: NivelParseable, levelin2: GameTypeLevel): void {
  if (levelin.links === undefined) return;
  for (let i = 0; i < levelin.links.length; i++) {
    let entitya = levelin2.find(entity => entity[1] === levelin.links[i][0] && entity[2] === levelin.links[i][1]);
    let entityb = levelin2.find(entity => entity[1] === levelin.links[i][2] && entity[2] === levelin.links[i][3]);
    if (entitya) entitya[5].push([levelin.links[i][2], levelin.links[i][3], levelin.links[i][4]]);
    if (entityb) entityb[5].push([levelin.links[i][0], levelin.links[i][1], levelin.links[i][4]]);
  }
}

export function convertirNivel(nivel: NivelParseable): GameTypeLevel {
  const level: GameTypeLevel = [];

  for (let y = 0; y < nivel.tablero.length; y++) {
    for (let x = 0; x < nivel.tablero[y].length; x++) {
      let tile = nivel.tablero[y][x];

      if (tile >= 1000 && tile < 2000) {
        level.push(["goal", x, y, -1, -1, [], tile]);
        tile -= 1000;
      }

      switch (tile) {
        case 2:
          level.push(["goal", x, y, -1, -1, [], tile]);
          break;

        case 3:
          level.push(["mirror", x, y, 2, -1, [], tile]);
          break;

        case 4:
          level.push(["mirror", x, y, 3, -1, [], tile]);
          break;

        case 5:
          level.push(["mirror", x, y, 0, -1, [], tile]);
          break;

        case 6:
          level.push(["mirror", x, y, 1, -1, [], tile]);
          break;

        case 11:
          level.push(["laserEmissor", x, y, 0, -1, [], tile]);
          break;

        case 12:
          level.push(["laserEmissor", x, y, 2, -1, [], tile]);
          break;

        case 13:
          level.push(["laserEmissor", x, y, 3, -1, [], tile]);
          break;

        case 14:
          level.push(["laserEmissor", x, y, 1, -1, [], tile]);
          break;

        case 27:
          level.push(["laserReciever", x, y, 0, -1, [], tile]);
          break;

        case 28:
          level.push(["laserReciever", x, y, 2, -1, [], tile]);
          break;

        case 29:
          level.push(["laserReciever", x, y, 3, -1, [], tile]);
          break;

        case 30:
          level.push(["laserReciever", x, y, 1, -1, [], tile]);
          break;

        case 37:
          level.push(["box", x, y, 0, -1, [], tile]);
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
          level.push(["wall", x, y, -1, -1, [], tile]);
          break;

        case 33:
        case 34:
        case 41:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          level.push(["machine", x, y, -1, -1, [], tile]);
          break;

        case 66:
          level.push(["player", x, y, 0, -1, [], tile]);
          break;

        case 68:
          level.push(["exit", x, y, -1, -1, [], tile]);
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

        const entity = level.find(entity => entity[1] === x && entity[2] === y);

        if (entity !== undefined) {
          entity[4] = dir;
        }
      }
    }
  }

  assignLinks(nivel, level);

  return level;
}