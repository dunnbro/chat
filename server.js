var express = require('express');
var app = express();
app.use(express.static(__dirname + '/public'));
var http = require('http').Server(app);
var io = require('socket.io')(http);

var users = {};
var rooms = []; //should this be object or array?
var sockets = [];

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	sockets.push(socket);
	
	socket.on('new user', function(data, callback){
		console.log(data);
		if (data in users){
			callback(false);
		} else {
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
			updateNicknames();
			socket.broadcast.emit('connectered', socket.nickname + " joined the session." );
		}
	});
	
	function updateNicknames(){
		io.sockets.emit('usernames', Object.keys(users));
	}
	
  socket.on('chat message', function(msg, callback){
	
		console.log(msg.message);
		//console.log(msg.name);
		//console.log(msg.sender);
		//console.log(msg.recipient);
		var entry = msg.message.trim();
		
		if (msg.recipient === "contentwrapper" ){
			io.emit('new message', msg);
		
		} else {
			//returns same value regardless of who sender or recipient is, so that roomname is same either way
			function alphabetize (a, b){
				var combined = [];
				combined.push(a);
				combined.push(b);
				combined.sort();
				return combined.toString();
			};
			
			//checks whether room exists already, if not, creates it
			var alpharoom = alphabetize(msg.sender, msg.recipient);
			console.log(alpharoom);
			if (rooms.indexOf(alpharoom) === -1){
				//push private room to array of rooms
				rooms.push(alpharoom);
				//the initiating socket joins alpharoom
				socket.join(alpharoom);
				//msg.recipient (sent with sender's message) matched up with its socket (from 'users' object)
				socket.nickname = msg.recipient;
				
				//set the user with the desired recipient nickname to the socket(have to do this to join it to the alpharoom)
				users[msg.recipient].join(alpharoom);
				console.log(Object.keys(io.nsps['/'].adapter.rooms[alpharoom]));
			} 
	
			io.to(alpharoom).emit('new message', msg);
		}
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		delete users[socket.nickname];
		updateNicknames();
		socket.broadcast.emit('exit', socket.nickname + " has left." );
	});
	
});//close "on connection"

http.listen(3000, function(){
  console.log('listening on *:3000');
});