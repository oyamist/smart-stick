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
            sweepDegrees: 45,
            downDegrees: 0,
            downRadians: 0,
            logLevel: 'info',
        });

    });
    it("TESTTESTcustom ctor", ()=>{
        var period = 1.5;
        var rStick = 1.2;
        var sweepDegrees = 32;
        var downDegrees = 61;
        var sweep = new Sweep({
            logLevel,
            period,
            rStick,
            sweepDegrees,
            downDegrees,
        });
        should(sweep).properties({
            logLevel,
            period, // stick sweep period in seconds
            frequency: 2 * Math.PI / period,
            rStick, // stick length in meters
            sweepDegrees,
            sweepRadians: Math.PI * sweepDegrees / 180,
            downDegrees,
            downRadians: Math.PI * downDegrees / 180,
        });
    });
    it("TESTTESTposition(t) => walker-relative tip position ", ()=>{
        var period = 1;
        var rStick = 1;
        var sweepDegrees = 45;
        var halfSweep = Math.PI * sweepDegrees/360;
        var sweep = new Sweep({ logLevel, period, rStick, sweepDegrees});

        var t = 0; // forward
        var pos = sweep.position(t);
        should(pos.xyDegrees).approximately(0,eps);
        should(pos.x).approximately(0,eps);
        should(pos.y).approximately(rStick,eps);
        should(pos.t).approximately(t,eps);
        should(pos.w).approximately(0,eps);

        var t = 0.25; // left 45 degrees
        var pos = sweep.position(t);
        should(pos.xyDegrees).approximately(sweepDegrees/2,eps);
        should(pos.x).approximately(-rStick*Math.sin(halfSweep), eps);
        should(pos.y).approximately(rStick*Math.cos(halfSweep),eps);
        should(pos.t).approximately(t,eps);
        should(pos.w).approximately(Math.PI*sweepDegrees/360,eps);

        var t = 0.5; // forward
        var pos = sweep.position(t);
        should(pos.xyDegrees).approximately(0,eps);
        should(pos.x).approximately(0,eps);
        should(pos.y).approximately(rStick,eps);
        should(pos.t).approximately(t,eps);
        should(pos.w).approximately(0,eps);

        var t = 0.75; // right 45 degrees
        var pos = sweep.position(t);
        should(pos.xyDegrees).approximately(-sweepDegrees/2,eps);
        should(pos.x).approximately(rStick*Math.sin(halfSweep), eps);
        should(pos.y).approximately(rStick*Math.cos(halfSweep),eps);
        should(pos.t).approximately(t,eps);
        should(pos.w).approximately(-Math.PI*sweepDegrees/360,eps);

    });
    it("TESTTESTacceleration(t) => tip-relative acceleration ", ()=>{
        var period = 1;
        var rStick = 1;
        var sweepDegrees = 45;
        var halfSweep = Math.PI * sweepDegrees/360;
        var sweep = new Sweep({ period, rStick, sweepDegrees});

        var t = 0; // forward
        var a = sweep.acceleration(t);
        should(a.xyDegrees).approximately(0,eps);
        should(a.ddx).approximately(0, eps);
        should(a.ddy).approximately(-6.088067,eps);
        should(a.t).approximately(t,eps); // forward
        should(a.aTip[0]).approximately(0, eps);
        should(a.aTip[1]).approximately(-6.08806, eps);
        should(a.aTip[2]).approximately(0, eps);

        var t = 0.25; // right
        var a = sweep.acceleration(t);
        should(a.xyDegrees).approximately(22.5,eps);
        should(a.ddx).approximately(14.32303, eps);
        should(a.ddy).approximately(5.932793,eps);
        should(a.t).approximately(t,eps);
        should(a.aTip[0]).approximately(15.50313, eps);
        should(a.aTip[1]).approximately(0, eps);
        should(a.aTip[2]).approximately(0, eps);

        var t = 0.5; // forward
        var a = sweep.acceleration(t);
        should(a.xyDegrees).approximately(0,eps);
        should(a.ddx).approximately(0, eps);
        should(a.ddy).approximately(-6.088067,eps);
        should(a.t).approximately(t,eps); // forward
        should(a.aTip[0]).approximately(0, eps);
        should(a.aTip[1]).approximately(-6.08806, eps);
        should(a.aTip[2]).approximately(0, eps);

        var t = 0.75; // left
        var a = sweep.acceleration(t);
        should(a.xyDegrees).approximately(-22.5,eps);
        should(a.ddx).approximately(-14.32303, eps);
        should(a.ddy).approximately(5.932793,eps);
        should(a.t).approximately(t,eps);
        should(a.aTip[0]).approximately(-15.50313, eps);
        should(a.aTip[1]).approximately(0, eps);
        should(a.aTip[2]).approximately(0, eps);
    });
    it("TESTTESTtransformTip(...) => tip-relative coordiates ", ()=>{
        var downDegrees = 30;
        var sweep = new Sweep({logLevel, downDegrees});

        // forward, down
        var tipxyz = sweep.transformTip([1,0,0],0);
        should(tipxyz[0]).approximately(1, eps);
        should(tipxyz[1]).approximately(0, eps);
        should(tipxyz[2]).approximately(0, eps);
        var tipxyz = sweep.transformTip([0,1,0],0);
        should(tipxyz[0]).approximately(0, eps);
        should(tipxyz[1]).approximately(0.866025, eps);
        should(tipxyz[2]).approximately(0.5, eps);
        var tipxyz = sweep.transformTip([0,0,1],0);
        should(tipxyz[0]).approximately(0, eps);
        should(tipxyz[1]).approximately(-0.5, eps);
        should(tipxyz[2]).approximately(0.866025, eps);

        // horizontal, left
        sweep.downDegrees = 0;
        var w = Math.PI*30/180;
        var tipxyz = sweep.transformTip([1,0,0],w);
        should(tipxyz[0]).approximately(0.866025, eps);
        should(tipxyz[1]).approximately(-0.5, eps);
        should(tipxyz[2]).approximately(0, eps);
        var tipxyz = sweep.transformTip([0,1,0],w);
        should(tipxyz[0]).approximately(0.5, eps);
        should(tipxyz[1]).approximately(0.866025, eps);
        should(tipxyz[2]).approximately(0, eps);
        var tipxyz = sweep.transformTip([0,0,1],w);
        should(tipxyz[0]).approximately(0, eps);
        should(tipxyz[1]).approximately(0, eps);
        should(tipxyz[2]).approximately(1, eps);

        // forward down, right
        sweep.downDegrees = 30;
        var w = -Math.PI*90/180;
        var tipxyz = sweep.transformTip([1,0,0],w);
        should(tipxyz[0]).approximately(0, eps);
        should(tipxyz[1]).approximately(0.866025, eps);
        should(tipxyz[2]).approximately(0.5, eps);
        var tipxyz = sweep.transformTip([0,1,0],w);
        should(tipxyz[0]).approximately(-1, eps);
        should(tipxyz[1]).approximately(0, eps);
        should(tipxyz[2]).approximately(0, eps);
        var tipxyz = sweep.transformTip([0,0,1],w);
        should(tipxyz[0]).approximately(0, eps);
        should(tipxyz[1]).approximately(-0.5, eps);
        should(tipxyz[2]).approximately(0.866025, eps);
    });

});
