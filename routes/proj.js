const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const Project = require('../models/Project');
const User = require('../models/User'); // Needed to validate team members

// ROUTE 1: Get all projects for the logged-in user using: GET "/api/projects/fetchallprojects". Login required.
router.get('/fetchallprojects', fetchuser, async (req, res) => {
    try {
        // Find projects where the user is either the team lead or a team member
        const projects = await Project.find({
            $or: [
                { teamLead: req.user.id },
                { team: req.user.id }
            ]
        }).populate('teamLead', 'name email').populate('team', 'name email'); // Populate with user details

        res.json(projects);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Create a new project using: POST "/api/projects/createproject". Login required.
router.post('/createproject', [
    fetchuser,
    body('name', 'Enter a valid name for the project').isLength({ min: 3 }),
    body('description', 'Description must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    try {
        const { name, description, team } = req.body;

        // If there are validation errors, return Bad request and the errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const newProject = new Project({
            name,
            description,
            teamLead: req.user.id, // The logged-in user is the team lead
            team: team || [] // Optional: include initial team members
        });

        const savedProject = await newProject.save();
        res.json(savedProject);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update an existing project using: PUT "/api/projects/updateproject/:id". Login required.
router.put('/updateproject/:id', fetchuser, async (req, res) => {
    const { name, description, team } = req.body;

    try {
        // Create a newProject object
        const newProject = {};
        if (name) { newProject.name = name; }
        if (description) { newProject.description = description; }
        if (team) { newProject.team = team; }

        // Find the project to be updated
        let project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).send("Not Found");
        }

        // Allow update only if the user is the team lead
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        project = await Project.findByIdAndUpdate(req.params.id, { $set: newProject }, { new: true });
        res.json({ project });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


// ROUTE 4: Delete an existing project using: DELETE "/api/projects/deleteproject/:id". Login required.
router.delete('/deleteproject/:id', fetchuser, async (req, res) => {
    try {
        // Find the project to be deleted
        let project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).send("Not Found");
        }

        // Allow deletion only if the user is the team lead
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        await Project.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Project has been deleted", project: project });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;
