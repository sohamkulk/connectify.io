import { Server } from "socket.io";

const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User comes online
    socket.on("userOnline", (userId) => {
      onlineUsers.set(String(userId), socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // User goes offline manually (logout)
    socket.on("userOffline", (userId) => {
      onlineUsers.delete(String(userId));
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Send message
    socket.on("sendMessage", (message) => {
      const receiverSocketId = onlineUsers.get(String(message.receiver));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", message);
      }
    });

    // Typing indicator
    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId });
      }
    });

    // Stop typing
    socket.on("stopTyping", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { senderId });
      }
    });

    // Edit message via socket
    socket.on("editMessage", (updatedMsg) => {
      const receiverSocketId = onlineUsers.get(String(updatedMsg.receiver));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updatedMsg);
      }
    });

    // Delete message via socket
    socket.on("deleteMessage", ({ messageId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(String(receiverId));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", messageId);
      }
    });

    // User disconnects
    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break; 
        }
      }
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};