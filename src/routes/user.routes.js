import express from "express";
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
        changeCurrentPassword,
        getCurrentUser,
        getUserChannelProfile,
        getWatchHistory,
        loginUser,
        logOutUser,
        refreshAccessToken,
        registerUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImg
} from "../controllers/user.controller.js"
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
router.post("/change-password", verifyJWT, changeCurrentPassword);
router.get("/current-user", verifyJWT, getCurrentUser);
router.patch("/edit-profile", verifyJWT, updateAccountDetails);
router.patch("/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.patch("update-cover", verifyJWT, upload.single("coverImage"), updateUserCoverImg);
router.get("/profile/:username", verifyJWT, getUserChannelProfile);
router.get("/watch-history", verifyJWT, getWatchHistory)

export default router;