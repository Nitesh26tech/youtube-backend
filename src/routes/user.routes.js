import express from "express";
import { upload } from '../middlewares/multer.middleware.js'
import { loginUser, logOutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register",
        upload.fields([
                { name: "avatar", maxCount: 1 },
                { name: "coverImage", maxCount: 1 }
        ]),
        registerUser
);

router.post("/login", loginUser);

// secure routes
router.post("/logout", verifyJWT, logOutUser);
router.post("/refresh-token", refreshAccessToken);

export default router;