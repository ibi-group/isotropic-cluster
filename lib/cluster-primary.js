import _Backoff from 'isotropic-backoff';
import _cluster from 'node:cluster';
import _Error from 'isotropic-error';
import _Initializable from 'isotropic-initializable';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _path from 'node:path';
import _process from 'node:process';

const _moduleLogger = _logger.child({
    module: _path.basename(import.meta.filename, _path.extname(import.meta.filename))
});

export default _make('ClusterPrimary', _Initializable, {
    get active () {
        return this._active;
    },
    fork ({
        workerCount = 1
    } = {}) {
        return this._active ?
            this._publish('fork', {
                workerCount
            }) :
            this;
    },
    get restartBackoff () {
        return this._restartBackoff;
    },
    roundRobin ({
        tag = ''
    } = {}) {
        if (!this._workers.length) {
            return;
        }

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

        this._roundRobinCounter += 1;

        workerTimeByWorkerWeakMap.set(oldestWorker, this._roundRobinCounter);

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
    get shutDownCompleted () {
        if (this._destroyed) {
            return void null;
        }

        if (this._getOnceEventSnapshot('shutDownComplete')) {
            return true;
        }

        return false;
    },
    get shuttingDown () {
        if (this._destroyed) {
            return void null;
        }

        if (this._getOnceEventSnapshot('shutDown') && !this._getOnceEventSnapshot('shutDownComplete')) {
            return true;
        }

        return false;
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

        if (this._ownRestartBackoff) {
            this._restartBackoff.destroy();
        }

        this._ownRestartBackoff = void null;

        this._restartAbortController = void null;

        this._restartBackoff = void null;

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
    _eventRestartGiveUp () {
        _moduleLogger.fatal('Worker restart attempts exhausted with no remaining workers; giving up');

        this.shutDown();
    },
    _eventShutDown () {
        _moduleLogger.info('Shutting down workers');

        this._active = false;

        this._restartAbortController?.abort();

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
            if (this._restartBackoff && !worker.exitedAfterDisconnect) {
                this._restartWorker();
            } else {
                _moduleLogger.info('Replacing dead worker');

                this.fork();
            }
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

        this._restartBackoff?.succeeded();

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

        this._roundRobinCounter = 0;

        this._workerTimeByWorkerWeakMapByTag = Object.create(null);

        return Reflect.apply(_Initializable.prototype._init, this, args);
    },
    _initialize (...args) {
        _moduleLogger.info('Initializing primary');

        const [{
            restartBackoff,
            workerArgs,
            workerScript,
            workerSilent,
            workerStdio
        } = {}] = args;

        if (restartBackoff || typeof restartBackoff === 'undefined') {
            if (typeof restartBackoff?.failed === 'function') {
                this._restartBackoff = restartBackoff;
            } else {
                this._ownRestartBackoff = true;
                this._restartBackoff = _Backoff(restartBackoff);
            }

            this._restartAbortController = new AbortController();
        }

        _cluster.setupPrimary({
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
    },
    _restartWorker () {
        this._restartBackoff.failed();

        if (this._restartBackoff.exhausted) {
            if (this._workers.length) {
                _moduleLogger.error('Worker restart attempts exhausted; continuing with remaining workers');
            } else {
                this._publish('restartGiveUp');
            }

            return this;
        }

        const {
            delay
        } = this._restartBackoff;

        if (delay) {
            _moduleLogger.warn({
                delay
            }, 'Delaying worker replacement');

            this._restartBackoff.attempt({
                signal: this._restartAbortController.signal
            }).then(() => {
                _moduleLogger.info('Replacing dead worker');

                this.fork();
            }, () => {
                // The delayed replacement was canceled during shut down.
            });
        } else {
            _moduleLogger.info('Replacing dead worker');

            this.fork();
        }

        return this;
    }
}, {
    _pubsub: {
        addWorker: {
            completeFunction: '_eventAddWorker'
        },
        fork: {
            completeFunction: '_eventFork'
        },
        removeWorker: {
            completeFunction: '_eventRemoveWorker'
        },
        restartGiveUp: {
            completeFunction: '_eventRestartGiveUp'
        },
        shutDown: {
            completeFunction: '_eventShutDown',
            completeOnce: true
        },
        shutDownComplete: {
            completeFunction: '_eventShutDownComplete',
            publishOnce: true
        },
        workerDisconnect: {
            completeFunction: '_eventWorkerDisconnect'
        },
        workerError: {
            completeFunction: '_eventWorkerError'
        },
        workerExit: {
            completeFunction: '_eventWorkerExit'
        },
        workerFork: {
            completeFunction: '_eventWorkerFork'
        },
        workerListening: {
            completeFunction: '_eventWorkerListening'
        },
        workerMessage: {
            completeFunction: '_eventWorkerMessage'
        },
        workerOnline: {
            completeFunction: '_eventWorkerOnline'
        },
        workerReady: {
            completeFunction: '_eventWorkerReady'
        }
    }
});
