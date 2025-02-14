/* 
    All Socket related functionalites .
    socket.io allow us to makes rooms, so that whetver we send
    is in that room only.so we make a room when the user connected .
*/

import { MessageModel } from './models/index.js';
let onlineUsers = [];
export default function (socket, io) {
	//user joins or opens the application
	socket.on('join', (user) => {
		console.log("user67",user)
		socket.join(user);
		//add joined user to online users
		if (!onlineUsers.some((u) => u.userId === user)) {
			onlineUsers.push({ userId: user, socketId: socket.id });
		}
		//send online users to frontend
		io.emit('get-online-users', onlineUsers);

		//send socket id
		io.to(socket.id).emit('setup socket', socket.id);
	});

	//socket disconnect
	socket.on('disconnect', () => {
		onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
		io.emit('get-online-users', onlineUsers);
	});

	//join a conversation room
	socket.on('join conversation', (conversation) => {
		socket.join(conversation);
	});

	//send and receive message
	socket.on('send message', (message) => {
		let conversation = message.conversation;

		if (!conversation.users) return;
		conversation.users.forEach((user) => {
			if (user._id === message.sender._id) return;
			socket.in(user._id).emit('receive message', message);
		});
	});

	//typing
	socket.on('typing', (conversation) => {
		socket.in(conversation).emit('typing', conversation);
	});
	socket.on('stop typing', (conversation) => {
		socket.in(conversation).emit('stop typing');
	});

	socket.on('messages seen', async ({ convo_id, chatUserId }) => {
	
		try {
			const updatedMessages = await MessageModel.updateMany(
				{ conversation: convo_id, seen: false },
				{ $set: { seen: true } }
			);
			
			let chatUserSocket = onlineUsers.find((user) => user.userId === chatUserId);
			socket.to(chatUserSocket.socketId).emit('messages seen', { convo_id });
		} catch (error) {
		
		}
	});
	//----------------------------------
	socket.on('call user', (data) => {
		console.log(`📞 'call user' event received from ${data.from} to ${data.userToCall}`);
		console.log("Call signal data:", data.signal);
	
		let userId = data.userToCall;
		let userSocketId = onlineUsers.find((user) => user.userId === userId);
	
		if (!userSocketId) {
			console.error(`❌ No online user found with ID: ${userId}`);
			return;
		}
	
		console.log(`✅ Emitting 'incoming call' to socket ID: ${userSocketId.socketId}`);
		io.to(userSocketId.socketId).emit('incoming call', {
			signal: data.signal,
			from: data.from,
			to: userSocketId.socketId,
			name: data.name,
			picture: data.picture,
		});
	});
	
	socket.on('not responded', ({ to }) => {
		console.log(`⏳ 'not responded' event received for ${to}`);
		socket.to(to).emit('not responded');
	});
	
	socket.on('call rejected', ({ to }) => {
		console.log(`❌ 'call rejected' event received for ${to}`);
		socket.to(to).emit('call rejected');
	});
	
	//---answer call
	socket.on('answer call', ({ signal, to, from }) => {
		console.log(`✅ 'answer call' event received from ${from} to ${to}`);
		console.log("Answer signal data:", signal);
	
		io.to(to).emit('call accepted', { signal: signal, receiverId: from });
	});
	
	//---end call
	socket.on('end call', (id) => {
		console.log(`📴 'end call' event received for ${id}`);
		io.to(id).emit('end call', { to: id });
	});
	
}
