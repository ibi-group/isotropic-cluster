import './js/logger-setup.js';
import _chai from 'isotropic-dev-dependencies/lib/chai.js';
import _cluster from 'cluster';
import _ClusterMaster from '../js/cluster-master.js';
import _ClusterWorker from '../js/cluster-worker.js';
import _Error from 'isotropic-error';
import _later from 'isotropic-later';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _mocha from 'isotropic-dev-dependencies/lib/mocha.js';

if (_cluster.isMaster) {
    _mocha.describe('cluster-worker', function () {
        this.timeout(144);

        _mocha.it('should construct cluster worker objects', () => {
            _chai.expect(_ClusterWorker).to.be.a('function');

            const clusterWorker = new _ClusterWorker({
                initialize: false
            });

            _chai.expect(clusterWorker).to.be.an.instanceOf(_ClusterWorker);
            clusterWorker.destroy();
        });

        _mocha.it('should be an initializable object factory', () => {
            _chai.expect(_ClusterWorker).to.be.a('function');

            const clusterWorker = _ClusterWorker({
                initialize: false
            });

            _chai.expect(clusterWorker).to.be.an.instanceOf(_ClusterWorker);
            clusterWorker.destroy();
        });

        _mocha.it('should fail to initialize in a non-worker process', callbackFunction => {
            _ClusterWorker().on('initializeError', event => {
                _chai.expect(event.data.error).to.be.an.instanceof(_Error);
                event.preventDefault();
                callbackFunction();
            });
        });
    });

    _mocha.describe('cluster-master', function () {
        this.timeout(17711);

        _mocha.it('should construct cluster master objects', callbackFunction => {
            _chai.expect(_ClusterMaster).to.be.a('function');

            const clusterMaster = new _ClusterMaster();

            _chai.expect(clusterMaster).to.be.an.instanceOf(_ClusterMaster);

            clusterMaster.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterMaster.destroy();
        });

        _mocha.it('should be an initializable object factory', callbackFunction => {
            _chai.expect(_ClusterMaster).to.be.a('function');

            const clusterMaster = _ClusterMaster();

            _chai.expect(clusterMaster).to.be.an.instanceOf(_ClusterMaster);

            clusterMaster.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterMaster.destroy();
        });

        _mocha.it('should be able to fork a worker process', callbackFunction => {
            const clusterMaster = _ClusterMaster(),
                eventHandlersExecuted = [];

            clusterMaster.after({
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                }
            });

            clusterMaster.on({
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should be able to fork a silent worker process', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerSilent: true
                }),
                eventHandlersExecuted = [];

            clusterMaster.after({
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                }
            });

            clusterMaster.on({
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    // TODO: Figure out some way to assert that the worker didn't output

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should not be able to fork a worker process after shut down', callbackFunction => {
            const clusterMaster = _ClusterMaster(),
                eventHandlersExecuted = [];

            clusterMaster.after({
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                }
            });

            clusterMaster.on({
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on shutDown',
                        'after shutDown',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);
                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                }
            });

            clusterMaster.shutDown().fork();

            _later(2584, () => {
                clusterMaster.destroy();
            });
        });

        _mocha.it('should handle worker process errors', callbackFunction => {
            const clusterMaster = _ClusterMaster(),
                eventHandlersExecuted = [];

            clusterMaster.after({
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerError () {
                    eventHandlersExecuted.push('after workerError');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerOnline ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerOnline');

                    worker.emit('error', _Error({
                        message: 'I couldn\'t find any reliable way to trigger a worker\'s error event, so I\'m directly emitting it'
                    }));

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                }
            });

            clusterMaster.on({
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerError',
                        'after workerError',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);
                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerError () {
                    eventHandlersExecuted.push('on workerError');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should be able to communicate with a cluster-worker instance', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'communicate',
                        'send-after-disconnect'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message,
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);

                    const count = message.count || -1;

                    if (count < 5) {
                        clusterMaster.send({
                            message: {
                                count: count + 1
                            },
                            to: worker
                        });
                    }
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        {
                            count: 1
                        },
                        {
                            count: 3
                        },
                        {
                            count: 5
                        }
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should execute a method based on the type property of a message', callbackFunction => {
            const eventHandlersExecuted = [],
                workerMessages = [],

                clusterMaster = _make(_ClusterMaster, {
                    _eventWorkerMessage_x ({
                        data: {
                            message,
                            worker
                        }
                    }) {
                        clusterMaster.send({
                            message: {
                                b: 'b',
                                message,
                                type: 'b',
                                workerMessages
                            },
                            to: worker
                        });
                    },
                    _eventWorkerMessage_y ({
                        data: {
                            message,
                            worker
                        }
                    }) {
                        clusterMaster.send({
                            message: {
                                c: 'c',
                                message,
                                type: 'c',
                                workerMessages
                            },
                            to: worker
                        });
                    },
                    _eventWorkerMessage_z () {
                        clusterMaster.destroy();
                    }
                })({
                    workerArgs: [
                        'typed'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                });

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('after workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');

                    clusterMaster.send({
                        message: {
                            a: 'a',
                            type: 'a',
                            workerMessages
                        },
                        to: worker
                    });
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'on shutDown',
                        'after shutDown',
                        'after workerMessage',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        {
                            masterMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }],
                            message: {
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            },
                            type: 'x',
                            x: 'x'
                        },
                        {
                            masterMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }, {
                                b: 'b',
                                message: {
                                    masterMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            }],
                            message: {
                                b: 'b',
                                message: {
                                    masterMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            },
                            type: 'y',
                            y: 'y'
                        },
                        {
                            masterMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }, {
                                b: 'b',
                                message: {
                                    masterMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            }, {
                                c: 'c',
                                message: {
                                    masterMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }, {
                                        b: 'b',
                                        message: {
                                            masterMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    }],
                                    message: {
                                        b: 'b',
                                        message: {
                                            masterMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    },
                                    type: 'y',
                                    y: 'y'
                                },
                                type: 'c',
                                workerMessages: [
                                    'ready',
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        type: 'x',
                                        x: 'x'
                                    },
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }, {
                                            b: 'b',
                                            message: {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    masterMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        }],
                                        message: {
                                            b: 'b',
                                            message: {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    masterMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        },
                                        type: 'y',
                                        y: 'y'
                                    }
                                ]
                            }],
                            message: {
                                c: 'c',
                                message: {
                                    masterMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }, {
                                        b: 'b',
                                        message: {
                                            masterMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    }],
                                    message: {
                                        b: 'b',
                                        message: {
                                            masterMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    },
                                    type: 'y',
                                    y: 'y'
                                },
                                type: 'c',
                                workerMessages: [
                                    'ready',
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        type: 'x',
                                        x: 'x'
                                    },
                                    {
                                        masterMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }, {
                                            b: 'b',
                                            message: {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    masterMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        }],
                                        message: {
                                            b: 'b',
                                            message: {
                                                masterMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    masterMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        },
                                        type: 'y',
                                        y: 'y'
                                    }
                                ]
                            },
                            type: 'z',
                            z: 'z'
                        }
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('on workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should ignore untyped or unknown type messages', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'typed'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('after workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                async workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');

                    await clusterMaster.send({
                        message: 'untyped message',
                        to: worker
                    });

                    await clusterMaster.send({
                        message: {
                            type: 'unknown',
                            workerMessages
                        },
                        to: worker
                    });

                    await clusterMaster.send({
                        message: {
                            type: 'replyUnknown',
                            workerMessages
                        },
                        to: worker
                    });

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        {
                            masterMessages: [
                                'untyped message',
                                {
                                    type: 'unknown',
                                    workerMessages: [
                                        'ready'
                                    ]
                                },
                                {
                                    type: 'replyUnknown',
                                    workerMessages: [
                                        'ready'
                                    ]
                                }
                            ],
                            message: {
                                type: 'replyUnknown',
                                workerMessages: [
                                    'ready'
                                ]
                            },
                            type: 'unknown'
                        }
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('on workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should be able to communicate with a cluster-worker instance by worker id', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'identify'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message,
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');

                    if (message === 'ready') {
                        workerMessages.push(message);
                    } else {
                        workerMessages.push(message.workerId === worker.id);
                        workerMessages.push(message.workerProperty === true);
                    }
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                },
                workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');
                    _chai.expect(clusterMaster.workerById[worker.id]).to.equal(worker);
                    clusterMaster.send({
                        message: 'identify',
                        to: worker.id
                    });
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        true,
                        true
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should reject when sending to an invalid worker', callbackFunction => {
            const caughtErrors = [],
                clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'communicate'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerDisconnect');

                    clusterMaster.send({
                        message: 'message',
                        to: -.123
                    }).catch(error => {
                        caughtErrors.push(error);

                        return clusterMaster.send({
                            message: 'message',
                            to: {}
                        });
                    }).catch(error => {
                        caughtErrors.push(error);

                        return clusterMaster.send({
                            message: 'message',
                            to: worker
                        });
                    }).catch(error => {
                        caughtErrors.push(error);
                    });
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                    clusterMaster.shutDown();
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(caughtErrors.length).to.equal(3);
                    _chai.expect(caughtErrors[0]).to.be.an.instanceof(_Error);
                    _chai.expect(caughtErrors[1]).to.be.an.instanceof(_Error);
                    _chai.expect(caughtErrors[2]).to.be.an.instanceof(_Error);

                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should not trigger the worker ready event before the ready message', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'early-send'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'not ready',
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should be able to fork and communicate with multiple cluster-worker instances', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'communicate'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    if (message !== 'ready') { // skip tracking ready messages to ensure order of eventHandlersExecuted
                        eventHandlersExecuted.push('after workerMessage');
                    }

                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                async workerReady () {
                    eventHandlersExecuted.push('after workerReady');

                    if (clusterMaster.workers.length === 3) {
                        let promise = Promise.resolve(0);

                        for (const worker of clusterMaster.workers) {
                            promise = promise.then(count => new Promise(resolve => {
                                clusterMaster.after('workerMessage', event => {
                                    if (event.data.message.count === count && event.data.worker === worker) {
                                        event.unsubscribe();
                                        resolve(count);
                                    }
                                });

                                clusterMaster.send({
                                    message: {
                                        count
                                    },
                                    to: worker
                                });

                                count += 1;
                            }));
                        }

                        _chai.expect(await promise).to.equal(3);

                        promise = Promise.all(clusterMaster.workers.map(worker => new Promise(resolve => {
                            clusterMaster.after('workerMessage', event => {
                                if (event.data.message.count === 1 && event.data.worker === worker) {
                                    event.unsubscribe();
                                    resolve();
                                }
                            });
                        })));

                        clusterMaster.send({
                            message: {
                                count: 0
                            }
                        });

                        _chai.expect((await promise).length).to.equal(3);

                        clusterMaster.destroy();
                    }
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerFork',
                        'after workerFork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerMessage',
                        'after workerMessage',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        'ready',
                        'ready',
                        {
                            count: 1
                        },
                        {
                            count: 2
                        },
                        {
                            count: 3
                        },
                        {
                            count: 1
                        },
                        {
                            count: 1
                        },
                        {
                            count: 1
                        }
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    if (message !== 'ready') { // skip tracking ready messages to ensure order of eventHandlersExecuted
                        eventHandlersExecuted.push('on workerMessage');
                    }
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork({
                workerCount: 3
            });
        });

        _mocha.it('should observe worker listening events', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'server'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerListening () {
                    eventHandlersExecuted.push('after workerListening');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');

                    _later(2584, () => {
                        clusterMaster.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerListening',
                        'after workerListening',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerListening () {
                    eventHandlersExecuted.push('on workerListening');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should replace a dead worker', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerExitObjects = [],
                workerMessages = [];

            let count = 0;

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerExit ({
                    data: {
                        code,
                        signal
                    }
                }) {
                    eventHandlersExecuted.push('after workerExit');
                    workerExitObjects.push({
                        code,
                        signal
                    });
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');

                    switch (count) {
                        case 0:
                            clusterMaster.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 1:
                            clusterMaster.send({
                                message: 'exit',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 2:
                            clusterMaster.send({
                                message: 'throw',
                                to: worker
                            });
                            count += 1;
                            break;
                        default:
                            clusterMaster.destroy();
                            break;
                    }
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerExitObjects).to.deep.equal([{
                        code: 0,
                        signal: null
                    }, {
                        code: 0,
                        signal: null
                    }, {
                        code: 1,
                        signal: null
                    }]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        'ready',
                        'ready',
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerExit () {
                    eventHandlersExecuted.push('on workerExit');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should not replace a dead worker after shut down', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerExitObjects = [],
                workerMessages = [];

            let count = 0;

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                    clusterMaster.destroy();
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerExit ({
                    data: {
                        code,
                        signal
                    }
                }) {
                    eventHandlersExecuted.push('after workerExit');
                    workerExitObjects.push({
                        code,
                        signal
                    });
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');

                    switch (count) {
                        case 0:
                            clusterMaster.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 1:
                            clusterMaster.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                    }
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on shutDown',
                        'after shutDown',
                        'after workerExit',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerExitObjects).to.deep.equal([{
                        code: 0,
                        signal: null
                    }, {
                        code: 0,
                        signal: null
                    }]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerExit () {
                    eventHandlersExecuted.push('on workerExit');

                    if (count === 2) {
                        clusterMaster.shutDown();
                    }
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork();
        });

        _mocha.it('should be able to select a worker for a task', callbackFunction => {
            const clusterMaster = _ClusterMaster({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${__dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                initialWorkerIdSelectionOrder = [],
                selectedCountByWorkerId = {},
                selectedWorkerIds = [],
                selectedWorkerIdSet = new Set(),
                workerMessages = [];

            let count = 0;

            clusterMaster.after({
                addWorker () {
                    eventHandlersExecuted.push('after addWorker');
                },
                fork () {
                    eventHandlersExecuted.push('after fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('after removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('after shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('after workerDisconnect');
                },
                workerExit () {
                    eventHandlersExecuted.push('after workerExit');
                },
                workerFork () {
                    eventHandlersExecuted.push('after workerFork');
                },
                workerMessage ({
                    data: {
                        message
                    }
                }) {
                    eventHandlersExecuted.push('after workerMessage');
                    workerMessages.push(message);
                },
                workerOnline () {
                    eventHandlersExecuted.push('after workerOnline');
                },
                async workerReady () {
                    eventHandlersExecuted.push('after workerReady');

                    count += 1;

                    switch (count) {
                        case 3:
                            for (let count = 0; count < 8; count += 1) {
                                const workerId = clusterMaster.roundRobin().id;

                                selectedWorkerIds.push(workerId);

                                if (selectedWorkerIdSet.has(workerId)) {
                                    selectedCountByWorkerId[workerId] += 1;
                                } else {
                                    initialWorkerIdSelectionOrder.push(workerId);
                                    selectedCountByWorkerId[workerId] = 1;
                                    selectedWorkerIdSet.add(workerId);
                                }

                                await new Promise(resolve => {
                                    _later(8, () => {
                                        resolve();
                                    });
                                });
                            }

                            _chai.expect(selectedWorkerIds.length).to.equal(8);
                            _chai.expect(selectedWorkerIdSet.size).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[0]]).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[1]]).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[2]]).to.equal(2);
                            _chai.expect(selectedWorkerIds).to.deep.equal([
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1]
                            ]);

                            clusterMaster.workerById[initialWorkerIdSelectionOrder[0]].destroy();
                            clusterMaster.workerById[initialWorkerIdSelectionOrder[1]].destroy();

                            break;
                        case 5:
                            for (let count = 0; count < 8; count += 1) {
                                const workerId = clusterMaster.roundRobin().id;

                                selectedWorkerIds.push(workerId);

                                if (selectedWorkerIdSet.has(workerId)) {
                                    selectedCountByWorkerId[workerId] += 1;
                                } else {
                                    initialWorkerIdSelectionOrder.push(workerId);
                                    selectedCountByWorkerId[workerId] = 1;
                                    selectedWorkerIdSet.add(workerId);
                                }

                                await new Promise(resolve => {
                                    _later(8, () => {
                                        resolve();
                                    });
                                });
                            }

                            _chai.expect(selectedWorkerIds.length).to.equal(16);
                            _chai.expect(selectedWorkerIdSet.size).to.equal(5);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[0]]).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[1]]).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[2]]).to.equal(4);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[3]]).to.equal(3);
                            _chai.expect(selectedCountByWorkerId[initialWorkerIdSelectionOrder[4]]).to.equal(3);
                            _chai.expect(selectedWorkerIds).to.deep.equal([
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[0],
                                initialWorkerIdSelectionOrder[1],
                                initialWorkerIdSelectionOrder[3],
                                initialWorkerIdSelectionOrder[4],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[3],
                                initialWorkerIdSelectionOrder[4],
                                initialWorkerIdSelectionOrder[2],
                                initialWorkerIdSelectionOrder[3],
                                initialWorkerIdSelectionOrder[4]
                            ]);

                            clusterMaster.workerById[initialWorkerIdSelectionOrder[3]].destroy();
                            clusterMaster.workerById[initialWorkerIdSelectionOrder[4]].destroy();

                            break;
                        case 7: {
                            const customTaskInitialWorkerIdSelectionOrder = [],
                                customTaskSelectedCountByWorkerId = {},
                                customTaskSelectedWorkerIds = [],
                                customTaskSelectedWorkerIdSet = new Set(),
                                defaultTaskInitialWorkerIdSelectionOrder = [],
                                defaultTaskSelectedCountByWorkerId = {},
                                defaultTaskSelectedWorkerIds = [],
                                defaultTaskSelectedWorkerIdSet = new Set();

                            for (let count = 0; count < 3; count += 1) {
                                const workerId = clusterMaster.roundRobin().id;

                                defaultTaskSelectedWorkerIds.push(workerId);

                                if (defaultTaskSelectedWorkerIdSet.has(workerId)) {
                                    defaultTaskSelectedCountByWorkerId[workerId] += 1;
                                } else {
                                    defaultTaskInitialWorkerIdSelectionOrder.push(workerId);
                                    defaultTaskSelectedCountByWorkerId[workerId] = 1;
                                    defaultTaskSelectedWorkerIdSet.add(workerId);
                                }

                                await new Promise(resolve => {
                                    _later(8, () => {
                                        resolve();
                                    });
                                });
                            }

                            _chai.expect(defaultTaskSelectedWorkerIds.length).to.equal(3);
                            _chai.expect(defaultTaskSelectedWorkerIdSet.size).to.equal(3);
                            _chai.expect(defaultTaskSelectedCountByWorkerId[defaultTaskInitialWorkerIdSelectionOrder[0]]).to.equal(1);
                            _chai.expect(defaultTaskSelectedCountByWorkerId[defaultTaskInitialWorkerIdSelectionOrder[1]]).to.equal(1);
                            _chai.expect(defaultTaskSelectedCountByWorkerId[defaultTaskInitialWorkerIdSelectionOrder[2]]).to.equal(1);
                            _chai.expect(defaultTaskSelectedWorkerIds).to.deep.equal([
                                defaultTaskInitialWorkerIdSelectionOrder[0],
                                defaultTaskInitialWorkerIdSelectionOrder[1],
                                defaultTaskInitialWorkerIdSelectionOrder[2]
                            ]);
                            _chai.expect(defaultTaskInitialWorkerIdSelectionOrder[2]).to.equal(initialWorkerIdSelectionOrder[2]);

                            for (let count = 0; count < 3; count += 1) {
                                const workerId = clusterMaster.roundRobin({
                                    tag: 'customTask'
                                }).id;

                                customTaskSelectedWorkerIds.push(workerId);

                                if (customTaskSelectedWorkerIdSet.has(workerId)) {
                                    customTaskSelectedCountByWorkerId[workerId] += 1;
                                } else {
                                    customTaskInitialWorkerIdSelectionOrder.push(workerId);
                                    customTaskSelectedCountByWorkerId[workerId] = 1;
                                    customTaskSelectedWorkerIdSet.add(workerId);
                                }

                                await new Promise(resolve => {
                                    _later(8, () => {
                                        resolve();
                                    });
                                });
                            }

                            _chai.expect(customTaskSelectedWorkerIds.length).to.equal(3);
                            _chai.expect(customTaskSelectedWorkerIdSet.size).to.equal(3);
                            _chai.expect(customTaskSelectedCountByWorkerId[customTaskInitialWorkerIdSelectionOrder[0]]).to.equal(1);
                            _chai.expect(customTaskSelectedCountByWorkerId[customTaskInitialWorkerIdSelectionOrder[1]]).to.equal(1);
                            _chai.expect(customTaskSelectedCountByWorkerId[customTaskInitialWorkerIdSelectionOrder[2]]).to.equal(1);
                            _chai.expect(customTaskSelectedWorkerIds).to.deep.equal([
                                customTaskInitialWorkerIdSelectionOrder[0],
                                customTaskInitialWorkerIdSelectionOrder[1],
                                customTaskInitialWorkerIdSelectionOrder[2]
                            ]);
                            _chai.expect(customTaskInitialWorkerIdSelectionOrder[0]).to.equal(initialWorkerIdSelectionOrder[2]);

                            clusterMaster.destroy();
                        }
                    }
                }
            });

            clusterMaster.on({
                addWorker () {
                    eventHandlersExecuted.push('on addWorker');
                },
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on fork',
                        'after fork',
                        'on workerFork',
                        'after workerFork',
                        'on workerFork',
                        'after workerFork',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
                        'on shutDown',
                        'after shutDown',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(workerMessages).to.deep.equal([
                        'ready',
                        'ready',
                        'ready',
                        'ready',
                        'ready',
                        'ready',
                        'ready'
                    ]);

                    callbackFunction();
                },
                fork () {
                    eventHandlersExecuted.push('on fork');
                },
                removeWorker () {
                    eventHandlersExecuted.push('on removeWorker');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                },
                workerDisconnect () {
                    eventHandlersExecuted.push('on workerDisconnect');
                },
                workerExit () {
                    eventHandlersExecuted.push('on workerExit');
                },
                workerFork () {
                    eventHandlersExecuted.push('on workerFork');
                },
                workerMessage () {
                    eventHandlersExecuted.push('on workerMessage');
                },
                workerOnline () {
                    eventHandlersExecuted.push('on workerOnline');
                },
                workerReady () {
                    eventHandlersExecuted.push('on workerReady');
                }
            });

            clusterMaster.fork({
                workerCount: 3
            });
        });
    });
} else {
    _logger.info('Log from a worker');
}
