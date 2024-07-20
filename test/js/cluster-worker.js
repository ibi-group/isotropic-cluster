import './logger-setup.js';
import _cluster from 'node:cluster';
import _ClusterWorker from '../../js/cluster-worker.js';
import _Error from 'isotropic-error';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _net from 'node:net';
import _process from 'node:process';

if (_cluster.isWorker) {
    switch (_process.argv[2]) {
        case 'communicate': {
            const clusterWorker = _ClusterWorker();

            clusterWorker.after({
                primaryDisconnect () {
                    if (_process.argv[3] === 'send-after-disconnect') {
                        clusterWorker.send({
                            message: 'message'
                        }).catch(error => {
                            // TODO: Find a way to assert this behavior
                            _logger.error({
                                error: _Error({
                                    error,
                                    message: 'This is an expected error sending to primary after disconnect'
                                })
                            }, 'This is an expected error sending to primary after disconnect');
                        });
                    }
                },
                primaryMessage ({
                    data: {
                        message: {
                            count
                        }
                    }
                }) {
                    clusterWorker.send({
                        message: {
                            count: count + 1
                        }
                    });
                }
            });
            break;
        }
        case 'early-send':
            _process.send('not ready');
            _ClusterWorker();
            break;
        case 'identify': {
            const clusterWorker = _ClusterWorker();

            clusterWorker.after('primaryMessage', ({
                data: {
                    message
                }
            }) => {
                if (message === 'identify') {
                    clusterWorker.send({
                        message: {
                            workerId: _ClusterWorker.workerId,
                            workerProperty: _ClusterWorker.worker === _cluster.worker
                        }
                    });
                }
            });
            break;
        }
        case 'replace': {
            const clusterWorker = _ClusterWorker();

            clusterWorker.after('primaryMessage', ({
                data: {
                    message
                }
            }) => {
                switch (message) {
                    case 'destroy':
                        clusterWorker.destroy();
                        break;
                    case 'exit':
                        _process.exit(0);
                        break;
                    case 'throw':
                        throw _Error({
                            message: 'Throwing an error on purpose'
                        });
                }
            });
            break;
        }
        case 'server': {
            const clusterWorker = _ClusterWorker();

            clusterWorker.after('initializeComplete', () => {
                _net.createServer().listen();
            });

            break;
        }
        case 'typed': {
            const primaryMessages = [];

            _make(_ClusterWorker, {
                _eventPrimaryMessage_a ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            message,
                            primaryMessages,
                            type: 'x',
                            x: 'x'
                        }
                    });
                },
                _eventPrimaryMessage_b ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            message,
                            primaryMessages,
                            type: 'y',
                            y: 'y'
                        }
                    });
                },
                _eventPrimaryMessage_c ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            message,
                            primaryMessages,
                            type: 'z',
                            z: 'z'
                        }
                    });
                },
                _eventPrimaryMessage_replyUnknown ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            message,
                            primaryMessages,
                            type: 'unknown'
                        }
                    });
                }
            })().on('primaryMessage', ({
                data: {
                    message
                }
            }) => {
                primaryMessages.push(message);
            });

            break;
        }
    }
}
