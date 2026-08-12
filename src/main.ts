import Phaser from "phaser";
import "./style.css";

import { MenuScene } from "./menuscene";
import { GameScene } from "./gamescene";
import { OptionsScene } from "./optionsscene";
import { CreditsScene } from "./creditsscene";
import { EditorScene } from "./editorscene";
import { LevelselectScene } from "./levelselectscene";
import { CommunityScene } from "./communityscene";

await document.fonts.ready;

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    width: 800,
    height: 600,

    backgroundColor: "#2d2d2d",

    pixelArt: true,

    scene: [
        MenuScene,
        GameScene,
        OptionsScene,
        CreditsScene,
        EditorScene,
        LevelselectScene,
        CommunityScene
    ]
};

new Phaser.Game(config);