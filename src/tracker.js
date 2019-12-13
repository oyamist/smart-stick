(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;
    const fourier = require('fourier-transform');
    const decibels = require('decibels');
    const Sweep = require('./sweep');

    class Tracker {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.maxPeriod = opts.maxPeriod || 3.5;
            this.minPeriod = opts.minPeriod || 0.5;
            this.sampleRate = opts.sampleRate || 1/0.32;
            this.smoothing = opts.smoothing || 0.66;
            this.smoothingDelay = opts.smoothingDelay == null
                ? (this.smoothing === 0 ? 0 : 2/this.sampleRate)
                : opts.smoothingDelay;
            this.sweep = opts.sweep || new Sweep(Object.assign({
            }, opts));
        }

        get sampleInterval() { return 1/this.sampleRate; }

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
            if (a === 0) { // linear
                var m = (y1-y2)/(x1-x2);
                var b = y1-m*x1;
                return -b / m;
            } else {
                var b = -y1*x2-y1*x3 +2*y2*x1+2*y2*x3 -y3*x1-y3*x2;
                var c = y1*x2*x3 -2*y2*x1*x3 +y3*x1*x2;
                this.abc = {a,b,c};
                var rootbac = Math.sqrt(b*b - 4*a*c);
                var xa = (-b-rootbac) / (2*a);
                var xb = (-b+rootbac) / (2*a);

                // return solution within interval
                return ((x1 <= xa && xa <= x3) ? xa : xb);
            }
        }

        smooth(waveform, s=this.smoothing) {
            var a = waveform[0];
            return waveform.map(v=> (a = (1-s)*v + s*a));
        }

        analyze(waveform) {
            var {
                sweep,
                minPeriod,
                maxPeriod,
                smoothingDelay,
                sampleInterval,
                sampleRate,
            } = this;
            // zero-crossing analysis requires slightly more 
            // than a full period of sample data. A slightly quicker
            // response could be squeezed out by analyzing maxima
            // and minima but that's a lot of work.
            var zeroes = [];
            var phaseDelay = undefined;
            var smoothed = this.smooth(waveform);
            for (var i=2; i<smoothed.length; i++) {
                var [wi1, wi] = smoothed.slice(i-1,i+1);
                if (wi1<=0 && wi>0 || wi1>0 && wi<=0) {
                    var pts = [i-2,i-1,i].map(i => ({
                        x: i*sampleInterval,
                        y: smoothed[i],
                    }));
                    var t = this.xIntercept3(pts);
                    if (wi1 <= 0 && phaseDelay === undefined) {
                        phaseDelay = t;
                    }
                    zeroes.push({ i, t, });
                }
            }
            //zeroes.forEach(z => console.log(js.s(z)));
            if (zeroes.length < 2) {
                period = minPeriod;
                phaseDelay = 0;
            } else {
                var period = 2*(zeroes[1].t - zeroes[0].t);
                if (period < minPeriod ) {
                    period = minPeriod;
                    phaseDelay = 0;
                } else if (maxPeriod < period) {
                    period = minPeriod;
                    phaseDelay = 0;
                } else {
                    if (phaseDelay > period) { 
                        phaseDelay -= period; 
                    }
                    phaseDelay -= smoothingDelay;
                }
            }
            var sampleTime = smoothed.length / sampleRate;
            sweep.period = period;
            sweep.phaseDelay = phaseDelay;
            var {
                heading,
                unitHeading,
            } = sweep.position(sampleTime);

            return {
                heading,
                unitHeading,
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

