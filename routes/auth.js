const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');

const JWT_SECRET = 'Bennyi$ag00dguy';

const router = express.Router();

// ROUTE-1: Create a new user using: POST "/api/auth/createuser". No login required.
router.post('/createuser', [
    body('name', 'Enter a valid name').isLength({ min: 5 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must contain at least 5 characters').isLength({ min: 5 }),
    // Added validation for the github link. It's optional, but if provided, it must be a URL.
    body('github', 'Enter a valid GitHub URL').optional().isURL(), 
], async (req, res) => {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check if a user with this email already exists
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            return res.status(400).json({ success: false, error: "Sorry, a user with this email already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // Create a new user with the provided details, including the github link
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: secPass,
            github: req.body.github, // Save the github link to the database
        });

        const data = {
            user: {
                id: user.id
            }
        };

        // Create and sign a JWT token
        const authtoken = jwt.sign(data, JWT_SECRET);
        
        res.json({ success: true, authtoken });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("An internal server error occurred");
    }
});

// ROUTE-2: Authenticate a user using: POST "/api/auth/login". No login required.
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists(),
], async (req, res) => {
    // If there are errors, return Bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, error: "Please try to login with correct credentials" });
        }

        const passwordCompare = await bcrypt.compare(password, user.password);
        if (!passwordCompare) {
            return res.status(400).json({ success: false, error: "Please try to login with correct credentials" });
        }

        const data = {
            user: {
                id: user.id
            }
        };
        const authtoken = jwt.sign(data, JWT_SECRET);
        res.json({ success: true, authtoken });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE-3: Get logged-in user details using: POST "/api/auth/getuser". Login required.
router.post('/getuser', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password"); // Exclude password from the result
        res.send(user);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;