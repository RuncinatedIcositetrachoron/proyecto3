import Phaser from "phaser";

export class CommunityScene extends Phaser.Scene {
    constructor() {
        super("community");
    }

    create() {
        this.add.text(400, 300, "COMMUNITY LEVELS!", {
            fontSize: "32px",
            color: "#ffffff",
        }).setOrigin(0.5);
    }
}