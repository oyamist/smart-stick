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
            var wi2 = waveform[0];
            var wi1 = waveform[1];
            var sum = 0;
            var sum3 = 0;
            var n = 0;
            var iPhase = undefined;
            for (var i=2; i<waveform.length; i++) {
                var wi = waveform[i];
                if (wi1<=0 && wi>0 || wi1>0 && wi<=0) {
                    if (wi1 < 0 && iPhase === undefined) {
                        iPhase = i;
                    }
                    let diz = wi1 / (wi1 - wi);
                    let diz21 = wi2 / (wi2 - wi1);
                    let diz2 = wi2 / (wi2 - wi);
                    console.log(`dbg diz`, 
                        js.s({wi2, wi1, wi, diz, diz21, diz2}));
                    //let diz3 = (diz + diz21 + diz2)/3;
                    let diz3 = (diz + diz2)/2;
                    sum3 += diz3;
                    sum += diz;
                    n++;
                    zeroes.push({
                        i,
                        sum,
                        sum3,
                        n,
                        avg: sum / n,
                        avg3: sum3 / n,
                        t: (i-diz)/sampleRate,
                        t3: (i-diz3)/sampleRate,
                    });
                }
                wi2 = wi1;
                wi1 = wi;
            }
            zeroes.forEach(z => console.log(js.s(z)));
            var zStats = zeroes.reduce((a,z,i) => {
                if (i === 0) {
                    a.tSum = 0;
                    a.tSum3 = 0;
                } else {
                    a.tSum += z.t - a.zPrev.t;
                    a.tSum3 += z.t3 - a.zPrev.t3;
                }
                a.zPrev = z;
                return a;
            },{});
            var period = 2 * zStats.tSum/(zeroes.length-1);
            var period3 = 2 * zStats.tSum3/(zeroes.length-1);
            var frequency = 1/period;
            var phaseDelay = iPhase/sampleRate;
            var duration = waveform.length / sampleRate;
            //console.log(`dbg zeroes`, waveform, zeroes);
            return {
                period, 
                period3,
                frequency,
                phaseDelay,
                duration,
            }
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

