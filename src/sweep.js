(function(exports) {
    const { js, logger, } = require('just-simple').JustSimple;

    class Sweep {
        constructor(opts={}) {
            // sweep model is sinusoidal
            logger.logInstance(this, opts);
            this.period = opts.period || 1.4;
            Object.defineProperty(this, "frequency", {
                enumerable: true,
                get() { return 1/this.period; },
                set(value=1/this.period) { this.period = 1/value; },
            });
            this.frequency = opts.frequency;
            this.rStick = opts.rStick || 1; // meter
            this.downDegrees = opts.downDegrees || 0;
            Object.defineProperty(this, "sweepRadians", {
                writable: true,
                value: opts.sweepRadians || (Math.PI * 45/180),
            });
            Object.defineProperty(this, "sweepDegrees", {
                enumerable: true,
                get() { return this.sweepRadians * 180 / Math.PI; },
                set(value) { this.sweepRadians = value * Math.PI / 180; },
            });
            opts.sweepDegrees && (this.sweepDegrees = opts.sweepDegrees);
            Object.defineProperty(this, "radiansPerSecond", {
                enumerable: true,
                get() { return this.frequency * 2  * Math.PI; },
            });
        }

        get downDegrees() {
            return 180 * this.downRadians / Math.PI;
        }

        set downDegrees(value) {
            this.downRadians =  Math.PI * value / 180;
        }

        position(t) { // walker relative
            var {
                sweepRadians,
                radiansPerSecond,
                rStick,
            } = this;
            var w = 0.5 * sweepRadians * Math.sin(radiansPerSecond * t);
            return {
                t,
                x: -rStick * Math.sin(w), // walker relative
                y: rStick * Math.cos(w), // walker relative
                w,
                xyDegrees: 180 * w / Math.PI,
            }
        }

        acceleration(t) { // tip relative
            var {
                sweepRadians,
                rStick,
            } = this;

            // approximate acceleration 
            var dt = -0.0001;
            var dt2 = dt * dt;
            var p0 = this.position(t-dt);
            var p1 = this.position(t);
            var p2 = this.position(t+dt);
            var dx10 = p1.x - p0.x;
            var dy10 = p1.y - p0.y;
            var dx21 = p2.x - p1.x;
            var dy21 = p2.y - p1.y;
            var w = p1.w;
            var ddx = (dx21 - dx10)/dt2;
            var ddy = (dy21 - dy10)/dt2;
            var aTip = this.transformTip([ddx, ddy, 0], w);

            return Object.assign(p1, { ddx, ddy, aTip});
        }

        transformTip(xyz, w) {
            var [x,y,z] = xyz;
            var {
                downRadians,
            } = this;

            var l = -1;
            var m = 0;
            var n = 0;
            var cd = Math.cos(-downRadians);
            var cd1 = 1 - cd;
            var sd = Math.sin(-downRadians);
            var [x1,y1,z1] = [
                (l*l*cd1+cd)*x + (m*l*cd1-n*sd)*y + (n*l*cd1+m*sd)*z, 
                (l*m*cd1+n*sd)*x + (m*m*cd1+cd)*y + (n*m*cd1-l*sd)*z,
                (l*n*cd1-m*sd)*x + (m*n*cd1+l*sd)*y + (n*n*cd1+cd)*z,
            ];
            var l = 0;
            if (1) {
            var m = -Math.sin(downRadians);
            var n = Math.cos(downRadians);
            } else{
            var m = 0;
            var n = 1;
            }
            var cd = Math.cos(-w);
            var cd1 = 1 - cd;
            var sd = Math.sin(-w);
            return [
                (l*l*cd1+cd)*x1 + (m*l*cd1-n*sd)*y1 + (n*l*cd1+m*sd)*z1, 
                (l*m*cd1+n*sd)*x1 + (m*m*cd1+cd)*y1 + (n*m*cd1-l*sd)*z1,
                (l*n*cd1-m*sd)*x1 + (m*n*cd1+l*sd)*y1 + (n*n*cd1+cd)*z1,
            ];
        }

    }

    module.exports = exports.Sweep = Sweep;
})(typeof exports === "object" ? exports : (exports = {}));

