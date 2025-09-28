
const User = require('../models/User');
const joi = require("joi");



// Joi schema for user registration validation
const RegisterUserSchema = joi.object({

    email: joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi.string().min(6).required().messages({ // Stronger password validation can be added
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'

   
    })

});

console.log('it is failing at this point');
// Middleware function to validate registration payload
const RegisterUserValidator = async (req, res, next) => {
    try {
        const payload = req.body;
        await RegisterUserSchema.validateAsync(payload, { abortEarly: false }); // abortEarly: false to get all errors

        next(); // If validation passes, proceed to the next middleware/controller
    } catch (error) {
        // If validation fails, Joi throws an error
        return res.status(400).json({
            status: "error",
            message: "Validation failed", // More general message
            errors: error.details.map(detail => detail.message) // Map Joi details to just messages
        });
    }
};



module.exports = {
    RegisterUserValidator
};