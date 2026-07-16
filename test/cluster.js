import './js/logger-setup.js';
import _Backoff from 'isotropic-backoff';
import _chai from 'isotropic-dev-dependencies/lib/chai.js';
import _cluster from 'node:cluster';
import _ClusterPrimary from '../lib/cluster-primary.js';
import _ClusterWorker from '../lib/cluster-worker.js';
import _Error from 'isotropic-error';
import _later from 'isotropic-later';
import _logger from 'isotropic-logger';
import _make from 'isotropic-make';
import _test from 'node:test';

if (_cluster.isPrimary) {
    _test.describe('cluster-worker', () => {
        _test.it('should construct cluster worker objects', () => {
            _chai.expect(_ClusterWorker).to.be.a('function');
            _chai.expect(_ClusterWorker).to.have.property('name').that.equals('ClusterWorker');
            _chai.expect(_ClusterWorker).to.have.property('worker');
            _chai.expect(_ClusterWorker).to.have.property('workerId');

            const clusterWorker = new _ClusterWorker({
                initialize: false
            });

            _chai.expect(clusterWorker).to.be.a('ClusterWorker');
            _chai.expect(clusterWorker).to.be.an.instanceOf(_ClusterWorker);
            _chai.expect(clusterWorker).to.have.property('send').that.is.a('function');
            clusterWorker.destroy();
        });

        _test.it('should be an initializable object factory', () => {
            const clusterWorker = _ClusterWorker({
                initialize: false
            });

            _chai.expect(clusterWorker).to.be.an.instanceOf(_ClusterWorker);
            _chai.expect(clusterWorker).to.have.property('send').that.is.a('function');
            clusterWorker.destroy();
        });

        _test.it('should fail to initialize in a non-worker process', {
            timeout: 144
        }, (test, callbackFunction) => {
            _ClusterWorker().on('initializeError', event => {
                _chai.expect(event.data.error).to.be.an.instanceof(_Error);
                event.prevent();
                callbackFunction();
            });
        });
    });

    _test.describe('cluster-primary', () => {
        // Add a pause to prevent interference from the previous test
        _test.beforeEach(() => _later(1597));

        _test.it('should construct cluster primary objects', {
            timeout: 28657
        }, (test, callbackFunction) => {
            _chai.expect(_ClusterPrimary).to.be.a('function');
            _chai.expect(_ClusterPrimary).to.have.property('name').that.equals('ClusterPrimary');

            const clusterPrimary = new _ClusterPrimary();

            _chai.expect(clusterPrimary).to.be.a('ClusterPrimary');
            _chai.expect(clusterPrimary).to.be.an.instanceOf(_ClusterPrimary);
            _chai.expect(clusterPrimary).to.have.property('fork').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('roundRobin').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('send').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('shutDown').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('workerById').that.is.an('object');
            _chai.expect(clusterPrimary).to.have.property('workers').that.is.an('array');

            clusterPrimary.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterPrimary.destroy();
        });

        _test.it('should be an initializable object factory', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary();

            _chai.expect(clusterPrimary).to.be.an.instanceOf(_ClusterPrimary);
            _chai.expect(clusterPrimary).to.have.property('fork').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('roundRobin').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('send').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('shutDown').that.is.a('function');
            _chai.expect(clusterPrimary).to.have.property('workerById').that.is.an('object');
            _chai.expect(clusterPrimary).to.have.property('workers').that.is.an('array');

            clusterPrimary.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterPrimary.destroy();
        });

        _test.it('should return undefined from roundRobin when there are no workers', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary();

            _chai.expect(clusterPrimary.roundRobin()).to.equal(void null);
            _chai.expect(clusterPrimary.roundRobin({
                tag: 'someTag'
            })).to.equal(void null);

            clusterPrimary.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterPrimary.destroy();
        });

        _test.it('should be able to fork a worker process', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary(),
                eventHandlersExecuted = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should be able to fork a silent worker process', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerSilent: true
                }),
                eventHandlersExecuted = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should not be able to fork a worker process after shut down', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary(),
                eventHandlersExecuted = [];

            clusterPrimary.after({
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

            clusterPrimary.on({
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

            clusterPrimary.shutDown().fork();

            _later(2584, () => {
                clusterPrimary.destroy();
            });
        });

        _test.it('should handle worker process errors', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary(),
                eventHandlersExecuted = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should be able to communicate with a cluster-worker instance', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'communicate',
                        'send-after-disconnect'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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
                        clusterPrimary.send({
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
                        clusterPrimary.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should execute a method based on the type property of a message', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const eventHandlersExecuted = [],
                workerMessages = [],

                clusterPrimary = _make(_ClusterPrimary, {
                    _eventWorkerMessage_x ({
                        data: {
                            message,
                            worker
                        }
                    }) {
                        clusterPrimary.send({
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
                        clusterPrimary.send({
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
                        clusterPrimary.destroy();
                    }
                })({
                    workerArgs: [
                        'typed'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                });

            clusterPrimary.after({
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

                    clusterPrimary.send({
                        message: {
                            a: 'a',
                            type: 'a',
                            workerMessages
                        },
                        to: worker
                    });
                }
            });

            clusterPrimary.on({
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
                            message: {
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            },
                            primaryMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }],
                            type: 'x',
                            x: 'x'
                        },
                        {
                            message: {
                                b: 'b',
                                message: {
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    primaryMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            },
                            primaryMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }, {
                                b: 'b',
                                message: {
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    primaryMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            }],
                            type: 'y',
                            y: 'y'
                        },
                        {
                            message: {
                                c: 'c',
                                message: {
                                    message: {
                                        b: 'b',
                                        message: {
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            primaryMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    },
                                    primaryMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }, {
                                        b: 'b',
                                        message: {
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            primaryMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    }],
                                    type: 'y',
                                    y: 'y'
                                },
                                type: 'c',
                                workerMessages: [
                                    'ready',
                                    {
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        type: 'x',
                                        x: 'x'
                                    },
                                    {
                                        message: {
                                            b: 'b',
                                            message: {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    primaryMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }, {
                                            b: 'b',
                                            message: {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    primaryMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        }],
                                        type: 'y',
                                        y: 'y'
                                    }
                                ]
                            },
                            primaryMessages: [{
                                a: 'a',
                                type: 'a',
                                workerMessages: [
                                    'ready'
                                ]
                            }, {
                                b: 'b',
                                message: {
                                    message: {
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    },
                                    primaryMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }],
                                    type: 'x',
                                    x: 'x'
                                },
                                type: 'b',
                                workerMessages: [
                                    'ready',
                                    {
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        type: 'x',
                                        x: 'x'
                                    }
                                ]
                            }, {
                                c: 'c',
                                message: {
                                    message: {
                                        b: 'b',
                                        message: {
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            primaryMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    },
                                    primaryMessages: [{
                                        a: 'a',
                                        type: 'a',
                                        workerMessages: [
                                            'ready'
                                        ]
                                    }, {
                                        b: 'b',
                                        message: {
                                            message: {
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            },
                                            primaryMessages: [{
                                                a: 'a',
                                                type: 'a',
                                                workerMessages: [
                                                    'ready'
                                                ]
                                            }],
                                            type: 'x',
                                            x: 'x'
                                        },
                                        type: 'b',
                                        workerMessages: [
                                            'ready',
                                            {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            }
                                        ]
                                    }],
                                    type: 'y',
                                    y: 'y'
                                },
                                type: 'c',
                                workerMessages: [
                                    'ready',
                                    {
                                        message: {
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }],
                                        type: 'x',
                                        x: 'x'
                                    },
                                    {
                                        message: {
                                            b: 'b',
                                            message: {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    primaryMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        },
                                        primaryMessages: [{
                                            a: 'a',
                                            type: 'a',
                                            workerMessages: [
                                                'ready'
                                            ]
                                        }, {
                                            b: 'b',
                                            message: {
                                                message: {
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                },
                                                primaryMessages: [{
                                                    a: 'a',
                                                    type: 'a',
                                                    workerMessages: [
                                                        'ready'
                                                    ]
                                                }],
                                                type: 'x',
                                                x: 'x'
                                            },
                                            type: 'b',
                                            workerMessages: [
                                                'ready',
                                                {
                                                    message: {
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    },
                                                    primaryMessages: [{
                                                        a: 'a',
                                                        type: 'a',
                                                        workerMessages: [
                                                            'ready'
                                                        ]
                                                    }],
                                                    type: 'x',
                                                    x: 'x'
                                                }
                                            ]
                                        }],
                                        type: 'y',
                                        y: 'y'
                                    }
                                ]
                            }],
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

            clusterPrimary.fork();
        });

        _test.it('should ignore untyped or unknown type messages', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'typed'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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

                    await clusterPrimary.send({
                        message: 'untyped message',
                        to: worker
                    });

                    await clusterPrimary.send({
                        message: {
                            type: 'unknown',
                            workerMessages
                        },
                        to: worker
                    });

                    await clusterPrimary.send({
                        message: {
                            type: 'replyUnknown',
                            workerMessages
                        },
                        to: worker
                    });

                    _later(2584, () => {
                        clusterPrimary.destroy();
                    });
                }
            });

            clusterPrimary.on({
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
                            message: {
                                type: 'replyUnknown',
                                workerMessages: [
                                    'ready'
                                ]
                            },
                            primaryMessages: [
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

            clusterPrimary.fork();
        });

        _test.it('should be able to communicate with a cluster-worker instance by worker id', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'identify'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                },
                workerReady ({
                    data: {
                        worker
                    }
                }) {
                    eventHandlersExecuted.push('after workerReady');
                    _chai.expect(clusterPrimary.workerById[worker.id]).to.equal(worker);
                    clusterPrimary.send({
                        message: 'identify',
                        to: worker.id
                    });
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should reject when sending to an invalid worker', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const caughtErrors = [],
                clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'communicate'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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

                    clusterPrimary.send({
                        message: 'message',
                        to: -.123
                    }).catch(error => {
                        caughtErrors.push(error);

                        return clusterPrimary.send({
                            message: 'message',
                            to: {}
                        });
                    }).catch(error => {
                        caughtErrors.push(error);

                        return clusterPrimary.send({
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
                        clusterPrimary.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                    clusterPrimary.shutDown();
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should not trigger the worker ready event before the ready message', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'early-send'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should be able to fork and communicate with multiple cluster-worker instances', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'communicate'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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

                    if (clusterPrimary.workers.length === 3) {
                        let promise = Promise.resolve(0);

                        for (const worker of clusterPrimary.workers) {
                            promise = promise.then(count => new Promise(resolve => {
                                clusterPrimary.after('workerMessage', event => {
                                    if (event.data.message.count === count && event.data.worker === worker) {
                                        event.unsubscribe();
                                        resolve(count);
                                    }
                                });

                                clusterPrimary.send({
                                    message: {
                                        count
                                    },
                                    to: worker
                                });

                                count += 1;
                            }));
                        }

                        _chai.expect(await promise).to.equal(3);

                        promise = Promise.all(clusterPrimary.workers.map(worker => new Promise(resolve => {
                            clusterPrimary.after('workerMessage', event => {
                                if (event.data.message.count === 1 && event.data.worker === worker) {
                                    event.unsubscribe();
                                    resolve();
                                }
                            });
                        })));

                        clusterPrimary.send({
                            message: {
                                count: 0
                            }
                        });

                        _chai.expect((await promise).length).to.equal(3);

                        clusterPrimary.destroy();
                    }
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork({
                workerCount: 3
            });
        });

        _test.it('should observe worker listening events', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'server'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerMessages = [];

            clusterPrimary.after({
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
                        clusterPrimary.destroy();
                    });
                },
                workerReady () {
                    eventHandlersExecuted.push('after workerReady');
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should replace a dead worker', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerExitObjects = [],
                workerMessages = [];

            let count = 0;

            clusterPrimary.after({
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
                            clusterPrimary.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 1:
                            clusterPrimary.send({
                                message: 'exit',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 2:
                            clusterPrimary.send({
                                message: 'hang',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 3:
                            clusterPrimary.send({
                                message: 'throw',
                                to: worker
                            });
                            count += 1;
                            break;
                        default:
                            clusterPrimary.destroy();
                            break;
                    }
                }
            });

            clusterPrimary.on({
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

            clusterPrimary.fork();
        });

        _test.it('should not replace a dead worker after shut down', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                workerExitObjects = [],
                workerMessages = [];

            let count = 0;

            clusterPrimary.after({
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
                    clusterPrimary.destroy();
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
                            clusterPrimary.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                        case 1:
                            clusterPrimary.send({
                                message: 'destroy',
                                to: worker
                            });
                            count += 1;
                            break;
                    }
                }
            });

            clusterPrimary.on({
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
                        clusterPrimary.shutDown();
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

            clusterPrimary.fork();
        });

        _test.it('should escalate restart delays and give up when a worker repeatedly crashes', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    restartBackoff: {
                        levels: [{
                            count: 2
                        }, {
                            count: 2,
                            delay: 89,
                            factor: 2
                        }]
                    },
                    workerArgs: [
                        'crash'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                delays = [],
                eventHandlersExecuted = [];

            clusterPrimary.restartBackoff.on('delayChange', ({
                data: {
                    delay
                }
            }) => {
                delays.push(delay);
            });

            clusterPrimary.after({
                restartGiveUp () {
                    eventHandlersExecuted.push('after restartGiveUp');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('after shutDownComplete');

                    clusterPrimary.destroy();
                }
            });

            clusterPrimary.on({
                destroyComplete () {
                    _chai.expect(delays).to.deep.equal([
                        89,
                        178
                    ]);

                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on restartGiveUp',
                        'on shutDown',
                        'after restartGiveUp',
                        'on shutDownComplete',
                        'after shutDownComplete'
                    ]);

                    _chai.expect(clusterPrimary.workers).to.deep.equal([]);

                    callbackFunction();
                },
                restartGiveUp () {
                    eventHandlersExecuted.push('on restartGiveUp');
                },
                shutDown () {
                    eventHandlersExecuted.push('on shutDown');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');
                }
            });

            clusterPrimary.fork();
        });

        _test.it('should delay worker replacement and cancel a pending replacement at shut down', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                restartBackoff: {
                    levels: [{
                        count: 2,
                        delay: 2584
                    }]
                },
                workerArgs: [
                    'crash'
                ],
                workerScript: `${import.meta.dirname}/js/cluster-worker.js`
            });

            let forkCount = 0;

            clusterPrimary.after({
                shutDownComplete () {
                    clusterPrimary.destroy();
                },
                workerExit () {
                    _later(89, () => {
                        clusterPrimary.shutDown();
                    });
                }
            });

            clusterPrimary.on({
                destroyComplete () {
                    _chai.expect(forkCount).to.equal(1);
                    _chai.expect(clusterPrimary.restartBackoff).to.equal(void null);

                    callbackFunction();
                },
                fork () {
                    forkCount += 1;
                }
            });

            clusterPrimary.fork();
        });

        _test.it('should continue with remaining workers when restarts are exhausted and give up when none remain', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    restartBackoff: {
                        levels: [{
                            count: 1
                        }]
                    }
                }),
                eventHandlersExecuted = [],
                worker = {
                    id: 1
                };

            clusterPrimary.before('fork', event => event.prevent());

            clusterPrimary.on({
                destroyComplete () {
                    _chai.expect(eventHandlersExecuted).to.deep.equal([
                        'on restartGiveUp',
                        'on shutDownComplete'
                    ]);

                    callbackFunction();
                },
                restartGiveUp () {
                    eventHandlersExecuted.push('on restartGiveUp');
                },
                shutDownComplete () {
                    eventHandlersExecuted.push('on shutDownComplete');

                    _later(89, () => {
                        clusterPrimary.destroy();
                    });
                }
            });

            clusterPrimary._addWorker({
                worker
            });

            _chai.expect(clusterPrimary.workers).to.deep.equal([
                worker
            ]);

            _chai.expect(clusterPrimary._restartWorker()).to.equal(clusterPrimary);

            _chai.expect(clusterPrimary.restartBackoff.exhausted).to.be.false;

            clusterPrimary._restartWorker();

            _chai.expect(clusterPrimary.restartBackoff.exhausted).to.be.true;
            _chai.expect(eventHandlersExecuted).to.deep.equal([]);

            clusterPrimary._removeWorker({
                worker
            });

            clusterPrimary._restartWorker();

            _chai.expect(eventHandlersExecuted).to.deep.equal([
                'on restartGiveUp'
            ]);
        });

        _test.it('should replace dead workers without backoff when the restart backoff is disabled', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                restartBackoff: false,
                workerArgs: [
                    'replace'
                ],
                workerScript: `${import.meta.dirname}/js/cluster-worker.js`
            });

            let forkCount = 0,
                readyCount = 0;

            _chai.expect(clusterPrimary.restartBackoff).to.equal(void null);

            clusterPrimary.after('workerReady', ({
                data: {
                    worker
                }
            }) => {
                readyCount += 1;

                if (readyCount === 1) {
                    clusterPrimary.send({
                        message: 'exit',
                        to: worker
                    });
                } else {
                    clusterPrimary.destroy();
                }
            });

            clusterPrimary.on({
                destroyComplete () {
                    _chai.expect(forkCount).to.equal(2);

                    callbackFunction();
                },
                fork () {
                    forkCount += 1;
                }
            });

            clusterPrimary.fork();
        });

        _test.it('should accept a shared restart backoff instance without taking ownership', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const restartBackoff = _Backoff({
                    levels: [{
                        count: 4,
                        delay: 89
                    }]
                }),

                clusterPrimary = _ClusterPrimary({
                    restartBackoff
                });

            _chai.expect(clusterPrimary.restartBackoff).to.equal(restartBackoff);

            clusterPrimary.on('destroyComplete', () => {
                _chai.expect(restartBackoff.failed()).to.equal(restartBackoff);
                _chai.expect(restartBackoff.delay).to.equal(89);

                restartBackoff.destroy();

                callbackFunction();
            });

            clusterPrimary.destroy();
        });

        _test.it('should be able to select a worker for a task', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                    workerArgs: [
                        'replace'
                    ],
                    workerScript: `${import.meta.dirname}/js/cluster-worker.js`
                }),
                eventHandlersExecuted = [],
                initialWorkerIdSelectionOrder = [],
                selectedCountByWorkerId = {},
                selectedWorkerIds = [],
                selectedWorkerIdSet = new Set(),
                workerMessages = [];

            let count = 0;

            clusterPrimary.after({
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
                                const workerId = clusterPrimary.roundRobin().id;

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

                            clusterPrimary.workerById[initialWorkerIdSelectionOrder[0]].destroy();

                            clusterPrimary.onceAfter('workerDisconnect', () => {
                                clusterPrimary.workerById[initialWorkerIdSelectionOrder[1]].destroy();
                            });

                            break;
                        case 5:
                            for (let count = 0; count < 8; count += 1) {
                                const workerId = clusterPrimary.roundRobin().id;

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

                            clusterPrimary.workerById[initialWorkerIdSelectionOrder[3]].destroy();

                            clusterPrimary.onceAfter('workerDisconnect', () => {
                                clusterPrimary.workerById[initialWorkerIdSelectionOrder[4]].destroy();
                            });

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
                                const workerId = clusterPrimary.roundRobin().id;

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
                                const workerId = clusterPrimary.roundRobin({
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

                            clusterPrimary.destroy();
                        }
                    }
                }
            });

            clusterPrimary.on({
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
                        'on workerExit',
                        'on fork',
                        'after fork',
                        'after workerExit',
                        'on workerFork',
                        'after workerFork',
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'after workerExit',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
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
                        'on workerDisconnect',
                        'on removeWorker',
                        'after removeWorker',
                        'after workerDisconnect',
                        'on workerExit',
                        'after workerExit',
                        'on workerOnline',
                        'after workerOnline',
                        'on workerMessage',
                        'after workerMessage',
                        'on workerReady',
                        'on addWorker',
                        'after addWorker',
                        'after workerReady',
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

            clusterPrimary.fork({
                workerCount: 3
            });
        });

        _test.it('should distribute selections evenly when called synchronously', {
            timeout: 28657
        }, (test, callbackFunction) => {
            const clusterPrimary = _ClusterPrimary({
                workerArgs: [
                    'replace'
                ],
                workerScript: `${import.meta.dirname}/js/cluster-worker.js`
            });

            let readyCount = 0;

            clusterPrimary.after('workerReady', () => {
                readyCount += 1;

                if (readyCount === 3) {
                    const selectedCountByWorkerId = {},
                        selectedWorkerIds = [];

                    for (let count = 0; count < 9; count += 1) {
                        const workerId = clusterPrimary.roundRobin().id;

                        selectedCountByWorkerId[workerId] = (selectedCountByWorkerId[workerId] || 0) + 1;
                        selectedWorkerIds.push(workerId);
                    }

                    // Each of the three workers should be selected exactly three times, cycling in order, even though all nine selections happen synchronously within the same millisecond.
                    _chai.expect(Object.values(selectedCountByWorkerId).sort()).to.deep.equal([
                        3,
                        3,
                        3
                    ]);
                    _chai.expect(selectedWorkerIds[0]).to.equal(selectedWorkerIds[3]);
                    _chai.expect(selectedWorkerIds[0]).to.equal(selectedWorkerIds[6]);
                    _chai.expect(selectedWorkerIds[1]).to.equal(selectedWorkerIds[4]);
                    _chai.expect(selectedWorkerIds[1]).to.equal(selectedWorkerIds[7]);
                    _chai.expect(selectedWorkerIds[2]).to.equal(selectedWorkerIds[5]);
                    _chai.expect(selectedWorkerIds[2]).to.equal(selectedWorkerIds[8]);
                    _chai.expect(new Set(selectedWorkerIds).size).to.equal(3);

                    clusterPrimary.destroy();
                }
            });

            clusterPrimary.on('destroyComplete', () => {
                callbackFunction();
            });

            clusterPrimary.fork({
                workerCount: 3
            });
        });
    });
} else {
    _logger.info('Log from a worker');
}
