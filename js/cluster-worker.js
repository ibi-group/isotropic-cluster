import _cluster from 'node:cluster';
import _Error from 'isotropic-error';
import _Initializable from 'isotropic-initializable';
import _later from 'isotropic-later';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _path from 'node:path';
import _process from 'node:process';

const _workerId = _cluster.worker && _cluster.worker.id,

    _moduleLogger = _logger.child({
        module: _path.basename(import.meta.filename, _path.extname(import.meta.filename)),
        workerId: _workerId
    });

export default _make(_Initializable, {
    send ({
        message
    }) {
        return new Promise((resolve, reject) => {
            _process.send(message, error => {
                if (error) {
                    reject(_Error({
                        details: {
                            message
                        },
                        error,
                        message: 'Error sending message to master'
                    }));
                } else {
                    resolve();
                }
            });
        });
    },
    _destroy (...args) {
        Object.keys(this._processEvents).forEach(eventName => {
            _process.removeListener(eventName, this._processEvents[eventName]);
        });

        this._processEvents = void null;

        Reflect.apply(_Initializable.prototype._destroy, this, args);
    },
    _destroyComplete ({
        timeout = 6765
    } = {}) {
        if (_cluster.worker) {
            _cluster.worker.disconnect();

            _later(timeout, () => {
                _cluster.worker.kill();
            });
        }
    },
    _eventMasterDisconnect () {
        _moduleLogger.info('Master disconnected');
    },
    _eventMasterMessage (event) {
        if (event.data.message && event.data.message.type) {
            const method = this[`_eventMasterMessage_${event.data.message.type}`];

            if (typeof method === 'function') {
                Reflect.apply(method, this, [
                    event
                ]);
            }
        }
    },
    _init (...args) {
        this._processEvents = {
            disconnect: () => {
                this._publish('masterDisconnect');
            },
            message: (message, handle) => {
                this._publish('masterMessage', {
                    handle,
                    message
                });
            }
        };

        return Reflect.apply(_Initializable.prototype._init, this, args);
    },
    _initialize () {
        if (_cluster.isWorker) {
            _moduleLogger.info('Initializing worker');

            Object.keys(this._processEvents).forEach(eventName => {
                _process.on(eventName, this._processEvents[eventName]);
            });
        } else {
            throw _Error({
                message: 'Cluster worker can not initialize in non-worker process'
            });
        }
    },
    _initializeComplete () {
        _process.send('ready');
    }
}, {
    get worker () {
        return _cluster.worker;
    },
    get workerId () {
        return _workerId;
    },
    _events: {
        masterDisconnect: {
            allowPublicPublish: false,
            defaultFunction: '_eventMasterDisconnect'
        },
        masterMessage: {
            allowPublicPublish: false,
            defaultFunction: '_eventMasterMessage'
        }
    }
});
