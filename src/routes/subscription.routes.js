import express  from 'express';
import {
        getSubscribedChannels,
        getUserChannelSubscribers,
        toggleSubscription,
} from "../controllers/subscription.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = express.Router();

router.post("/toggle/:channelId", verifyJWT, toggleSubscription)
router.get("/subscribers/:channelId", getUserChannelSubscribers)
router.get("/subscribed/:subscriberId", getSubscribedChannels)

export default router