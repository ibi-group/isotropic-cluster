# isotropic-cluster

[![npm version](https://img.shields.io/npm/v/isotropic-cluster.svg)](https://www.npmjs.com/package/isotropic-cluster)
[![License](https://img.shields.io/npm/l/isotropic-cluster.svg)](https://github.com/ibi-group/isotropic-cluster/blob/main/LICENSE)
![](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)

A reusable and extendable platform to manage local Node.js process clusters with a clean API for primary/worker communication and lifecycle management.

## Why Use This?

- **Simple API for Cluster Management**: Manage worker processes with an intuitive, event-driven API
- **Reliable Worker Lifecycle**: Automatic worker initialization and ready state management
- **Robust Communication**: Structured, promise-based message passing between primary and workers
- **Load Balancing**: Built-in round-robin worker selection with support for task-specific distribution
- **Error Handling**: Comprehensive error propagation and worker replacement on failure
- **Event Lifecycle**: Observable events for all worker lifecycle stages
- **Type-based Routing**: Route messages to specific handler methods based on message type

## Installation

```bash
npm install isotropic-cluster
```

## Basic Usage

### Primary Process

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';
import _later from 'isotropic-later';

{
    // Create a cluster primary
    const primary = _ClusterPrimary();

    // Listen for messages from workers
    primary.on('workerMessage', ({
        data: {
            message,
            worker
        }
    }) => {
        console.log(`Received from worker ${worker.id}:`, message);
    });

    // Listen for worker lifecycle events
    primary.on('workerReady', ({
        data: {
            worker
        }
    }) => {
        console.log(`Worker ${worker.id} is ready to handle requests`);

        // Send a message to the worker
        primary.send({
            message: {
                name: 'User',
                type: 'greet'
            },
            to: worker
        });
    });

    // Start some workers
    primary.fork({
        workerCount: 4
    });

    // Later, shutdown the cluster
    _later_(60000, () => {
        primary.shutDown();
    });
}
```

### Worker Process

```javascript
import _ClusterWorker from 'isotropic-cluster/lib/cluster-worker.js';

{
    // Create a cluster worker
    const worker = _ClusterWorker();

    // Handle messages from primary
    worker.on('primaryMessage', ({
        data: {
            message
        }
    }) => {
        if (message.type === 'greet') {
            console.log(`Hello, ${message.name}!`);

            // Send a response back to primary
            worker.send({
                message: {
                    content: `Greeted ${message.name}`,
                    type: 'response'
                }
            });
        }
    });

    // Handle primary disconnection
    worker.on('primaryDisconnect', () => {
        console.log('Primary disconnected, cleaning up...');
        // Perform cleanup operations
    });
}
```

## Core Concepts

### Cluster Architecture

Node.js clusters consist of a primary process that manages multiple worker processes. The primary process:

- Forks and monitors worker processes
- Distributes work among workers
- Handles worker failures and restarts

Workers are separate processes that:
- Handle specific tasks (like serving HTTP requests)
- Report their status to the primary
- Perform work assigned by the primary

### Initialization Lifecycle

1. **Creation**: Primary and worker objects are created
2. **Initialization**: Internal setup occurs
3. **Worker Readiness**: Workers signal readiness to the primary
4. **Operation**: Normal operation with message passing
5. **Shutdown**: Clean termination of worker processes

### Event-Based Communication

Both `ClusterPrimary` and `ClusterWorker` extend `isotropic-pubsub`, providing a complete event system:

- Subscribe to events with `on()`, `before()`, and `after()`
- Publish events with observable lifecycle phases
- Type-based message routing for organized handlers

## Examples

### HTTP Server with Worker Processes

```javascript
// primary.js
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';
import _os from 'node:os';
import _process from 'node:process';

{
    const primary = _ClusterPrimary({
        workerScript: 'worker.js'
    });

    // Log worker activity
    primary.on({
        workerExit: ({
            data: {
                code,
                signal,
                worker
            }
        }) => {
            console.log(`Worker ${worker.id} exited with code ${code} and signal ${signal}`);
        },
        workerReady: ({
            data: {
                worker
            }
        }) => {
            console.log(`Worker ${worker.id} is ready to handle connections`);
        }
    });

    {
        // Start workers based on CPU count
        const cpuCount = _os.cpus().length;

        console.log(`Starting ${cpuCount} workers`);

        primary.fork({
            workerCount: cpuCount
        });
    }

    // Handle graceful shutdown
    _process.on('SIGTERM', () => {
        console.log('Shutting down server');

        primary.shutDown();
    });
}

// worker.js
import _ClusterWorker from 'isotropic-cluster/lib/cluster-worker.js';
import _http from 'node:http';

{
    const worker = _ClusterWorker();

    // Create HTTP server
    const server = _http.createServer((request, response) => {
        ressponse.writeHead(200);
        response.end(`Hello from worker ${_ClusterWorker.workerId}`);
    });

    // Start listening on port 3000
    server.listen(3000, () => {
        console.log(`Worker ${ClusterWorker.workerId} listening on port 3000`);
    });

    // Handle shutdown
    worker.on('primaryDisconnect', () => {
        console.log('Primary asked worker to disconnect, closing server');
        server.close(() => {
            process.exit(0);
        });
    });
}
```

### Task Distribution with Round-Robin

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';

{
    const primary = _ClusterPrimary(),

        // Queue of tasks to process
        tasks = [{
            data: '...',
            id: 1
        }, {
            data: '...',
            id: 2
        }, {
            data: '...',
            id: 3
        }, {
            // ... more tasks
        }],

        processQueue = () => {
            if (tasks.length) {
                const task = tasks.shift(), // Get the next task
                    worker = primary.roundRobin(); // Select a worker using round-robin

                // Send the task to the worker
                primary.send({
                    message: {
                        task,
                        type: 'processTask'
                    },
                    to: worker
                }).then(() => {
                    console.log(`Task ${task.id} sent to worker ${worker.id}`);
                }).catch(error => {
                    console.error(`Failed to send task ${task.id}:`, error);

                    // Put task back in queue
                    tasks.unshift(task);
                });
            }
        };

    // Listen for worker readiness
    primary.on('workerReady', () => {
        // Start processing tasks when at least one worker is ready
        processQueue();
    });

    // Handle task completion
    primary.on('workerMessage', ({
        data: {
            message
        }
    }) => {
        if (message.type === 'taskComplete') {
            console.log(`Task ${message.taskId} completed with result:`, message.result);

            // Process next task
            processQueue();
        }
    });

    // Start workers
    primary.fork({
        workerCount: 4
    });
}
```

### Specialized Task Distribution

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';

{
    const primary = _ClusterPrimary(),

    // Different types of tasks
        tasksByType = {
            compute: [{
                data: '...',
                id: 'c1'
            }, {
                data: '...',
                id: 'c2'
            }],
            io: [{
                data: '...',
                id: 'i1'
            }, {
                data: '...',
                id: 'i2'
            }],
            lightweight: [{
                data: '...',
                id: 'l1'
            }, {
                data: '...',
                id: 'l2'
            }],

        processQueue = queueType => {
            const tasks = tasksByType[queueType];

            if (tasks.length) {
                const task = tasks.shift(), // Get the next task
                    worker = primary.roundRobin({ // Select a worker using queue-specific round-robin
                        tag: queueType
                    });

                // Send the task to the worker
                primary.send({
                    message: {
                        task,
                        type: 'processTask'
                    },
                    to: worker
                }).then(() => {
                    console.log(`Task ${task.id} sent to worker ${worker.id}`);
                }).catch(error => {
                    console.error(`Failed to send task ${task.id}:`, error);

                    // Put task back in queue
                    tasks.unshift(task);
                });
            }
        };
    };

    // Listen for worker readiness
    primary.on('workerReady', () => {
        // Start processing tasks when at least one worker is ready
        processQueue('compute');
        processQueue('io');
        processQueue('lightweight');
    });

    // Handle task completion
    primary.on('workerMessage', ({
        data: {
            message
        }
    }) => {
        if (message.type === 'taskComplete') {
            console.log(`Task ${message.taskId} completed with result:`, message.result);

            // Process next task
            processQueue();
        }
    });

    // Start workers
    primary.fork({
        workerCount: 6
    });
}
```

### Type-Based Message Routing

Message passing between the primary process and a worker process is very common. When messages are coming from multiple places with different payloads and different contexts, it can be difficult to process with a single message event handler function. There is a built-in shortcut for handling messages of different types. It requires the message to be an object with a string property named `type`. When the ClusterPrimary instance receives a message from a worker with a type property, it will execute a method with the name `_eventWorkerMessage_${type}`. You don't have to subscribe to the `message` event. The ClusterPrimary instance just needs to have the correct methods defined. This can be done easily with `isotropic-make`.

When a ClusterWorker instance receives a message from the primary with a type property, it will execute a method with the name `_eventPrimaryMessage_${type}`.

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';
import _make from 'isotropic-make';

// Extend ClusterPrimary with custom message handler methods
const _AdvancedPrimary = _make(_ClusterPrimary, {
    _eventWorkerMessage_log ({
        data: {
            message,
            worker
        }
    }) {
        // Handler for messages with type: 'log'
        console.log(`[Worker ${worker.id} LOG] ${message.level}: ${message.text}`);
    },
    _eventWorkerMessage_metric({
        data: {
            message
    } }) {
        // Handler for messages with type: 'metric'
        console.log(`METRIC: ${message.name} = ${message.value}`);

        // Store in database, etc.
        this._storeMetric({
            name: message.name,
            value: message.value
        });
    },
    _eventWorkerMessage_requestHelp({
        data: {
            message,
            worker
        }
    }) {
        // Handler for messages with type: 'requestHelp'
        console.log(`Worker ${worker.id} needs help with: ${message.problem}`);

        // Send help back to the worker
        this.send({
            message: {
                solution: this._getSolution(message.problem),
                type: 'helpResponse'
            },
            to: worker
        });
    },
    // Supporting methods
    _getSolution (problem) {
        // Return solution based on problem
        return `Solution for ${problem}`;
    },
    _storeMetric ({
        name,
        value
    }) {
        // Store metric in database
    }
});

{
    const primary = _AdvancedPrimary();

    primary.fork({
        workerCount: 2
    });
}
```

## API Reference

### ClusterPrimary

#### Constructor

```javascript
const primary = _ClusterPrimary(options);
```

Options:
- `workerArgs`: Array of arguments to pass to worker processes
- `workerScript`: Path to worker script (defaults to current script)
- `workerSilent`: Whether to suppress worker stdout/stderr
- `workerStdio`: Configuration for worker stdio
- `initialize`: Whether to automatically initialize (defaults to true)

#### Methods

- **destroy()**: Clean up and destroy the primary instance
- **fork({ workerCount })**: Start new worker processes. `workerCount` is optional and defaults to `1`.
- **roundRobin({ tag })**: Select a worker using round-robin distribution. The `tag` is optional. It returns the worker object that has been least recently selected for the given tag.
- **send({ message, to })**: Send a message to one or more workers. `to` can be a worker object or a worker id. It can also be an array of either. Returns a promise.
- **shutDown()**: Gracefully shut down all workers

#### Properties

- **workerById**: Object mapping worker ids to worker objects
- **workers**: Array of all active worker objects

#### Events

- **destroy**: When destroy begins
- **destroyComplete** When destroy completes
- **initialize**: When initialization begins
- **initializeComplete**: When initialization completes successfully
- **initializeError**: When initialization fails
- **shutDown**: When the cluster is shutting down
- **shutDownComplete**: When all workers have been shut down
- **workerDisconnect**: When a worker disconnects
- **workerError**: When a worker encounters an error
- **workerExit**: When a worker exits
- **workerFork**: When a new worker is forked
- **workerListening**: When a worker sets up a server and is listening
- **workerMessage**: When a message is received from a worker
- **workerOnline**: When a worker is online
- **workerReady**: When a worker is ready to receive work

### ClusterWorker

#### Constructor

```javascript
const worker = _ClusterWorker(options);
```

Options:
- `initialize`: Whether to automatically initialize (defaults to true)

#### Methods

- **destroy()**: Clean up and destroy the worker instance
- **send({ message })**: Send a message to the primary process

#### Static Properties

- **worker**: Reference to the Node.js cluster worker object
- **workerId**: Id of the current worker

#### Events

- **destroy**: When destroy begins
- **destroyComplete** When destroy completes
- **initialize**: When initialization begins
- **initializeComplete**: When initialization completes successfully
- **initializeError**: When initialization fails
- **primaryDisconnect**: When the primary disconnects
- **primaryMessage**: When a message is received from the primary

## Advanced Usage

### Custom Worker Initialization

```javascript
import _ClusterWorker from 'isotropic-cluster/lib/cluster-worker.js';
import _make from 'isotropic-make';
import _mongoose from 'mongoose';

// Custom worker with database connection
const _DbWorker = _make(_ClusterWorker, {
    get db () {
        return this._db;
    },
    // Custom initialization
    async _initialize() {
        // Connect to database
        console.log(`Worker ${_ClusterWorker.workerId} connecting to database...`);

        this._db = await _mongoose.connect('mongodb://localhost/myapp');

        // Perform other initialization
        this._setupModels();
        await this._loadInitialData();
    },
    _initializeComplete () {
        console.log(`Worker ${_ClusterWorker.workerId} database initialized`);
    },
    // Clean up resources on destroy
    _destroy (...args) {
        // Close database connection
        if (this._db) {
            console.log(`Worker ${_ClusterWorker.workerId} closing database connection`);
            this._db.disconnect();
            this._db = void null;
        }

        // Call parent destroy
        return Reflect.apply(_ClusterWorker.prototype._destroy, this, args);
    },
    // Helper methods
    async _loadInitialData () {
        // Load any required initial data
    },
    _setupModels () {
        // Define mongoose models
    }
});

{
    // Create the worker
    const worker = _DbWorker();
}
```

### Auto-Restart on Worker Failure

The `ClusterPrimary` automatically restarts workers that die unexpectedly. This means workers are automatically replaced if they crash, ensuring application resilience.

### Health Monitoring

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';
import _later from 'isotropic-later';

{
    const primary = _ClusterPrimary(),
        workerHealth = {},

        sendHealthChecks = () => {
            // Send regular health checks to workers
            for (const worker of primary.workers) {
                primary.send({
                    message: {
                        timestamp: Date.now(),
                        type: 'healthCheck'
                    },
                    to: worker
                }).catch(error => {
                    console.error(`Failed to send health check to worker ${worker.id}:`, error);
                });
            }

            _later(30000, sendHealthChecks);
        };

    // Process health responses
    primary.on('workerMessage', ({
        data: {
            message,
            worker
        }
    }) => {
        if (message.type === 'healthStatus') {
            workerHealth[worker.id] = {
                activeRequests: message.activeRequests,
                lastResponse: Date.now(),
                memoryUsage: message.memoryUsage,
                uptime: message.uptime
            };

            // Check for memory leaks or other issues
            if (message.memoryUsage.heapUsed > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
                console.warn(`Worker ${worker.id} using excessive memory, scheduling restart`);

                // Gracefully restart the worker
                primary.send({
                    message: {
                        type: 'prepareForRestart'
                    },
                    to: worker
                }).then(() => {
                    // Worker will finish current tasks and exit
                });
            }
        }
    });

    // Start workers
    primary.fork({
        workerCount: 4
    });

    sendHealthChecks();
}
```

## Integration with Other isotropic Modules

isotropic-cluster works seamlessly with other modules in the isotropic ecosystem:

- **isotropic-error**: Nested error reporting
- **isotropic-initializable**: Parent-to-child initialization sequence
- **isotropic-logger**: Structured logging
- **isotropic-make**: Create constructor functions with inheritance and mixins
- **isotropic-pubsub**: Event system for the lifecycle events

## Contributing

Please refer to [CONTRIBUTING.md](https://github.com/ibi-group/isotropic-cluster/blob/main/CONTRIBUTING.md) for contribution guidelines.

## Issues

If you encounter any issues, please file them at https://github.com/ibi-group/isotropic-cluster/issues
