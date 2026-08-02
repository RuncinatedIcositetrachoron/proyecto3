import Phaser from "phaser";

export class CreditsScene extends Phaser.Scene {
    constructor() {
        super("credits");
    }

    create() {
        this.add.text(400, 300, "CREDITS!", {
            fontSize: "32px",
            color: "#ffffff",
        }).setOrigin(0.5);
    }
}