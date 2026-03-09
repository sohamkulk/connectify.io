import mongoose from "mongoose";

const messageSchema = mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  message: {
    type: String,
    required: true
  },
  edited: {
    type: Boolean,
    default: false
  },
  deletedForEveryone: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);