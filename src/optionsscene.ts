import Phaser from "phaser";

export class OptionsScene extends Phaser.Scene {
    constructor() {
        super("options");
    }

    create() {
        this.add.text(400, 300, "OPTIONS!", {
            fontSize: "32px",
            color: "#ffffff",
        }).setOrigin(0.5);
    }
}