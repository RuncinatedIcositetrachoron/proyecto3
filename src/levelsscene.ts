import Phaser from "phaser";

import {
  obtenerNiveles,
  crearNivel,
  eliminarNivel,
  crearBoton,
  renombrarNivel,
  duplicarNivel,
} from "./niveles";

export class LevelsScene extends Phaser.Scene {

  constructor() {
    super("LevelsScene");
  }

  init(data: { ordenInvertido?: boolean, busqueda?: string}): void {
    if (data.ordenInvertido !== undefined) {
      this.ordenInvertido = data.ordenInvertido;
    } else {
      this.ordenInvertido = false;
    }
    if (data.busqueda !== undefined) {
      this.busqueda = data.busqueda;
    }
  }

  private ordenInvertido: boolean = false;
  private busqueda: string = "";
  private escribiendoBusqueda: boolean = false;
  private textoBusqueda: Phaser.GameObjects.Text;


  create(): void {
    this.add.text(40, 30, "Level Editor", {fontSize: "28px", color: "#ffffff"});
    crearBoton(this, 120, 90, 120, "Crear Nivel", () => {
        const nivel = crearNivel(10, 16);
        this.scene.start("EditorScene", {nivelId: nivel.id});
    });
    crearBoton(this, 260, 90, 120, "Invertir Orden", () => {
      this.scene.restart({
        ordenInvertido: !this.ordenInvertido,
      });
    });

    //BUSQUEDA

    const fondoBusqueda = this.add.rectangle(600, 90, 300, 40, 0x333333);
    fondoBusqueda.setStrokeStyle(1, 0xffffff);
    fondoBusqueda.setInteractive({useHandCursor: true,});
    this.textoBusqueda = this.add.text(460, 90, "Buscar nivel...",
      {
        fontSize: "16px",
        color: "#aaaaaa",
      },
    );
    this.textoBusqueda.setOrigin(0, 0.5);
    this.actualizarTextoBusqueda();


    fondoBusqueda.on("pointerdown", () => {
      this.escribiendoBusqueda = true;
      fondoBusqueda.setStrokeStyle(2, 0x00ff00);
    });

    this.input.keyboard?.on("keydown", (evento: KeyboardEvent) => {
      if (!this.escribiendoBusqueda) {
        return;
      }
      if (evento.key === "Backspace") {
        this.busqueda = this.busqueda.substring(0, this.busqueda.length - 1);
      } else if (evento.key === "Enter") {
        this.escribiendoBusqueda = false;
        fondoBusqueda.setStrokeStyle(1, 0xffffff);
        this.scene.restart({
          ordenInvertido: this.ordenInvertido,
          busqueda: this.busqueda,
        });
        return;
      } else if (evento.key.length === 1) {
        this.busqueda = this.busqueda + evento.key;
      }
      this.actualizarTextoBusqueda();
    });




    this.mostrarNiveles();
    }

//FUNCIONES!!!

private mostrarNiveles(): void {
    let niveles = obtenerNiveles();
    if (this.ordenInvertido) {
      niveles.reverse();
    }
    if (this.busqueda !== "") {
      niveles = niveles.filter((nivel) => {
      return nivel.nombre.toLowerCase().includes(this.busqueda.toLowerCase());
      });
    }
  
    let y: number = 160;
    for (const nivel of niveles) {
        this.add.text(40, y, nivel.nombre, {fontSize: "18px", color: "#ffffff"}).setOrigin(0, 0.5);
        crearBoton(this, 300, y, 90, "Editar", () => {
            this.scene.start("EditorScene", {nivelId: nivel.id});
        });
        crearBoton(this, 410, y, 90, "Eliminar", () => {
            eliminarNivel(nivel.id);
            this.scene.restart();
        });
        crearBoton(this, 520, y, 90, "Renombrar", () => {
          const nuevoNombre = prompt("Nuevo nombre:", nivel.nombre);
          if (nuevoNombre === null || nuevoNombre.trim() === "") {
            return;
          }
          renombrarNivel(nivel.id, nuevoNombre.trim());
          this.scene.restart();
        });
        crearBoton(this, 630, y, 90, "Duplicar", () => {
          duplicarNivel(nivel.id);
          this.scene.restart();
        });
        y = y + 60;
    }
 }

 private actualizarTextoBusqueda(): void {
  if (this.busqueda === "") {
    this.textoBusqueda.setText("Buscar nivel...");
    this.textoBusqueda.setColor("#aaaaaa");
  } else {
    this.textoBusqueda.setText(this.busqueda);
    this.textoBusqueda.setColor("#ffffff");
  }
}







}

