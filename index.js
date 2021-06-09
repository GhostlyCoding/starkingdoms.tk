const Matter = require('matter-js');
const logging = require("./logging.js");

const core_server_util = require("./core_server_util.js");

let io = core_server_util.get_io(); // automatically determine dev mode or not

var Engine = Matter.Engine,
    Runner = Matter.Runner,
    Bodies = Matter.Bodies,
    Composite = Matter.Composite,
    Constraint = Matter.Constraint,
    Events = Matter.Events;

let players = {};
let playerVitals = {};
let usernames = {};
let modules = []; // lets readd modules wcgw
let mouses = {};
let buttons = {};

tick();

const SCALE = 30;

// create the engine, it has the world
var engine = Engine.create({
	gravity: {x: 0, y: 0}
});

let earthPos = {
	x: 0,
	y: 0
}

// make the earth
var earthBody = Bodies.circle(
	earthPos.x,
	earthPos.y,
	1250,
	{
        friction: .0007,
        isStatic: true
	}, 50
);
console.log(earthBody.mass)

// find moon location
let moonDistance = 5000;
var moonLocation = {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1
}

var magnitude = Math.sqrt(moonLocation.x * moonLocation.x + moonLocation.y * moonLocation.y);
moonLocation.x /= magnitude;
moonLocation.y /= magnitude;

moonLocation.x *= moonDistance;
moonLocation.y *= moonDistance;

// make moon
var moonBody = Bodies.circle(
	moonLocation.x,
	moonLocation.y,
	300,
	{}
);

// add moon and earth to the world
Composite.add(engine.world, [earthBody, moonBody]);

var runner = Runner.create();

// input
function wkey(socket) {
	var force = { x: 0, y: -.001 };
	force = Matter.Vector.rotate(force, players[socket.id].angle);

	Matter.Body.applyForce(players[socket.id], players[socket.id].position, force);
}

function skey(socket) {
	var force = { x: 0, y: .001 };
	force = Matter.Vector.rotate(force, players[socket.id].angle);

	Matter.Body.applyForce(players[socket.id], players[socket.id].position, force);
}

function akey(socket) {
	if (players[socket.id].angularVelocity < -0.21041200776958874) {
		return;
	}

	Matter.Body.setAngularVelocity(players[socket.id], players[socket.id].angularVelocity + -.0025);
}

function dkey(socket) {
	if (players[socket.id].angularVelocity > 0.21041200776958874) {
		return;
	}

	Matter.Body.setAngularVelocity(players[socket.id], players[socket.id].angularVelocity + .0025);
}


io.sockets.on('connection', (socket) => {
	console.log('Someone connected');
    
    // make player upon join
	var boxBody = Bodies.rectangle(1500, 100, 50, 50, {
		friction: .001,
		restitution: 0.2,
		frictionAir: 0,
	});

    // add player to the world
	Composite.add(engine.world, [boxBody]);
	players[socket.id] = boxBody;
    // make the mouse body as a sensor with no collision
    mouses[socket.id] = Bodies.circle(0, 0, 1, {
        isSensor: true,
        density: .0001
    });
    mouses[socket.id].constraint = null;
    Composite.add(engine.world, mouses[socket.id]);
	
    // join message
	socket.on('join', (username) => {
		usernames[socket.id] = username;
		io.emit('message', username + " joined the game", "Server")
	});

    // handle disconnection
	socket.on('disconnect', () => {
		console.log('Someone disconnected');
		io.emit('message', usernames[socket.id] + " left the game", "Server");

		Composite.remove(engine.world, [players[socket.id]]);
		delete players[socket.id]
		delete playerVitals[socket.id]
		delete usernames[socket.id]
	});

    // messages
	socket.on('message', (text, username) => {
		io.emit('message', text, username);
	});

    // recieving inputs
	socket.on('input', (keys, mousePos, mouseButtons) => {
		if (keys.s) {
			skey(socket);
		}
		if (keys.w) {
			wkey(socket);
		}
		if (keys.a) {
			akey(socket);
		}
		if (keys.d) {
			dkey(socket);
		}
        // set mouse body to world space mouse x and mouse y
        Matter.Body.setPosition(mouses[socket.id], { x: mousePos.x + players[socket.id].position.x, y: mousePos.y + players[socket.id].position.y })
        buttons[socket.id] = mouseButtons;
	});
});

var planets = {};
var moduleVitals = [];

// module movements
Events.on(engine, 'collisionActive', (event) => {
    var pairs = event.pairs;

    // loop through pairs
    for(var i = 0, j = pairs.length; i != j; ++i) {
        var pair = pairs[i];
        
        // check for clicking
        for(let key of Object.keys(mouses)) {
            if(pair.bodyA === mouses[key]) {
                if(pair.bodyB != players[key]) {
                    if(buttons[key] == 1) {
                        if(mouses[key].constraint == null){
                            console.log("constraint");
                            // make mouse constraint to module
                            mouses[key].constraint = Constraint.create({
                                bodyA: mouses[key],
                                bodyB: pair.bodyB,
                                stiffness: .1
                            });
                            Matter.Body.setDensity(pair.bodyB, .00000001);
                            Composite.add(engine.world, mouses[key].constraint);
                        }
                    }
                }
            }
            if(pair.bodyB === mouses[key]) {
                if(pair.bodyA != players[key] && pair.bodyA != earthBody) {
                    if(buttons[key] == 1) {
                        if(mouses[key].constraint == null){
                            console.log("constraint");
                            mouses[key].constraint = Constraint.create({
                                bodyA: pair.bodyA,
                                bodyB: mouses[key],
                                stiffness: .1
                            });
                            Matter.Body.setDensity(pair.bodyA, .00000001);
                            Composite.add(engine.world, mouses[key].constraint);
                        }
                    }
                }
            }
        }
    }
});

function tick() {
	const intervalId = setInterval(() => {
        // tick the engine and fix earth and moon positions
		Engine.update(engine, 1000/60);
		Matter.Body.setPosition(earthBody, earthPos);
		Matter.Body.setPosition(moonBody, moonLocation);

		for (let key of Object.keys(players)) {
			playerVitals[key] = {
				x: players[key].position.x,
				y: players[key].position.y,
				rotation: players[key].angle,
				velX: players[key].velocity.x,
				velY: players[key].velocity.y,
			};
            // remove constraints if mouse button is lifted
            if (buttons[key] == 0 && mouses[key].constraint != null) {
                // set velocities to 0
                Matter.Body.setVelocity(mouses[key].constraint.bodyB, {x: 0, y: 0});
                Matter.Body.setVelocity(mouses[key].constraint.bodyA, {x: 0, y: 0});
                // reset density
                if(mouses[key].constraint.bodyB == mouses[key]) {
                    Matter.Body.setDensity(mouses[key].constraint.bodyB, 0.001);
                } else {
                    Matter.Body.setDensity(mouses[key].constraint.bodyA, 0.001);
                }
                // remove constraint
                Composite.remove(engine.world, mouses[key].constraint);
                mouses[key].constraint = null;
            }
            // 0 velocities
            if (buttons[key] == 1 && mouses[key].constraint != null) {
                Matter.Body.setVelocity(mouses[key].constraint.bodyB, {x: 0, y: 0});
                Matter.Body.setVelocity(mouses[key].constraint.bodyA, {x: 0, y: 0});
            }
		}

        // module essentials creation
		for(let i = 0;  i < modules.length; i++) {
			moduleVitals[i] = {
				x: modules[i].position.x,
				y: modules[i].position.y,
				rotation: modules[i].angle,
                velocity: modules[i].velocity
			};
        }
        
        // module gravity
		for(let i = 0;  i < modules.length; i++) {
			var distance = Math.sqrt(
				((moduleVitals[i].x - earthBody.position.x / SCALE) *
					(moduleVitals[i].x - earthBody.position.x / SCALE)) +
				((moduleVitals[i].y - earthBody.position.y / SCALE) *
					(moduleVitals[i].y - earthBody.position.y / SCALE)));

      			var distance2 = Math.sqrt(
				((moduleVitals[i].x - moonBody.position.x / SCALE) *
					(moduleVitals[i].x - moonBody.position.x / SCALE)) +
				((moduleVitals[i].y - moonBody.position.y / SCALE) *
					(moduleVitals[i].y - moonBody.position.y / SCALE)))
			var G = .05;

            // calculate strength values
			var strength = G * (4895.829560036 * modules[i].mass) / (distance * distance);
      			var strength2 = G * (moonBody.mass * modules[i].mass) / (distance2 * distance2);

            // get the direction
			var force = {
				x: (earthBody.position.x) - moduleVitals[i].x,
				y: (earthBody.position.y) - moduleVitals[i].y,
			};

			var force2 = {
				x:  (moonBody.position.x) - moduleVitals[i].x,
				y:  (moonBody.position.y) - moduleVitals[i].y,
			};

            // set the magnitude of the direction to strength
			force.x /= distance;
			force.y /= distance;
			force.x *= strength;
			force.y *= strength;

  		    	force2.x /= distance2;
			force2.y /= distance2;
			force2.x *= strength2;
			force2.y *= strength2;
            // apply gravity force
			Matter.Body.applyForce(modules[i], Matter.Vector.create(moduleVitals[i].x, moduleVitals[i].y), Matter.Vector.create(force.x + force2.x, force.y + force2.y));
		}

		planets = {
			earth: {
				x: earthBody.position.x,
				y: earthBody.position.y
			},

			moon: {
				x: moonBody.position.x,
				y: moonBody.position.y
			}
		}

		for (let key of Object.keys(playerVitals)) {
            // calculate distance
			var distance = Math.sqrt(
				((playerVitals[key].x - earthBody.position.x) * (playerVitals[key].x - earthBody.position.x)) +
				((playerVitals[key].y - earthBody.position.y) * (playerVitals[key].y - earthBody.position.y)));

			var distance2 = Math.sqrt(
				((playerVitals[key].x - moonBody.position.x) * (playerVitals[key].x - moonBody.position.x)) +
				((playerVitals[key].y - moonBody.position.y) * (playerVitals[key].y - moonBody.position.y)));

			var G = .05;
		   	var G2 = 0.1;

            // refer back to module gravity
			var strength = G * (4895.829560036 * players[key].mass) / (distance * distance);
			var strength2 = G * (moonBody.mass * players[key].mass) / (distance2 * distance2);

			var force = {
				x: earthBody.position.x - playerVitals[key].x,
				y: earthBody.position.y - playerVitals[key].y
			};

			var force2 = {
				x: moonBody.position.x - playerVitals[key].x,
				y: moonBody.position.y - playerVitals[key].y
			};

			force.x /= distance;
			force.y /= distance;
			force.x *= strength;
			force.y *= strength;

			force2.x /= distance2;
			force2.y /= distance2;
			force2.x *= strength2;
			force2.y *= strength2;
            
			Matter.Body.applyForce(players[key], players[key].position, {x: force.x + force2.x, y: force.y + force2.y});

            io.to(key).emit('client-pos', playerVitals, playerVitals[key], usernames);

			io.to(key).emit('planet-pos', planets);
			io.to(key).emit('module-pos', moduleVitals);
		}

	}, 1000 / 60);

    // spawn modules
	var intervalId2 = setInterval(() => {
		console.log(modules.length);
        // find module position
		if(modules.length < 30) {
			var location = {
				x: Math.random() * 2 - 1,
				y: Math.random() * 2 - 1
			}

			var magnitude = Math.sqrt(location.x * location.x + location.y * location.y);
			location.x /= magnitude;
			location.y /= magnitude;

			location.x *= 1500;
			location.y *= 1500;

            // make and add modules to the world
			var moduleBody = Bodies.rectangle(location.x, location.y, 50, 50);

			Composite.add(engine.world, moduleBody);
			modules.push(moduleBody);
		}
	}, 2000);
}
