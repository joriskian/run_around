// the game itself
let game;

// global object with configuration options
let gameOptions = {

    // radius of the big circle, in pixels
    bigCircleRadius: 300,

    // thickness of the big circle, in pixels
    bigCircleThickness: 20,

    // radius of the player, in pixels
    playerRadius: 25,

    // player speed, in degrees per frame
    playerSpeed: 0.6,

    // world gravity
    worldGravity: 0.8,

    // jump force of the single and double jump
    jumpForce: [12, 8]
}

window.onload = function() {
    let gameConfig = {
        type: Phaser.CANVAS,
        backgroundColor: 0x444444,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: "thegame",
            width: 800,
            height: 800
        },
        scene: playGame
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
}
class playGame extends Phaser.Scene{
    constructor(){
        super("PlayGame");
    }
    preload(){
        this.load.image("player", "player.png");
    }
    create(){

        // array to store all painted arcs
        this.paintedArcs = [];

        // calculate the distance from the center of the canvas and the big circle
        this.distanceFromCenter = gameOptions.bigCircleRadius - gameOptions.playerRadius - gameOptions.bigCircleThickness / 2;

        // draw the big circle
        this.bigCircle = this.add.graphics();
        this.bigCircle.lineStyle(gameOptions.bigCircleThickness, 0xffffff);
        this.bigCircle.strokeCircle(game.config.width / 2, game.config.height / 2, gameOptions.bigCircleRadius);

        // graphics object where to draw the highlight circle
        this.highlightCircle = this.add.graphics();

        // add player sprite
        this.player = this.add.sprite(game.config.width / 2, game.config.height / 2 - this.distanceFromCenter, "player");
        this.player.displayWidth = gameOptions.playerRadius * 2;
        this.player.displayHeight = gameOptions.playerRadius * 2;

        // player current angle, on top of the big circle
        this.player.currentAngle = -90;

        // player previous angle, at the moment same value of current angle
        this.player.previousAngle = this.player.currentAngle;

        // jump offset, the distance from the ground and player position during jumps
        this.player.jumpOffset = 0;

        // counter to keep track of player jumps
        this.player.jumps = 0;

        // current jump force
        this.player.jumpForce = 0;

        // input listener
        this.input.on("pointerdown", function(){

            // if the player jumped less than 2 times...
            if(this.player.jumps < 2){

                // one more jump
                this.player.jumps ++;

                // add to player jump force the proper force according to the number of jumps performed
                this.player.jumpForce = gameOptions.jumpForce[this.player.jumps - 1];
            }
        }, this);

        // text to display player progress
        this.levelText = this.add.text(game.config.width / 2, game.config.height / 2, "", {
            fontFamily: "Arial",
            fontSize: 96,
            color: "#00ff00"
        });
        this.levelText.setOrigin(0.5);
    }

    // method to be executed at each frame
    update(){

        // if the player is jumping...
        if(this.player.jumps > 0){

            // increase player jump offset according to jump force
            this.player.jumpOffset += this.player.jumpForce;

            // decrease jump force ti simulate gravity
            this.player.jumpForce -= gameOptions.worldGravity;

            // if jump offset is zero or less than zero, that is the player is on the ground...
            if(this.player.jumpOffset < 0){

                // set jump offset to zero
                this.player.jumpOffset = 0;

                // player is not jumping
                this.player.jumps = 0;

                // player has no jump force
                this.player.jumpForce = 0;
            }
        }

        // update previous angle to current angle
        this.player.previousAngle = this.player.currentAngle;

        // update current angle adding player speed
        this.player.currentAngle = Phaser.Math.Angle.WrapDegrees(this.player.currentAngle + gameOptions.playerSpeed);

        // if player is not jumping...
        if(this.player.jumpOffset == 0){

            // set painted ratio to zero
            this.paintedRatio = 0;

            // convert Phaser angles to a more readable angles where zero is on top, 90 is right, 180 down, 270 left
            let currentAngle = this.getGameAngle(this.player.currentAngle);
            let previousAngle = this.getGameAngle(this.player.previousAngle);

            // if current angle is greater than previous angle...
            if(currentAngle >= previousAngle){

                // put in paintedArcs array a new arc
                this.paintedArcs.push([previousAngle, currentAngle]);
            }
            else{

                // this is the case player passed from a value less than 360 to a value greater than 360, which is zero
                // we manage this case as a couple of arcs
                this.paintedArcs.push([previousAngle, 360]);
                this.paintedArcs.push([0, currentAngle]);
            }

            // prepare highlightCircle graphic object to draw
            this.highlightCircle.clear();
            this.highlightCircle.lineStyle(gameOptions.bigCircleThickness, 0xff00ff);

            // merge small arcs into bigger arcs, if possible
            this.paintedArcs = this.mergeIntervals(this.paintedArcs);

            // loop through all arcs
            this.paintedArcs.forEach(function(i){

                // increase painted ratio value with arc length
                this.paintedRatio += (i[1] - i[0]);

                // draw the arc
                this.highlightCircle.beginPath();
                this.highlightCircle.arc(game.config.width / 2, game.config.height / 2, gameOptions.bigCircleRadius, Phaser.Math.DegToRad(i[0] - 90), Phaser.Math.DegToRad(i[1] - 90), false);
                this.highlightCircle.strokePath();
            }.bind(this));

            // convert the sum of all arcs lenght into a 0 -> 100 value
            this.paintedRatio = Math.round(this.paintedRatio * 100 / 360);

            // update player progress text
            this.levelText.setText(this.paintedRatio + "%");

            // if the player painted the whole circle...
            if(this.paintedRatio == 100){

                // ... restart the game in two seconds
                this.time.addEvent({
                    delay: 2000,
                    callbackScope: this,
                    callback: function(){
                        this.scene.start("PlayGame");
                    }
                });
            }
        }

        // transform degrees to radians
        let radians = Phaser.Math.DegToRad(this.player.currentAngle);

        // determine distance from center according to jump offset
        let distanceFromCenter = this.distanceFromCenter - this.player.jumpOffset;

        // position player using trigonometry
        this.player.x = game.config.width / 2 + distanceFromCenter * Math.cos(radians);
        this.player.y = game.config.height / 2 + distanceFromCenter * Math.sin(radians);

        // rotate player using trigonometry
        let revolutions = gameOptions.bigCircleRadius / gameOptions.playerRadius + 1;
        this.player.angle = -this.player.currentAngle * revolutions;
    }

    // method to convert Phaser angles to a more readable angles
    getGameAngle(angle){
        let gameAngle = angle + 90;
        if(gameAngle < 0){
            gameAngle = 360 + gameAngle
        }
        return gameAngle;
    }

    // method to merge intervals, found at
    // https://gist.github.com/vrachieru/5649bce26004d8a4682b
    mergeIntervals(intervals){
        if(intervals.length <= 1){
            return intervals;
        }
        let stack = [];
        let top = null;
        intervals = intervals.sort(function(a, b){
            return a[0] - b[0]
        });
        stack.push(intervals[0]);
        for(let i = 1; i < intervals.length; i++){
            top = stack[stack.length - 1];
            if(top[1] < intervals[i][0]){
                stack.push(intervals[i]);
            }
            else{
                if (top[1] < intervals[i][1]){
                    top[1] = intervals[i][1];
                    stack.pop();
                    stack.push(top);
                }
            }
        }
        return stack;
    }
}
