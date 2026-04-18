import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

//generate new token
const generateAccessRefreshToken = async (userId) => {
        try {
                const user = await User.findById(userId)
                const accessToken = user.generateAccessToken()
                const refreshToken = user.generateRefreshToken()

                user.refreshToken = refreshToken
                await user.save({ validateBeforeSave: false })

                return { accessToken, refreshToken }

        } catch (error) {
                throw new ApiError(500, "Something went wrong ")
        }
}
//register new user 
const registerUser = asyncHandler(async (req, res) => {

        // get user details from client
        const { fullname, email, username, password } = req.body
        // console.log("body", req.body)

        // validation - not empty field
        if ([fullname, email, username, password].some((field) =>
                field?.trim() === "")) {
                throw new ApiError(400, "All field are required !")
        }

        // check if user already exists : username, email
        const existedUser = await User.findOne({
                $or: [{ username }, { email }]
        })
        // console.log("existedUser", existedUser)
        if (existedUser) {
                throw new ApiError(409, "User with email or username already exists")
        }
        // console.log("files", req.files)

        // check for images, check for avatar
        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        // console.log("avatarLocalPath", avatarLocalPath)
        if (!avatarLocalPath) {
                throw new ApiError(400, "Avatar file is required")
        }

        // upload them to cloudinary, avatar
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        // console.log("avatar", avatar)

        if (!avatar) {
                throw new ApiError(400, "Avatar file is required")
        }

        // create user object - create entry in db
        const user = await User.create({
                fullname,
                avatar: avatar.url,
                coverImage: coverImage?.url || "",
                email,
                password,
                username: username.toLowerCase()
        });

        const createUser = await User.findById(user._id).select(
                "-password -refreshToken"
        )

        // check for user creation or not
        if (!createUser) {
                throw new ApiError(500, "Something went wrong while registering the user")
        }

        // remove password and refresh token field from response
        // return response
        return res.status(200).json(
                new ApiResponse(200, createUser, "User Registered Successfully")
        )

});

// login user with email and password
const loginUser = asyncHandler(async (req, res) => {

        // req body 
        const { email, username, password } = req.body
        console.log(email, password)
        // check username or email
        if (!username && !email) {
                throw new ApiError(400, "Username or password is required")
        }

        // find the user
        const user = await User.findOne({
                $or: [{ username }, { email }]
        })
        // console.log("user", user)
        if (!user) {
                throw new ApiError(404, "User does not exit")
        }

        console.log("enter password", password, typeof password)
        console.log("store password", user.password, typeof user.password)
        // password check
        const isPasswordValid = await user.isPasswordCorrect(String(password))

        if (!isPasswordValid) {
                throw new ApiError(401, "Invalid password")
        }

        // access and refresh token
        const { accessToken, refreshToken } = await generateAccessRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id)
                .select("-password -refreshToken");

        // send cookie
        const options = {
                httpOnly: true,
                secure: true
        }
        return res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json(
                        new ApiResponse(200,
                                {
                                        user: loggedInUser, accessToken,
                                        refreshToken
                                },
                                "User logged In Successfully"
                        )
                )

});

// logout user
const logOutUser = asyncHandler(async (req, res) => {
        await User.findByIdAndUpdate(req.user._id,
                {
                        $set: {
                                refreshToken: undefined
                        }
                },
                {
                        new: true
                }
        )
        const options = {
                httpOnly: true,
                secure: true
        }
        return res
                .status(200)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .json(new ApiResponse(200, {}, "User logged Out"))
})

//refresh token 
const refreshAccessToken = asyncHandler(async (req, res) => {
        const incomingRefreshToken = req.cookies.
                refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
                throw new ApiError(401, "unauthorized request")
        }

        try {
                const decodedToken = jwt.verify(
                        incomingRefreshToken,
                        process.env.REFRESH_TOKEN_KEY)

                const user = await User.findById(decodedToken?._id)

                if (!user) {
                        throw new ApiError(401, "Invalid refresh token")
                }

                if (incomingRefreshToken !== user?.refreshToken) {
                        throw new ApiError(401, "refresh token is expired or used")

                }

                const options = {
                        httpOnly: true,
                        secure: true
                }

                const { accessToken, newRefreshToken } = await
                        generateAccessRefreshToken(user._id)

                return res
                        .status(200)
                        .cookie("accessToken", accessToken, options)
                        .cookie("refreshToken", newRefreshToken, options)
                        .json(
                                new ApiResponse(
                                        200,
                                        {
                                                accessToken,
                                                refreshToken: newRefreshToken
                                        },
                                        "Access token refreshed"
                                )
                        )

        } catch (error) {
                throw new ApiError(401, error?.message ||
                        "Invalid refresh token"
                )

        }
});

// password changed
const changeCurrentPassword = asyncHandler(async (req, res) => {
        const { oldPassword, newPassword } = req.body

        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if (!isPasswordCorrect) {
                throw new ApiError(400, "Invalid old password")
        }

        user.password = newPassword
        await user.save({ validateBeforeSave: false })

        return res
                .status(200)
                .json(new ApiResponse(200, {}, "Password changed successfully"))
})

// get current user 
const getCurrentUser = asyncHandler(async (req, res) => {
        return res
                .status(200)
                .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

// update user Account details 
const updateAccountDetails = asyncHandler(async (req, res) => {
        const { fullname, email } = req.body

        if (!fullname || !email) {
                throw new ApiError(400, "All field  required")
        }

        const UpdatedUser = await User.findByIdAndUpdate(
                req.user?._id,
                {
                        $set: {
                                fullname,
                                email: email
                        }
                },
                { new: true }
        ).select("-password ")

        return res
                .status(200)
                .json(new ApiResponse(200, UpdatedUser, "Account details Updated"))
})

// update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {

        const avatarLocalPath = req.file?.path

        if (!avatarLocalPath) {
                throw new ApiError(400, "Avatar file is missing")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)

        if (!avatar.url) {
                throw new ApiError(400, "Error while uploading on avatar")
        }

        const updateAvatar = await User.findByIdAndUpdate(req.user?._id,
                {
                        $set: {
                                avatar: avatar.url
                        }
                },
                {
                        new: true
                }
        ).select("-password")

        return res
                .status(200)
                .json(
                        new ApiResponse(200, updateAvatar, "Avatar is updated Successfully")
                )
})

// update user cover images
const updateUserCoverImg = asyncHandler(async (req, res) => {

        const coverImgLocalPath = req.file?.path

        if (!coverImgLocalPath) {
                throw new ApiError(400, "coverImgLocalPath file is missing")
        }

        const coverImage = await uploadOnCloudinary(coverImgLocalPath)

        if (!coverImage.url) {
                throw new ApiError(400, "Error while uploading on coverImage")
        }

        const updatedImage = await User.findByIdAndUpdate(req.user?._id,
                {
                        $set: {
                                coverImage: coverImage.url
                        }
                },
                {
                        new: true
                }
        ).select("-password")

        return res
                .status(200)
                .json(
                        new ApiResponse(200, updatedImage, "CoverImage is updated Successfully")
                )
})

// get user channel details using aggregation pipeline
const getUserChannelProfile = asyncHandler(async (req, res) => {
        const username = req.params

        if (!username?.trim()) {
                throw new ApiError(400, "username not found")
        }

        const channel = User.aggregate([
                {       //1 aggregation for filler doc & match user 
                        $match: {
                                username: username?.toLowerCase()
                        }
                },
                { //2 aggregation for get subscribers of a channel
                        $lookup: {
                                from: "subscriptions",
                                localField: "_id",
                                foreignField: "channel",
                                as: "subscribers"
                        }
                },
                { //3 aggregation for get subscribed 
                        $lookup: {
                                from: "subscriptions",
                                localField: "_id",
                                foreignField: "subscribers",
                                as: "subscribedTo"
                        }
                },
                { //4 aggregation for add new field 
                        $addFields: {
                                SubscribersCount: {
                                        $size: "subscribers"
                                },
                                channelSubscribedCount: {
                                        $size: "$subscribedTo"
                                },
                                isSubscribed: {
                                        $cond: {
                                                if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                                                then: true,
                                                else: false
                                        }
                                }
                        }
                },
                { //5 aggregation for final projection
                        $project: {
                                fullname: 1,
                                username: 1,
                                SubscribersCount: 1,
                                channelSubscribedCount: 1,
                                isSubscribed: 1,
                                avatar: 1,
                                coverImage: 1,
                                email: 1
                        }
                }
        ])
        // console.log("channel data",channel)

        if (!channel?.length) {
                throw new ApiError(404, "channel not found")
        }
        return res
                .status(200)
                .json(
                        new ApiResponse(200, channel[0], "User Channel fetch successfully")
                )
})

// watch history
const getWatchHistory = asyncHandler(async (req, res) => {
        const user = await User.aggregate([
                {
                        $match: {
                                _id: new mongoose.Types.ObjectId(req.user._id)
                        }
                },
                {
                        $lookup: {
                                from: "videos",  //db model
                                localField: "watchHistory",
                                foreignField: "_id",
                                as: "watchHistory",
                                pipeline: [ // nested pipeline
                                        {
                                                $lookup: {
                                                        from: "users", // db model
                                                        localField: "owner",
                                                        foreignField: "_id",
                                                        as: "owner",
                                                        pipeline: [
                                                                {
                                                                        $project: {
                                                                                fullname: 1,
                                                                                username: 1,
                                                                                avatar: 1
                                                                        }
                                                                }
                                                        ]
                                                }

                                        },
                                        {
                                                $addFields: {
                                                        owner: {
                                                                $first: "$owner"
                                                        }
                                                }
                                        }
                                ]
                        }
                }
        ])

        return res
                .status(200)
                .json(
                        new ApiResponse(
                                200,
                                user[0].WatchHistory,
                                "Watch History fetch successfully"
                        )
                )
})


export {
        registerUser,
        loginUser,
        logOutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImg,
        getUserChannelProfile,
        getWatchHistory
}