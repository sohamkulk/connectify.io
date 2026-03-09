import { Server } from "socket.io";

const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User comes online
    socket.on("userOnline", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
    });

    // Send message
    socket.on("sendMessage", (message) => {
      const receiverSocketId = onlineUsers.get(message.receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", message);
      }
    });

    // Typing indicator
    socket.on("typing", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing", { senderId });
      }
    });

    // Stop typing
    socket.on("stopTyping", ({ senderId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("stopTyping", { senderId });
      }
    });

    // Edit message via socket
    socket.on("editMessage", (updatedMsg) => {
      const receiverSocketId = onlineUsers.get(updatedMsg.receiver);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updatedMsg);
      }
    });

    // Delete message via socket
    socket.on("deleteMessage", ({ messageId, receiverId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", messageId);
      }
    });

    // User disconnects
    socket.on("disconnect", () => {
      onlineUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
        }
      });
      io.emit("onlineUsers", Array.from(onlineUsers.keys()));
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};