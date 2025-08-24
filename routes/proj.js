const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const Project = require('../models/Project');
const User = require('../models/User'); 

// ROUTE 1: Get all projects for the logged-in user
router.get('/fetchallprojects', fetchuser, async (req, res) => {
    try {
        const projects = await Project.find({
            $or: [ { teamLead: req.user.id }, { team: req.user.id } ]
        }).populate('teamLead', 'name email').populate('team', 'name email');
        res.json(projects);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Create a new project
router.post('/createproject', [
    fetchuser,
    body('name', 'Enter a valid name for the project').isLength({ min: 3 }),
    body('description', 'Description must be at least 5 characters').isLength({ min: 5 }),
], async (req, res) => {
    try {
        const { name, description, team } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const newProject = new Project({
            name,
            description,
            teamLead: req.user.id,
            team: team || [] 
        });
        const savedProject = await newProject.save();
        res.json(savedProject);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update an existing project (e.g., add team members)
router.put('/updateproject/:id', fetchuser, async (req, res) => {
    const { name, description, team } = req.body;
    try {
        const newProjectData = {};
        if (name) newProjectData.name = name;
        if (description) newProjectData.description = description;
        if (team) newProjectData.team = team;

        let project = await Project.findById(req.params.id);
        if (!project) return res.status(404).send("Not Found");

        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }
        project = await Project.findByIdAndUpdate(req.params.id, { $set: newProjectData }, { new: true });
        res.json({ project });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Delete an existing project
router.delete('/deleteproject/:id', fetchuser, async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);
        if (!project) return res.status(404).send("Not Found");

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