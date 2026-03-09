import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  deleteAccount
} from "../controllers/authController.js";
import upload from "../middleware/upload.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", upload.single("image"), registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.delete("/delete", protect, deleteAccount);

export default router;