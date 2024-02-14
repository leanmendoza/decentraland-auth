const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors')

const app = express();
const port = process.env.QUEUE_SERVER_PORT || 5545;

// Map to store tasks with unique IDs
const tasksMap = new Map();

app.use(cors())

// Middleware to parse JSON in the request body
app.use(bodyParser.json());

// POST endpoint to add a new task with a specified ID
app.post('/task', (req, res) => {
    const { id, request } = req.body;
    console.log({ id, request })

    // Validate the ID format
    if (!isValidId(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if the ID is already in use
    if (tasksMap.has(id)) {
        return res.status(400).json({ error: 'ID already in use' });
    }

    // Add the task to the map with the specified ID
    tasksMap.set(id, { id, request, createdAt: Date.now() });

    res.status(201).json({ id });
});


// PUT endpoint to add the response
app.put('/task/:id', (req, res) => {
    const taskId = req.params.id;
    const { response } = req.body;
    console.log({ taskId, response })

    // Validate the ID format
    if (!isValidId(taskId)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if the ID exists
    if (!tasksMap.has(taskId)) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (tasksMap.get(taskId).response) {
        return res.status(400).json({ error: 'Response already added' });
    }

    tasksMap.get(taskId).response = response
    res.status(200).json({ id: taskId });
});

// GET endpoint to retrieve a task by ID
app.get('/task/:id/request', (req, res) => {
    const taskId = req.params.id;
    const task = tasksMap.get(taskId);

    if (task) {
        if (task.response) {
            res.status(404).json({ error: 'Response already added' });
        } else if (task.request) {
            res.json(task.request);
        } else {
            res.status(404).json({ error: 'Request not found' });
        }
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// GET endpoint to retrieve a task by ID
app.get('/task/:id/response', (req, res) => {
    const taskId = req.params.id;
    const task = tasksMap.get(taskId);

    if (task) {
        if (task.response) {
            res.json(task.response);
        } else {
            res.status(404).json({ error: 'Response not found' });
        }
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
    const toDelete = new Set()
    const currentTime = Date.now();
    for (const [taskId, task] of tasksMap.entries()) {
        // Assuming tasks expire after 10 minutes
        const expirationTime = task.createdAt + 10 * 60 * 1000; // 10 minutes
        if (currentTime > expirationTime) {
            toDelete.add(taskId)
        }
    }

    for (const taskId of toDelete.values()) {
        tasksMap.delete(taskId);
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