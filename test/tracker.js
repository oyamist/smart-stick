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

    function randGauss(min, max, skew=1) {
        var u = 0, v = 0;
        while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        let num = Math.sqrt( -2.0 * Math.log( u ) ) * 
            Math.cos( 2.0 * Math.PI * v );

        num = num / 10.0 + 0.5; // Translate to 0 -> 1
        if (num > 1 || num < 0) {
            // resample between 0 and 1 if out of range
            num = randGauss(min, max, skew); 
        }
        num = Math.pow(num, skew); // Skew
        num *= max - min; // Stretch to fill range
        num += min; // offset to min
        return num;
    }

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
    it("analyze(...) => phaseDelay, period", ()=>{
        var tracker = new Tracker();
        var period = 3; // the longest trackable period
        var sampleInterval = .032;
        var size = Math.ceil(period/sampleInterval)+1;
        var phaseDelay = period - 0.0001;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
        console.log(`dbg analyze`,js.s({sweep}));
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                signal[i] = sweep.acceleration(i/sampleRate).aTip[0];
            }
            return signal;
        };
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
    it("TESTTESTanalyze(...) => handles gaussian noise", ()=>{
        var tracker = new Tracker();
        var period = 3; // the longest trackable period
        var sampleInterval = .032;
        var size = Math.ceil(period/sampleInterval)+1;
        var phaseDelay = 0.6 * period;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
        console.log(`dbg analyze`,js.s({sweep}));
        var noisePeak = 0.6;
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                var noise = randGauss(-noisePeak, noisePeak);
                signal[i] = sweep.acceleration(i/sampleRate).aTip[0]
                    + noise;
                //console.log(`dbg noise`, noise);
            }
            return signal;
        };
        var sampleRate = 1/sampleInterval;
        var smoothing = 0.34;
        var ePeriod = 0;
        var ePhaseDelay = 0;
        var nTrials = 10000;
        for (var i = 0; i < nTrials; i++) {
            var t = sampleInterval*Math.random();
            var tracker = new Tracker({logLevel, smoothing});
            var signal = sample(sampleRate);
            var res = tracker.analyze(signal, sampleRate);
            ePeriod += Math.pow(period - res.period, 2);
            ePhaseDelay += Math.pow(phaseDelay - res.phaseDelay, 2);
        }
        ePeriod /= nTrials;
        ePhaseDelay /= nTrials;
        console.log(js.s({ePeriod, ePhaseDelay}));
        var eps = 0.1;
        should(ePeriod).below(0.1);
        should(ePhaseDelay).below(0.01);
        console.log(`dbg res`, res);
    })
});
