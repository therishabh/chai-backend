import { Router } from "express";
import {
    changePasswordController,
    getCurrentUser,
    loginUserController,
    logoutUserController,
    refreshTokenController,
    registerUserController,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/verifyJWT.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUserController
);

router.route("/login").post(loginUserController);
router.route("/logout").post(verifyJWT, logoutUserController);
router.route("/refresh-token").post(refreshTokenController);
router.route("/change-password").post(verifyJWT, changePasswordController);
router.route("/info").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
    .route("/update-coverImage")
    .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
