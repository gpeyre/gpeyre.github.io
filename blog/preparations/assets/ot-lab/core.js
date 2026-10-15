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
  function cdfSquaredDistance(F,G,n,lower=0,upper=1) {
    const step=(upper-lower)/n;
    const h=(x,y)=>Math.max(F(x)-G(y),0)+Math.max(G(x)-F(y),0);
    let value=0;
    for(let i=0;i<n;i++) {
      // Each diagonal cell contributes a triangle, sampled at its centroid.
      value+=.5*h(lower+(i+1/3)*step,lower+(i+2/3)*step);
      for(let j=i+1;j<n;j++)value+=h(lower+(i+.5)*step,lower+(j+.5)*step);
    }
    return 2*step*step*value;
  }
  const api={sum,dot,zeros,dist2,rng,gaussian,transport,bary,objective,feasibility,
    weakStep,weakAwayStep,weakCertificate,crossing,catalan,sampleMatching,sqrtSPD,matmul,transpose,solve,
    twoPointPlan,twoPointTransport,bernstein,uniformQuantization,uniformMongeGap,mongeRegression,
    gaussianCDF,bernoulliErrorCurve,convexEnvelope,cdfSquaredDistance};
  if(typeof module!=="undefined" && module.exports)module.exports=api;
  root.BlogMath=api;
})(typeof window!=="undefined"?window:globalThis);
