import express from "express";
import { upload } from '../middlewares/multer.middleware.js'
import { registerUser } from "../controllers/user.controller.js"
const router = express.Router();

router.post("/register",
        upload.fields([
                { name: "avatar", maxCount: 1 },
                { name: "coverImage", maxCount: 1 }
        ]),

        registerUser
);

export default router;