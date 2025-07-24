import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const accessToken =
            req.cookies["accessToken"] ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!accessToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodeToken = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET
        );

        if (!decodeToken) {
            throw new ApiError(401, "Unauthorized request");
        }

        const user = await User.findById(decodeToken._id).select(
            "-password, -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export { verifyJWT };
