import { asyncHandler } from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { ApiResponse } from "./../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

const cookieOptions = {
    httpOnly: true,
    secure: true,
};

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
        throw new ApiError(
            400,
            `${emptyFieldArray.join(", ")} fields are required`
        );
    }

    // check if user already exists: username, email
    const existingUser = await User.findOne({
        $or: [{ email }, { username }],
    }).lean(); // By default, Mongoose returns a Mongoose document, which has many helper methods (like .save(), .validate(), etc.). When you use .lean(), it bypasses those Mongoose features and returns a plain JS object.
    if (existingUser) {
        throw new ApiError(400, "Email or Username already exists");
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

    const userObject = user;
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

const logoutUserController = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    await User.findByIdAndUpdate(
        req.user._id,
        {
            //$unset is a MongoDB operator that removes a field from a document.
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        {
            // This tells Mongoose to return the updated document instead of the original.
            new: true,
        }
    );

    res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshTokenController = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies["refreshToken"] || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const { _id } = decodeToken;
        const user = await User.findById(_id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }

        const { accessToken, refreshToken } =
            await generateAccessRefreshToken(user);

        res.status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        refreshToken,
                        accessToken,
                    },
                    "successfully login"
                )
            );
    } catch (err) {
        throw new ApiError(401, err?.message || "invalid refresh token");
    }
});

const changePasswordController = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "please enter oldPassword and newPassword");
    }

    // fetch user info from DB
    const user = await User.findById(_id);
    // validate for password correction.
    const isValidPassword = await user.isPasswordCorrect(oldPassword);

    if (!isValidPassword) {
        throw new ApiError(400, "oldPassword is not valid");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    res.status(200).json(
        new ApiResponse(200, {}, "Password successfully changed.")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // Jab aap Mongoose document ko JSON me convert karte ho (like sending it in response from API, or using res.json(user)), to Mongoose automatically call karta hai toJSON() method.
    res.status(200).json(
        new ApiResponse(200, req.user, "current user fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const userByEmail = await User.findOne({
        email,
        _id: { $ne: req.user?._id }, // exclude this _id
    }).lean();
    // $ne is a MongoDB query operator that stands for "not equal". It’s used to find documents where a field’s value is not equal to a specific value.

    if (userByEmail) {
        throw new ApiError(400, "Email id already exist");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        {
            new: true, // that parameter help us to return updated information, if i'll not pass that parameter then old data will show
        }
    );

    res.status(200).json(
        new ApiResponse(200, user, "Account details updated, successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        {
            new: true,
        }
    );

    res.status(200).json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(400, "Error while uploading on cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    );

    res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});

export {
    registerUserController,
    loginUserController,
    logoutUserController,
    refreshTokenController,
    changePasswordController,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
};
