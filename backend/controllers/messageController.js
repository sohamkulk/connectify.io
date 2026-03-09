import Message from "../models/message.js";

// Send message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user._id;

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message
    });

    res.status(201).json(newMessage);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get messages between two users
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: userId },
        { sender: userId, receiver: myId }
      ],
      deletedForEveryone: false
    }).sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit message
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user._id;

    const msg = await Message.findById(id);

    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(401).json({ message: "Not authorized to edit this message" });
    }

    msg.message = message;
    msg.edited = true;
    await msg.save();

    res.json(msg);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete message for everyone
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const msg = await Message.findById(id);

    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (msg.sender.toString() !== userId.toString()) {
      return res.status(401).json({ message: "Not authorized to delete this message" });
    }

    msg.deletedForEveryone = true;
    await msg.save();

    res.json({ message: "Message deleted for everyone" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};