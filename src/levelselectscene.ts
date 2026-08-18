import Phaser from "phaser";

export class LevelselectScene extends Phaser.Scene {
    constructor() {
        super("levelselect");
    }

    create() {
        this.add.text(400, 300, "Level Select", {
            fontSize: "32px",
            color: "#ffffff",
        }).setOrigin(0.5);
    }
}