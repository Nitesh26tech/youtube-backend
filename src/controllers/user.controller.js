import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

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

export { registerUser }