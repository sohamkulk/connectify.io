import express from "express";
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage
} from "../controllers/messageController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send", protect, sendMessage);
router.get("/:userId", protect, getMessages);
router.put("/:id", protect, editMessage);
router.delete("/:id", protect, deleteMessage);

export default router;