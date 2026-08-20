# isotropic-cluster

[npm version](https://www.npmjs.com/package/isotropic-cluster)
[License](https://github.com/ibi-group/isotropic-cluster/blob/main/LICENSE)



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
    _later(60000, () => {
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

### Cluster Status

A `ClusterPrimary` reports where it is in its own lifecycle through three Boolean getters:

```javascript
const primary = _ClusterPrimary();

console.log(primary.active); // Operating normally
console.log(primary.shuttingDown); // Shut down has begun but has not finished
console.log(primary.shutDownCompleted); // Every worker has disconnected
```

At most one of them is ever `true`. `active` starts out `true` and becomes `false` the moment the `shutDown` event completes, so it is the one to check before handing out work.

Shutting down is not instantaneous. The primary asks every worker to disconnect and then waits for them, which leaves a window where the cluster is no longer active but is not finished either. `shuttingDown` and `shutDownCompleted` distinguish the two halves of that window. All three are `undefined` once the instance has been destroyed.

| | `active` | `shuttingDown` | `shutDownCompleted` |
| --- | --- | --- | --- |
| Operating | `true` | `false` | `false` |
| Shutting down | `false` | `true` | `false` |
| Shut down | `false` | `false` | `true` |
| Destroyed | `undefined` | `undefined` | `undefined` |

The `shutDown` event is `completeOnce`, so a shut down that an observer prevents does not move the cluster out of the operating state. The status changes only when the event actually completes.

`fork()` consults `active` internally, so forking a cluster that is already shutting down is a no-op rather than an error.

These describe the shut down phase specifically. The earlier initialization phase is reported by `initialized`, `initializing`, and `initializeFailed`, inherited from [isotropic-initializable](https://www.npmjs.com/package/isotropic-initializable), and `destroyed` comes from [isotropic-pubsub](https://www.npmjs.com/package/isotropic-pubsub). A `ClusterWorker` has those inherited getters but none of the shut down getters, since a worker does not manage a pool.

### Event-Based Communication

Both `ClusterPrimary` and `ClusterWorker` extend `isotropic-pubsub`, providing a complete event system:

- Subscribe to events with `on()`, `before()`, and `after()`
- Publish events with observable lifecycle phases
- Type-based message routing for organized handlers

### Awaiting Cluster Events

Any of these events can be awaited with the `until` method inherited from [isotropic-pubsub](https://www.npmjs.com/package/isotropic-pubsub), which subscribes once and returns a promise that resolves with a snapshot of the event.

`shutDownComplete` is the natural candidate. Shutting down is asynchronous, and the work that has to happen afterward such as closing a database pool, releasing a lock, or exiting the process, reads better in the enclosing function than in a callback:

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';
import _process from 'node:process';

{
    const primary = _ClusterPrimary();

    primary.fork({
        workerCount: 4
    });

    _process.on('SIGTERM', async () => {
        primary.shutDown();

        await primary.until('shutDownComplete');

        // Every worker has disconnected, so anything the primary itself
        // was holding open can be released now.
        await closeDatabasePool();

        _process.exit(0);
    });
}
```

`shutDownComplete` is a `publishOnce` event, so awaiting it settles whether the shut down finished a moment ago or is still in progress. That matters because the primary shuts itself down on its own initiative too. `restartGiveUp` and `destroy()` both trigger shut down. The shut down may already be over by the time anything gets around to waiting for it:

```javascript
// Correct whether or not the shut down has already completed
await primary.until('shutDownComplete');
```

Add a timeout when a worker might refuse to disconnect:

```javascript
try {
    await primary.until({
        eventName: 'shutDownComplete',
        subject: 'Cluster shut down',
        timeout: 30000
    });
} catch (error) {
    // Error: Cluster shut down timed out
    _process.exit(1);
}
```

#### Waiting For A Particular Message

An `until` config accepts a `filterFunction`, which decides whether a given event is the one being waited for. A filtered out event does not run the subscription, so the one-time subscription behind `until` stays subscribed until the *right* event arrives rather than settling for the next one. That turns the primary's message stream into request/response:

```javascript
const requestResult = async ({
    primary,
    task,
    worker
}) => {
    await primary.send({
        message: {
            task,
            type: 'processTask'
        },
        to: worker
    });

    const {
        data: {
            message
        }
    } = await primary.until({
        eventName: 'workerMessage',
        filterFunction: event => event.data.worker === worker && event.data.message?.type === 'taskComplete' && event.data.message.taskId === task.id,
        subject: 'Task result',
        timeout: 60000
    });

    return message.result;
};
```

The same filtering works for waiting on one specific worker's lifecycle:

```javascript
// Resolves when this particular worker is ready for work
await primary.until({
    eventName: 'workerReady',
    filterFunction: event => event.data.worker === worker
});
```

#### Awaiting Worker Initialization

`ClusterWorker` and `ClusterPrimary` both extend [isotropic-initializable](https://www.npmjs.com/package/isotropic-initializable), so both have `untilInitialized()`. It resolves when initialization completes and rejects when it fails or when the instance is destroyed first.

This is most useful for a subclass whose initialization is asynchronous, where the instance exists before it is usable:

```javascript
{
    const worker = _DbWorker();

    await worker.untilInitialized();

    // The database connection is established here
    worker.db.collection('jobs');
}
```

It is correct whether or not initialization has already finished, so it stays right if a subclass later makes its `_initialize` method asynchronous.

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
    _process.on('SIGTERM', async () => {
        console.log('Shutting down server');

        primary.shutDown();

        await primary.until('shutDownComplete');

        console.log('All workers have disconnected');

        _process.exit(0);
    });
}

// worker.js
import _ClusterWorker from 'isotropic-cluster/lib/cluster-worker.js';
import _http from 'node:http';

{
    const worker = _ClusterWorker();

    // Create HTTP server
    const server = _http.createServer((request, response) => {
        response.writeHead(200);
        response.end(`Hello from worker ${_ClusterWorker.workerId}`);
    });

    // Start listening on port 3000
    server.listen(3000, () => {
        console.log(`Worker ${_ClusterWorker.workerId} listening on port 3000`);
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
            }]
        },

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

            // Process the next task from each queue
            processQueue('compute');
            processQueue('io');
            processQueue('lightweight');
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
const _AdvancedPrimary = _make('AdvancedPrimary', _ClusterPrimary, {
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

- `restartBackoff`: Controls how dead workers are replaced. By default, replacements are paced by an [isotropic-backoff](https://www.npmjs.com/package/isotropic-backoff) instance with default levels. Pass a backoff configuration object to customize the levels, pass an existing backoff instance to share one, or pass `false` to disable the backoff and replace dead workers immediately and indefinitely.
- `workerArgs`: Array of arguments to pass to worker processes
- `workerScript`: Path to worker script (defaults to current script)
- `workerSilent`: Whether to suppress worker stdout/stderr
- `workerStdio`: Configuration for worker stdio
- `initialize`: Whether to automatically initialize (defaults to true)

#### Methods

- **destroy()**: Clean up and destroy the primary instance
- **fork({ workerCount })**: Start new worker processes. `workerCount` is optional and defaults to `1`.
- **roundRobin({ tag })**: Select a worker using round-robin distribution. The `tag` is optional. It returns the worker object that has been least recently selected for the given tag, or `undefined` if there are no workers.
- **send({ message, to })**: Send a message to one or more workers. `to` can be a worker object or a worker id. It can also be an array of either. Returns a promise.
- **shutDown()**: Gracefully shut down all workers

All of the other `isotropic-initializable` and `isotropic-pubsub` instance methods are inherited as well, including `after`, `before`, `destroy`, `initialize`, `on`, `onceAfter`, `onceBefore`, `onceOn`, `publish`, `subscribe`, `until`, and `untilInitialized`.

#### Properties

- **active**: Whether the cluster is operating normally. Becomes `false` when shut down begins and `undefined` after destruction.
- **restartBackoff**: The backoff instance pacing worker replacements, or `undefined` when disabled
- **shutDownCompleted**: Whether every worker has disconnected and the shut down has finished. `undefined` after destruction.
- **shuttingDown**: Whether shut down has begun but has not finished. `undefined` after destruction.
- **workerById**: Object mapping worker ids to worker objects
- **workers**: Array of all active worker objects

See [Cluster Status](#cluster-status) for how these relate to one another. `destroyed`, `initialized`, `initializeFailed`, and `initializing` are inherited.

#### Events

- **addWorker**: When a ready worker is added to the pool
- **destroy**: When destroy begins
- **destroyComplete** When destroy completes
- **fork**: When `fork()` is called to start one or more workers
- **initialize**: When initialization begins
- **initializeComplete**: When initialization completes successfully
- **initializeError**: When initialization fails
- **removeWorker**: When a worker is removed from the pool
- **restartGiveUp**: When the restart backoff is exhausted and no workers remain; the cluster shuts down
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

- **destroy({ timeout })**: Clean up and destroy the worker instance. The worker disconnects its IPC channel and, if it has not exited on its own within `timeout` milliseconds (default `6765`), is force-killed.
- **send({ message })**: Send a message to the primary process

All of the other `isotropic-initializable` and `isotropic-pubsub` instance methods are inherited as well, including `after`, `before`, `destroy`, `initialize`, `on`, `onceAfter`, `onceBefore`, `onceOn`, `publish`, `subscribe`, `until`, and `untilInitialized`.

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
const _DbWorker = _make('DbWorker', _ClusterWorker, {
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

### Why ClusterWorker Has No `_initializeError` Method

`ClusterWorker._initialize` throws when it discovers that the process it is running in is not a worker process. Nothing in the class implements `_initializeError`, so the base implementation from [isotropic-initializable](https://www.npmjs.com/package/isotropic-initializable) runs instead, and it rethrows the error asynchronously as an uncaught exception. That terminates the process.

**This is deliberate, and it is the correct handling for this particular failure.** `isotropic-initializable` documents `_initializeError` as the place a class takes responsibility for its own initialization failures, and warns that reaching the base method usually means a class forgot to implement one. `ClusterWorker` is the other case: it considered the failure and decided that crashing is the right response.

A `ClusterWorker` in a non-worker process has no primary to report to, no IPC channel to send on, and no work to be assigned. There is no degraded mode to fall back to and nothing to retry, because the condition is a property of how the process was started and cannot change while it runs. A worker that swallowed the error would sit there doing nothing at all, and the primary would simply never see it become ready. Failing loudly, immediately, and in a way that is difficult to suppress is what should happen, so the class gets that behavior by intentionally declining to implement `_initializeError`.

The failure is still published as the `initializeError` event before the base method runs, so an observer can call `prevent()` at the `before` or `on` stage and stop it from completing. That is how the test suite asserts the failure without taking the test process down.

A subclass that overrides `_initialize` takes on its own failure modes, and should implement `_initializeError` when those failures call for something other than a crash. Note that there is one error channel for the whole chain: a subclass's `_initializeError` handles the base class's wrong-process error too, so it needs to recognize what it can handle and rethrow the rest.

```javascript
import _ClusterWorker from 'isotropic-cluster/lib/cluster-worker.js';
import _make from 'isotropic-make';

const _DbWorker = _make('DbWorker', _ClusterWorker, {
    async _initialize () {
        // ClusterWorker's own _initialize has already run and succeeded by this point
        this._db = await _mongoose.connect('mongodb://localhost/myapp');
    },
    _initializeError (error) {
        if (error.error?.name === 'MongoNetworkError') {
            // A database that is not reachable yet is worth reporting and retrying.
            // It is not the same kind of problem as running in the wrong process.
            _logger.error({
                error
            }, 'Database unreachable; worker will exit and be replaced');

            this.destroy();

            return;
        }

        // Anything else, including the wrong-process error, still crashes
        Reflect.apply(_ClusterWorker.prototype._initializeError, this, [
            error
        ]);
    }
});
```

### Auto-Restart on Worker Failure

The `ClusterPrimary` automatically restarts workers that die unexpectedly, ensuring application resilience. Replacements are paced by a restart backoff: a worker that crashes repeatedly (for example, one that fails on startup) is replaced immediately once, then with escalating delays. Each worker that reaches the ready state resets the backoff. When the backoff is exhausted and other workers remain, the primary logs an error and continues with the remaining workers; when none remain, it publishes a `restartGiveUp` event and shuts down rather than looping forever.

```javascript
import _ClusterPrimary from 'isotropic-cluster/lib/cluster-primary.js';

{
    // Customize the restart pacing: three immediate replacements, then five
    // escalating delays from 500ms, then give up.
    const primary = _ClusterPrimary({
        restartBackoff: {
            levels: [{
                count: 3
            }, {
                count: 5,
                delay: 500,
                factor: 3,
                maximumDelay: 30000
            }]
        }
    });

    primary.on('restartGiveUp', () => {
        // The cluster could not keep any worker alive and is shutting down.
    });

    primary.fork({
        workerCount: 4
    });
}
```

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

- **isotropic-backoff**: Escalating delays for worker replacement
- **isotropic-error**: Nested error reporting
- **isotropic-initializable**: Parent-to-child initialization sequence
- **isotropic-logger**: Structured logging
- **isotropic-make**: Create constructor functions with inheritance and mixins
- **isotropic-pubsub**: Event system for the lifecycle events

## Contributing

Please refer to [CONTRIBUTING.md](https://github.com/ibi-group/isotropic-cluster/blob/main/CONTRIBUTING.md) for contribution guidelines.

## Issues

If you encounter any issues, please file them at [https://github.com/ibi-group/isotropic-cluster/issues](https://github.com/ibi-group/isotropic-cluster/issues)
