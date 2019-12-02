(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;
    const fourier = require('fourier-transform');
    const decibels = require('decibels');

    class Tracker {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.sampleRate = opts.sampleRate || 3;
        }

        phase(waveform, sampleRate) {
            var zeroes = [];
            var wiPrev = waveform[0];
            for (var i=1; i<waveform.length; i++) {
                var wi = waveform[i];
                if (wiPrev < 0 && 0 <= wi || 0 <= wiPrev && wi < 0) {
                    zeroes.push(i);
                }
                wiPrev = wi;
            }
            let tzero = [];
            var diz = zeroes.reduce((a,i) => {
                if (i===0) { return a; }
                let [v0,v1] = [waveform[i-1], waveform[i]];
                let diz = v0/(v0-v1);
                a.sum += diz;
                a.n++;
                a.avg = a.sum / a.n;
                tzero.push((i-diz)/sampleRate);
                return a;
            },{sum:0,n:0});
            var iMin = zeroes[0];
            tzero.sort((a,b) => a-b);
            console.log(js.s({zeroes,diz,tzero}));
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
            // parabolic estimate for peak frequency
            var [dba, dbb, dbc] = [db[iMax-1], db[iMax], db[iMax+1]];
            var p = 0.5 * (dba-dbc) / (dba - 2 * dbb + dbc);
            return (iMax + p) * dHz + dHz/2;
        }
    }

    module.exports = exports.Tracker = Tracker;
})(typeof exports === "object" ? exports : (exports = {}));

