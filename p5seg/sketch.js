var game;
var margin;
var board_size;
var xmods;
var ymods;
var actives;
var colors;

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function randrange(min, max) {
    if(max === undefined) {
        max = Math.floor(min)
        min = 0
    } else {
        min = Math.floor(min);
        max = Math.floor(max);
    }
    return Math.floor(Math.random() * (max - min)) + min;
}

function choice(arr) {
    return arr[randrange(arr.length)]
}

async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => { resolve() }, ms);
    });
}

function repeat(array, n){
  var newArray = [];
  for (var i = 0; i < n; i++){
    newArray = newArray.concat(array);
  }
  return newArray;
}

class Sprite {

    constructor(name) {
        if(name) {
            this.image = images[name]
        }
    }

    set_position(x, y) {
        this.center_x = x
        this.center_y = y
    }

    draw() {
        if(this.image === undefined) {
            return 'weird'
        }
        push()
        if(this.center_x === undefined) {
            console.log(1)
        }
        translate(this.center_x, this.center_y)
        if(this.scale) {
            scale(this.scale)
        }
        rotate(radians(-this.angle))
        image(this.image, -this.image.width/2, -this.image.height/2)
        pop()
    }

}

class GameThing extends Sprite {

    constructor(path) {
        super(path)
        this.radiate = null;
    }
        

    set_board(board) {
        this.board = board
    }

    set_cell(cell) {
        this.cell = cell
    }

    cleanup() {
        return true
    }

    step_on(direction, radiate) {
        if(this.radiate) {
            this.board.player.radiate = new Radiate()
        }
        return this.collect(direction, radiate)
    }

    collect(direction, radiate) {
        return true
    }

    draw() {
        super.draw()
        if(this.radiate) {
            this.radiate.set_position(this.center_x + 20, this.center_y + 20)
            this.radiate.scale = .5
            this.radiate.draw()
        }
    }
}

class Multipart extends GameThing {
    set_position(x, y) {
        super.set_position(x, y)
        this.segments.forEach((segment) => {
            segment.set_position(x, y)
        })
    }

    draw() {
        this.segments.forEach((segment) => {
            segment.draw()
        })
    }
}

class Radiate extends Sprite {
    constructor() {
        super("radiate.png")
    }
}

class Player extends Multipart {
    constructor(x, y) {
        super()
        this.x = x
        this.y = y
        shuffle(colors, true)
        this.segments = Array.from({length: 4}, (x,i) => new Segment(true, i, colors[i], 1))
        this.radiate = null
    }

    can_move(direction) {
        return true
    }

    cleanup() {
        return false
    }

    set_position(x, y) {
        super.set_position(x, y)
        if(this.radiate) {
            this.radiate.set_position(x, y)
        }
    }
    
    draw() {
        super.draw()
        if(this.radiate) {
            this.radiate.set_position(this.center_x, this.center_y)
            this.radiate.scale = .79
            this.radiate.draw()
        }
    }
}

class Device extends Multipart {
    constructor(strength, reward) {
        super()
        this.reward = reward
        shuffle(colors, true)
        let durability_order = [1,1,1,1]
        for(var i=0;i<strength;i++) {
            durability_order[randrange(4)] += 1
        }
        this.segments = Array.from({length: 4}, (x,i) => new Segment(false, i, colors[i], durability_order[i]))
    }

    async bonk(direction) {
        let receiving_segment = this.segments[(direction+2)%4]
        let bonking_segment = this.board.player.segments[direction]

        let shattered = false
        if(bonking_segment.durability == 0) {
            if(![bonking_segment.color, bonking_segment.temp_color.color].includes(receiving_segment.color)) {
                this.board.player.segments[direction] = new DeadSegment(direction)
                receiving_segment.durability -= 1
                shatter.play()
                //await sleep(100)
                let shattered = true
            } else {
                if(receiving_segment.color == bonking_segment.temp_color.color) {
                    bonking_segment.temp_color = new NoneTempColor()
                }
                uhuh.play()
                //await sleep(40)
                return
            }
        } else {
            receiving_segment.durability -= 1
            if([bonking_segment.color, bonking_segment.temp_color.color].includes(receiving_segment.color)) {
                if(receiving_segment.durability > 0) {
                    receiving_segment.durability -= 1
                    bonking_segment.durability -= 1
                }
            } else {
                bonking_segment.durability -= 1
            }

            if(receiving_segment.color == bonking_segment.temp_color.color) {
                bonking_segment.temp_color = new NoneTempColor()
            }
        }

        if(receiving_segment.durability <= 0) {
            let idx = this.cell.indexOf(this)
            this.cell.splice(idx, 1)
            this.cell.push(this.reward)
            this.board.player.radiate = new Radiate()
            if(!shattered) {
                destroy.play()
                //await sleep(50)
            }
        } else {
            choice(bonks).play()
        }

        return false
    }
}
            
class Segment extends Sprite {
    constructor(player, direction, color, durability) {
        super(`${player?'player':'device'}_segment_${color}.png`)
        this.player = player
        this.direction = direction
        this.color = color
        this.durability = durability
        this.temp_color = new NoneTempColor()
        this.angle = -90 * direction
    }

    set_temp_color(color) {
        this.temp_color = new TempColor(color, this.angle)
    }

    draw() {
        super.draw()
        fill('black')
        textSize(14)
        text(`${this.durability}`, this.center_x + (this.player?20:18) * xmods[this.direction],
             this.center_y + (this.player?20:18) * ymods[this.direction])

        if(this.temp_color) {
            this.temp_color.set_position(this.center_x, this.center_y)
            this.temp_color.draw()
        }
    }
}

class DeadSegment extends GameThing {
    constructor(direction) {
        super("dead_segment.png")
        this.color = null
        this.direction = direction
        this.durability = 0
        this.angle = -90 * direction
        this.temp_color = new NoneTempColor()
    }

    set_temp_color(color) {}
}

class Goop extends GameThing {
    constructor() {
        super("goop.png")
        this.duration = 2
        this.angle = choice([0, 90, 180, 270])
    }

    can_move(direction) {
        stuck.play()
        if(this.duration == 0) {
            let idx = this.cell.indexOf(this)
            this.cell.splice(idx, 1)
        } else {
            this.duration -= 1
        }
        return false
    }

    stick(direction) {
        goop.play()
    }

    cleanup() { return false }
    
}

class Exit extends GameThing {
    constructor() {
        super("exit.png")
        this.radiate = new Radiate()
    }

    can_move(direction) { return true }

    async collect(direction, radiate) {
        let idx = game.board_list.indexOf(this.board)
        let new_board = new Board(game, this.board.x, this.board.y, this.angle, this.board.level + 1, this.board.player)
        game.board_list.splice(idx, 1, new_board)
        exitsound.play()
        //await sleep(100)

        return true
    }
}

class TempColor extends GameThing {
    constructor(color, angle) {
        super(`temp_color_${color}.png`)
        this.color = color
        this.angle = angle
    }
}

class NoneTempColor extends GameThing {
    constructor() {
        super("none_temp_color.png")
        this.color = null
    }
}

class AddTempColor extends GameThing {
    constructor(radiate) {
        super("add_temp_color.png")
        if(radiate) {
            this.radiate = new Radiate()
        }
    }

    collect(direction, radiate) {
        game.board_list.forEach((b) => {
            if(b !== this.board ? !radiate : radiate) {
                return
            }

            if((b.player.segments[direction] instanceof DeadSegment) ||
               (this.board.player.segments[direction] instanceof DeadSegment)) {
                return
            }

            if(b !== this.board) {
                b.player.segments[direction].set_temp_color(this.board.player.segments[direction].color)
            } else {
                let options = [...colors]
                let idx = options.indexOf(b.player.segments[direction].color)
                options.splice(idx, 1)
                b.player.segments[direction].set_temp_color(choice(options))
            }
        })

        tempcolor.play()
    }
}

class Flip extends GameThing {
    constructor(vertical, radiate) {
        super("flip.png")
        this.vertical = vertical
        if(radiate) {
            this.radiate = new Radiate()
        }

    }

    collect(direction, radiate) {
        game.board_list.forEach((b) => {
            if(b !== this.board ? !radiate : radiate) {
                return
            }

            if(this.vertical) {
                [b.player.segments[0], b.player.segments[2]] = [b.player.segments[2], b.player.segments[0]];
                [b.player.segments[0].angle, b.player.segments[2].angle] = [b.player.segments[2].angle, b.player.segments[0].angle];
                [b.player.segments[0].direction, b.player.segments[2].direction] = [b.player.segments[2].direction, b.player.segments[0].direction];
                b.player.segments[0].temp_color.angle = b.player.segments[0].angle
                b.player.segments[2].temp_color.angle = b.player.segments[2].angle
            } else {
                [b.player.segments[1], b.player.segments[3]] = [b.player.segments[3], b.player.segments[1]];
                [b.player.segments[1].angle, b.player.segments[3].angle] = [b.player.segments[3].angle, b.player.segments[1].angle];
                [b.player.segments[1].direction, b.player.segments[3].direction] = [b.player.segments[3].direction, b.player.segments[1].direction];
                b.player.segments[1].temp_color.angle = b.player.segments[1].angle
                b.player.segments[3].temp_color.angle = b.player.segments[3].angle

            }

            flip.play()
        })
    }
}

class FlipVertical extends Flip {
    constructor(radiate) {
        super(true, radiate)
        this.angle = 90
    }
}

class FlipHorizontal extends Flip {
    constructor(radiate) {
        super(false, radiate)
    }
}       

class Rotate extends GameThing {
    constructor(path, direction, radiate) {
        super(path)
        this.direction = direction
        if(radiate) {
            this.radiate = new Radiate()
        }
    }

    async collect(direction, radiate) {
        game.board_list.forEach((b) => {
            if(b !== this.board ? !radiate : radiate) {
                return
            }

            b.cells.forEach((column) => {
                column.forEach((cell) => {
                    cell.forEach((thing) => {
                        if(thing instanceof Device) {
                            // move first segment to the end or vice versa
                            if(this.direction == 1) {
                                thing.segments = [thing.segments[1], thing.segments[2], thing.segments[3], thing.segments[0]]
                            } else {
                                thing.segments = [thing.segments[3], thing.segments[0], thing.segments[1], thing.segments[2]]
                            }
                            thing.segments.forEach((segment) => {
                                segment.direction -= this.direction
                                segment.direction = mod(segment.direction, 4)
                                segment.angle += 90 * this.direction
                            })
                        }
                    })
                })
            })
        })

        this.direction == 1 ? left.play() : right.play()
        //await sleep(50)
    }
}

class RotateRight extends Rotate {
    constructor(radiate) {
        super("rotate_right.png", -1, radiate)
    }
}

class RotateLeft extends Rotate {
    constructor(radiate) {
        super("rotate_left.png", 1, radiate)
    }
}

class SpawnDevice extends GameThing {
    constructor(radiate) {
        super("spawn_device.png")
        if(radiate) {
            this.radiate = new Radiate()
        }
    }

    async collect(direction, radiate) {
        game.board_list.forEach((b) => {
            if((b !== this.board ? !radiate : radiate) || b.board_over) {
                return
            }

            let cell = b.freecell()
            let strength = randrange(13)
            cell.push(new Device(strength, b.reward(strength)))
        })
        grow.play()
    }
}
        
class Gadget extends GameThing {
    constructor(quantity, radiate) {
        super("gadget.png")
        this.quantity = quantity
        if(radiate) {
            this.radiate = new Radiate()
        }
    }

    collect(direction, radiate) {
        game.board_list.forEach((b) => {
            if(b !== this.board ? !radiate : radiate) {
                return
            }

            let target_color = this.board.player.segments[direction].color
            b.player.segments.forEach((segment) => {
                if(segment.color == target_color) {
                    segment.durability += this.quantity
                    return
                }
            })

            gadgets.play()
        })
    }

    draw() {
        super.draw()
        fill('black')
        textSize(20)
        text(`${this.quantity}`, this.center_x, this.center_y)
    }
}

class Board extends Sprite {
    
    constructor(game, x, y, angle, level, player=null) {
        super(`level_${level}.png`)
        this.size = 5;
        this.cell_size = board_size / this.size;
        [this.x, this.y, this.angle, this.level, this.player] = [x, y, angle, level, player]
        this.background = bgcolor
        this.displayed_score = 0
        this.has_exit = true
        this.set_position(this.x + board_size / 2, this.y + board_size / 2)

        this.cells = Array.from({length: this.size}, ()=>Array.from({length: this.size}, ()=>[]))

        if(!player) {
            this.player = new Player(randrange(this.size), randrange(this.size))
        }
        this.cells[this.player.x][this.player.y].push(this.player)

        if(level == 5) {
            this.board_over = true
            return
        }
        this.board_over = false

        let weakcell = this.freecell()
        weakcell.push(new Device(2+level*2, this.reward(2)))

        for(var i=0;i<this.size-2;i++) {
            let strength = randrange(2+level*2, 13+level*3)
            let cell = this.freecell()
            cell.push(new Device(strength, this.reward(strength)))
        }
        let exitcell = this.freecell()
        exitcell.push(new Device(3*level + randrange(7), new Exit()))

        let num_actives = randrange(3,6)
        for(var i=0;i<num_actives;i++) {
            let active = choice(actives[this.level])
            this.freecell().push(new active(false))
        }
        if(num_actives == 3) {
            let active = choice(actives[this.level])
            this.freecell().push(new active(true))
        }

        let num_gadgets = randrange(2,5)
        for(var i=0;i<num_gadgets;i++) {
            this.freecell().push(new Gadget(randrange(1,3), false))
        }
        if(num_gadgets == 2) {
            this.freecell().push(new Gadget(1, true))
        }

        for(var i=0;i<randrange(3,6);i++) {
            this.freecell().push(new Goop())
        }
    }

    reward(strength) {
        if(!this.has_exit) {
            this.has_exit = true
            return new Exit()
        }
        let has_active = Math.random() < .33
        if(has_active) {
            let active = choice(actives[this.level])
            let radiate = false
            if(strength > 5) {
                radiate = true
            }
            return new active(radiate)
        }

        if(strength < 8) {
            return new Gadget(choice([1,1,1,1,2]), false)
        }
        if(strength < 15) {
            return new Gadget(choice([1,1,2,2,2]), false)
        }
        if(strength < 24) {
            return new Gadget(choice([2,2,3]), choice([true, false]))
        }
        return new Gadget(choice([2,3]), true)
    }

    freecell() {
        let candidates = []
        this.cells.forEach((sublist) => {
            sublist.forEach((cell) => {
                if(cell.length == 0) {
                    candidates.push(cell)
                }
            })
        })
        return choice(candidates)
    }


    playercell() {
        return this.cells[this.player.x][this.player.y]
    }

    display_score() {
        let score = game.score()
        if(game.board_list.every((x)=>x.board_over)) {
            fill(255, 126, 0)
            textSize(40)
            if(score >= 100) {
                let hundreds = Math.floor(score/100)
                score %= 100
                text(`${hundreds} hundred and`, board_size + margin / 2, board_size*2-1.9*board_size)
            }
            text("points!", board_size+margin/2, board_size*2-margin*4)
        }
        if(this.displayed_score != score) {
            this.displayed_score = score
            let tens = this.center_x < board_size
            let top = this.center_y < board_size
            var digit;
            if(tens) {
                digit = Math.floor(score/10)
            } else {
                digit = score % 10
            }
            this.digit = new Sprite(`${digit}_${top?'top':'bot'}.png`)
            this.digit.set_position(this.center_x, this.center_y + (top?-2:2))
        }
    }

    draw() {
        push()
        fill(this.background)
        noStroke()
        square(this.x - margin, this.y - margin, board_size+margin*2)
        pop()
        super.draw()
        if(this.board_over) {
            this.display_score()
            if(this.digit.draw() == 'weird') {
                this.displayed_score = -1
            }
            this.player.draw()
            return
        }

        this.cells.forEach((column, i) => {
            column.forEach((cell, j) => {
                if(cell.includes(this.player)) {
                    let idx = cell.indexOf(this.player)
                    cell.splice(idx, 1)
                    cell.unshift(this.player)
                }
                cell.forEach((sprite, k) => {
                    if(sprite.board === undefined) {
                        sprite.set_board(this)
                    }
                    if(sprite.cell === undefined) {
                        sprite.set_cell(cell)
                    }

                    sprite.set_position(this.x + this.cell_size/2+i*this.cell_size, this.y+this.cell_size/2+j*this.cell_size)
                    sprite.draw()
                })
            })
        })
    }

    async move(direction) {
        let x = this.player.x + xmods[direction]
        let y = this.player.y + ymods[direction]
        if(x >= this.size || x < 0 || y >= this.size || y < 0) {
            tink.play()
            return
        }

        // check move-from restrictions first, so you can't bonk while stuck
        if(this.playercell().some((obj) => {
            if(typeof(obj.can_move) === 'function' && !obj.can_move(direction)) {
                return true
            }
        })) { return false }

        let to_cell = this.cells[this.player.x + xmods[direction]][this.player.y + ymods[direction]]

        if(!to_cell.length) {
            step.play()
        } else {
            if(!(this.player.segments[direction] instanceof DeadSegment)) {
                // the things we're checking for here have to be alone
                let obj = to_cell[0]
                if(obj instanceof Device) {
                    obj.bonk(direction)
                    return
                } else if(obj instanceof Goop) {
                    obj.stick(direction)
                } else {
                    step.play()
                }
            }
        }

        if((this.player.segments[direction] instanceof DeadSegment) && to_cell.length) {
            chomp.play()
            if(to_cell[0] instanceof Device) {
                to_cell.splice(0, 99, to_cell[0].reward)
            } else {
                if(to_cell[0] instanceof Exit) {
                    this.has_exit = false
                }
                to_cell.splice(0, 99)
            }
        }

        // actually moving
        let idx = this.playercell().indexOf(this.player)
        this.playercell().splice(idx, 1)
        this.player.x += xmods[direction]
        this.player.y += ymods[direction]
        to_cell.push(this.player)
        return true
    }

    async collect(direction) {
        let stuff = this.playercell().filter((x) => x !== this.player)
        if(!stuff.length) {
            return null
        }
        
        this.background = color(180,30,80)
        await sleep(speed * .7)
        stuff.forEach((obj) => {
            let keep_radiate = obj.step_on(direction, !!this.player.radiate)

            if(this.player.radiate && !keep_radiate) {
                this.player.radiate = null
            }

            if(obj.radiate) {
                this.player.radiate = new Radiate()
            }
        })

        this.playercell().splice(0, 99, ...this.playercell().filter((x) => !x.cleanup()))
        return true
    }
}

class Restart extends Sprite {
    constructor() {
        super("restart.png")
        this.set_position(board_size+50, board_size)
    }
}

class Game {
    constructor() {
        this.directions = {
            38: 0,
            39: 1,
            40: 2,
            37: 3,
            87: 0,
            68: 1,
            83: 2,
            65: 3,
        }

        this.restart = new Restart()
    }

    setup() {
        this.input_lock = false
        this.restart_confirm = false

        let level = 1
        this.board_list = []
        this.board_list.push(new Board(this, margin, margin, 180, level))
        this.board_list.push(new Board(this, board_size+2*margin, margin, 270, level))

        this.board_list.push(new Board(this, margin, board_size+2*margin, 90, level))
        this.board_list.push(new Board(this, board_size+2*margin, board_size + 2*margin, 0, level))
    }

    score() {
        return this.board_list.map((x) => x.player).reduce((sum, player) => {
            return sum + player.segments.reduce((sum, segment) => {
                return sum + ((segment instanceof DeadSegment) ? 0 : segment.durability)
            }, 0)
        }, 0)
    }

    draw() {
        fill(148,201,61)
        square(0,0,board_size*2 + margin * 3)
        this.board_list.forEach((board) => {
            if(board.background === bgcolor) {
                board.draw()
            }
        })
        this.board_list.forEach((board) => {
            if(board.background !== bgcolor) {
                board.draw()
            }
        })



        if(this.restart_confirm) {
            this.restart.draw()
        }
    }

    async on_key_release(k) {
        if(k in this.directions && !this.input_lock) {
            this.input_lock = true
            await this.process_input(k)
        } else if(k == 82) { //R
            if(this.restart_confirm) {
                game = new Game()
                game.setup()
            } else {
                this.restart_confirm = true
                return
            }
        } else if(parseInt(key)) {
            speed = parseInt(key) * parseInt(key)/2 * 60 
        }
            
        this.restart_confirm = false
    }

    async process_input(k) {
        let moved = []
        await asyncForEach(this.board_list, async (board) => {
            if(!board.board_over) {
                board.background = color(30,80,180)
                await sleep(speed/2)
                if(await board.move(this.directions[k])) {
                    moved.push(board)
                }
                await sleep(speed/2)
                board.background = bgcolor
            }
        })

        asyncForEach(moved, async (board) => {
            if(!board.board_over) {
                if(await board.collect(this.directions[k])) {
                    await sleep(speed/2)
                    board.background = bgcolor
                }
            }
        })

        this.input_lock = false
    }
}
                   
async function keyReleased() {
    await game.on_key_release(keyCode)
    return
}

function preload() {
    
    soundFormats('mp3', 'wav');

    gadgets = loadSound("sounds/gadgets.wav")
    tempcolor = loadSound("sounds/tempcolor.wav")
    chomp = loadSound("sounds/chomp.wav")
    grow = loadSound("sounds/grow.wav")
    uhuh = loadSound("sounds/uhuh.wav")
    shatter = loadSound("sounds/shatter.wav")
    destroy = loadSound("sounds/destroy.wav")
    tink = loadSound("sounds/tink.wav")
    exitsound = loadSound("sounds/exit.wav")
    right = loadSound("sounds/rotateright.wav")
    left = loadSound("sounds/rotateleft.wav")
    goop = loadSound("sounds/goop.wav")
    stuck = loadSound("sounds/stuck.wav")
    step =  loadSound("sounds/step.wav")
    flip = loadSound("sounds/flip.wav")

    images = {
        "0_bot.png": loadImage("images/0_bot.png"),
        "0_top.png": loadImage("images/0_top.png"),
        "1_bot.png": loadImage("images/1_bot.png"),
        "1_top.png": loadImage("images/1_top.png"),
        "2_bot.png": loadImage("images/2_bot.png"),
        "2_top.png": loadImage("images/2_top.png"),
        "3_bot.png": loadImage("images/3_bot.png"),
        "3_top.png": loadImage("images/3_top.png"),
        "4_bot.png": loadImage("images/4_bot.png"),
        "4_top.png": loadImage("images/4_top.png"),
        "5_bot.png": loadImage("images/5_bot.png"),
        "5_top.png": loadImage("images/5_top.png"),
        "6_bot.png": loadImage("images/6_bot.png"),
        "6_top.png": loadImage("images/6_top.png"),
        "7_bot.png": loadImage("images/7_bot.png"),
        "7_top.png": loadImage("images/7_top.png"),
        "8_bot.png": loadImage("images/8_bot.png"),
        "8_top.png": loadImage("images/8_top.png"),
        "9_bot.png": loadImage("images/9_bot.png"),
        "9_top.png": loadImage("images/9_top.png"),
        "add_temp_color.png": loadImage("images/add_temp_color.png"),
        "dead_segment.png": loadImage("images/dead_segment.png"),
        "device_segment_green.png": loadImage("images/device_segment_green.png"),
        "device_segment_orange.png": loadImage("images/device_segment_orange.png"),
        "device_segment_pink.png": loadImage("images/device_segment_pink.png"),
        "device_segment_purple.png": loadImage("images/device_segment_purple.png"),
        "exit.png": loadImage("images/exit.png"),
        "flip.png": loadImage("images/flip.png"),
        "foo.png": loadImage("images/foo.png"),
        "gadget.png": loadImage("images/gadget.png"),
        "goop.png": loadImage("images/goop.png"),
        "level_0.png": loadImage("images/level_0.png"),
        "level_1.png": loadImage("images/level_1.png"),
        "level_2.png": loadImage("images/level_2.png"),
        "level_3.png": loadImage("images/level_3.png"),
        "level_4.png": loadImage("images/level_4.png"),
        "level_5.png": loadImage("images/level_5.png"),
        "none_temp_color.png": loadImage("images/none_temp_color.png"),
        "player_segment_green.png": loadImage("images/player_segment_green.png"),
        "player_segment_orange.png": loadImage("images/player_segment_orange.png"),
        "player_segment_pink.png": loadImage("images/player_segment_pink.png"),
        "player_segment_purple.png": loadImage("images/player_segment_purple.png"),
        "points.png": loadImage("images/points.png"),
        "radiate.png": loadImage("images/radiate.png"),
        "restart.png": loadImage("images/restart.png"),
        "rotate_left.png": loadImage("images/rotate_left.png"),
        "rotate_right.png": loadImage("images/rotate_right.png"),
        "spawn_device.png": loadImage("images/spawn_device.png"),
        "temp_color_green.png": loadImage("images/temp_color_green.png"),
        "temp_color_orange.png": loadImage("images/temp_color_orange.png"),
        "temp_color_pink.png": loadImage("images/temp_color_pink.png"),
        "temp_color_purple.png": loadImage("images/temp_color_purple.png"),
    }
    
    bonks = Array.from({length: 5}, (x,i) => loadSound("sounds/bonk"+i+".wav"))

}
        
function setup() {
    margin = 5
    board_size = 362
    speed = 800

    xmods = {0: 0, 1: 1, 2: 0, 3: -1}
    ymods = {0: -1, 1: 0, 2: 1, 3: 0}

    bgcolor = color(148,201,61)

    actives = { 1: repeat([AddTempColor,
                           RotateRight,
                           RotateLeft ], 3).concat(
                               [ FlipVertical, FlipHorizontal, SpawnDevice ]
                           ),
                2: repeat([FlipVertical, FlipHorizontal], 3).concat(
                    [ RotateRight, RotateLeft, SpawnDevice]
                ),
                3: repeat([SpawnDevice], 4).concat(repeat([AddTempColor, RotateRight, RotateLeft], 2)).concat([FlipHorizontal, FlipVertical]),
                4: repeat([AddTempColor, FlipHorizontal, FlipVertical], 3).concat([RotateRight, RotateLeft, SpawnDevice])
              }

    colors = ["orange", "pink", "green", "purple"]
    textAlign(CENTER, CENTER)

    game = new Game()
    game.setup()

    let width = board_size * 2 + margin * 3
    let height = width
    createCanvas(width, height)
}

async function draw() {
    game.draw()
}
