const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');

// ROUTE: Get the video call status for a specific project
// GET "/api/video/status/:projectId"
router.get('/status/:projectId', fetchuser, (req, res) => {
  // Retrieve the 'rooms' map set in the main index.js file
  const rooms = req.app.get('videoRooms');
  const { projectId } = req.params;
  
  // Check if a room exists for the given project ID and has participants
  if (rooms && rooms.has(projectId) && rooms.get(projectId).size > 0) {
    res.json({ isActive: true });
  } else {
    res.json({ isActive: false });
  }
});

module.exports = router;
