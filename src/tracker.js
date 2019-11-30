(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;
    const fourier = require('fourier-transform');
    const decibels = require('decibels');

    class Tracker {
        constructor(opts={}) {
            this.sampleRate = opts.sampleRate || 3;
        }

        frequency(waveform, sampleRate) {
            sampleRate = sampleRate || this.sampleRate;
            var spectrum = fourier(waveform);
            var dHz = sampleRate/waveform.length;
            var db = spectrum.map(v => decibels.fromGain(v));
            var iMax = db.reduce((a,d,i) => (db[i] > db[a] ? i : a), 0);
            if (iMax < 1 || waveform.length-2 < iMax) {
                throw new Error(
                    `Cannot compute peak frequency iMax:${iMax}`);
            }
            var [dba, dbb, dbc] = [db[iMax-1], db[iMax], db[iMax+1]];
            var p = 0.5 * (dba-dbc) / (dba - 2 * dbb + dbc);
            return (iMax + p) * dHz;
        }
    }

    module.exports = exports.Tracker = Tracker;
})(typeof exports === "object" ? exports : (exports = {}));

