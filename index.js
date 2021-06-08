const Matter = require('matter-js');
const logging = require("./logging.js");

logging.setup(true); // enable debug logging

logging.info("Welcome to StarKingdoms!");
logging.debug("Creating io()");
const core_server_util = require("./core_server_util.js");

let io = core_server_util.get_io(); // automatically determine dev mode or not

logging.debug("io function setup");

var Engine = Matter.Engine;
var Runner = Matter.Runner;
var Bodies = Matter.Bodies;
var Composite = Matter.Composite;

let players = {};
let playerVitals = {};
let usernames = {};
let modules = []; // lets readd modules wcgw

tick();

const SCALE = 30;

var engine = Engine.create({
	gravity: {x: 0, y: 0}
});

logging.info("Engine created");

let earthPos = {
	x: 0,
	y: 0
}

var earthBody = Bodies.circle(
	earthPos.x,
	earthPos.y,
	1250,
	{
		friction: .0007
	}, 50
);

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

var moonBody = Bodies.circle(
	moonLocation.x,
	moonLocation.y,
	300,
	{}
);


Composite.add(engine.world, [earthBody, moonBody]);
logging.info("Created planets");
var runner = Runner.create();
logging.debug("Runner created");

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

logging.info("Server setup.");

io.sockets.on('connection', (socket) => {
	logging.info("Player connected");

	var boxBody = Bodies.rectangle(1500, 100, 50, 50, {
		friction: .001,
		restitution: 0.2,
		frictionAir: 0,
	});

	logging.debug("Created body");

	Composite.add(engine.world, [boxBody]);
	players[socket.id] = boxBody;

	logging.debug("Body added to world");

	socket.on('join', (username, state) => {
		usernames[socket.id] = username;
		io.emit('message', username + " joined the game", "Server");
		logging.info(`Player ${username} joined with state ${state}`);
	});

	socket.on('disconnect', () => {
		logging.info(`Player ${usernames[socket.id]} disconnected`);
		io.emit('message', usernames[socket.id] + " left the game", "Server");

		Composite.remove(engine.world, [players[socket.id]]);
		delete players[socket.id]
		delete playerVitals[socket.id]
		delete usernames[socket.id]
	});

	socket.on('message', (text, username) => {
		logging.info(`Broadcasted message ${text} from ${username}`);
		io.emit('message', text, username);
	});

	socket.on('input', (keys) => {
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
	});
});

var planets = {};
var moduleVitals = [];

function tick() {
	const intervalId = setInterval(() => {
		Engine.update(engine, 1000/60);
		Matter.Body.setPosition(earthBody, earthPos);
		Matter.Body.setPosition(moonBody, moonLocation);

		for (let key of Object.keys(players)) {
			playerVitals[key] = {
				x: players[key].position.x,
				y: players[key].position.y,
				rotation: players[key].angle,
				velX: players[key].velocity.x,
				velY: players[key].velocity.y
			};
		}

		for(let i = 0;  i < modules.length; i++) {
			moduleVitals[i] = {
				x: modules[i].position.x,
				y: modules[i].position.y,
				rotation: modules[i].angle
			};

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

			var strength = G * (earthBody.mass * modules[i].mass) / (distance * distance);
      			var strength2 = G * (moonBody.mass * modules[i].mass) / (distance2 * distance2);

			var force = {
				x: (earthBody.position.x) - moduleVitals[i].x,
				y: (earthBody.position.y) - moduleVitals[i].y,
			};

			var force2 = {
				x:  (moonBody.position.x) - moduleVitals[i].x,
				y:  (moonBody.position.y) - moduleVitals[i].y,
			};

			force.x /= distance;
			force.y /= distance;
			force.x *= strength;
			force.y *= strength;

  		    	force2.x /= distance2;
			force2.y /= distance2;
			force2.x *= strength2;
			force2.y *= strength2;
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
			var distance = Math.sqrt(
				((playerVitals[key].x - earthBody.position.x) * (playerVitals[key].x - earthBody.position.x)) +
				((playerVitals[key].y - earthBody.position.y) * (playerVitals[key].y - earthBody.position.y)));

			var distance2 = Math.sqrt(
				((playerVitals[key].x - moonBody.position.x) * (playerVitals[key].x - moonBody.position.x)) +
				((playerVitals[key].y - moonBody.position.y) * (playerVitals[key].y - moonBody.position.y)));

			var G = .05;
		   	var G2 = 0.1;

			var strength = G * (earthBody.mass * players[key].mass) / (distance * distance);
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

	var intervalId2 = setInterval(() => {
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

			var moduleBody = Bodies.rectangle(location.x, location.y, 50, 50);

			Composite.add(engine.world, moduleBody);
			modules.push(moduleBody);
		}
	}, 2000);
}
