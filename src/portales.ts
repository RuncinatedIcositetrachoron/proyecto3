import Phaser from "phaser";

export const COLORES_PORTALES = ["green", "blue", "orange", "pink"];

export function cargarPortales(escena: Phaser.Scene): void {
  for (let i = 0; i < COLORES_PORTALES.length; i++) {
    const color = COLORES_PORTALES[i];
    const normal = "portal-normal-" + color;
    const normalopening = "portal-normal-opening-" + color;
    const topdown = "portal-topdown-" + color;
    if (!escena.textures.exists(normal)) {
      escena.load.image(normal, "./assets/portals/portal " + color + ".sprsheet.png");
    }
    if (!escena.textures.exists(normalopening)) {
      escena.load.image(normalopening, "./assets/portals/portal " + color + " open.sprsheet.png");
    }
    if (!escena.textures.exists(topdown)) {
      escena.load.image(topdown, "./assets/portals/portals " + color + " topdownview.sprsheet.png");
    }
  }
}

export function crearAnimacionesPortales(escena: Phaser.Scene): void {
  const filas = [0, 48, 16, 64];
  const alturas = [16, 12, 32, 12];
  for (let i = 0; i < COLORES_PORTALES.length; i++) {
    const color = COLORES_PORTALES[i];
    const normal = "portal-normal-" + color;
    const topdown = "portal-topdown-" + color;
    if (escena.textures.exists(normal)) {
      const textura = escena.textures.get(normal);
      const frames = [];
      for (let frame = 0; frame < 10; frame++) {
        if (!textura.has(String(frame))) {
          textura.add(frame, 0, frame * 16, 0, 16, 16);
        }
        frames.push({ key: normal, frame: frame });
      }
      if (!escena.anims.exists(normal)) {
        escena.anims.create({ key: normal, frames: frames, frameRate: 12, repeat: -1 });
      }
    }
    if (escena.textures.exists(topdown)) {
      const textura = escena.textures.get(topdown);
      for (let direccion = 0; direccion < 4; direccion++) {
        const frames = [];
        const animacion = topdown + "-" + direccion;
        for (let frame = 0; frame < 5; frame++) {
          const numero = direccion * 5 + frame;
          if (!textura.has(String(numero))) {
            textura.add(numero, 0, frame * 16, filas[direccion], 16, alturas[direccion]);
          }
          frames.push({ key: topdown, frame: numero });
        }
        if (!escena.anims.exists(animacion)) {
          escena.anims.create({ key: animacion, frames: frames, frameRate: 6, repeat: -1 });
        }
      }
    }

    const normalopening = "portal-normal-opening-" + color;
    if (escena.textures.exists(normalopening)) {
      const textura = escena.textures.get(normalopening);
      const frames = [];
      const cantidadFrames = Math.floor(textura.source[0].width / 16);

      for (let frame = 0; frame < cantidadFrames; frame++) {
        if (!textura.has(String(frame))) {
          textura.add(frame, 0, frame * 16, 0, 16, 16);
        }

        frames.push({ key: normalopening, frame: frame });
      }

      if (!escena.anims.exists(normalopening)) {
        escena.anims.create({
          key: normalopening,
          frames: frames,
          frameRate: 12,
          repeat: 0
        });
      }
    }
  }
}

function orientarPortalCerrado(
  sprite: Phaser.GameObjects.Sprite,
  direccion: number
): void {
  sprite.setAngle(direccion * 90);

  switch (direccion) {
    case 0:
      sprite.setOrigin(1, 1);
      break;
    case 1:
      sprite.setOrigin(1, 0);
      break;
    case 2:
      sprite.setOrigin(0, 0);
      break;
    case 3:
      sprite.setOrigin(0, 1);
      break;
  }
}

export function actualizarEstadoPortal(
  sprite: Phaser.GameObjects.Sprite,
  grupo: number,
  direccion: number,
  normal: boolean,
  activo: boolean
): void {
  if (!normal) {
    configurarPortal(sprite, grupo, direccion, normal);
    return;
  }

  let indiceColor = 0;

  if (grupo > 0) {
    indiceColor = (grupo - 1) % COLORES_PORTALES.length;
  }

  const color = COLORES_PORTALES[indiceColor];
  const opening = "portal-normal-opening-" + color;
  const estado = sprite.getData("portalEstado");

  if (estado === undefined) {
    if (activo) {
      sprite.setData("portalEstado", "abierto");
      sprite.setAngle(0);
      configurarPortal(sprite, grupo, direccion, normal);
    } else {
      sprite.setData("portalEstado", "cerrado");
      sprite.stop();
      sprite.setTexture(opening, 0);
      orientarPortalCerrado(sprite, direccion);
    }

    return;
  }

  if (activo && estado === "cerrado") {
    sprite.setData("portalEstado", "abriendo");
    sprite.stop();
    sprite.setTexture(opening, 0);
    orientarPortalCerrado(sprite, direccion);
    sprite.play(opening);

    sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + opening,
      () => {
        if (sprite.getData("portalEstado") !== "abriendo") {
          return;
        }

        sprite.setData("portalEstado", "abierto");
        sprite.setAngle(0);
        configurarPortal(sprite, grupo, direccion, normal);
      }
    );

    return;
  }

  if (!activo && estado === "abierto") {
    sprite.setData("portalEstado", "cerrando");
    sprite.stop();
    sprite.setTexture(opening);
    orientarPortalCerrado(sprite, direccion);
    sprite.playReverse(opening);

    sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + opening,
      () => {
        if (sprite.getData("portalEstado") !== "cerrando") {
          return;
        }

        sprite.setData("portalEstado", "cerrado");
        sprite.stop();
        sprite.setTexture(opening, 0);
        orientarPortalCerrado(sprite, direccion);
      }
    );
  }
}

export function direccionPortalEditor(tile: number): number {
  if (tile === 50) return 0;
  if (tile === 55) return 1;
  if (tile === 51) return 2;
  if (tile === 53) return 3;
  return -1;
}
export function esParedExteriorPortal(tile: number): boolean {
  return tile >= 17 && tile <= 24;
}
export function configurarPortal(
  sprite: Phaser.GameObjects.Sprite,
  grupo: number,
  direccion: number,
  normal: boolean
): void {
  let indiceColor = 0;
  if (grupo > 0) {
    indiceColor = (grupo - 1) % COLORES_PORTALES.length;
  }
  const color = COLORES_PORTALES[indiceColor];
  let animacion = "portal-normal-" + color;
  let origenY = 1;
  if (!normal) {
    animacion = "portal-topdown-" + color + "-" + direccion;
    if (direccion === 0) origenY = 1.5;
    if (direccion === 1 || direccion === 3) origenY = 2;
    if (direccion === 2) origenY = 27 / 32;
  }

  if (normal) {
    const estado = sprite.getData("portalEstado");

    if (
      estado === "cerrado" ||
      estado === "abriendo" ||
      estado === "cerrando"
    ) {
      return;
    }
  }

  sprite.setOrigin(1, origenY);
  sprite.setAngle(0);
  sprite.play(animacion, true);
}
