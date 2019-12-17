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

    // BMA250 handles 10-bits 2's complement, so we simulate a
    // weak signal
    var digMax = 250; 

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

    function digitize(waveform, digMax) {
        var { max, min } = waveform.reduce((a,v) => {
            v < a.min && (a.min = v);
            v > a.max && (a.max = v);
            return a;
        }, {min:waveform[0], max:waveform[0]});
        var range = max - min;
        var scale = 2*digMax/ range;
        scale = 1;

        var signal =  waveform.map(v => v*scale);
        return signal;
    }

    it("default ctor", ()=>{
        var tracker = new Tracker();
        var sampleRate = 1/0.32;
        var smoothing = 0.66; 
        var smoothingDelay = 2/sampleRate; 
        should(tracker).properties({
            logLevel: 'info',
            sampleRate,
            smoothing,
            smoothingDelay,
        });

    });
    it("custom ctor", ()=>{
        var logLevel = 'info';
        var sampleRate = 1/0.16;
        var smoothingDelay = 1;
        var sweep = new Tracker({
            logLevel,
            sampleRate,
            smoothingDelay,
        });
        should(sweep).properties({
            logLevel,
            sampleRate,
            smoothingDelay,
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

        // handle linear, for which quadratic eqn has zero denominator
        var pts = [{x:0, y:21}, {x:0.032, y:4}, {x:0.064, y:-13} ];
        var x = tracker.xIntercept3(pts);
        should(x).equal(0.03952941176470588); // linear
    })
    it("analyze(...) => phaseDelay, period", ()=>{
        var tracker = new Tracker();
        var period = 3.2;
        var sweepDegrees = 45;
        var sampleInterval = .032;
        var size = 2*Math.ceil(period/sampleInterval);
        var phaseDelay = 2.4;
        var sweep = new Sweep({ 
            logLevel, 
            period, 
            phaseDelay, 
            sweepDegrees,
        });
        //console.log(`dbg analyze`,js.s({sweep}));
        var heading;
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                var t = i/sampleRate;
                signal[i] = sweep.acceleration(t).aTip[0];
                heading = sweep.position(t).heading;
            }
            return signal;
        };
        var sampleRate = 1/sampleInterval;
        var smoothing = 0;
        var tracker = new Tracker({logLevel, sampleRate, smoothing});
        var signal = sample(sampleRate);
        //console.log(signal.slice(size-20));
        var res = tracker.analyze(signal);
        var iSample = (period/sampleInterval)*(heading / 360)
        //console.log(`dbg res `, {res, heading, iSample});
        //console.log(`dbg samples per period`, period/sampleInterval);
        should(res.period).approximately(period,eps);
        should(res.phaseDelay).approximately(phaseDelay,0.05);
        should(res.sampleInterval).approximately(sampleInterval,eps);
        should(res.sampleTime)
            .approximately(signal.length*sampleInterval,eps);
        var unitHeading = {
            0: 0,
            0.8: -1,
            1.6: 0,
            2.4: 1,
        }[phaseDelay];
        should(res.unitHeading).approximately(unitHeading,0.0001);
    })
    it("analyze(...) => handles gaussian noise", ()=>{
        var tracker = new Tracker();
        var period = 3; // the longest trackable period
        var sampleInterval = .032;
        var size = Math.ceil(period/sampleInterval)+15;
        var phaseDelay = 0.6 * period;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
        //console.log(`dbg analyze`,js.s({sweep}));
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
        var ePeriod = 0;
        var ePhaseDelay = 0;
        var nTrials = 10000;
        for (var i = 0; i < nTrials; i++) {
            var t = sampleInterval*Math.random();
            var tracker = new Tracker({
                logLevel, 
                sampleRate,
            });
            var signal = sample(sampleRate);
            var res = tracker.analyze(signal);
            ePeriod += Math.pow(period - res.period, 2);
            ePhaseDelay += Math.pow(phaseDelay - res.phaseDelay, 2);
        }
        ePeriod /= nTrials;
        ePhaseDelay /= nTrials;
        //console.log(js.s({ePeriod, ePhaseDelay}));
        var eps = 0.1;
        should(ePeriod).below(0.1);
        should(ePhaseDelay).below(0.01);
        //console.log(`dbg res`, res);
    })
    it("analyze(...) => handles digitized waveform", ()=>{
        var tracker = new Tracker();
        var period = 3; // the longest trackable period
        var sampleInterval = .032;
        var size = Math.ceil(period/sampleInterval)+10;
        var phaseDelay = 0.5 * period;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
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
        var ePeriod = 0;
        var ePhaseDelay = 0;
        var nTrials = 10000;
        for (var i = 0; i < nTrials; i++) {
            var t = sampleInterval*Math.random();
            var tracker = new Tracker({
                logLevel, 
                sampleRate,
            });
            var signal = digitize(sample(sampleRate), digMax);
            var res = tracker.analyze(signal);
            ePeriod += Math.pow(period - res.period, 2);
            if (ePeriod === Infinity) {
                //console.log(`dbg res`, res);
                break;
            }
            ePhaseDelay += Math.pow(phaseDelay - res.phaseDelay, 2);
        }
        ePeriod /= nTrials;
        ePhaseDelay /= nTrials;
        //console.log(`dbg res`, res);
        should(ePeriod).below(0.05);
        should(ePhaseDelay).below(0.02);
    })
    it("analyze(...) => handles long periods", ()=>{
        var tracker = new Tracker();
        var period = 6; 
        var sampleInterval = .032;
        var maxPeriod = 3;
        var size = Math.ceil(maxPeriod/sampleInterval);
        var phaseDelay = 0.5 * period;
        var sweep = new Sweep({ logLevel, period, phaseDelay, });
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
        var t = sampleInterval*Math.random();
        var tracker = new Tracker({
            logLevel, 
            sampleRate,
        });
        var signal = digitize(sample(sampleRate), digMax);
        var res = tracker.analyze(signal);
        should(res.period).equal(tracker.minPeriod);
        should(res.phaseDelay).equal(0);
    })
    it("TESTTESTquarter long then short signal", ()=>{
        var sampleInterval = .032;
        var sampleRate = 1/sampleInterval;
        var longPeriod = 2;
        var shortPeriod = 0.5;
        var nPeriods = 10;
        var tTotal = nPeriods*(longPeriod+shortPeriod);
        var size = Math.ceil(tTotal/sampleInterval);

        var rawSignal = new Float32Array(size);
        var signalMax = 0;
        var signalMin = 0;
        var sizeLong = Math.round(longPeriod*nPeriods*sampleRate);
        var longSweep = new Sweep({ logLevel, period:longPeriod, });
        var kLong = 2;
        for (var i = 0; i < sizeLong; i++) {
            rawSignal[i] = kLong*longSweep.acceleration(i/sampleRate).aTip[0];
        }
        var shortSweep = new Sweep({ logLevel, period:shortPeriod, });
        var kShort = 1;
        for (var i = sizeLong; i < size; i++) {
            rawSignal[i] = kShort*shortSweep.acceleration(i/sampleRate).aTip[0];
        }

        var signal = digitize(rawSignal, 100);
        var noisePeak = 10;
        for (var i = 0; i < size; i++) {
            signal[i] += Math.round(randGauss(-noisePeak, noisePeak));
            signal[i] += (i < sizeLong ? -50 : 50);
        }

        var windowPeriod = 1;
        var windowSize = Math.ceil(0.5*windowPeriod*sampleRate)*2;
        var window = new Array(windowSize).fill(signal[0]);
        var endFrac = 0.125;
        var a = signal.reduce((a,y,iSig) => {
            var rank = window.reduce((a,yi) => yi<=y?a+1:a, 0)/window.length;
            window.shift();
            window.push(y);
            if (rank <= endFrac) {
                a.low++;
            } else if (rank <= 1/2) {
                a.lowMed++;
            } else if (rank <= (1-endFrac)) {
                a.highMed++;
            } else {
                a.high++;
            }
            //(iSig === sizeLong) && console.log('dbg ---');
            //(0===iSig%10) && console.log(`dbg window`, js.s(a),y,rank);
            return a;
        },{
            lowMed:0,
            highMed:0,
            high:0,
            low:0,
        });
        var tolerance = signal.length*.04; 
        should(a.low).approximately(signal.length/4, tolerance);
        should(a.high).approximately(signal.length/4, tolerance);
        should(a.lowMed).approximately(signal.length/4, tolerance);
        should(a.highMed).approximately(signal.length/4, tolerance);
    })
});
