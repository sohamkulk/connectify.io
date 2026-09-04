import User from "../models/user.js";
import Message from "../models/message.js";

// Get all users except logged in user, with last message time + unread count
export const getAllUsers = async (req, res) => {
  try {
    const myId = req.user._id;
    const users = await User.find({ _id: { $ne: myId } }).select("-password");

    const usersWithMeta = await Promise.all(
      users.map(async (u) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: myId, receiver: u._id },
            { sender: u._id, receiver: myId }
          ],
          deletedForEveryone: false
        }).sort({ createdAt: -1 });

        const unreadCount = await Message.countDocuments({
          sender: u._id,
          receiver: myId,
          read: false,
          deletedForEveryone: false
        });

        return {
          ...u.toObject(),
          lastMessageAt: lastMessage ? lastMessage.createdAt : null,
          unreadCount
        };
      })
    );

    usersWithMeta.sort((a, b) => {
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    res.json(usersWithMeta);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};