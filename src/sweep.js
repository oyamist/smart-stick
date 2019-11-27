(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;

    class Sweep {
        constructor(opts={}) {
            this.period = opts.period || 1.4;
            this.frequency = 2 * Math.PI/this.period;
            this.rStick = opts.rStick || 1; // meter
            if (opts.sweepRadians) {
                this.sweepRadians = opts.sweepRadians;
            } else {
                var sweepDegrees = opts.sweepDegrees || 45;
                this.sweepRadians = Math.PI * sweepDegrees / 180;
            }
        }

        position(t) {
            var {
                sweepRadians,
                frequency,
                rStick,
            } = this;
            var w = 0.5 * sweepRadians * Math.sin(frequency * t);
            var y = rStick * Math.cos(w);
            var x = rStick * Math.sin(w);

            return {
                xyDegrees: 180 * w / Math.PI,
                x,
                y,
                t,
            }
        }

    }

    module.exports = exports.Sweep = Sweep;
})(typeof exports === "object" ? exports : (exports = {}));

