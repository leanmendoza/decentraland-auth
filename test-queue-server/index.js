const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')

const app = express();
const port = 3000;

// Map to store tasks with unique IDs
const tasksMap = new Map();

app.use(cors())

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// POST endpoint to add a new task with a specified ID
app.post('/task', (req, res) => {
    const { id, data } = req.body;
    console.log({ id, body: req.body })

    // Validate the ID format
    if (!isValidId(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if the ID is already in use
    if (tasksMap.has(id)) {
        return res.status(400).json({ error: 'ID already in use' });
    }

    // Add the task to the map with the specified ID
    tasksMap.set(id, { id, data, createdAt: Date.now() });

    res.status(201).json({ id });
});

// GET endpoint to retrieve a task by ID
app.get('/task/:id', (req, res) => {
    const taskId = req.params.id;
    const task = tasksMap.get(taskId);

    if (task) {
        res.json(task);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// DELETE endpoint to remove a task by ID
app.delete('/task/:id', (req, res) => {
    const taskId = req.params.id;

    // Remove the task from the map
    const deletedTask = tasksMap.get(taskId);
    tasksMap.delete(taskId);

    if (deletedTask) {
        res.json(deletedTask);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});


// TODO only for test
app.get('/tasks', (req, res) => {
    res.json({ tasks: [...tasksMap.entries()] });
});

// Function to validate the format of the ID
function isValidId(id) {
    const idRegex = /^[a-zA-Z0-9-_]{48,64}$/; // Base64url characters with a length between 48 and 64
    return idRegex.test(id);
}

// Set up a cleanup interval to remove expired tasks (e.g., every 5 minutes)
const cleanupInterval = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
    cleanupExpiredTasks();
}, cleanupInterval);

// Function to clean up expired tasks
function cleanupExpiredTasks() {
    const currentTime = Date.now();
    for (const [taskId, task] of tasksMap.entries()) {
        // Assuming tasks expire after 10 minutes
        const expirationTime = task.createdAt + 10 * 60 * 1000; // 10 minutes
        if (currentTime > expirationTime) {
            tasksMap.delete(taskId);
        }
    }
}


app.use((req, res, next) => {
    res.status(404).json({
        error: 'Not found'
    })
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});