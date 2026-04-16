import { jwt } from 'jsonwebtoken';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';



const userSchema = new Schema({
        username: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
                index: true
        },
        email: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
        },
        fullname: {
                type: String,
                required: true,
                trim: true,
                index: true
        },
        avatar: {
                type: String,  // cloudinary url
                required: true,

        },
        coverImage: {
                type: String,
        },
        watchHistory: [
                {
                        type: Schema.Types.ObjectId,
                        ref: "Video"
                }
        ],
        password: {
                type: String,
                required: [true, 'Password is required !']
        },
        refreshToken: {
                type: String
        }
}, { timestamps: true });


// password hashing before store using the bcrypt middleware 
userSchema.pre("save", async function (next) {
        if (this.isModified("password")) return next();
        this.password = bcrypt.hash(this.password, 10)
        next()
})

//checking the password using bcrypt middleware
userSchema.methods.isPasswordCorrect = async function (password) {
        return await bcrypt.compare(password, this.password)
}  // true or false

//create token
userSchema.methods.generateAccessToken = function () {
        return jwt.sign({
                _id: this._id,
                email: this.email,
                username: this.username,
                fullname: this.fullname
        },
                process.env.JWT_SECRET_KEY,
                {
                        expiresIn: process.env.TOKEN_EXPIRY
                }
        )
}

// refresh token
userSchema.methods.generateRefreshToken = function () {
        return jwt.sign({
                _id: this._id,
                email: this.email,
                username: this.username,
                fullname: this.fullname
        },
                process.env.REFRESH_TOKEN_KEY,
                {
                        expiresIn: process.env.REFRESH_EXPIRY
                }
        )
}


export const User = mongoose.model("User", userSchema)