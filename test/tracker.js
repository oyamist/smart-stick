(typeof describe === 'function') && describe("tracker", function() {
    const should = require("should");
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Sweep,
        Tracker,
    } = require('../index');
    const {
        Factory,
        Network,
        Example,
        Variable,
    } = require('oya-ann');
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
    it("frequency(signal) => fundamental Hz", ()=>{
        var tracker = new Tracker();
        var actualT = 1.4;
        var fActual = (1/actualT); // 0.7142857
        var size = 32; // power of two
        var sweep = new Sweep({
            logLevel,
            frequency: fActual,
        });
        console.log(js.s(sweep));
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                signal[i] = sweep.acceleration(i/sampleRate).aTip[0];
            }
            return signal;
        };
       
        var errSqr = 0;
        var n = 0;
        for (var rate=2; rate<6; rate += 0.2) {
            var signal = sample(rate);
            var fSample = tracker.frequency(signal, rate);
            var dT = 1/fSample - actualT;
            errSqr += dT * dT;
            n++;
        }
        var rmse = Math.sqrt(errSqr/n);
        console.log(`period RMSE:`, rmse);

        // 32 samples over 10 seconds yields a time estimate good to
        // 0.1 second
        should(rmse).below(0.09);
    });
    it("phase(signal) => zero crossings", ()=>{
        var tracker = new Tracker();
        var period = 1.8;
        var frequency = (1/period); 
        var size = 96;
        var phaseDelay = 0.35;
        var sweep = new Sweep({ logLevel, frequency, phaseDelay, });
        console.log(`dbg phase`,js.s({sweep}));
        var sample = (sampleRate) => {
            var signal = new Float32Array(size);
            for (var i = 0; i < size; i++) {
                signal[i] = sweep.acceleration(i/sampleRate).aTip[0];
            }
            return signal;
        };
       
        var errSqr = 0;
        var n = 0;
        var rate = 1/0.064; // BOSCH BMA250 accelerometer 64ms
        var rate = 1/0.032; // BOSCH BMA250 accelerometer 32ms
        var signal = sample(rate);
        var fSample = tracker.phase(signal, rate);
        console.log(`dbg fSample`, js.s({fSample, rate}));
        should(fSample.phaseDelay).approximately(phaseDelay, 0.030);
        should(fSample.period3).approximately(period, period*0.05);
        should(fSample.period).approximately(period, period*0.07);
        should(fSample.duration).approximately(3.1, 0.03);
    });
    it("TESTTESTOyaAnn can estimate zero-crossing", done=>{
        // OyaAnn works wonderfully but...
        // ...it's a lot of code to cram onto Arduino
        var period = 1.8;
        var frequency = 1/period;
        var signal = t=>Math.sin(2*Math.PI*t);
        var dt = .032;
        var nExamples = 100;
        var examples = [];
        for (var i = 0; i < nExamples; i++) {
            var t = dt*Math.random();
            var input = [
                signal(t-2*dt),
                signal(t-dt),
                signal(t),
            ];
            var target = [ -t/dt ];
            var example = new Example(input, target);
            examples.push(example);
        }

        var v = Variable.variables(examples);
        var targetCost = .0000001; 
        var factory = new Factory(v, {
            power: 2,
            targetCost,
            preTrain: true,
            //trainingReps: 50, 
        });

        for (var trials = 0; trials < 50; trials++) {
            var network = factory.createNetwork();
            var resTrain = network.train(examples);

            var oanScore = 0;
            var maxErr = 0;
            var maxErrlin = 0;
            for (var i = 0; i < examples.length; i++) {
                var ex = examples[i];
                var resAct = network.activate(ex.input);
                var err = resAct[0] - ex.target[0];

                var lin= ex.input[1] / (ex.input[1]-ex.input[2]) - 1;
                var target = ex.target[0];
                var errlin = lin - target;
                maxErr = Math.max(maxErr, Math.abs(err));
                maxErrlin = Math.max(maxErrlin, Math.abs(errlin));
                if (Math.abs(err) <= Math.abs(errlin)) {
                    oanScore++;
                } else {
                    //console.log(js.s({target, lin, err, errlin}));
                }
            };
            oanScore = oanScore/examples.length;
            if (oanScore > 0.91 && maxErr < .0004) { break; }
        }
        should(oanScore).above(0.91);
        should(maxErr).below(0.0004);
        console.log(js.s({oanScore, maxErr, maxErrlin}));

        done();
        return;
    })
});
