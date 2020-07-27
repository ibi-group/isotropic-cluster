import _cluster from 'cluster';
import _Error from 'isotropic-error';
import _Initializable from 'isotropic-initializable';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _path from 'path';
import _process from 'process';

const _moduleLogger = _logger.child({
    module: _path.basename(__filename, _path.extname(__filename))
}, true);

export default _make(_Initializable, {
    fork ({
        workerCount = 1
    } = {}) {
        return this._active ?
            this._publish('fork', {
                workerCount
            }) :
            this;
    },
    roundRobin ({
        tag = ''
    } = {}) {
        let oldestWorker,
            oldestWorkerTime = Infinity,
            workerTimeByWorkerWeakMap = this._workerTimeByWorkerWeakMapByTag[tag];

        if (!workerTimeByWorkerWeakMap) {
            workerTimeByWorkerWeakMap = new WeakMap();
            this._workerTimeByWorkerWeakMapByTag[tag] = workerTimeByWorkerWeakMap;
        }

        for (const worker of this._workers) {
            const workerTime = workerTimeByWorkerWeakMap.get(worker);

            if (workerTime) {
                if (workerTime < oldestWorkerTime) {
                    oldestWorker = worker;
                    oldestWorkerTime = workerTime;
                }
            } else {
                oldestWorker = worker;
                break;
            }
        }

        workerTimeByWorkerWeakMap.set(oldestWorker, Date.now());
        return oldestWorker;
    },
    send ({
        message,
        to = this._workers
    }) {
        if (!Array.isArray(to)) {
            to = [
                to
            ];
        }

        return Promise.all(to.map(to => new Promise((resolve, reject) => {
            const worker = typeof to === 'number' ?
                this._workerById[to] :
                to;

            if (worker && worker.send) {
                worker.send(message, error => {
                    if (error) {
                        reject(_Error({
                            details: {
                                message,
                                workerId: worker.id
                            },
                            error,
                            message: 'Error sending message to worker'
                        }));
                    } else {
                        resolve();
                    }
                });
            } else {
                reject(_Error({
                    details: {
                        message,
                        to
                    },
                    message: 'Invalid message destination'
                }));
            }
        })));
    },
    shutDown () {
        return this._publish('shutDown');
    },
    get workerById () {
        return this._workerById;
    },
    get workers () {
        return this._workers;
    },
    _addWorker ({
        worker
    }) {
        return this._publish('addWorker', {
            worker
        });
    },
    _destroy (...args) {
        if (this._active) {
            this._onceAfter('shutDownComplete', '_destroy');
            this.shutDown();
            return;
        }

        this._active = void null;

        Object.keys(this._clusterListenerByEventName).forEach(eventName => {
            _cluster.removeListener(eventName, this._clusterListenerByEventName[eventName]);
        });

        this._clusterListenerByEventName = void null;

        this._workerTimeByWorkerWeakMapByTag = void null;

        Reflect.apply(_Initializable.prototype._destroy, this, args);
    },
    _eventAddWorker ({
        data: {
            worker
        }
    }) {
        this._workerById[worker.id] = worker;
        this._workers = Object.values(this._workerById);
    },
    _eventFork ({
        data: {
            workerCount
        }
    }) {
        while (workerCount > 0) {
            _moduleLogger.info('Starting a new worker');

            _cluster.fork();
            workerCount -= 1;
        }
    },
    _eventRemoveWorker ({
        data: {
            worker
        }
    }) {
        delete this._workerById[worker.id];
        this._workers = Object.values(this._workerById);
    },
    _eventShutDown () {
        _moduleLogger.info('Shutting down workers');

        this._active = false;

        _cluster.disconnect(() => {
            this._publish('shutDownComplete');
        });

        return this;
    },
    _eventShutDownComplete () {
        _moduleLogger.info('Worker shut down complete');
    },
    _eventWorkerDisconnect ({
        data: {
            worker
        }
    }) {
        _moduleLogger.info({
            workerId: worker.id
        }, 'Worker disconnected');

        this._removeWorker({
            worker
        });
    },
    _eventWorkerError ({
        data: {
            error,
            worker
        }
    }) {
        _moduleLogger.fatal({
            error: _Error({
                details: {
                    workerId: worker.id
                },
                error,
                message: 'Worker error'
            }),
            workerId: worker.id
        }, 'Worker error');

        this._removeWorker({
            worker
        });
    },
    _eventWorkerExit ({
        data: {
            code,
            signal,
            worker
        }
    }) {
        if (worker.exitedAfterDisconnect) {
            _moduleLogger.info({
                code,
                signal,
                workerId: worker.id
            }, 'Worker exited voluntarily');
        } else if (code) {
            _moduleLogger.fatal({
                code,
                signal,
                workerId: worker.id
            }, 'Worker died unexpectedly');
        } else {
            _moduleLogger.error({
                code,
                signal,
                workerId: worker.id
            }, 'Worker died');
        }

        this._removeWorker({
            worker
        });

        if (this._active) {
            _moduleLogger.info('Replacing dead worker');

            this.fork();
        }
    },
    _eventWorkerFork ({
        data: {
            worker
        }
    }) {
        _moduleLogger.info({
            workerId: worker.id
        }, 'Starting new worker');

        worker.on('error', error => {
            this._publish('workerError', {
                error: _Error({
                    details: {
                        worker
                    },
                    error,
                    message: 'Error in worker'
                }),
                worker
            });
        });
    },
    _eventWorkerListening ({
        data: {
            address,
            worker
        }
    }) {
        _moduleLogger.info({
            address: address.address,
            port: address.port,
            workerId: worker.id
        }, 'Worker is listening');
    },
    _eventWorkerMessage (event) {
        if (event.data.message && event.data.message.type) {
            const method = this[`_eventWorkerMessage_${event.data.message.type}`];

            if (typeof method === 'function') {
                Reflect.apply(method, this, [
                    event
                ]);
            }
        }
    },
    _eventWorkerOnline ({
        data: {
            worker
        }
    }) {
        _moduleLogger.info({
            workerId: worker.id
        }, 'Worker is now online');

        const listener = message => {
            if (message === 'ready') {
                worker.removeListener('message', listener);

                this._publish('workerReady', {
                    worker
                });
            }
        };

        worker.on('message', listener);
    },
    _eventWorkerReady ({
        data: {
            worker
        }
    }) {
        _moduleLogger.info({
            workerId: worker.id
        }, 'Worker is ready to work');

        this._addWorker({
            worker
        });
    },
    _init (...args) {
        this._active = true;

        this._clusterListenerByEventName = {
            disconnect: worker => {
                this._publish('workerDisconnect', {
                    worker
                });
            },
            exit: (worker, code, signal) => {
                this._publish('workerExit', {
                    code,
                    signal,
                    worker
                });
            },
            fork: worker => {
                this._publish('workerFork', {
                    worker
                });
            },
            listening: (worker, address) => {
                this._publish('workerListening', {
                    address,
                    worker
                });
            },
            message: (worker, message, handle) => {
                this._publish('workerMessage', {
                    handle,
                    message,
                    worker
                });
            },
            online: worker => {
                this._publish('workerOnline', {
                    worker
                });
            }
        };

        this._workerById = Object.create(null);

        this._workers = [];

        this._workerTimeByWorkerWeakMapByTag = Object.create(null);

        return Reflect.apply(_Initializable.prototype._init, this, args);
    },
    _initialize (...args) {
        _moduleLogger.info('Initializing master');

        const [{
            workerArgs,
            workerScript,
            workerSilent,
            workerStdio
        } = {}] = args;

        _cluster.setupMaster({
            args: typeof workerArgs === 'undefined' ?
                _process.argv.slice(2) :
                workerArgs,
            exec: typeof workerScript === 'undefined' ?
                _process.argv[1] :
                workerScript,
            silent: typeof workerSilent === 'undefined' ?
                false :
                workerSilent,
            stdio: workerStdio
        });

        Object.keys(this._clusterListenerByEventName).forEach(eventName => {
            _cluster.on(eventName, this._clusterListenerByEventName[eventName]);
        });
    },
    _removeWorker ({
        worker
    }) {
        if (worker.id in this._workerById) {
            this._publish('removeWorker', {
                worker
            });
        }

        return this;
    }
}, {
    _events: {
        addWorker: {
            allowPublicPublish: false,
            defaultFunction: '_eventAddWorker'
        },
        fork: {
            allowPublicPublish: false,
            defaultFunction: '_eventFork'
        },
        removeWorker: {
            allowPublicPublish: false,
            defaultFunction: '_eventRemoveWorker'
        },
        shutDown: {
            allowPublicPublish: false,
            completeOnce: true,
            defaultFunction: '_eventShutDown'
        },
        shutDownComplete: {
            allowPublicPublish: false,
            defaultFunction: '_eventShutDownComplete',
            publishOnce: true
        },
        workerDisconnect: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerDisconnect'
        },
        workerError: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerError'
        },
        workerExit: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerExit'
        },
        workerFork: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerFork'
        },
        workerListening: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerListening'
        },
        workerMessage: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerMessage'
        },
        workerOnline: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerOnline'
        },
        workerReady: {
            allowPublicPublish: false,
            defaultFunction: '_eventWorkerReady'
        }
    }
});
