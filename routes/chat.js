const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Message = require('../models/Message');
const Project = require('../models/Project');

// ROUTE 1: Get all messages for a specific project using: GET "/api/chat/:projectId". Login required.
router.get('/:projectId', fetchuser, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).send("Project Not Found");
        }

        // Check if the user is part of the project team
        const isUserInProject = project.team.map(id => id.toString()).includes(req.user.id) || project.teamLead.toString() === req.user.id;
        if (!isUserInProject) {
            return res.status(401).send("Not Allowed");
        }

        const messages = await Message.find({ projectId: req.params.projectId })
            .sort({ timestamp: 1 }) // Fetch messages in chronological order
            .populate('sender', 'name'); // Populate sender's name

        res.json(messages);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: This route will be used by our WebSocket server to save messages.
// It's not meant to be called directly by the client's form submission.
// POST "/api/chat/sendmessage". Login required.
router.post('/sendmessage', fetchuser, async (req, res) => {
    try {
        const { content, projectId } = req.body;
        if (!content || !projectId) {
            return res.status(400).json({ error: "Content and projectId are required." });
        }

        const newMessage = new Message({
            content,
            projectId,
            sender: req.user.id
        });

        const savedMessage = await newMessage.save();
        // Populate sender details before sending back
        const populatedMessage = await Message.findById(savedMessage._id).populate('sender', 'name');
        
        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;