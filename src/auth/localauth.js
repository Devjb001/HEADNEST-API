// services/userService.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const CreateUser = async ({email, password }) => {
    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return { status: 409, success: false, message: 'Email already registered' };
        }

        const user = await User.create({email, password });

        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        // Ensure 'status' is a string for successful responses
        return { status: 201, success: true, message: 'User created successfully', data: { user: userWithoutPassword, token: generateToken(user._id) } };
    } catch (error) {
        console.error("Error creating user in UserService:", error); // Keep this log for debugging

        // Check for Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.keys(error.errors).map(key => error.errors[key].message);
            return { status: 400, success: false, message: 'Validation failed', errors: errors };
        }
        // For any other unexpected errors
        return { status: 500, success: false, message: 'Internal server error during user creation', error: error.message };
    }
};

module.exports = {
    CreateUser
};