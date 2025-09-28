const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const deleteAccount = require('../controllers/userController');
const userMiddleware = require('../middlewares/userMiddleware');
const UsersController = require('../controllers/userController');



//router.delete('/me', auth, deleteAccount);


router.post('/signup', userMiddleware.RegisterUserValidator, UsersController.CreateUser);


module.exports = router;