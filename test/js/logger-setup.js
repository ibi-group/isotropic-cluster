import _bunyanStreamIsotropic from 'bunyan-stream-isotropic';
import _logger from 'isotropic-logger';

_logger.streams = [];
_logger.addStream({
    level: 'info',
    name: 'isotropic',
    stream: _bunyanStreamIsotropic,
    type: 'raw'
});
