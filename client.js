var canvas = document.getElementById("canvas");
var ctx = canvas.getContext('2d');

function getParameterByName( name ){
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp(regexS);
	var results = regex.exec(window.location.href);
	if(results == null) {
		return "";
	} else {
		return decodeURIComponent(results[1].replace(/\+/g, " "));
	}
}

console.log("%cWelcome to StarKingdoms! Version: v0.3.1.1", "color:blue");

var username = getParameterByName('username');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.onresize = function() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

if(username == undefined || username == "" || username == " ") {
	username = "Unnamed";
}

var socket = io("localhost:8443");
socket.emit("join", username);

var players = {};
var player = {
	x: 0,
	y: 0,
	rotation: 90,
	velX: 0,
	velY: 0
};

var keys = {};
var mousePos = {};
var usernames = {};
var planets = {};
var modules = [];

const SCALE = 30;

function chatMsg(value) {
	socket.emit("message", value, username);
	console.log("%cSent chat message to server.", "color:green");
}

function mkInlineImg(src) {
	var img = new Image();
	img.src = src;
	
	img.style = `  
	display: inline-block;
	width: 250px;
	height: auto;
	vertical-align: top;
	border: 3px solid #888;
	border-radius: 5px;`;

	return img;
}

function checkForImgUrl(url) {
	return(url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}

socket.on("client-pos", function(msg, thisPlayer, usernamesInfo){
	players = msg;
	player.x = thisPlayer.x;
	player.y = thisPlayer.y;
	player.rotation = thisPlayer.rotation;
	player.username = thisPlayer.username;
	player.velX = thisPlayer.velX;
	player.velY = thisPlayer.velY;
	usernames = usernamesInfo;
});

socket.on("planet-pos", (planetInfo) => {
	planets = planetInfo;
})

socket.on("module-pos", (moduleInfo) => {
	modules = moduleInfo;
});

let chat = document.getElementById("chat");

socket.on("message", (text, username) => {
	if (checkForImgUrl(text)) {
		let img = mkInlineImg(text);
		chat.innerHTML += '<b>' + username + "</b>: ";
		chat.appendChild(img);
		chat.innerHTML += '<p>';
	} else {
		chat.innerHTML += '<b>' + username + "</b>: " + text + '<p>';
		chat.scrollTop = chat.scrollHeight;
	}
	console.log("%cRevieved chat message from server.", "color:green");
});

var earth = new Image;
earth.src = "assets/earth.png"

var moon = new Image;
moon.src = "assets/moon.png"

var hearty = new Image;
hearty.src = "assets/hearty.png"

var cargo = new Image;
cargo.src = "assets/cargo.png"

function draw() {
	let intervalId = setInterval(() => {

		var position = document.getElementById("position");
		position.innerHTML = "Position: " + Math.round(player.x / 50) + ", " + Math.round(player.y / 50);
		var velocity = document.getElementById("velocity");
		velocity.innerHTML = "Vel: " + Math.round(Math.sqrt(player.velX * player.velX + player.velY * player.velY))

		canvas.style.backgroundPosition = `${-player.x / 10}px ${-player.y / 10}px`
		
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var camX = -player.x + canvas.width / 2
		var camY = -player.y + canvas.height / 2
		ctx.translate(camX, camY);

		if (planets.earth == null) {
			return;
		}

		ctx.drawImage(earth, -1250 + planets.earth.x, -1250 + planets.earth.y, 2500, 2500)

		ctx.drawImage(moon, -300 + planets.moon.x, -300 + planets.moon.y, 600, 600);

		ctx.beginPath();
		ctx.strokeStyle = "gray";
		ctx.lineWidth = 5;
		ctx.moveTo(player.x, player.y);
		ctx.lineTo(planets.moon.x, planets.moon.y);
		ctx.stroke();

		ctx.beginPath();
		ctx.strokeStyle = "limegreen";
		ctx.lineWidth = 5;
		ctx.moveTo(player.x, player.y);
		ctx.lineTo(planets.earth.x, planets.earth.y)
		ctx.stroke();

		for(var key of Object.keys(players)) {
			ctx.save();
			ctx.translate(players[key].x, players[key].y);

			ctx.textAlign = "center";
			ctx.font = '30px Segoe UI';
			ctx.fillStyle = "white";
			ctx.fillText(usernames[key], 0, -35);

			ctx.rotate(players[key].rotation);
			ctx.drawImage(hearty, -25, -25, 50, 50);
			ctx.restore();
		}

		for(let i = 0; i < modules.length; i++) {
			ctx.save();
			ctx.translate(modules[i].x, modules[i].y)
			ctx.rotate(modules[i].rotation);
			ctx.drawImage(cargo, -25, -25, 50, 50) 
			ctx.restore();
		}

		socket.emit("input", keys, mousePos);
	}, 1000/60);
}

draw();

document.onkeydown = (e) => {
	if(document.activeElement != document.getElementById('msg')) {
		keys[e.key] = true
	}
};
document.onkeyup = (e) => {
	keys[e.key] = false;
};
document.addEventListener('mousemove', (event) => {
    mousePos = {
        x: event.clientX - (canvas.width / 2),
        y: event.clientY - (canvas.height / 2),
    }
});
