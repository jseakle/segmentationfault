import arcade
import random
import os, time
from threading import Thread
from random import randrange, shuffle, choice

margin = 5
board_size = 362

#random.seed(5)


gadgets = arcade.load_sound("sounds/gadgets.wav")
tempcolor = arcade.load_sound("sounds/tempcolor.wav")
chomp = arcade.load_sound("sounds/chomp.wav")
grow = arcade.load_sound("sounds/grow.wav")
uhuh = arcade.load_sound("sounds/uhuh.wav")
shatter = arcade.load_sound("sounds/shatter.wav")
destroy = arcade.load_sound("sounds/destroy.wav")
tink = arcade.load_sound("sounds/tink.wav")
exitsound = arcade.load_sound("sounds/exit.wav")
right = arcade.load_sound("sounds/rotateright.wav")
left = arcade.load_sound("sounds/rotateleft.wav")
goop = arcade.load_sound("sounds/goop.wav")
stuck = arcade.load_sound("sounds/stuck.wav")
step =  arcade.load_sound("sounds/step.wav")
flip = arcade.load_sound("sounds/flip.wav")
bonks = list(map(arcade.load_sound, map(lambda i: "sounds/bonk{}.wav".format(i), range(5))))



class GameThing(arcade.Sprite):

    radiate = None

    def set_board(self, board):
        self.board = board

    def set_cell(self, cell):
        self.cell = cell

    def cleanup(self):
        return True

    def step_on(self, direction, radiate):
        if hasattr(self, 'radiate') and self.radiate:
            self.board.player.radiate = Radiate()
        return self.collect(direction, radiate)

    def collect(self, direction, radiate):
        return True

    def draw(self):
        super().draw()
        if self.radiate:
            self.radiate.set_position(self.center_x + 20, self.center_y + 20)
            self.radiate.scale = .5
            self.radiate.draw()

class Multipart(GameThing):

    def set_position(self, x, y):
        super().set_position(x, y)
        for segment in self.segments:
            segment.set_position(x, y)

    def draw(self):
        for segment in self.segments:
            segment.draw()
            

class Radiate(arcade.Sprite):
    def __init__(self):
        super().__init__("images/radiate.png")
        
            
class Player(Multipart):

    def __init__(self, x, y):
        super().__init__()
        self.x, self.y = x, y
        shuffle(colors)
        self.segments = [Segment(True, i, colors[i], 1) for i in range(4)]
        self.radiate = None

    def can_move(self, direction):
        return True

    def cleanup(self):
        return False

    def set_position(self, x, y):
        super().set_position(x, y)
        if self.radiate:
            self.radiate.set_position(x, y)

    def draw(self):
        super().draw()
        if self.radiate:
            self.radiate.draw()


class Device(Multipart):

    def __init__(self, strength, reward):
        super().__init__()
        self.reward = reward
        shuffle(colors)
        durability_order = [1,1,1,1]
        for i in range(strength):
            durability_order[randrange(4)] += 1
        self.segments = [Segment(False, i, colors[i], durability_order[i]) for i in range(4)]

    def bonk(self, direction):
        receiving_segment = self.segments[(direction + 2) % 4]
        bonking_segment = self.board.player.segments[direction]

        shattered = False
        if bonking_segment.durability == 0:
            if receiving_segment.colour not in [bonking_segment.colour, bonking_segment.temp_color.colour]:
                self.board.player.segments[direction] = DeadSegment(direction)
                receiving_segment.durability -= 1
                arcade.play_sound(shatter)
                time.sleep(.1)
                shattered = True
            else:
                if receiving_segment.colour == bonking_segment.temp_color.colour:
                    bonking_segment.temp_colour = NoneTempColor()
                # Can't die to your own color
                arcade.play_sound(uhuh)
                time.sleep(.04)
                return
        else:
            receiving_segment.durability -= 1
            if receiving_segment.colour in [bonking_segment.colour, bonking_segment.temp_color.colour]:
                if receiving_segment.durability > 0:
                    receiving_segment.durability -= 1
                    bonking_segment.durability -= 1
            else:
                bonking_segment.durability -= 1

            if receiving_segment.colour == bonking_segment.temp_color.colour:
                bonking_segment.temp_color = NoneTempColor()

        if receiving_segment.durability <= 0:
            self.cell.remove(self)
            self.cell.append(self.reward)
            self.board.player.radiate = Radiate()
            if not shattered:
                arcade.play_sound(destroy)
                time.sleep(.5)
        else:
            arcade.play_sound(random.choice(bonks))

        return False

class Segment(arcade.Sprite):

    def __init__(self, player, direction, color, durability):
        # colour because arcade reserves .color on sprites :/
        self.player, self.direction, self.colour, self.durability = player, direction, color, durability
        self.temp_color = NoneTempColor()
        super().__init__(f"images/{('device','player')[player]}_segment_{color}.png")
        self.angle = -90 * direction

    def set_temp_color(self, color):
        self.temp_color = TempColor(color, self.angle)

    def draw(self):
        super().draw()
        arcade.draw_text(f"{self.durability}", self.center_x + 20 * xmods[self.direction], self.center_y + 20 * ymods[self.direction], color=arcade.color.BLACK, align="center", anchor_x="center", anchor_y="center")

        if self.temp_color:
            self.temp_color.set_position(self.center_x, self.center_y)
            self.temp_color.draw()

class DeadSegment(GameThing):
    
    def __init__(self, direction):
        super().__init__(f"images/dead_segment.png")
        self.colour = None
        self.direction = direction
        self.durability = 0
        self.angle = -90 * self.direction

    def set_temp_color(self, color):
        pass


class Goop(GameThing):
    def __init__(self):
        super().__init__("images/goop.png")
        self.duration = 2
        self.angle = choice([0, 90, 180, 270])

    def can_move(self, direction):
        arcade.play_sound(stuck)
        if self.duration == 0:
            self.cell.remove(self)
            return False
        else:
            self.duration -= 1
            return False

    def stick(self, direction):
        arcade.play_sound(goop)

    def cleanup(self):
        return False
        

class Exit(GameThing):

    def __init__(self):
        super().__init__("images/exit.png")
        self.radiate = Radiate()

    def can_move(self, direction):
        return True

    def collect(self, direction, radiate):
        game.board_list.remove(self.board)
        new_board = Board(game, self.board.x, self.board.y, self.angle, self.board.level + 1, self.board.player)
        game.board_list.append(new_board)
        arcade.play_sound(exitsound)
        time.sleep(.1)

        return True

class TempColor(GameThing):
    def __init__(self, color, angle):
        super().__init__(f"images/temp_color_{color}.png")
        self.colour = color
        self.angle = angle

class NoneTempColor(GameThing):
    def __init__(self):
        super().__init__("images/none_temp_color.png")
        self.colour = None
        

class AddTempColor(GameThing):
    def __init__(self, radiate):
        super().__init__("images/add_temp_color.png")
        if radiate:
            self.radiate = Radiate()

    def collect(self, direction, radiate):
        for b in game.board_list:
            if (b is not self.board) ^ radiate:
                continue

            if isinstance(b.player.segments[direction], DeadSegment) or \
               isinstance(self.board.player.segments[direction], DeadSegment):
                continue

            if b is not self.board:
                b.player.segments[direction].set_temp_color(self.board.player.segments[direction].colour)
            else:
                options = colors.copy()
                options.remove(b.player.segments[direction].colour)
                b.player.segments[direction].set_temp_color(choice(options))
        arcade.play_sound(tempcolor)


class Flip(GameThing):
    def __init__(self, path, vertical):
        super().__init__(path)
        self.vertical = vertical

    def collect(self, direction, radiate):
        for b in game.board_list:
            if (b is not self.board) ^ radiate:
                continue
        
            if self.vertical:
                b.player.segments[0], b.player.segments[2] = b.player.segments[2], b.player.segments[0]
                b.player.segments[0].angle, b.player.segments[2].angle = b.player.segments[2].angle, b.player.segments[0].angle
                b.player.segments[0].direction, b.player.segments[2].direction = b.player.segments[2].direction, b.player.segments[0].direction
            else:
                b.player.segments[1], b.player.segments[3] = b.player.segments[3], b.player.segments[1]
                b.player.segments[1].angle, b.player.segments[3].angle = b.player.segments[3].angle, b.player.segments[1].angle
                b.player.segments[1].direction, b.player.segments[3].direction = b.player.segments[3].direction, b.player.segments[1].direction                
            arcade.play_sound(flip)

class FlipVertical(Flip):                
    def __init__(self, radiate):
        super().__init__("images/flip.png", True)
        if radiate:
            self.radiate = Radiate()
        self.angle = 90

class FlipHorizontal(Flip):                
    def __init__(self, radiate):
        super().__init__("images/flip.png", False)
        if radiate:
            self.radiate = Radiate()
        
class Rotate(GameThing):
    def __init__(self, path, direction):
        super().__init__(path)
        self.direction = direction

    def collect(self, direction, radiate):
        for b in game.board_list:
            if (b is not self.board) ^ radiate:
                continue

            for column in b.cells:
                for cell in column:
                    for thing in cell:
                        if isinstance(thing, Device):
                            # move first segment to the end or vice versa
                            thing.segments.insert([0,4][self.direction == 1], thing.segments.pop([-1,0][self.direction == 1]))
                            for segment in thing.segments:
                                segment.direction += -self.direction
                                segment.direction %= 4
                                segment.angle += 90 * self.direction
        
        arcade.play_sound([right, left][self.direction == 1])
        time.sleep(.05)
        
class RotateRight(Rotate):
    def __init__(self, radiate):
        super().__init__("images/rotate_right.png", -1)
        if radiate:
            self.radiate = Radiate()
        
class RotateLeft(Rotate):
    def __init__(self, radiate):
        super().__init__("images/rotate_left.png", 1)
        if radiate:
            self.radiate = Radiate()

class SpawnDevice(GameThing):
    def __init__(self, radiate):
        super().__init__("images/spawn_device.png")
        if radiate:
            self.radiate = Radiate()
        
    def collect(self, direction, radiate):
        for b in game.board_list:
            if (b is not self.board) ^ radiate or b.board_over:
                continue

            cell = b.freecell()
            strength = randrange(13)
            cell.append(Device(strength, b.reward(strength)))
        arcade.play_sound(grow)
        time.sleep(.04)

class Gadget(GameThing):
    def __init__(self, quantity, radiate):
        self.quantity = quantity
        super().__init__("images/gadget.png")
        if radiate:
            self.radiate = Radiate()
        
    def collect(self, direction, radiate):
        for b in game.board_list:
            if (b is not self.board) ^ radiate:
                continue

            target_color = self.board.player.segments[direction].colour
            for segment in b.player.segments:
                if segment.colour == target_color:
                    segment.durability += self.quantity
                    break
                
        arcade.play_sound(gadgets)

    def draw(self):
        super().draw()
        arcade.draw_text(f"{self.quantity}", self.center_x -7, self.center_y - 12, arcade.color.BLACK, 20, align="center", )

class Digit(arcade.Sprite):
    def __init__(self, path):
        super().__init__(path)

class Board(arcade.Sprite):

    size = 5
    cell_size = board_size / size

    def __init__(self, game, x, y, angle, level, player=None):
        super().__init__(f"images/level_{level}.png")
        self.x, self.y, self.angle, self.level, self.player = x, y, angle, level, player
        self.displayed_score = 0
        self.has_exit = True
        self.set_position(self.x + board_size / 2, self.y + board_size / 2)

        self.cells = [ [[] for i in range(self.size)] for j in range(self.size) ]

        if not player:
            self.player = Player(randrange(self.size), randrange(self.size))
        self.cells[self.player.x][self.player.y].append(self.player)

        if level == 5:
            self.board_over = True
            return
        self.board_over = False

        weakcell = self.freecell()
        weakcell.append(Device(strength=2 + level * 2, reward=self.reward(2)))
        for i in range(self.size - 2):
            strength = randrange(2 + level * 2, 13 + level * 3)
            cell = self.freecell()
            cell.append(Device(strength, self.reward(strength)))
        exitcell = self.freecell()
        exitcell.append(Device(strength=3 * level + randrange(7), reward=Exit()))

        num_actives = randrange(3,6)
        for i in range(num_actives):
            self.freecell().append(random.choice(actives[self.level])(False))
        if num_actives == 3: # Make a radiate one if few
            self.freecell().append(random.choice(actives[self.level])(True))

        num_gadgets = randrange(3,5)
        for i in range(num_gadgets):
            self.freecell().append(Gadget(randrange(1,3), False))
        if num_gadgets == 3:
            self.freecell().append(Gadget(1, True))

        for i in range(randrange(3,6)):
            self.freecell().append(Goop())

    def reward(self, strength):
        if not self.has_exit:
            self.has_exit = True
            return Exit()
        has_active = random.random() < .33
        if has_active:
            active = random.choice(actives[self.level])
            radiate = False
            if strength > 5:
                radiate = True
            return active(radiate)

        if strength < 8:
            return Gadget(choice([1,1,1,1,2]), False)
        if strength < 15:
            return Gadget(choice([1,1,2,2,2]), False)
        if strength < 24:
            return Gadget(choice([2,2,3]), choice([True, False]))
        return Gadget(choice([2,3]), True)
            
        
    def freecell(self):
        return random.choice([cell for sublist in self.cells for cell in sublist if len(cell) == 0])

    def playercell(self):
        return self.cells[self.player.x][self.player.y]

    def display_score(self):
        score = game.score()
        if all(map(lambda x: x.board_over, game.board_list)):
            if  score >= 100:
                hundreds = int(score / 100)
                score %= 100
                arcade.draw_text(f"{hundreds} and", board_size + margin / 2, 1.8 * board_size, arcade.color.SAE, 40, align="center", anchor_x="center")
            arcade.draw_text("points!", board_size + margin / 2, margin * 4, arcade.color.SAE, 40, align="center", anchor_x="center")
        if self.displayed_score != score:
            self.displayed_score = score
            tens = self.center_x < board_size
            top = self.center_y > board_size
            if tens:
                digit = int(score / 10)
            else:
                digit = score % 10
            self.digit = Digit(f"images/{digit}_{('bot','top')[top]}.png")
            self.digit.set_position(self.center_x, self.center_y + [-3,2][top])
                
    
    def draw(self):
        super().draw()
        if self.board_over:
            self.display_score()
            self.digit.draw()
            self.player.draw()
            return

        for i, column in enumerate(self.cells):
            for j, cell in enumerate(column):
                if self.player in cell:
                    cell.remove(self.player)
                    cell.insert(0, self.player)
                for k, sprite in enumerate(cell):

                    # This is a tradeoff of 2 hasattrs per sprite per frame to avoid
                    # explicitly passing this stuff to every constructor or making
                    # a Cell class that knows where it is. Not sure if worth.
                    if not hasattr(sprite, "board"):
                        sprite.set_board(self)
                    if not hasattr(sprite, "cell"):
                        sprite.set_cell(cell)

                    # adjust position to fit them all in the square
                    sprite.set_position(self.x + self.cell_size / 2 + i * self.cell_size, self.y + self.cell_size / 2 + j * self.cell_size)
                    sprite.draw()

    def move(self, direction):

        if self.player.x + xmods[direction] not in range(self.size) or \
           self.player.y + ymods[direction] not in range(self.size):
            arcade.play_sound(tink)
            return


        # check move-from restrictions first, so you can't bonk while stuck
        for obj in self.playercell():
            if not obj.can_move(direction):
                return

        to_cell = self.cells[self.player.x + xmods[direction]][self.player.y + ymods[direction]]

        if not to_cell:
            arcade.play_sound(step)
        else: 
            if not isinstance(self.player.segments[direction], DeadSegment):
                # the things we're checking for here have to be alone
                obj = to_cell[0]
                if isinstance(obj, Device):
                    obj.bonk(direction)
                    return
                elif isinstance(obj, Goop):
                    obj.stick(direction)

        if isinstance(self.player.segments[direction], DeadSegment) and len(to_cell):
            arcade.play_sound(chomp)
            time.sleep(.08)
            if isinstance(to_cell[0], Device):
                to_cell[:] = [to_cell[0].reward]
            else:
                if isinstance(to_cell[0], Exit):
                    self.has_exit = False
                to_cell[:] = []

            
        # actually moving
        self.playercell().remove(self.player)
        self.player.x += xmods[direction]
        self.player.y += ymods[direction]
        to_cell.append(self.player)
        return True


    def collect(self, direction):

        stuff = [x for x in self.playercell() if x is not self.player]

        for obj in stuff:
            keep_radiate = obj.step_on(direction, bool(self.player.radiate))

            if self.player.radiate and not keep_radiate:
                self.player.radiate = None

            if obj.radiate:
                self.player.radiate = Radiate()

        # delete stuff we just stood on unless it asks us not to
        self.playercell()[:] = [x for x in self.playercell() if not x.cleanup()]


xmods = {0: 0, 1: 1, 2: 0, 3: -1}
ymods = {0: 1, 1: 0, 2: -1, 3: 0}

actives = { 1: [ AddTempColor,
                 RotateRight,
                 RotateLeft ] * 3 +\
               [ FlipVertical, FlipHorizontal, SpawnDevice ],
            2: [ FlipVertical, FlipHorizontal] * 3 +\
               [ RotateRight, RotateLeft, SpawnDevice],
            3: [ SpawnDevice ] * 4 + [ AddTempColor, RotateRight, RotateLeft] * 2 + [FlipHorizontal, FlipVertical],
            4: [ AddTempColor, FlipHorizontal, FlipVertical ] * 3 + [ RotateRight, RotateLeft, SpawnDevice ] }

colors = ["orange", "pink", "green", "purple"]                

class Restart(arcade.Sprite):
    def __init__(self):
        super().__init__("images/restart.png")
        self.set_position(board_size+50, board_size)

class Game(arcade.Window):

    def __init__(self):

        # Call the parent class initializer
        width = height = board_size * 2 + margin * 3
        super().__init__(width, height, "Segmentation Fault")

        # Set the working directory (where we expect to find files) to the same
        # directory this .py file is in. You can leave this out of your own
        # code, but it is needed to easily run the examples using "python -m"
        # as mentioned at the top of this program.
        file_path = os.path.dirname(os.path.abspath(__file__))
        os.chdir(file_path)

        # Set the background color
        arcade.set_background_color((148,201,61))

        self.directions = {arcade.key.UP: 0,
                           arcade.key.RIGHT: 1,
                           arcade.key.DOWN: 2,
                           arcade.key.LEFT: 3,
                           arcade.key.W: 0,
                           arcade.key.D: 1,
                           arcade.key.S: 2,
                           arcade.key.A: 3
        }
        self.restart = Restart()

    def setup(self):
        """ Set up the game and initialize the variables. """

        self.input_lock = False
        self.restart_confirm = False

        level = 1
        # Sprite lists
        self.board_list = []
        self.board_list.append(Board(self, margin, board_size + 2*margin, 90, level))
        self.board_list.append(Board(self, board_size + 2*margin, board_size + 2*margin, 0, level))
        self.board_list.append(Board(self, margin, margin, 180, level))
        self.board_list.append(Board(self, board_size + 2*margin, margin, 270, level))


    def score(self):
        return sum([sum(seg.durability for seg in player.segments if not isinstance(seg, DeadSegment)) for player in map(lambda x: x.player, self.board_list)])

    def on_draw(self):
        """
        Render the screen.
        """

        arcade.start_render()        
        for board in self.board_list:
            board.draw()

        if self.restart_confirm:
            self.restart.draw()

        arcade.finish_render()
        

    def on_key_release(self, key, modifiers):
        """Called when the user releases a key. """

        if key in self.directions and not self.input_lock:
            self.input_lock = True
            Thread(target=self.process_input, args=[key, modifiers]).start()
        elif key == arcade.key.R:
            if self.restart_confirm:
                self.setup()
            else:
                self.restart_confirm = True
                return
        self.restart_confirm = False

    def process_input(self, key, modifiers):
        moved = []
        for board in self.board_list:
            if not board.board_over:
                if board.move(self.directions[key]):
                    moved.append(board)
                time.sleep(.12)

        for board in moved:
            if not board.board_over:
                board.collect(self.directions[key])
                time.sleep(.12)

        self.input_lock = False    

game = Game()
            
def main():
    """ Main method """
    game.setup()
    arcade.run()


if __name__ == "__main__":
    main()            
