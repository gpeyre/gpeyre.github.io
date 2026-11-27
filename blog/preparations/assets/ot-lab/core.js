/* Numerical core shared by the offline laboratory and its independent tests. */
(function (root) {
  "use strict";
  const sum = a => a.reduce((s, x) => s + x, 0);
  const dot = (a, b) => sum(a.map((v, i) => v * b[i]));
  const zeros = (n, m) => Array.from({length:n}, () => Array(m).fill(0));
  const dist2 = (x, y) => sum(x.map((v, k) => (v-y[k])**2));
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function gaussian(random) {
    return Math.sqrt(-2*Math.log(Math.max(1e-15,random())))*Math.cos(2*Math.PI*random());
  }

  // Successive shortest augmenting paths. Row shifts make initial costs
  // nonnegative; reduced-cost potentials keep every later Dijkstra valid.
  function transport(cost, a, b) {
    const n=a.length, m=b.length, N=n+m+2, source=N-2, sink=N-1;
    if (Math.abs(sum(a)-sum(b)) > 1e-10) throw Error("Unequal transport masses");
    const adj=Array.from({length:N},()=>[]), refs=zeros(n,m);
    function edge(u,v,cap,c) {
      const f={to:v, rev:adj[v].length, cap, cost:c};
      const r={to:u, rev:adj[u].length, cap:0, cost:-c};
      adj[u].push(f); adj[v].push(r); return f;
    }
    a.forEach((v,i)=>edge(source,i,v,0));
    b.forEach((v,j)=>edge(n+j,sink,v,0));
    for(let i=0;i<n;i++) {
      const shift=Math.min(...cost[i]);
      for(let j=0;j<m;j++) refs[i][j]=edge(i,n+j,Math.max(sum(a),1),cost[i][j]-shift);
    }
    const pot=Array(N).fill(0); let sent=0, it=0;
    while(sent < sum(a)-2e-12) {
      if(++it > 10000) throw Error("Transport path budget exceeded");
      const d=Array(N).fill(Infinity), used=Array(N).fill(false), prev=Array(N);
      d[source]=0;
      for(let z=0;z<N;z++) {
        let u=-1;
        for(let v=0;v<N;v++) if(!used[v] && (u<0 || d[v]<d[u])) u=v;
        if(u<0 || !Number.isFinite(d[u])) break;
        used[u]=true;
        for(let k=0;k<adj[u].length;k++) {
          const e=adj[u][k]; if(e.cap<1e-13 || used[e.to]) continue;
          const nd=d[u]+Math.max(0,e.cost+pot[u]-pot[e.to]);
          if(nd < d[e.to]-1e-13) {d[e.to]=nd;prev[e.to]=[u,k];}
        }
      }
      if(!prev[sink]) throw Error("No feasible residual path");
      for(let v=0;v<N;v++) if(Number.isFinite(d[v])) pot[v]+=d[v];
      let flow=sum(a)-sent;
      for(let v=sink;v!==source;) {const [u,k]=prev[v];flow=Math.min(flow,adj[u][k].cap);v=u;}
      for(let v=sink;v!==source;) {const [u,k]=prev[v],e=adj[u][k]; e.cap-=flow;adj[v][e.rev].cap+=flow;v=u;}
      sent+=flow;
    }
    const p=zeros(n,m);
    for(let i=0;i<n;i++) for(let j=0;j<m;j++) {
      const e=refs[i][j];p[i][j]=adj[e.to][e.rev].cap;
    }
    return p;
  }
  function bary(p,y,a) {
    return p.map((row,i)=>y[0].map((_,k)=>sum(row.map((v,j)=>v*y[j][k]))/a[i]));
  }
  function objective(p,x,y,a) {return sum(bary(p,y,a).map((z,i)=>a[i]*dist2(z,x[i])));}
  function feasibility(p,a,b) {
    let r=0;
    for(let i=0;i<a.length;i++) r=Math.max(r,Math.abs(sum(p[i])-a[i]));
    for(let j=0;j<b.length;j++) r=Math.max(r,Math.abs(sum(p.map(row=>row[j]))-b[j]));
    return Math.max(r,-Math.min(...p.flat()),0);
  }
  function weakStep(p,x,y,a,b) {
    const z=bary(p,y,a);
    const c=z.map((zi,i)=>y.map(yj=>2*dot(zi.map((v,k)=>v-x[i][k]),yj)));
    const s=transport(c,a,b);
    const gap=sum(p.map((row,i)=>sum(row.map((v,j)=>c[i][j]*(v-s[i][j])))));
    const w=bary(s,y,a).map((v,i)=>v.map((t,k)=>t-z[i][k]));
    const numerator=-sum(w.map((v,i)=>a[i]*dot(z[i].map((t,k)=>t-x[i][k]),v)));
    const denominator=sum(w.map((v,i)=>a[i]*dot(v,v)));
    const gamma=denominator>1e-25 ? Math.max(0,Math.min(1,numerator/denominator)) : 0;
    return {p:p.map((row,i)=>row.map((v,j)=>v+gamma*(s[i][j]-v))),gap,gamma};
  }
  function weakCertificate(p,x,y,a,b) {
    const z=bary(p,y,a), c=z.map((zi,i)=>y.map(yj=>2*dot(zi.map((v,k)=>v-x[i][k]),yj)));
    const s=transport(c,a,b);
    return Math.max(0,sum(p.map((row,i)=>sum(row.map((v,j)=>c[i][j]*(v-s[i][j]))))));
  }
  function weakAwayStep(state,x,y,a,b) {
    const p=state.p,z=bary(p,y,a);
    const c=z.map((zi,i)=>y.map(yj=>2*dot(zi.map((v,k)=>v-x[i][k]),yj)));
    const value=q=>sum(q.map((row,i)=>dot(row,c[i])));
    const s=transport(c,a,b), vp=value(p), vs=value(s), gap=vp-vs;
    let away=0, va=-Infinity;
    state.atoms.forEach((v,i)=>{const f=value(v);if(f>va){va=f;away=i;}});
    const useAway=va-vp>gap && state.weights[away]<1-1e-13;
    const direction=p.map((row,i)=>row.map((v,j)=>useAway?v-state.atoms[away][i][j]:s[i][j]-v));
    const dz=direction.map((row,i)=>y[0].map((_,k)=>sum(row.map((v,j)=>v*y[j][k]))/a[i]));
    const den=sum(dz.map((v,i)=>a[i]*dot(v,v)));
    const max=useAway?state.weights[away]/(1-state.weights[away]):1;
    const gamma=den>1e-25?Math.max(0,Math.min(max,-value(direction)/(2*den))):0;
    state.p=p.map((row,i)=>row.map((v,j)=>v+gamma*direction[i][j]));
    state.weights=state.weights.map(w=>w*(useAway?1+gamma:1-gamma));
    if(useAway)state.weights[away]-=gamma;
    else {state.atoms.push(s);state.weights.push(gamma);}
    const keep=state.weights.map((w,i)=>({w,i})).filter(v=>v.w>1e-13);
    state.atoms=keep.map(v=>state.atoms[v.i]);state.weights=keep.map(v=>v.w);
    return {p:state.p,gap,gamma};
  }
  function cross(a,b,c) {return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
  function crossing(x,y,p) {
    for(let i=0;i<x.length;i++) for(let j=0;j<i;j++) {
      const a=x[i],b=y[p[i]],c=x[j],d=y[p[j]];
      if(cross(a,b,c)*cross(a,b,d)<-1e-12 && cross(c,d,a)*cross(c,d,b)<-1e-12) return true;
    }return false;
  }
  function catalan(n) {let c=1; for(let k=0;k<n;k++) c=c*2*(2*k+1)/(k+2);return c;}
  function sampleMatching(n,random) {
    const cats=Array.from({length:n+1},(_,k)=>catalan(k)), p=Array(n);
    function rec(vertices) {
      const nn=vertices.length/2;if(!nn)return;
      let z=random()*cats[nn], k=0;
      for(;k<nn-1;k++){const w=cats[k]*cats[nn-1-k];if(z<w)break;z-=w;}
      const j=2*k+1;let a=vertices[0],b=vertices[j];if(a%2)[a,b]=[b,a];p[a/2]=(b-1)/2;
      rec(vertices.slice(1,j));rec(vertices.slice(j+1));
    }
    rec(Array.from({length:2*n},(_,i)=>i));return p;
  }
  function sqrtSPD(a) {
    // For a 2x2 SPD matrix: sqrt(A)=(A+sqrt(det A) I)/sqrt(tr A+2sqrt(det A)).
    const s=Math.sqrt(Math.max(0,a[0][0]*a[1][1]-a[0][1]*a[1][0]));
    const d=Math.sqrt(a[0][0]+a[1][1]+2*s);
    return a.map((row,i)=>row.map((v,j)=>(v+(i===j?s:0))/d));
  }
  const matmul=(a,b)=>a.map(row=>b[0].map((_,j)=>sum(row.map((v,k)=>v*b[k][j]))));
  const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
  function solve(a,b) {
    const n=b.length, m=a.map((r,i)=>[...r,b[i]]);
    for(let i=0;i<n;i++) {
      let k=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[k][i]))k=j;
      [m[i],m[k]]=[m[k],m[i]];
      if(Math.abs(m[i][i])<1e-14)throw Error("Singular kernel system");
      const d=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=d;
      for(let k=0;k<n;k++)if(k!==i){const c=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=c*m[i][j];}
    }return m.map(r=>r[n]);
  }
  function twoPointPlan(a,b,t) {
    return [[t,a-t],[b-t,1-a-b+t]];
  }
  function twoPointTransport(a,b,cost) {
    const low=Math.max(0,a+b-1),high=Math.min(a,b);
    const slope=cost[0][0]+cost[1][1]-cost[0][1]-cost[1][0];
    const t=slope>=0?low:high,plan=twoPointPlan(a,b,t);
    return {low,high,t,plan,slope,value:sum(plan.map((row,i)=>dot(row,cost[i])))};
  }
  function bernstein(n,f,a) {
    if(a<=0)return f(0);if(a>=1)return f(1);
    // Recur away from the binomial mode: this avoids underflow near a=1.
    const mode=Math.floor((n+1)*a),weights=Array(n+1).fill(0);weights[mode]=1;
    for(let j=mode;j>0;j--)weights[j-1]=weights[j]*j/(n-j+1)*(1-a)/a;
    for(let j=mode;j<n;j++)weights[j+1]=weights[j]*(n-j)/(j+1)*a/(1-a);
    return sum(weights.map((w,j)=>w*f(j/n)))/sum(weights);
  }
  function uniformQuantization(points) {
    const xs=[...points].sort((a,b)=>a-b),n=xs.length;
    return sum(xs.map((x,i)=>(x-(i+.5)/n)**2))/n+1/(12*n*n);
  }
  function uniformMongeGap(values) {
    const n=values.length;let gap=0;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)gap+=Math.max(values[i]-values[j],0);
    return 2*gap/(n*(n-1));
  }
  function mongeRegression(observations, options={}) {
    const n=observations.length,lambda=options.lambda??.0008,delta=options.delta??.015;
    const bandwidth=options.bandwidth??.075,x=observations.map((_,i)=>i/(n-1));
    const kernel=x.map(a=>x.map(b=>Math.exp(-.5*((a-b)/bandwidth)**2)));
    const inverse=transpose(x.map((_,i)=>solve(kernel,x.map((_,j)=>i===j?1:0))));
    // Roundoff in the separate solves must not introduce an antisymmetric
    // part into the quadratic objective or its Hessian.
    for(let i=0;i<n;i++)for(let j=0;j<i;j++)inverse[i][j]=inverse[j][i]=(inverse[i][j]+inverse[j][i])/2;
    const factor=2/(n*(n-1));
    function evaluate(values,gamma,secondOrder=false) {
      const kt=inverse.map(row=>dot(row,values));
      let value=sum(values.map((v,i)=>(v-observations[i])**2))/n+lambda*dot(values,kt);
      const gradient=values.map((v,i)=>2*(v-observations[i])/n+2*lambda*kt[i]);
      const hessian=secondOrder?inverse.map((row,i)=>row.map((v,j)=>2*lambda*v+(i===j?2/n:0))):null;
      for(let i=0;i<n;i++)for(let j=i+1;j<n;j++) {
        const z=(values[i]-values[j])/delta;
        const sigmoid=z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
        value+=gamma*factor*delta*(Math.max(z,0)+Math.log1p(Math.exp(-Math.abs(z))));
        const first=gamma*factor*sigmoid;gradient[i]+=first;gradient[j]-=first;
        if(hessian) {
          const second=gamma*factor*sigmoid*(1-sigmoid)/delta;
          hessian[i][i]+=second;hessian[j][j]+=second;hessian[i][j]-=second;hessian[j][i]-=second;
        }
      }
      return {value,gradient,hessian};
    }
    function fit(gamma) {
      // Every slider position starts from the same ridge fit. Backtracking
      // Newton is insensitive to the ill-conditioning that stalled descent.
      let values=solve(inverse.map((row,i)=>row.map((v,j)=>lambda*n*v+(i===j?1:0))),observations);
      let iterations=0;
      for(;iterations<60;iterations++) {
        const state=evaluate(values,gamma,true),norm2=dot(state.gradient,state.gradient);
        if(norm2<1e-16)break;
        const direction=solve(state.hessian,state.gradient.map(v=>-v)),slope=dot(state.gradient,direction);
        let step=1,accepted=false;
        while(step>=2**-30) {
          const next=values.map((v,i)=>v+step*direction[i]);
          if(evaluate(next,gamma).value<=state.value+1e-4*step*slope+1e-14) {
            values=next;accepted=true;break;
          }
          step/=2;
        }
        if(!accepted)break;
      }
      const state=evaluate(values,gamma),norm2=dot(state.gradient,state.gradient);
      const coefficients=inverse.map(row=>dot(row,values));
      // The data term alone is 2/n-strongly convex in the fitted values.
      // This certifies the SMOOTH objective only, not the exact hinge problem.
      return {values,iterations,value:state.value,gradientNorm:Math.sqrt(norm2),errorBound:n*norm2/4,
        predict:point=>dot(x.map(t=>Math.exp(-.5*((point-t)/bandwidth)**2)),coefficients)};
    }
    return {evaluate,fit};
  }
  function gaussianCDF(x) {
    if(x===0)return .5;
    if(Math.abs(x)>8)return x<0?0:1;
    const t=Math.abs(x);let term=t,total=t;
    // Positive-term series for exp(x²/2) ∫_0^x exp(-u²/2) du.
    for(let k=1;k<200;k++){term*=t*t/(2*k+1);total+=term;if(term<total*1e-16)break;}
    return .5+Math.sign(x)*Math.exp(-t*t/2)*total/Math.sqrt(2*Math.PI);
  }
  // Normalized Gaussian mixtures on the whole real line. Quantiles are
  // obtained by bracketed bisection, not by renormalizing a plotting window.
  function gaussianMixture1D(means,weights,sigma) {
    if(!(sigma>0) || !Number.isFinite(sigma) || means.length!==weights.length || !means.length ||
      means.some(x=>!Number.isFinite(x)) || weights.some(w=>!(w>0) || !Number.isFinite(w)) ||
      Math.abs(sum(weights)-1)>1e-12)throw new RangeError("Invalid Gaussian mixture");
    const scale=1/(sigma*Math.sqrt(2*Math.PI));
    const density=x=>{let value=0;for(let i=0;i<means.length;i++)value+=weights[i]*scale*Math.exp(-.5*((x-means[i])/sigma)**2);return value;};
    const cdf=x=>{let value=0;for(let i=0;i<means.length;i++)value+=weights[i]*gaussianCDF((x-means[i])/sigma);return value;};
    function quantile(r) {
      if(!(r>0 && r<1))throw new RangeError("A finite Gaussian quantile needs 0 < rank < 1");
      let lo=Math.min(...means)-9*sigma,hi=Math.max(...means)+9*sigma;
      while(cdf(lo)>r)lo-=9*sigma;
      while(cdf(hi)<r)hi+=9*sigma;
      for(let k=0;k<52;k++){const mid=(lo+hi)/2;if(cdf(mid)<r)lo=mid;else hi=mid;}
      return (lo+hi)/2;
    }
    return {means:[...means],weights:[...weights],sigma,density,cdf,quantile};
  }
  const bernsteinQuantileRanks=Object.freeze([[1,10],[1,4],[1,2],[3,4],[9,10]].map(Object.freeze));
  const bernsteinQuantileLevels=Object.freeze(bernsteinQuantileRanks.map(([a,b])=>a/b));
  function bernsteinQuantileMixture(s) {
    if(!Number.isFinite(s) || s< -1 || s>1)throw new RangeError("Mixture setting must be in [-1, 1]");
    return gaussianMixture1D([-1.25+.65*s,1.1+.35*s],[.52-.25*s,.48+.25*s],.52);
  }
  function bernsteinQuantileExperiment(s,{maxN=120,intervals=1200}={}) {
    if(!Number.isSafeInteger(maxN) || maxN<1)throw new RangeError("The sample-size horizon must be a positive integer");
    if(!Number.isSafeInteger(intervals) || intervals<2 || intervals%2!==0)throw new RangeError("Simpson quadrature needs an even number of intervals");
    const law=bernsteinQuantileMixture(s);
    const lower=Math.min(...law.means)-9*law.sigma,upper=Math.max(...law.means)+9*law.sigma;
    const step=(upper-lower)/intervals,weights=new Float64Array(intervals+1),weightedX=new Float64Array(intervals+1);
    const logF=new Float64Array(intervals+1),logSurvival=new Float64Array(intervals+1);
    for(let i=0;i<=intervals;i++) {
      const x=lower+step*i;
      let F=0,survival=0;
      for(let j=0;j<law.means.length;j++) {
        const z=(x-law.means[j])/law.sigma;
        // Compute the small tail by reflection, without subtracting a CDF
        // rounded close to one. Clip tiny negative roundoff in the tail.
        const tail=Math.max(0,gaussianCDF(-Math.abs(z))),w=law.weights[j];
        F+=w*(z<=0?tail:1-tail);
        survival+=w*(z<=0?1-tail:tail);
      }
      logF[i]=Math.log(F);logSurvival[i]=Math.log(survival);
      weights[i]=law.density(x)*(i===0 || i===intervals?1:i%2===0?2:4)*step/3;
      weightedX[i]=x*weights[i];
    }
    const factorialLog=new Float64Array(maxN);
    for(let i=2;i<maxN;i++)factorialLog[i]=factorialLog[i-1]+Math.log(i);
    const curves=bernsteinQuantileRanks.map(([numerator,denominator],index)=>{
      const t=bernsteinQuantileLevels[index],quantile=law.quantile(t),points=[];
      for(let n=1;n<=maxN;n++) {
        // The displayed t are rational, so ceil(n*t) is computed with their
        // exact integer numerators and denominators rather than rounded ranks.
        const rank=Math.ceil(n*numerator/denominator),a=rank-1,b=n-rank;
        const logCoefficient=Math.log(n)+factorialLog[n-1]-factorialLog[a]-factorialLog[b];
        let estimate=0,mass=0;
        for(let i=0;i<=intervals;i++) {
          const beta=Math.exp(logCoefficient+(a===0?0:a*logF[i])+(b===0?0:b*logSurvival[i]));
          estimate+=beta*weightedX[i];mass+=beta*weights[i];
        }
        // No finite-window renormalization: this is the integral of the
        // order-statistic density, whose sampled mass is reported separately.
        const signedError=estimate-quantile;
        points.push({n,rank,estimate,error:Math.abs(signedError),signedError,mass});
      }
      return {t,quantile,points};
    });
    return {law,levels:bernsteinQuantileLevels,curves,quadrature:{lower,upper,intervals}};
  }
  function gaussianMixtureDensityCap(law,cells=1024) {
    if(!Number.isInteger(cells) || cells<1)throw new RangeError("The cap partition needs a positive integer cell count");
    const lo=Math.min(...law.means),hi=Math.max(...law.means),scale=1/(law.sigma*Math.sqrt(2*Math.PI));
    if(lo===hi)return scale*sum(law.weights);
    // Outside the convex hull of the component centers, the density is
    // monotone towards that hull. On each cell, replace every Gaussian by
    // its maximum over that cell. The largest cell bound is a GLOBAL bound,
    // not the maximum of samples. Refining the partition tightens it.
    let cap=0;
    for(let i=0;i<cells;i++){
      const a=lo+(hi-lo)*i/cells,b=lo+(hi-lo)*(i+1)/cells;
      let bound=0;
      for(let j=0;j<law.means.length;j++){
        const distance=Math.max(a-law.means[j],law.means[j]-b,0);
        bound+=law.weights[j]*Math.exp(-.5*(distance/law.sigma)**2);
      }
      cap=Math.max(cap,scale*bound);
    }
    return cap;
  }
  function gaussianDensityCapScene(sigma=.22,resolution=501,sourceCount=2,targetCount=2) {
    if(!(sigma>=.1 && sigma<=.32))throw new RangeError("Bandwidth outside the experiment range");
    if(!Number.isInteger(resolution) || resolution<33)throw new RangeError("The plotting grid needs at least 33 points");
    if([sourceCount,targetCount].some(k=>!Number.isInteger(k) || k<1 || k>8))throw new RangeError("Each mixture needs between one and eight components");
    const endpoint=(count,isTarget)=>{
      const means=count===2?(isTarget?[-.2,1.5]:[-1.5,.2]):
        Array.from({length:count},(_,i)=>(isTarget?.65:-.65)+1.7*(i-(count-1)/2));
      // Keep the original two-component experiment exactly. Other counts
      // use positive linearly tilted weights, normalized without randomness.
      const raw=count===2?(isTarget?[.4,.6]:[.55,.45]):
        Array.from({length:count},(_,i)=>count===1?1:1+(isTarget?-.3:.3)*(1-2*i/(count-1)));
      const total=sum(raw),weights=raw.map(w=>w/total);
      return gaussianMixture1D(means,weights,sigma);
    };
    const source=endpoint(sourceCount,false),target=endpoint(targetCount,true);
    const endpoints=[source,target],tail=1e-9;
    const xmin=Math.min(...source.means,...target.means)-7*sigma;
    const xmax=Math.max(...source.means,...target.means)+7*sigma;
    const x=Array.from({length:resolution},(_,i)=>xmin+(xmax-xmin)*i/(resolution-1));
    // Rank samples inherited from both spatial grids resolve narrow peaks and
    // low-density gaps, which a uniform quantile grid alone can miss.
    const ranks=Array.from({length:resolution},(_,i)=>tail+(1-2*tail)*i/(resolution-1));
    for(const law of endpoints)for(const z of x){const r=law.cdf(z);if(r>tail && r<1-tail)ranks.push(r);}
    for(let k=1;k<=9;k++)ranks.push(10**(-k),1-10**(-k));
    ranks.sort((a,b)=>a-b);
    const r=[tail,...ranks.filter((v,i)=>v>tail+1e-14 && v<1-tail-1e-14 &&
      (i===0 || v-ranks[i-1]>1e-14)),1-tail];
    const q0=r.map(source.quantile),q1=r.map(target.quantile);
    const d0=q0.map(source.density),d1=q1.map(target.density);
    const cap=Math.max(...endpoints.map(law=>gaussianMixtureDensityCap(law)));
    return {source,target,sourceCount,targetCount,sigma,r,q0,q1,d0,d1,cap,x,xmin,xmax,tail};
  }
  function gaussianDensityCapGeodesic(scene,t) {
    if(!(t>=0 && t<=1))throw new RangeError("Geodesic time must be in [0,1]");
    const points=scene.r.map((r,i)=>{
      const x=(1-t)*scene.q0[i]+t*scene.q1[i];
      const density=1/((1-t)/scene.d0[i]+t/scene.d1[i]);
      return [x,density];
    });
    return {points,quantiles:scene.r.map((r,i)=>[r,points[i][0]]),peak:Math.max(...points.map(p=>p[1]))};
  }
  function bernoulliErrorCurve(n,extent=4) {
    const mode=Math.floor(n/2),mass=Array(n+1).fill(0);mass[mode]=1;
    for(let i=mode;i>0;i--)mass[i-1]=mass[i]*i/(n-i+1);
    for(let i=mode;i<n;i++)mass[i+1]=mass[i]*(n-i)/(i+1);
    const total=sum(mass),root=Math.sqrt(n),atoms=mass.map((_,i)=>(2*i-n)/root);
    const nodes=Array.from({length:401},(_,i)=>({x:-extent+2*extent*i/400}));
    atoms.forEach((x,i)=>{if(x>=-extent && x<=extent)nodes.push({x,atom:i});});
    nodes.sort((a,b)=>a.x-b.x||((a.atom??-1)-(b.atom??-1)));
    let cdf=0,index=0;const curve=[];
    for(const node of nodes) {
      while(index<atoms.length && atoms[index]<node.x){cdf+=mass[index]/total;index++;}
      const phi=gaussianCDF(node.x);
      curve.push([node.x,root*(cdf-phi)]);
      if(node.atom!==undefined && index===node.atom) {
        cdf+=mass[index++]/total;curve.push([node.x,root*(cdf-phi)]);
      }
    }
    return curve;
  }
  function convexEnvelope(a,b,epsilon=0) {
    return Math.max(0,Math.abs(a-b)-epsilon*(a*(1-a)+b*(1-b)));
  }
  function sinusoidalLaw(lambda) {
    if(!Number.isFinite(lambda) || Math.abs(lambda)>.9)throw new RangeError("The amplitude must be in [-0.9, 0.9]");
    const density=x=>x<0 || x>1?0:x===0 || x===1?1:1+lambda*Math.sin(2*Math.PI*x);
    // (1−cos(2πx))/(2π) = sin²(πx)/π, avoiding cancellation near zero.
    const cdf=x=>x<=0?0:x>=1?1:x+lambda*Math.sin(Math.PI*x)**2/Math.PI;
    return {density,cdf};
  }
  // This integrand is used on the ordered triangle x <= y.
  function cdfIntegrand(F,G,x,y) {
    return Math.max(F(x)-G(y),0)+Math.max(G(x)-F(y),0);
  }
  function cdfSquaredDistance(F,G,n,lower=0,upper=1) {
    const step=(upper-lower)/n;
    let value=0;
    for(let i=0;i<n;i++) {
      // Each diagonal cell contributes a triangle, sampled at its centroid.
      value+=.5*cdfIntegrand(F,G,lower+(i+1/3)*step,lower+(i+2/3)*step);
      for(let j=i+1;j<n;j++)value+=cdfIntegrand(F,G,lower+(i+.5)*step,lower+(j+.5)*step);
    }
    return 2*step*step*value;
  }
  const api={sum,dot,zeros,dist2,rng,gaussian,transport,bary,objective,feasibility,
    weakStep,weakAwayStep,weakCertificate,crossing,catalan,sampleMatching,sqrtSPD,matmul,transpose,solve,
    twoPointPlan,twoPointTransport,bernstein,uniformQuantization,uniformMongeGap,mongeRegression,
    gaussianCDF,gaussianMixture1D,bernsteinQuantileMixture,bernsteinQuantileExperiment,
    gaussianMixtureDensityCap,gaussianDensityCapScene,gaussianDensityCapGeodesic,
    bernoulliErrorCurve,convexEnvelope,sinusoidalLaw,cdfIntegrand,cdfSquaredDistance};
  if(typeof module!=="undefined" && module.exports)module.exports=api;
  root.BlogMath=api;
})(typeof window!=="undefined"?window:globalThis);
