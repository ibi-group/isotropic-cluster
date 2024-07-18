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
                masterDisconnect () {
                    if (_process.argv[3] === 'send-after-disconnect') {
                        clusterWorker.send({
                            message: 'message'
                        }).catch(error => {
                            // TODO: Find a way to assert this behavior
                            _logger.error({
                                error: _Error({
                                    error,
                                    message: 'This is an expected error sending to master after disconnect'
                                })
                            }, 'This is an expected error sending to master after disconnect');
                        });
                    }
                },
                masterMessage ({
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

            clusterWorker.after('masterMessage', ({
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

            clusterWorker.after('masterMessage', ({
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
            const masterMessages = [];

            _make(_ClusterWorker, {
                _eventMasterMessage_a ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            masterMessages,
                            message,
                            type: 'x',
                            x: 'x'
                        }
                    });
                },
                _eventMasterMessage_b ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            masterMessages,
                            message,
                            type: 'y',
                            y: 'y'
                        }
                    });
                },
                _eventMasterMessage_c ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            masterMessages,
                            message,
                            type: 'z',
                            z: 'z'
                        }
                    });
                },
                _eventMasterMessage_replyUnknown ({
                    data: {
                        message
                    }
                }) {
                    this.send({
                        message: {
                            masterMessages,
                            message,
                            type: 'unknown'
                        }
                    });
                }
            })().on('masterMessage', ({
                data: {
                    message
                }
            }) => {
                masterMessages.push(message);
            });

            break;
        }
    }
}
