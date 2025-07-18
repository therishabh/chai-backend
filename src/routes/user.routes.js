import { Router } from "express";
import {
    loginUserController,
    registerUserController,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
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

export default router;
