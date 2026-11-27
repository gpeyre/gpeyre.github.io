/* Unbiased positive and random-phase Fourier features for exp(-|x-y|^p).
 * Positive features are the construction in the accompanying article.
 * The stable scale uses Kanter's formula (Devroye & James, 2014, Section 1).
 * Both sketches use r scalar features and the same fixed random prefixes.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.KernelSketches = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const domain = Object.freeze([-2, 2]);
  const colorRange = Object.freeze([-2, 2]);
  const pRange = Object.freeze([.5, 2]);
  const levels = Object.freeze([-1, -.5, -.25, 0, .25, .5, .75, 1, 1.5]);

  function exponent(p) {
    if (!Number.isFinite(p) || p < pRange[0] || p > pRange[1]) {
      throw new RangeError("The numerical exponent must be between 0.5 and 2");
    }
    return p;
  }
  function sampleCount(r, maximum = 1048576) {
    if (!Number.isSafeInteger(r) || r < 1 || r > maximum) {
      throw new RangeError("Invalid number of random features");
    }
  }
  function random(seed) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 4294967295) {
      throw new RangeError("The seed must be an unsigned 32-bit integer");
    }
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      // Open endpoints are needed for logarithms and the stable-law sampler.
      return (((t ^ (t >>> 14)) >>> 0) + .5) / 4294967296;
    };
  }

  // If U is uniform on (0,pi) and E is Exp(1), this has
  // E exp(-t Lambda) = exp(-t^a). Work with log Lambda to avoid
  // overflowing the heavy-tailed scale. At a=1 the scale is exactly one.
  function stableLogScale(a, u, e) {
    if (!(a > 0 && a <= 1) || !Number.isFinite(a) ||
        !(u > 0 && u < Math.PI) || !(e > 0) || !Number.isFinite(e)) {
      throw new RangeError("Invalid positive-stable sampling parameters");
    }
    if (a === 1) return 0;
    return Math.log(Math.sin(a*u)) - Math.log(Math.sin(u))/a +
      ((1-a)/a)*(Math.log(Math.sin((1-a)*u)) - Math.log(e));
  }

  function createSamples(p, r, seed = 42) {
    exponent(p); sampleCount(r);
    const next = random(seed), a = p/2;
    const draws = Array.from({length: r}, () => {
      // Consume all five uniforms also at p=2, preserving the coupling
      // between slider positions and every prefix of the feature sequence.
      const u = Math.PI*next(), e = -Math.log(next());
      const z = Math.sqrt(-2*Math.log(next()))*Math.cos(2*Math.PI*next());
      const phase = 2*Math.PI*next();
      return {logLambda: stableLogScale(a,u,e), z, phase};
    });
    return {p,r,seed,draws};
  }

  function positiveFeature(x, draw) {
    if (!Number.isFinite(x)) throw new RangeError("A feature coordinate must be finite");
    if (x === 0) return 1;
    const t = Math.SQRT2*Math.exp(draw.logLambda/2)*x;
    if (!Number.isFinite(t)) return 0; // exact limiting underflow of exp(-t^2+zt)
    // Completing the square gives an upper bound exp(z^2/4), even at huge
    // scales. No scale, feature, or kernel value is clipped to the palette.
    const shifted = t-draw.z/2;
    return Math.exp(draw.z*draw.z/4-shifted*shifted);
  }
  function fourierFeature(x, draw) {
    if (!Number.isFinite(x)) throw new RangeError("A feature coordinate must be finite");
    const argument = Math.SQRT2*Math.exp(draw.logLambda/2)*draw.z*x+draw.phase;
    if (!Number.isFinite(argument)) throw new RangeError("Fourier phase exceeds floating-point range");
    return Math.SQRT2*Math.cos(argument);
  }
  const kernel = (x,y,p) => Math.exp(-(Math.abs(x-y)**p));

  function evaluatePair(x, y, samples) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError("Kernel coordinates must be finite");
    let positive = 0, fourier = 0;
    for (const draw of samples.draws) {
      positive += positiveFeature(x,draw)*positiveFeature(y,draw);
      fourier += fourierFeature(x,draw)*fourierFeature(y,draw);
    }
    return {exact:kernel(x,y,samples.p),positive:positive/samples.r,fourier:fourier/samples.r};
  }

  function statistics(values, reference) {
    let min=Infinity,max=-Infinity,error=0,negative=0,saturated=0;
    for (let i=0;i<values.length;i++) {
      const value=values[i];
      if (!Number.isFinite(value)) throw new RangeError("A sampled kernel value is not finite");
      min=Math.min(min,value);max=Math.max(max,value);
      error+=(value-reference[i])**2;
      if(value<0)negative++;
      if(value<colorRange[0] || value>colorRange[1])saturated++;
    }
    return {min,max,rmse:Math.sqrt(error/values.length),
      negativeFraction:negative/values.length,saturatedFraction:saturated/values.length};
  }

  function compute(p,r,options={}) {
    exponent(p);sampleCount(r,4096);
    const size=options.size === undefined ? 129 : options.size;
    const seed=options.seed === undefined ? 42 : options.seed;
    if(!Number.isSafeInteger(size) || size<3 || size>257)throw new RangeError("Grid size must be between 3 and 257");
    const samples=createSamples(p,r,seed);
    const xs=Float64Array.from({length:size},(_,i)=>domain[0]+(domain[1]-domain[0])*i/(size-1));
    const exact=new Float64Array(size*size),positive=new Float64Array(size*size),fourier=new Float64Array(size*size);
    const pos=new Float64Array(size),four=new Float64Array(size);
    for(const draw of samples.draws) {
      for(let j=0;j<size;j++){pos[j]=positiveFeature(xs[j],draw);four[j]=fourierFeature(xs[j],draw);}
      // Accumulate one triangle and reflect exactly, so both plots remain
      // symmetric even when individual positive terms have high variance.
      for(let row=0;row<size;row++){
        const base=row*size,a=pos[row],b=four[row];
        for(let col=0;col<=row;col++){
          const index=base+col;
          positive[index]+=a*pos[col];fourier[index]+=b*four[col];
        }
      }
    }
    for(let row=0;row<size;row++)for(let col=0;col<=row;col++){
      const index=row*size+col,transpose=col*size+row;
      exact[index]=exact[transpose]=kernel(xs[col],xs[row],p);
      positive[index]/=r;fourier[index]/=r;
      positive[transpose]=positive[index];fourier[transpose]=fourier[index];
    }
    return {p,r,size,seed,xs,exact,positive,fourier,stats:{
      exact:statistics(exact,exact),positive:statistics(positive,exact),fourier:statistics(fourier,exact)}};
  }
  return Object.freeze({domain,colorRange,pRange,levels,createSamples,stableLogScale,
    positiveFeature,fourierFeature,evaluatePair,compute});
});
