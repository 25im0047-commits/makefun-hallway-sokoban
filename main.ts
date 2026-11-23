import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STEP = 'udlr';
const INF = 1e6;
class Heap {
  a = [];
  put(x) {
    let i = this.a.length; this.a.push(x);
    while (i) {
      const p = (i-1)>>1;
      if (this.a[p][0] <= x[0]) break;
      this.a[i] = this.a[p]; i = p;
    }
    this.a[i] = x;
  }
  take() {
    const a = this.a, first = a[0], x = a.pop();
    if (a.length) {
      let i = 0;
      while (i*2+1 < a.length) {
        let c = i*2+1;
        if (c+1 < a.length && a[c+1][0] < a[c][0]) c++;
        if (a[c][0] >= x[0]) break;
        a[i] = a[c]; i = c;
      }
      a[i] = x;
    }
    return first;
  }
}
function puzzle(text) {
  const rows=text.replaceAll('\r','').trimEnd().split('\n');
  const w=Math.max(...rows.map(r=>r.length))+2;
  const dy=[-w,w,-1,1], floor=new Set(), goals=new Set(), boxes=new Set();
  let p=-1;
  for (let y=0;y<rows.length;y++) for(let x=0;x<rows[y].length;x++) {
    const c=rows[y][x], z=(y+1)*w+x+1;
    if (!' .$*@+'.includes(c)) continue;
    floor.add(z);
    if ('.*+'.includes(c)) goals.add(z);
    if ('$*'.includes(c)) boxes.add(z);
    if ('@+'.includes(c)) p=z;
  }
  if (p<0 || boxes.size!==goals.size) throw Error('invalid map');
  return {dy,w,floor,goals,boxes,p};
}
function partitions(m) {
  const {floor,goals,boxes,p,dy,w}=m;
  const row=Math.floor(p/w);
  if ([...boxes,...goals].some(z=>Math.floor(z/w)===row)) return null;
  const left=new Set([...floor].filter(z=>Math.floor(z/w)!==row));
  const rooms=[];
  while(left.size) {
    const from=left.values().next().value, cells=new Set([from]), q=[from], doors=new Set();
    left.delete(from);
    for(let i=0;i<q.length;i++) for(const d of dy) {
      const z=q[i]+d;
      if (!floor.has(z)) continue;
      if (Math.floor(z/w)===row) {doors.add(z); continue;}
      if (left.delete(z)) {q.push(z);cells.add(z);}
    }
    const b=q.filter(z=>boxes.has(z)), g=q.filter(z=>goals.has(z));
    if (!b.length&&!g.length) continue;
    if (b.length!==g.length || doors.size!==1) return null;
    rooms.push({cells,b,g,enter:[...doors][0]});
  }
  return rooms;
}
function getPushes({cells,b,g,enter},dy) {
  const sites=[...cells, ...(!cells.has(enter)?[enter]:[])];
  const idx=new Map(sites.map((z,i)=>[z,i]));
  const N=sites.length;
  const nn=sites.map(z=>dy.map(d=>idx.get(z+d)??-1));
  const allowed=sites.map(z=>cells.has(z));
  const goal=g.map(z=>idx.get(z)), goalSet=new Set(goal);
  const distances=goal.map(to=>{
    const result=new Int32Array(N).fill(INF); result[to]=0;
    const q=[to];
    for(let k=0;k<q.length;k++) for(let d=0;d<4;d++) {
      const z=nn[q[k]][d^1];
      if (z<0||!allowed[z]||nn[z][d^1]<0||result[z]!==INF) continue;
      result[z]=result[q[k]]+1; q.push(z);
    }
    return result;
  });
  const heuristic=bs=>{
    function match(i,mask) {
      if(i===bs.length) return 0;
      let min=INF;
      for(let j=0;j<goal.length;j++) if(!(mask&(1<<j))) {
        const dist=distances[j][bs[i]];
        if(dist<min) min=Math.min(min,dist+match(i+1,mask|(1<<j)));
      }
      return min;
    }
    return match(0,0);
  };
  const states = new Map(), queue = new Heap();
  const occ=new Uint8Array(N), seen=new Int32Array(N), work=new Int32Array(N);
  let stamp=0;
  function visit(bs,p) {
    occ.fill(0);
    for (const z of bs) occ[z]=1;
    stamp++;
    let len=1, first=p;
    work[0]=p; seen[p]=stamp;
    for(let i=0;i<len;i++) for(const z of nn[work[i]]) if(z>=0&&!occ[z]&&seen[z]!==stamp){
      seen[z]=stamp; work[len++]=z; if(z<first) first=z;
    }
    return first;
  }
  const start=b.map(z=>idx.get(z)).sort((a,b)=>a-b), s=idx.get(enter);
  const initial={b:start,p:s,n:0,prev:null};
  initial.key=start.join(',')+'|'+visit(start,s);
  states.set(initial.key,initial);queue.put([heuristic(start),initial]);
  let steps=0;
  while(queue.a.length && steps++ < 850000) {
    const current=queue.take()[1];
    if(states.get(current.key)!==current) continue;
    if(current.b.every(x=>goalSet.has(x))) {
      const pushes=[];
      for(let cur=current;cur.prev;cur=cur.prev) pushes.push([sites[cur.p],cur.d]);
      return pushes.reverse();
    }
    visit(current.b,current.p);
    const candidates=[];
    for(let i=0;i<current.b.length;i++) for(let d=0;d<4;d++) {
      const z=current.b[i], n=nn[z][d], behind=nn[z][d^1];
      if(n<0 || behind<0 || !allowed[n] || occ[n] || seen[behind]!==stamp) continue;
      if(!distances.some(a=>a[n]<INF)) continue;
      candidates.push([i,d,z,n]);
    }
    for(const [i,d,z,n] of candidates) {
      const bs=current.b.slice();bs[i]=n;bs.sort((a,b)=>a-b);
      const h=heuristic(bs); if(h===INF) continue;
      const key=bs.join(',')+'|'+visit(bs,z), cost=current.n+1;
      if((states.get(key)?.n??INF)<=cost) continue;
      const st={key,b:bs,p:z,n:cost,d,prev:current};
      states.set(key,st);queue.put([(cost+h)*10000+h,st]);
    }
  }
  throw Error('no push solution found');
}
function solve(text) {
  const m=puzzle(text), {floor,goals,boxes,dy}=m;
  const rooms=partitions(m)??[{cells:floor,b:[...boxes],g:[...goals],enter:m.p}];
  const result=[]; let p=m.p;
  for(const room of rooms) for(const [box,d] of getPushes(room,dy)) {
    const target=box-dy[d], via=new Map([[p,[-1,-1]]]), q=[p];
    for(let i=0;i<q.length&&!via.has(target);i++) for(let k=0;k<4;k++) {
      const n=q[i]+dy[k];
      if(floor.has(n)&&!boxes.has(n)&&!via.has(n)){via.set(n,[q[i],k]);q.push(n);}
    }
    if(!via.has(target)) throw Error('cannot walk to push');
    const walk=[];
    for(let z=target;z!==p;) {const [back,k]=via.get(z);walk.push(STEP[k]);z=back;}
    result.push(walk.reverse().join(''),STEP[d].toUpperCase());
    boxes.delete(box); boxes.add(box+dy[d]); p=box;
  }
  if (![...boxes].every(z=>goals.has(z))) throw Error('incorrect finish');
  return result.join('');
}

const input=process.env.MAKEFUN_INPUT_DIR??'/input';
const output=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(input,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort()) {
  const out=join(output,id);
  mkdirSync(out,{recursive:true});
  let moves='';
  try {moves=solve(readFileSync(join(input,id,'level.txt'),'utf8'));}
  catch(error) { console.error(id,error.message); }
  writeFileSync(join(out,'solution.txt'),moves+'\n');
}
