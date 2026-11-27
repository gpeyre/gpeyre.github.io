/* Standardized sums used by the central-limit experiment.
 * Histogram heights are probability / bin width, not fitted to a Gaussian.
 * The uniform input remains continuous throughout the calculation.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CLTDistribution = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  function count(n) {
    if (!Number.isSafeInteger(n) || n < 1 || n > 4096) {
      throw new RangeError("n must be an integer from 1 to 4096");
    }
  }
  const normalPdf = x => Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);

  // CDF of U_1+...+U_n for independent U_i uniform on [0,1].
  // On 0<t<m, F_m(t)=(t/m)F_{m-1}(t)+(1-t/m)F_{m-1}(t-1).
  // Together with the exact support values, these are convex combinations:
  // no cancellation of large alternating powers occurs even when n is large.
  function irwinHallLower(n, t) {
    if (t <= 0) return 0;
    if (t >= n) return 1;
    if (n === 1) return t;
    const length = Math.floor(t)+2;
    let previous = new Float64Array(length);
    let next = new Float64Array(length);
    for (let j=0;j<length;j++) previous[j]=Math.min(1,Math.max(0,t-j));
    for (let m=2;m<=n;m++) {
      for (let j=0;j<length;j++) {
        const z=t-j;
        next[j]=z<=0 ? 0 : z>=m ? 1 :
          (z/m)*previous[j]+(1-z/m)*(previous[j+1] || 0);
      }
      const swap=previous;previous=next;next=swap;
    }
    return previous[0];
  }

  // CDF of n^(-1/2) sum X_i, X_i ~ Uniform[-sqrt(3),sqrt(3)].
  function uniformCdf(n, x) {
    count(n);
    if (Number.isNaN(x) || typeof x !== "number") throw new RangeError("x must be a number");
    if (x === 0) return .5;
    const t=n/2-Math.abs(x)*Math.sqrt(n/12);
    const lower=irwinHallLower(n,t);
    return x<0 ? lower : 1-lower;
  }

  function bernoulli(n) {
    count(n);
    // Recurrence away from the mode avoids underflow of 2^(-n).
    const mode=Math.floor(n/2),weights=new Float64Array(n+1);
    weights[mode]=1;
    for(let k=mode;k>0;k--) weights[k-1]=weights[k]*k/(n-k+1);
    for(let k=mode;k<n;k++) weights[k+1]=weights[k]*(n-k)/(k+1);
    let total=0;for(const value of weights)total+=value;
    const width=2/Math.sqrt(n);
    const bars=Array.from(weights,(value,k)=>{
      const center=(2*k-n)/Math.sqrt(n),mass=value/total;
      return {center,left:center-width/2,right:center+width/2,mass,height:mass/width};
    });
    return {n,width,bars,totalMass:1};
  }

  function uniform(n, edges) {
    count(n);
    if (!Array.isArray(edges) || edges.length<2 ||
        edges.some((x,i)=>!Number.isFinite(x) || (i>0 && x<=edges[i-1]))) {
      throw new RangeError("Bin edges must be a strictly increasing finite array");
    }
    const cdf=edges.map(x=>uniformCdf(n,x));
    // Reflect positive-tail intervals before differencing: do not subtract
    // two numbers close to one, even for very small visible tail bars.
    const lower=edges.map(x=>uniformCdf(n,-Math.abs(x)));
    const bars=edges.slice(0,-1).map((left,i)=>{
      const right=edges[i+1],width=right-left;
      const mass=Math.max(0,left>=0 ? lower[i]-lower[i+1] : cdf[i+1]-cdf[i]);
      return {center:(left+right)/2,left,right,mass,height:mass/width};
    });
    const leftTail=cdf[0],rightTail=uniformCdf(n,-edges[edges.length-1]);
    return {n,bars,totalMass:bars.reduce((sum,bar)=>sum+bar.mass,0),
      leftTail,rightTail,omittedMass:leftTail+rightTail};
  }

  return Object.freeze({normalPdf,uniformCdf,bernoulli,uniform});
});
