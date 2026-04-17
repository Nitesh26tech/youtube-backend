import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'
import dotenv from "dotenv";
dotenv.config();


cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async(localFilePath) =>{
        try {
                // console.log("uploading to cloudinary", localFilePath)
                if(!localFilePath) return null
                //upload the file on cloudinary
                const response = await cloudinary.uploader.upload(localFilePath,{
                    resource_type:"auto"    
                });

                // file has been uploaded successfully
                // console.log("file is uploaded on cloudinary", response);
                return response;
        } catch (error) {
                console.log("Cloudinary Error", error)
                fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
                return null
                
        }
};

export { uploadOnCloudinary }