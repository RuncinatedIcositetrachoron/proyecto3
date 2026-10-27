import Phaser from "phaser";
import { ajustes } from "./ajustes";

export class TransitionScene extends Phaser.Scene {

    private transition!: Phaser.GameObjects.Sprite;
    private blocker!: Phaser.GameObjects.Rectangle;
    private changing = false;
    private oldDomZIndex = "";
    private oldCanvasPosition = "";
    private oldCanvasZIndex = "";
    private get volumenEfectos(): number {
        return 0.7 * ajustes.efectos;
    }

    constructor() {
        super({
            key: "transition",
            active: true
        });
    }

    preload() {
        this.load.spritesheet(
            "transition",
            "assets/transition.anim.png",
            {
                frameWidth: 192,
                frameHeight: 108,
            }
        );
        this.load.audio("open", "assets/sound/ui_sfx/screentransitionopen.wav",);
        this.load.audio("close", "assets/sound/ui_sfx/screentransitionclose.wav",);
    }

    create() {
        if (!this.anims.exists("transitionclose")) {
            this.anims.create({
                key: "transitionclose",
                frames: [
                    { key: "transition", frame: 0 },
                    { key: "transition", frame: 1 },
                    { key: "transition", frame: 2 },
                    { key: "transition", frame: 3 },
                    { key: "transition", frame: 4 },
                    { key: "transition", frame: 5 },
                ],
                frameRate: 18,
                repeat: 0
            });
        }

        if (!this.anims.exists("transitionopen")) {
            this.anims.create({
                key: "transitionopen",
                frames: [
                    { key: "transition", frame: 5 },
                    { key: "transition", frame: 4 },
                    { key: "transition", frame: 3 },
                    { key: "transition", frame: 2 },
                    { key: "transition", frame: 1 },
                    { key: "transition", frame: 0 },
                ],
                frameRate: 18,
                repeat: 0
            });
        }

        this.transition = this.add.sprite(
            this.scale.width / 2,
            this.scale.height / 2,
            "transition",
            0
        );

        this.transition.setOrigin(0.5);

        const scaleX =
            this.scale.width / this.transition.width;

        const scaleY =
            this.scale.height / this.transition.height;

        const scale =
            Math.max(scaleX, scaleY);

        this.transition.setScale(scale);
        this.transition.setVisible(false);

        this.blocker = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            0x000000,
            0
        );

        this.blocker.setInteractive();
        this.blocker.setVisible(false);
    }

    private putDomBehindCanvas() {
        const domContainer = this.game.domContainer;
        const canvas = this.game.canvas;

        if (!domContainer) {
            return;
        }

        this.oldDomZIndex = domContainer.style.zIndex;
        this.oldCanvasPosition = canvas.style.position;
        this.oldCanvasZIndex = canvas.style.zIndex;

        domContainer.style.zIndex = "0";
        canvas.style.position = "relative";
        canvas.style.zIndex = "1";
    }

    private restoreDom() {
        const domContainer = this.game.domContainer;
        const canvas = this.game.canvas;

        if (!domContainer) {
            return;
        }

        domContainer.style.zIndex = this.oldDomZIndex;
        canvas.style.position = this.oldCanvasPosition;
        canvas.style.zIndex = this.oldCanvasZIndex;
    }

    private playTransition(animation: string): Promise<void> {

        return new Promise((resolve) => {

            this.transition.setVisible(true);

            this.transition.once(
                Phaser.Animations.Events.ANIMATION_COMPLETE,
                () => {
                    resolve();
                }
            );

            this.transition.play(animation);
        });
    }

    private waitFrame(): Promise<void> {
        return new Promise((resolve) => {
            this.time.delayedCall(
                0,
                () => {
                    resolve();
                }
            );
        });
    }

    private wait(ms: number): Promise<void> {
        return new Promise((resolve) => {
            this.time.delayedCall(ms, () => {
                resolve();
            });
        });
    }

    async changeScene(
        oldScene: string,
        newScene: string,
        data: any = {},
        sleepOld: boolean = false
    ) {
        if (this.changing) {
            return;
        }

        this.changing = true;

        this.blocker.setVisible(true);

        this.scene.bringToTop("transition");

        this.putDomBehindCanvas();

        await Promise.all([
            this.playTransition("transitionclose"),
            this.sound.play("open", {
                volume: this.volumenEfectos
            })
        ]);
        await this.wait(240);

        const destinationSleeping = this.scene.isSleeping(newScene);

        if (destinationSleeping) {

            if (sleepOld) {
                this.scene.sleep(oldScene);
            } else {
                this.scene.stop(oldScene);
            }

            this.scene.wake(newScene);

        } else {

            const nextScene =
                this.scene.get(newScene);

            const sceneCreated =
                new Promise<void>((resolve) => {

                    nextScene.events.once(
                        Phaser.Scenes.Events.CREATE,
                        () => {
                            resolve();
                        }
                    );
                });

            if (sleepOld) {
                this.scene.sleep(oldScene);
            } else {
                this.scene.stop(oldScene);
            }

            this.scene.launch(
                newScene,
                data
            );

            await sceneCreated;
        }

        this.scene.bringToTop("transition");

        await this.waitFrame();

        this.sound.play("close", {
            volume: this.volumenEfectos
        });
        
        await this.playTransition("transitionopen");

        this.transition.setVisible(false);
        this.blocker.setVisible(false);

        this.restoreDom();

        this.changing = false;
    }
}