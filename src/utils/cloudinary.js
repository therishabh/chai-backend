import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({
    cloud_name: "dxgmvpunp",
    api_key: 781272397713371,
    api_secret: "3xSpseWs7g0odYjBFj7fPgkQR0g",
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // file has been uploaded successfully
        console.log("file has been uploaded successfully", response);
        return response;
    } catch (error) {
        console.log("upload error", error);
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed.
        return null;
    }
};

export { uploadOnCloudinary };
