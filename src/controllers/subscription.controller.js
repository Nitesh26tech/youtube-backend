import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
        const { channelId } = req.params
        // console.log("channel", channelId)

        if (!isValidObjectId(channelId)) {
                throw new ApiError(400, "Invalid channel Id")
        }

        const userId = req.user?._id

        // check already subscribed or not
        const existingSubscription = await Subscription.findOne({
                subscriber: userId,
                channel: channelId
        })

        if (existingSubscription) {
                // unsubscribe
                await Subscription.findByIdAndDelete(existingSubscription._id)

                return res.status(200).json(
                        new ApiResponse(200, {}, "Unsubscribed successfully")
                )
        }

        // subscribe
        const newSubscription = await Subscription.create({
                subscriber: userId,
                channel: channelId
        })

        return res.status(200).json(
                new ApiResponse(200, newSubscription, "Subscribed successfully")
        )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
        const { channelId } = req.params

        if (!isValidObjectId(channelId)) {
                throw new ApiError(400, "Invalid channel Id")
        }

        const subscribers = await Subscription.aggregate([
                {
                        $match: {
                                channel: new mongoose.Types.ObjectId(channelId)
                        }
                },
                {
                        $lookup: {
                                from: "users",
                                localField: "subscriber",
                                foreignField: "_id",
                                as: "subscriberDetails"
                        }
                },
                {
                        $unwind: "$subscriberDetails"
                },
                {
                        $project: {
                                _id: 0,
                                subscriberId: "$subscriberDetails._id",
                                fullname: "$subscriberDetails.fullname",
                                username: "$subscriberDetails.username",
                                avatar: "$subscriberDetails.avatar"
                        }
                }
        ])

        return res.status(200).json(
                new ApiResponse(200, subscribers, "Subscribers fetched successfully")
        )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
        const { subscriberId } = req.params

        if (!isValidObjectId(subscriberId)) {
                throw new ApiError(400, "Invalid subscriber Id")
        }

        const channels = await Subscription.aggregate([
                {
                        $match: {
                                subscriber: new mongoose.Types.ObjectId(subscriberId)
                        }
                },
                {
                        $lookup: {
                                from: "users",
                                localField: "channel",
                                foreignField: "_id",
                                as: "channelDetails"
                        }
                },
                {
                        $unwind: "$channelDetails"
                },
                {
                        $project: {
                                _id: 0,
                                channelId: "$channelDetails._id",
                                fullname: "$channelDetails.fullname",
                                username: "$channelDetails.username",
                                avatar: "$channelDetails.avatar"
                        }
                }
        ])

        return res.status(200).json(
                new ApiResponse(200, channels, "Subscribed channels fetched successfully")
        )
})

export {
        toggleSubscription,
        getUserChannelSubscribers,
        getSubscribedChannels
}