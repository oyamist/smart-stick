(typeof describe === 'function') && describe("sweep", function() {
    const should = require("should");
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Sweep,
    } = require('../index');
    var logLevel = false;
    var eps = 0.00001;

    it("TESTTESTdefault ctor", ()=>{
        var sweep = new Sweep();
        var period = 1.4;
        should(sweep).properties({
            period, // stick sweep period in seconds
            frequency: 2 * Math.PI / period,
            rStick: 1, // stick length in meters
            sweepRadians: Math.PI * 45 / 180, // forward sweep angle
        });

    });
    it("TESTTESTcustom ctor", ()=>{
        var period = 1.5;
        var rStick = 1.2;
        var sweep = new Sweep({
            period,
            rStick,
        });
        should(sweep).properties({
            period, // stick sweep period in seconds
            frequency: 2 * Math.PI / period,
            rStick, // stick length in meters
        });
    });
    it("TESTTESTposition(t) => stick tip position ", ()=>{
        var period = 1;
        var rStick = 1;
        var sweepDegrees = 45;
        var halfSweep = Math.PI * sweepDegrees/360;
        var sweep = new Sweep({ period, rStick, sweepDegrees});

        var t = 0; // forward
        should(sweep.position(t).xyDegrees).approximately(0,eps);
        should(sweep.position(t).x).approximately(0,eps);
        should(sweep.position(t).y).approximately(rStick,eps);
        should(sweep.position(t).t).approximately(t,eps);

        var t = 0.25; // right 45 degrees
        should(sweep.position(t).xyDegrees)
            .approximately(sweepDegrees/2,eps);
        should(sweep.position(t).x)
            .approximately(rStick*Math.sin(halfSweep), eps);
        should(sweep.position(t).y)
            .approximately(rStick*Math.cos(halfSweep),eps);
        should(sweep.position(t).t).approximately(t,eps);

        var t = 0.5; // forward
        should(sweep.position(t).xyDegrees).approximately(0,eps);
        should(sweep.position(t).x).approximately(0,eps);
        should(sweep.position(t).y).approximately(rStick,eps);
        should(sweep.position(t).t).approximately(t,eps);

        var t = 0.75; // left 45 degrees
        should(sweep.position(t).xyDegrees)
            .approximately(-sweepDegrees/2,eps);
        should(sweep.position(t).x)
            .approximately(-rStick*Math.sin(halfSweep), eps);
        should(sweep.position(t).y)
            .approximately(rStick*Math.cos(halfSweep),eps);
        should(sweep.position(t).t).approximately(t,eps);

    });
});
