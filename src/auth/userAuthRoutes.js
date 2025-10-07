
const express = require("express");
const authController = require("../controllers/userAuthController");
const {validateRegistration,validateLogin} = require("../middlewares/validateMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const { deleteAccount } = require("../controllers/userAuthController");
// this logic are found in prefrence, we will seperate them when everything is sorted
const { getProfile ,updateProfile, updateSettings , } = require("../controllers/preferencesController");


const router = express.Router();

router.post("/user/auth/register", validateRegistration, authController.register);

router.post("/user/auth/login",validateLogin,authController.login);

router.get("/user/auth/verify-email", authController.verifyEmail);

router.post("/user/auth/resend-link", authController.resendLink);

router.get('/user/auth/profile', authMiddleware, getProfile);

router.put('/user/auth/profile', authMiddleware, updateProfile);

router.put('/user/auth/settings', authMiddleware, updateSettings);

router.delete("/user/auth/delete", authMiddleware, deleteAccount);

router.post("/user/auth/token/refresh", authController.tokenRefresh);

module.exports = router;
