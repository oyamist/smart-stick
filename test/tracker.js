(typeof describe === 'function') && describe("tracker", function() {
    const should = require("should");
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Sweep,
        Tracker,
    } = require('../index');
    var logLevel = false;
    var eps = 0.00001;
    this.timeout(10*1000);

    it("default ctor", ()=>{
        var tracker = new Tracker();
        should(tracker).properties({
            logLevel: 'info',
        });

    });
    it("custom ctor", ()=>{
        var logLevel = 'info';
        var sweep = new Sweep({
            logLevel,
        });
        should(sweep).properties({
            logLevel,
        });
    });
    it("xIntercept3(pts) => x-intercept of parabola", ()=>{
        var tracker = new Tracker();
        var a = -1;
        var b = 2;
        var c = 3;
        var parabola = x => a*x*x + b*x + c;
        var dx = 1; // x-values must be evenly spaced
        var x0 = -0.5;
        var pts = [x0-dx, x0, x0+dx].map(x => ({
            x,
            y: parabola(x),
        }));
        var x = tracker.xIntercept3(pts);
        should(parabola(x)).equal(0);
        should(x).equal(-1);
    })
    it("TESTTESTanalyze(...) => phaseDelay, period", ()=>{
        var tracker = new Tracker();
        var period = 3; // the longest trackable period
        var size = 100;
        var phaseDelay = 1.35;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
        console.log(`dbg analyze`,js.s({sweep}));
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                signal[i] = sweep.acceleration(i/sampleRate).aTip[0];
            }
            return signal;
        };
        var sampleInterval = .032;
        var sampleRate = 1/sampleInterval;
        var t = sampleInterval*Math.random();
        var tracker = new Tracker({logLevel});
        var signal = sample(sampleRate);
        var res = tracker.analyze(signal, sampleRate);
        should(res.period).approximately(period,eps);
        should(res.phaseDelay).approximately(phaseDelay,0.0001);
        should(res.sampleInterval).approximately(sampleInterval,eps);
        should(res.sampleTime)
            .approximately(signal.length*sampleInterval,eps);
        console.log(`dbg res`, res);
    })
});
