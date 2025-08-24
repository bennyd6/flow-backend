const express = require("express");
const axios = require("axios");
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const User = require('../models/User');

const GITHUB_API = "https://api.github.com";

// Middleware to get the GitHub username for the logged-in user
const getGithubUsername = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('github');
        if (!user || !user.github) {
            return res.status(404).json({ error: "GitHub username not found for this user. Please add it to your profile." });
        }
        // Extract username from URL, e.g., https://github.com/username -> username
        req.githubUsername = new URL(user.github).pathname.substring(1);
        next();
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve GitHub username." });
    }
};

// All routes below will first fetch the user's GitHub username
router.use(fetchuser, getGithubUsername);

// Get User Profile
router.get("/user", async (req, res) => {
    try {
        const response = await axios.get(`${GITHUB_API}/users/${req.githubUsername}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch GitHub user profile." });
    }
});

// Get User Repositories
router.get("/user/repos", async (req, res) => {
    try {
        const response = await axios.get(`${GITHUB_API}/users/${req.githubUsername}/repos?per_page=100&sort=updated`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch GitHub repositories." });
    }
});

// Get Language Usage (aggregate across repos)
router.get("/user/languages", async (req, res) => {
    try {
        const reposResponse = await axios.get(`${GITHUB_API}/users/${req.githubUsername}/repos?per_page=100`);
        const languageStats = {};

        await Promise.all(
            reposResponse.data.map(async (repo) => {
                if (repo.languages_url) {
                    const langRes = await axios.get(repo.languages_url);
                    Object.entries(langRes.data).forEach(([lang, count]) => {
                        languageStats[lang] = (languageStats[lang] || 0) + count;
                    });
                }
            })
        );
        res.json(languageStats);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch language data." });
    }
});

module.exports = router;