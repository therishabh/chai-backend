import { asyncHandler } from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { ApiResponse } from "./../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessRefreshToken = async (user) => {
    try {
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return {
            accessToken,
            refreshToken,
        };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token"
        );
    }
};

const registerUserController = asyncHandler(async (req, res, next) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // get user details from frontend
    const { fullName, email, username, password } = req.body;

    // validation - not empty
    let isAnyFieldEmpty = false;
    let emptyFieldArray = [];
    const fieldObj = { fullName, email, username, password };
    for (let key in fieldObj) {
        if (
            fieldObj[key]?.trim() === undefined ||
            fieldObj[key]?.trim() === ""
        ) {
            isAnyFieldEmpty = true;
            emptyFieldArray.push(key);
        }
    }

    if (isAnyFieldEmpty) {
        return next(
            new ApiError(
                400,
                `${emptyFieldArray.join(", ")} fields are required`
            )
        );
    }

    // check if user already exists: username, email
    const existingUser = await User.findOne({
        $or: [{ email }, { username }],
    }).lean();
    if (existingUser) {
        return next(new ApiError(400, "Email or Username already exists"));
    }

    // check for images, check for avatar
    const avatarPath =
        Array.isArray(req?.files?.avatar) && req.files.avatar.length > 0
            ? req?.files?.avatar[0]?.path
            : undefined;
    const coverImagePath =
        Array.isArray(req?.files?.coverImage) &&
        req?.files?.coverImage.length > 0
            ? req?.files?.coverImage[0]?.path
            : undefined;

    if (!avatarPath) {
        return next(new ApiError(400, "avatar Image is required"));
    }

    console.log("avatarPath", avatarPath);

    const avatarImageServerObj = await uploadOnCloudinary(avatarPath);

    let coverImageServerObj = {};
    if (coverImagePath) {
        coverImageServerObj = await uploadOnCloudinary(coverImagePath);
        if (Object.keys(coverImageServerObj).length == 0) {
            return next(new ApiError(500, "Avatar Image is not uploaded"));
        }
    }

    if (Object.keys(avatarImageServerObj).length == 0) {
        return next(new ApiError(500, "Avatar Image is not uploaded"));
    }

    // upload them to cloudinary, avatar

    // create user object - create entry in db
    const newUser = await User.create({
        username,
        password,
        email,
        avatar: avatarImageServerObj?.url,
        coverImage: coverImageServerObj?.url,
        fullName,
    });

    // remove password and refresh token field from response
    // check for user creation
    const createdUser = await User.findById(newUser._id).select(
        "-password -refreshToken -__v"
    );

    if (!createdUser) {
        return next(
            new ApiError(500, "Something went wrong while registering the user")
        );
    }

    // return res
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUserController = asyncHandler(async (req, res, next) => {
    const { email, username, password } = req.body;

    // check if email or username should not be empty
    if (!(email || username)) {
        throw new ApiError(400, "email or username is required for login");
    }

    // check if password should not be empty
    if (!password) {
        throw new ApiError(400, "password is required");
    }

    // fetch user info based on email id or password from database
    const user = await User.findOne({
        $or: [{ email }, { username }],
    }).select("-__v -createdAt");

    // throw error if user is not exist in database
    if (!user) {
        throw new ApiError(400, "invalid user");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "invalid user credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessRefreshToken(user);

    const cookieOptions = {
        httpOnly: true,
        secure: true,
    };

    const userObject = user.toJSON();
    res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: userObject,
                    refreshToken,
                    accessToken,
                },
                "successfully login"
            )
        );
});

export { registerUserController, loginUserController };
