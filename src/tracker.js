(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;
    const fourier = require('fourier-transform');
    const decibels = require('decibels');

    class Tracker {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.sampleRate = opts.sampleRate || 3;
        }

        xIntercept3(pts) {
            if (pts.length !== 3) {
                throw new Error(`Expected three points {x,y}`);
            }

            // Lagrange interpolation
            //y1(x−x2)(x−x3)/(x1−x2)(x1−x3) +
            //y2(x−x1)(x−x3)/(x2−x1)(x2−x3) +
            //y3(x−x1)(x−x2)/(x3−x1)(x3−x2)

            var { x:x1, y:y1, } = pts[0];
            var { x:x2, y:y2, } = pts[1];
            var { x:x3, y:y3, } = pts[2];

            // Assume evenly spaced points so (x1-x2) = (x3-x2)
            var a = y1 - 2*y2 + y3;    
            var b = -y1*x2-y1*x3 +2*y2*x1+2*y2*x3 -y3*x1-y3*x2;
            var c = y1*x2*x3 -2*y2*x1*x3 +y3*x1*x2;
            var rootbac = Math.sqrt(b*b - 4*a*c);
            var xa = (-b-rootbac) / (2*a);
            var xb = (-b+rootbac) / (2*a);

            // return solution within interval
            return ((x1 <= xa && xa <= x3) ? xa : xb);
        }

        analyze(waveform, sampleRate) {
            var zeroes = [];
            var sampleInterval = 1/sampleRate;
            var phaseDelay = undefined;
            for (var i=2; i<waveform.length; i++) {
                var [wi1, wi] = waveform.slice(i-1,i+1);
                if (wi1<=0 && wi>0 || wi1>0 && wi<=0) {
                    var pts = [i-2,i-1,i].map(i => ({
                        x: i*sampleInterval,
                        y: waveform[i],
                    }));
                    var t = this.xIntercept3(pts);
                    if (wi1 <= 0 && phaseDelay === undefined) {
                        phaseDelay = t;
                    }
                    zeroes.push({ i, t, });
                }
            }
            zeroes.forEach(z => console.log(js.s(z)));
            var zStats = zeroes.reduce((a,z,i) => {
                a.tSum = i === 0 
                    ? a.tSum = 0
                    : a.tSum += z.t - a.zPrev.t;
                a.zPrev = z;
                return a;
            },{});
            var period = 2 * zStats.tSum/(zeroes.length-1);
            var sampleTime = waveform.length / sampleRate;
            return {
                period, 
                phaseDelay,
                sampleTime,
                sampleRate,
                sampleInterval,
                zeroes: zeroes.length,
            }
        }

    }

    module.exports = exports.Tracker = Tracker;
})(typeof exports === "object" ? exports : (exports = {}));

