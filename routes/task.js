const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fetchuser = require('../middleware/fetchuser');
const Task = require('../models/Task');
const Project = require('../models/Project');

// ROUTE 1: Get all tasks for a specific project
router.get('/fetchalltasks/:projectId', fetchuser, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) return res.status(404).send("Project Not Found");

        const isUserInProject = project.team.map(id => id.toString()).includes(req.user.id) || project.teamLead.toString() === req.user.id;
        if (!isUserInProject) return res.status(401).send("Not Allowed");

        const tasks = await Task.find({ projectId: req.params.projectId })
            .populate('assignedBy', 'name email')
            .populate('assignedTo', 'name email');
        res.json(tasks);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 2: Create a new task in a project
router.post('/createtask/:projectId', [
    fetchuser,
    body('title', 'Enter a valid title').isLength({ min: 3 }),
    body('assignedTo', 'Please assign the task').isMongoId(),
    body('dueDate', 'Please provide a valid due date').isISO8601().toDate(),
], async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        const project = await Project.findById(req.params.projectId);
        if (!project) return res.status(404).send("Project Not Found");

        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Only the team lead can create tasks.");
        }
        const newTask = new Task({
            projectId: req.params.projectId, title, description, assignedBy: req.user.id, assignedTo, dueDate
        });
        const savedTask = await newTask.save();
        res.json(savedTask);
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 3: Update an existing task with role-based permissions
router.put('/updatetask/:id', fetchuser, async (req, res) => {
    const { status } = req.body; // We only allow status updates for now
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).send("Task Not Found");

        const project = await Project.findById(task.projectId);
        const isTeamLead = project.teamLead.toString() === req.user.id;
        const isAssignedUser = task.assignedTo.toString() === req.user.id;

        if (!isTeamLead && !isAssignedUser) {
            return res.status(401).send("Not authorized to update this task.");
        }

        // Rule: Team members cannot set status to 'completed'
        if (isAssignedUser && !isTeamLead && status === 'completed') {
            return res.status(401).send("Only the team lead can mark a task as completed.");
        }

        const updatedTaskData = {};
        if (status) updatedTaskData.status = status;

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, { $set: updatedTaskData }, { new: true });
        res.json({ task: updatedTask });

    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

// ROUTE 4: Delete an existing task
router.delete('/deletetask/:id', fetchuser, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (!task) return res.status(404).send("Task Not Found");

        const project = await Project.findById(task.projectId);
        if (project.teamLead.toString() !== req.user.id) {
            return res.status(401).send("Only the team lead can delete tasks.");
        }
        await Task.findByIdAndDelete(req.params.id);
        res.json({ "Success": "Task has been deleted" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;