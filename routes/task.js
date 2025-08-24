    const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const Task = require('../models/Task');
const Project = require('../models/Project');

// ROUTE 1: Get all tasks for a specific project using: GET "/api/tasks/fetchalltasks/:projectId". Login required.
router.get('/fetchalltasks/:projectId', fetchuser, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).send("Project Not Found");
        }

        // Check if the user is part of the project team or the lead
        const isUserInProject = project.team.map(id => id.toString()).includes(req.user.id) || project.teamLead.toString() === req.user.id;
        if (!isUserInProject) {
            return res.status(401).send("Not Allowed");
        }

        const tasks = await Task.find({ projectId: req.params.projectId })
            .populate('assignedBy', 'name email')
            .populate('assignedTo', 'name email');
            
        res.json(tasks);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Create a new task in a project using: POST "/api/tasks/createtask/:projectId". Login required.
router.post('/createtask/:projectId', [
    fetchuser,
    body('title', 'Enter a valid title for the task').isLength({ min: 3 }),
    body('description', 'Description must be at least 5 characters').isLength({ min: 5 }),
    body('assignedTo', 'Please assign the task to a user').isMongoId(),
    body('dueDate', 'Please provide a valid due date').isISO8601().toDate(),
], async (req, res) => {
    try {
        const { title, description, assignedTo, status, dueDate } = req.body;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).send("Project Not Found");
        }

        // Allow task creation only if the user is the team lead
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed to create tasks in this project");
        }

        const newTask = new Task({
            projectId: req.params.projectId,
            title,
            description,
            assignedBy: req.user.id,
            assignedTo,
            status,
            dueDate
        });

        const savedTask = await newTask.save();
        res.json(savedTask);

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update an existing task using: PUT "/api/tasks/updatetask/:id". Login required.
router.put('/updatetask/:id', fetchuser, async (req, res) => {
    const { title, description, assignedTo, status, dueDate } = req.body;

    try {
        const newTaskData = {};
        if (title) newTaskData.title = title;
        if (description) newTaskData.description = description;
        if (assignedTo) newTaskData.assignedTo = assignedTo;
        if (status) newTaskData.status = status;
        if (dueDate) newTaskData.dueDate = dueDate;

        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).send("Task Not Found");
        }

        const project = await Project.findById(task.projectId);
        
        // Allow update only if the user is the project's team lead
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        task = await Task.findByIdAndUpdate(req.params.id, { $set: newTaskData }, { new: true });
        res.json({ task });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Delete an existing task using: DELETE "/api/tasks/deletetask/:id". Login required.
router.delete('/deletetask/:id', fetchuser, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).send("Task Not Found");
        }

        const project = await Project.findById(task.projectId);

        // Allow deletion only if the user is the project's team lead
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Not Allowed");
        }

        await Task.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Task has been deleted", task: task });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
