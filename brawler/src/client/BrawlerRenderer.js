import Renderer from 'lance/render/Renderer';
import Fighter from './../common/Fighter';
import Platform from './../common/Platform';

let PIXI = require('pixi.js');
let game = null;

export default class BrawlerRenderer extends Renderer {

    constructor(gameEngine, clientEngine) {
        super(gameEngine, clientEngine);
        game = gameEngine;
        this.sprites = {};

        // remove instructions on first input
        game.once('client__processInput', () => {
            document.getElementById('joinGame').classList.add('hidden');
        });
    }

    get ASSETPATHS() {
        return {
            background: 'assets/deserttileset/png/BG.png',
            fighter: 'assets/adventure_girl/png/Idle (1).png',
            platform: 'assets/deserttileset/png/Tile/2.png',
            jumpSheet: 'assets/adventure_girl/png/Jump.json',
            idleSheet: 'assets/adventure_girl/png/Idle.json',
            meleeSheet: 'assets/adventure_girl/png/Melee.json'
        };
    }

    init() {
        this.pixelsPerSpaceUnit = window.innerWidth / this.gameEngine.spaceWidth;
        if (window.innerHeight < this.gameEngine.spaceHeight * this.pixelsPerSpaceUnit) {
            this.pixelsPerSpaceUnit = window.innerHeight / this.gameEngine.spaceHeight;
        }
        this.viewportWidth = this.gameEngine.spaceWidth * this.pixelsPerSpaceUnit;
        this.viewportHeight = this.gameEngine.spaceHeight * this.pixelsPerSpaceUnit;

        this.stage = new PIXI.Container();

        if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') {
            this.onDOMLoaded();
        } else {
            document.addEventListener('DOMContentLoaded', ()=>{
                this.onDOMLoaded();
            });
        }

        return new Promise((resolve, reject)=>{
            PIXI.loader.add(Object.keys(this.ASSETPATHS).map((x)=>{
                return{
                    name: x,
                    url: this.ASSETPATHS[x]
                };
            }))
            .load(() => {
                this.isReady = true;
                this.setupStage();

                if (isTouchDevice()) {
                    document.body.classList.add('touch');
                } else if (isMacintosh()) {
                    document.body.classList.add('mac');
                } else if (isWindows()) {
                    document.body.classList.add('pc');
                }

                resolve();

                this.gameEngine.emit('renderer.ready');
            });
        });

    }

    setupStage() {
        window.addEventListener('resize', this.setRendererSize.bind(this));
        this.stage.backgroundSprite = new PIXI.Sprite(PIXI.loader.resources.background.texture);
        this.stage.backgroundSprite.width = this.viewportWidth;
        this.stage.backgroundSprite.height = this.viewportHeight;
        this.stage.addChild(this.stage.backgroundSprite);
    }

    setRendererSize() {
        this.pixelsPerSpaceUnit = window.innerWidth / this.gameEngine.spaceWidth;
        if (window.innerHeight < this.gameEngine.spaceHeight * this.pixelsPerSpaceUnit) {
            this.pixelsPerSpaceUnit = window.innerHeight / this.gameEngine.spaceHeight;
        }
        this.viewportWidth = this.gameEngine.spaceWidth * this.pixelsPerSpaceUnit;
        this.viewportHeight = this.gameEngine.spaceHeight * this.pixelsPerSpaceUnit;

        this.renderer.resize(this.viewportWidth, this.viewportHeight);
    }

    onDOMLoaded() {
        this.renderer = PIXI.autoDetectRenderer(this.viewportWidth, this.viewportHeight);
        document.body.querySelector('.pixiContainer').appendChild(this.renderer.view);
    }

    addPlatform(obj) {
        let sprite = new PIXI.Container();
        sprite.platformSprite = new PIXI.extras.TilingSprite(
            PIXI.loader.resources.platform.texture,
            obj.width * this.pixelsPerSpaceUnit,
            obj.height * this.pixelsPerSpaceUnit
        );
        sprite.addChild(sprite.platformSprite);
        this.sprites[obj.id] = sprite;
        sprite.position.set(obj.position.x, obj.position.y);
        this.stage.addChild(sprite);
    }

    addFighter(obj) {
        let sprite = new PIXI.Container();
        let textures = [];
        let sheet = PIXI.loader.resources.meleeSheet;
        for (let t of Object.keys(sheet.textures))
            textures.push(sheet.textures[t]);
        sprite.fighterSprite = new PIXI.extras.AnimatedSprite(textures);
        sprite.fighterSprite.width = obj.width * this.pixelsPerSpaceUnit * 1.6;
        sprite.fighterSprite.height = obj.height * this.pixelsPerSpaceUnit;
        sprite.fighterSprite.anchor.set(0.2, 0.0);
        sprite.addChild(sprite.fighterSprite);
        this.sprites[obj.id] = sprite;
        sprite.position.set(obj.position.x, obj.position.y);
        this.stage.addChild(sprite);
    }

    removeFighter(obj) {
        let sprite = this.sprites(obj.id);
        if (sprite) {
            if (sprite.fighterSprite) sprite.fighterSprite.destroy();
            sprite.destroy();
        }
    }

    draw(t, dt) {
        super.draw(t, dt);

        if (!this.isReady) return; // assets might not have been loaded yet

        // Draw all things
        game.world.forEachObject((id, obj) => {
            let sprite = this.sprites[obj.id];
            if (obj instanceof Fighter) {
                sprite.x = obj.position.x * this.pixelsPerSpaceUnit;
                sprite.y = this.viewportHeight - (obj.position.y + obj.height) * this.pixelsPerSpaceUnit;
                sprite.fighterSprite.gotoAndStop(Math.floor(obj.progress/10));
            } else if (obj instanceof Platform) {
                sprite.x = obj.position.x * this.pixelsPerSpaceUnit;
                sprite.y = this.viewportHeight - (obj.position.y + obj.height) * this.pixelsPerSpaceUnit;
            }
        });

        // update status and render
        this.updateStatus();
        this.renderer.render(this.stage);
    }

    updateStatus() {

        let playerShip = this.gameEngine.world.queryObject({ playerId: this.gameEngine.playerId });

        if (!playerShip) {
            if (this.lives !== undefined)
                document.getElementById('gameover').classList.remove('hidden');
            return;
        }

        // update lives if necessary
        if (playerShip.playerId === this.gameEngine.playerId && this.lives !== playerShip.lives) {
            document.getElementById('lives').innerHTML = 'Lives ' + playerShip.lives;
            this.lives = playerShip.lives;
        }
    }

    removeInstructions() {
        document.getElementById('instructions').classList.add('hidden');
    }
}

function isMacintosh() { return navigator.platform.indexOf('Mac') > -1; }
function isWindows() { return navigator.platform.indexOf('Win') > -1; }
function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints; }
