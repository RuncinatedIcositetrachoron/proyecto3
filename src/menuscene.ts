import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
    private selected = 0;

    private menuItems: Phaser.GameObjects.Text[] = [];
    
    private updateMenu() {
        const labels = ["START", "OPTIONS", "EDITOR", "CREDITS"];

        for (let i = 0; i < this.menuItems.length; i++) {
            if (i === this.selected) {
                this.menuItems[i].setText("> " + labels[i]);
            } else {
                this.menuItems[i].setText(" " + labels[i]);
            }
        }
    }
    constructor() {
        super("menu");
    }

    preload() {
        this.load.image("logo", "assets/logo.png");
    }

    create() {
        const options = [
            "START",
            "OPTIONS",
            "EDITOR",
            "CREDITS"
        ];
        this.add.image(400, 150, "logo").setScale(2);
        for (let i = 0; i < options.length; i++) {
            const text = this.add.text(
                400,
                360 + i * 40,
                options[i],
                {
                    fontFamily: "biysmall",
                    fontSize: "16px",
                    color: "#ffffff",
                }
            ).setOrigin(0.5);
            this.menuItems.push(text);
        }
        
        this.updateMenu();

        this.input.keyboard!.on("keydown-UP", () => {
            this.selected =
                (this.selected - 1 + this.menuItems.length) %
                this.menuItems.length;

            this.updateMenu();
        });

        this.input.keyboard!.on("keydown-DOWN", () => {
            this.selected =
               (this.selected + 1) %
               this.menuItems.length;

            this.updateMenu();
        });

        this.input.keyboard!.on("keydown-ENTER", () => {
            switch (this.selected) {
                case 0:
                    this.scene.start("game", {level: 1});
                    break;
                
                case 1:
                    this.scene.start("options");
                    break;

                case 2:
                    this.scene.start("EditorScene");
                    break;

                case 3:
                    this.scene.start("credits");
                    break;
            }
        });
    }
}