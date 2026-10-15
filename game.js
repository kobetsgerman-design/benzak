
(()=>{
'use strict';
const COLS=6,ROWS=10;
const WP=[[0,0],[0,1],[5,1],[5,3],[0,3],[0,5],[5,5],[5,7],[0,7],[0,9]];
const SLOTS=[[0,2],[1,2],[2,2],[3,2],[2,4],[3,4],[4,4],[5,4],[0,6],[1,6],[2,6],[3,6],[1,8],[2,8],[1,9],[2,9],[2,0],[3,0]];
const TT={
  mg:{n:'Пулемёт',cost:30,range:2.5,up:[25,45]},
  fl:{n:'Огнемёт',cost:50,range:2,up:[40,70]},
  sp:{n:'Шипомёт',cost:40,range:2,up:[35,60]},
  gen:{n:'Генератор',cost:35,range:0,up:[30,50]}};
const TKEYS=['mg','fl','sp','gen'];
/* уровни башен 1..3: значения по индексу уровня; у генератора усиливается бонус комбо */
const MAXLV=3;
const LV={
  mg:{dmg:[8,12,18],rate:[2,2.5,3],range:[2.5,2.8,3.1]},
  fl:{dmg:[20,28,38],rate:[.7,.8,.9],range:[2,2.2,2.4],r:[1,1.15,1.3]},
  sp:{dmg:[3,5,8],slow:[.4,.5,.6],range:[2,2.2,2.4]},
  gen:{}};
const lvOf=t=>t.lv||1;
const genK=(k,v)=>k?1+v*(k+1):1;          // множитель комбо от уровня генератора (ур.1 = ×1.4/×1.5)
function rangeOf(t){const S=LV[t.type];return S.range?S.range[lvOf(t)-1]*(t.f&&t.f.elec?genK(t.f.elec,.25):1):0;}
function upCost(t){const lv=lvOf(t);return lv>=MAXLV?null:TT[t.type].up[lv-1];}
function sellValue(t){return Math.floor((t.inv||TT[t.type].cost)*.5);}
function statLine(t){
  const S=LV[t.type],lv=lvOf(t),n=lv<MAXLV,f=(a,u)=>n?a[lv-1]+u+' → '+a[lv]+u:a[lv-1]+u;
  if(t.type==='mg')return 'Урон '+f(S.dmg,'')+' · скорострельность '+f(S.rate,'/с')+' · дальность '+f(S.range,'');
  if(t.type==='fl')return 'Урон '+f(S.dmg,'')+' · радиус '+f(S.r,'')+' · дальность '+f(S.range,'');
  if(t.type==='sp')return 'Урон '+f(S.dmg,'')+' · замедление '+(n?Math.round(S.slow[lv-1]*100)+'% → '+Math.round(S.slow[lv]*100)+'%':Math.round(S.slow[lv-1]*100)+'%')+' · дальность '+f(S.range,'');
  return 'Усиление комбо соседей: +'+25*(lv+1)+'%'+(n?' → +'+25*(lv+2)+'%':'');
}
const EN={
  raider:{hp:40,sp:1.3,leak:1,rew:3,reach:0},
  biker:{hp:25,sp:2.2,leak:1,rew:3,reach:0},
  armor:{hp:120,sp:.8,leak:2,rew:10,reach:1,dps:15},
  boss:{hp:800,sp:.5,leak:10,rew:100,reach:2,dps:25}};
const WAVES=[
  {raider:8},{raider:10},{raider:8,biker:6},{raider:10,armor:2},{raider:8,biker:8,armor:2},
  {raider:12,armor:4},{biker:10,armor:4},{raider:12,biker:8,armor:5},{raider:14,biker:8,armor:6},
  {boss:1,raider:10,armor:4}];
const CB=[
  {k:'fl+mg',n:'Зажигательные патроны',e:'Попадания пулемёта поджигают цель: 4 урона в секунду в течение 3 секунд',q:'Искра в гильзе — и пустошь горит ярче.'},
  {k:'mg+sp',n:'Пробитые колёса',e:'Каждый 3-й выстрел пулемёта обездвиживает цель на 1,5 секунды',q:'Без колёс даже король дороги — просто груда железа.'},
  {k:'gen+mg',n:'Форсаж',e:'Скорость стрельбы пулемёта +40%',q:'Мотор ревёт, ствол раскалён — спать будем потом.'},
  {k:'fl+sp',n:'Горящий заслон',e:'Враги в зоне огня получают на 20% больше урона в течение 3 секунд',q:'Кто прошёл через огонь, тот уже не вернётся прежним.'},
  {k:'fl+gen',n:'Детонация',e:'Радиус урона огнемёта по области +50%',q:'Здесь всё горит. Даже воздух.'},
  {k:'gen+sp',n:'Электрозабор',e:'Радиус замедления +50%, замедление растёт с 40% до 55%',q:'Проволока поёт, а гости пляшут.'}];
const CBMAP={};CB.forEach(c=>CBMAP[c.k]=c);
const FLAG={'mg>fl':'burn','mg>sp':'punct','mg>gen':'rate','fl>sp':'vuln','fl>gen':'det','sp>gen':'elec'};

/* ---------- сохранение ---------- */
let save={best:0,combos:[],sound:true};
try{const s=JSON.parse(localStorage.getItem('benzak')||'null');if(s)save=Object.assign(save,s);}catch(e){}
function persist(){try{localStorage.setItem('benzak',JSON.stringify(save));}catch(e){}}

/* ---------- путь и соседи ---------- */
const PTS=WP.map(p=>[p[0]+.5,p[1]+.5]);
const SEG=[];let TOT=0;
for(let i=0;i<PTS.length-1;i++){
  const dx=PTS[i+1][0]-PTS[i][0],dy=PTS[i+1][1]-PTS[i][1],len=Math.hypot(dx,dy);
  SEG.push({x:PTS[i][0],y:PTS[i][1],dx:dx/len,dy:dy/len,len,s:TOT});TOT+=len;
}
function pathPos(d){
  for(const s of SEG)if(d<=s.s+s.len){const t=d-s.s;return{x:s.x+s.dx*t,y:s.y+s.dy*t,a:Math.atan2(s.dy,s.dx)};}
  const s=SEG[SEG.length-1];return{x:s.x+s.dx*s.len,y:s.y+s.dy*s.len,a:Math.atan2(s.dy,s.dx)};
}
const NB=SLOTS.map((s,i)=>{const r=[];SLOTS.forEach((o,j)=>{if(j!==i&&Math.abs(o[0]-s[0])+Math.abs(o[1]-s[1])===1)r.push(j);});return r;});
const slotAt=(c,r)=>SLOTS.findIndex(s=>s[0]===c&&s[1]===r);

/* ---------- звук ---------- */
let AC=null,hum=null,humG=null;const lastSnd={};
function ac(){
  if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  if(AC&&AC.state==='suspended')AC.resume();
  return AC;
}
function tone(f,d,type,vol,to){
  if(!save.sound)return;const a=ac();if(!a)return;
  const o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
  o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g).connect(a.destination);o.start(t);o.stop(t+d);
}
function noise(d,vol,fc){
  if(!save.sound)return;const a=ac();if(!a)return;
  const n=Math.floor(a.sampleRate*d),b=a.createBuffer(1,n,a.sampleRate),c=b.getChannelData(0);
  for(let i=0;i<n;i++)c[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(),g=a.createGain(),f=a.createBiquadFilter();
  f.type='lowpass';f.frequency.value=fc;g.gain.value=vol;s.buffer=b;
  s.connect(f).connect(g).connect(a.destination);s.start();
}
function sfx(k){
  const now=performance.now();if(now-(lastSnd[k]||0)<70)return;lastSnd[k]=now;
  if(k==='mg')tone(520,.06,'square',.04,180);
  else if(k==='fl')noise(.25,.12,900);
  else if(k==='sp')tone(900,.08,'triangle',.05,300);
  else if(k==='boom'){noise(.5,.3,500);tone(90,.4,'sawtooth',.12,35);}
  else if(k==='clang')tone(220,.09,'square',.05,120);
  else if(k==='buy')tone(660,.1,'triangle',.07,990);
  else if(k==='combo'){tone(520,.12,'triangle',.08,780);setTimeout(()=>tone(780,.18,'triangle',.08,1170),110);}
  else if(k==='leak')tone(160,.3,'sawtooth',.1,60);
}
function humUpdate(){
  const a=save.sound?ac():AC;if(!a)return;
  if(!hum){
    hum=a.createOscillator();humG=a.createGain();const f=a.createBiquadFilter();
    hum.type='sawtooth';hum.frequency.value=48;f.type='lowpass';f.frequency.value=160;humG.gain.value=0;
    hum.connect(f).connect(humG).connect(a.destination);hum.start();
  }
  humG.gain.value=(save.sound&&G&&G.running&&!G.over)?.05:0;
}

/* ---------- состояние ---------- */
let G=null,cs=40,offX=0,offY=0,dpr=1;
function newGame(){
  try{resetScene();}catch(e){}
  G={scrap:100,fuel:10,wave:0,running:false,over:false,overT:0,speed:1,slots:SLOTS.map(()=>null),
     enemies:[],parts:[],floats:[],tracers:[],rings:[],spawnQ:[],spawnT:0,sel:-1,links:[],found:[],t:0,shake:0};
  $('bSpeed').textContent='×1';closeSheet();updateWaveBtn();
}
const $=id=>document.getElementById(id);
const cv=$('cv');

function recompute(){
  const old=new Set(G.links.map(l=>l.i+'-'+l.j));
  G.links=[];
  G.slots.forEach(t=>{if(t&&!t.rubble)t.f={};});
  const born=[];
  SLOTS.forEach((_,i)=>{
    const a=G.slots[i];if(!a||a.rubble)return;
    for(const j of NB[i]){
      if(j<i)continue;const b=G.slots[j];if(!b||b.rubble)continue;
      const k=[a.type,b.type].sort().join('+');if(!CBMAP[k])continue;
      G.links.push({i,j,k});
      // значение флага = уровень генератора (для комбо с ним), иначе 1
      let f=FLAG[a.type+'>'+b.type];if(f)a.f[f]=Math.max(a.f[f]||0,b.type==='gen'?lvOf(b):1);
      f=FLAG[b.type+'>'+a.type];if(f)b.f[f]=Math.max(b.f[f]||0,a.type==='gen'?lvOf(a):1);
      if(!old.has(i+'-'+j))born.push({i,j,k});
    }
  });
  return born;
}
function announce(born){
  for(const l of born){
    const c=CBMAP[l.k],[x1,y1]=SLOTS[l.i],[x2,y2]=SLOTS[l.j];
    G.floats.push({x:(x1+x2)/2+.5,y:(y1+y2)/2+.2,text:c.n,t:2.2,c:'#ffd24a'});
    if(!G.found.includes(l.k))G.found.push(l.k);
    if(!save.combos.includes(l.k)){save.combos.push(l.k);persist();sfx('combo');}
    else sfx('buy');
  }
}

/* ---------- действия игрока ---------- */
function build(i,type){
  const d=TT[type];if(G.over||G.scrap<d.cost)return;
  const s=G.slots[i];if(s&&!s.rubble)return;
  G.scrap-=d.cost;G.slots[i]={type,hp:100,cd:0,shots:0,aim:0,f:{},lv:1,inv:d.cost};
  announce(recompute());sfx('buy');closeSheet();
}
function sell(i){
  const t=G.slots[i];if(!t||t.rubble)return;
  G.scrap+=sellValue(t);G.slots[i]=null;recompute();sfx('buy');closeSheet();
}
function upgrade(i){
  const t=G.slots[i];if(!t||t.rubble||G.over)return;
  const c=upCost(t);if(c==null||G.scrap<c)return;
  G.scrap-=c;t.lv=lvOf(t)+1;t.inv=(t.inv||TT[t.type].cost)+c;t.hp=100;t.upAt=G.t;
  const [col,row]=SLOTS[i];
  G.floats.push({x:col+.5,y:row+.2,text:'Уровень '+t.lv,t:1.8,c:'#7fe36a'});
  announce(recompute());sfx('combo');
}
function repairCost(t){return Math.ceil((t.inv||TT[t.type].cost)*.5*(100-t.hp)/100);}
function repair(i){
  const t=G.slots[i];if(!t||t.rubble||t.hp>=100)return;
  const c=repairCost(t);if(G.scrap<c)return;G.scrap-=c;t.hp=100;sfx('buy');
}
function destroyTower(i){
  const [c,r]=SLOTS[i];G.slots[i]={rubble:true};recompute();
  boom((c+.5),(r+.5),1);G.shake=.4;sfx('boom');
  if(G.sel===i)closeSheet();
}
function startWave(){
  if(G.running||G.over||G.wave>=10)return;ac();
  const w=WAVES[G.wave];G.wave++;
  const q=[];for(const k in w)for(let n=0;n<w[k];n++)q.push(k);
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  const bi=q.indexOf('boss');if(bi>=0){q.splice(bi,1);q.splice(Math.min(4,q.length),0,'boss');}
  G.spawnQ=q;G.spawnT=.5;G.running=true;updateWaveBtn();
}
function endWave(){
  G.running=false;G.scrap+=20;
  if(G.wave>save.best){save.best=G.wave;persist();}
  if(G.wave>=10){finish(true);return;}
  updateWaveBtn();
}

/* ---------- игровой цикл ---------- */
function boom(x,y,s){
  G.rings.push({x,y,t:.45,max:.45,s});
  for(let i=0;i<14*s;i++){const a=Math.random()*6.28,v=.5+Math.random()*2.2*s;
    G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.6+Math.random()*.5,max:1,c:Math.random()<.5?'#ff8a2a':'#ffd24a',r:.06+Math.random()*.08});}
  for(let i=0;i<6*s;i++)G.parts.push({x,y,vx:(Math.random()-.5),vy:-.6-Math.random(),life:1+Math.random(),max:2,c:'#1c1c1c',r:.1+Math.random()*.1});
}
function hurt(e,d){
  if(e.dead)return;
  if(e.vuln>0)d*=1.2;
  e.hp-=d;e.flash=.08;
  if(e.hp<=0){
    e.dead=true;G.scrap+=EN[e.type].rew;
    boom(e.x,e.y,e.type==='boss'?3:.6);sfx(e.type==='boss'?'boom':'clang');
    if(e.type==='boss')G.shake=.6;
  }
}
function step(dt){
  G.t+=dt;
  if(G.shake>0)G.shake-=dt;
  if(G.over){G.overT+=dt;}
  else{
    if(G.running){
      G.spawnT-=dt;
      if(G.spawnQ.length&&G.spawnT<=0){
        const type=G.spawnQ.shift(),E=EN[type];
        G.enemies.push({type,d:0,x:PTS[0][0],y:PTS[0][1],a:Math.PI/2,hp:E.hp,max:E.hp,slowT:0,slowAmt:0,burn:0,stun:0,vuln:0,flash:0,dead:false,atk:false,ph:Math.random()*6});
        G.spawnT=type==='boss'?1.5:(type==='biker'?.55:.85);
      }
    }
    // враги
    for(const e of G.enemies){
      if(e.dead)continue;const E=EN[e.type];
      if(e.burn>0){e.burn-=dt;hurt(e,4*dt);if(e.dead)continue;}
      if(e.slowT>0)e.slowT-=dt;if(e.stun>0)e.stun-=dt;if(e.vuln>0)e.vuln-=dt;if(e.flash>0)e.flash-=dt;
      e.atk=false;
      if(Math.random()<dt*(e.type==='boss'?10:3)){
        G.parts.push({x:e.x-Math.cos(e.a)*.3,y:e.y-Math.sin(e.a)*.3-.08,vx:-Math.cos(e.a)*.2+(Math.random()-.5)*.2,vy:-.35,life:.8,max:.8,c:'#2a2623',r:.06+Math.random()*.05});
      }
      if(e.stun>0)continue;
      if(E.reach){
        let tg=-1,bd=0;
        SLOTS.forEach((s,i)=>{const t=G.slots[i];if(!t||t.rubble)return;
          const d=Math.hypot(s[0]+.5-e.x,s[1]+.5-e.y);if(d>E.reach+.05)return;
          if(tg<0||d<bd-1e-6||(Math.abs(d-bd)<1e-6&&t.hp<G.slots[tg].hp)){tg=i;bd=d;}});
        if(tg>=0){
          e.atk=true;const t=G.slots[tg];t.hp-=E.dps*dt/(1+.3*(lvOf(t)-1));
          if(Math.random()<dt*6)sfx('clang');
          if(Math.random()<dt*25)G.parts.push({x:e.x+Math.cos(e.a)*.5,y:e.y+Math.sin(e.a)*.5,vx:(Math.random()-.5)*2,vy:(Math.random()-.8)*1.5,life:.3,max:.3,c:'#ffd24a',r:.03});
          if(t.hp<=0){t.hp=0;destroyTower(tg);}
          continue;
        }
      }
      const sp=E.sp*(e.slowT>0?1-e.slowAmt:1);
      e.d+=sp*dt;
      if(e.d>=TOT){
        e.dead=true;e.leaked=true;G.fuel-=E.leak;sfx('leak');G.shake=.3;
        G.floats.push({x:.5,y:9,text:'-'+E.leak,t:1.2,c:'#ff5a3a'});
        if(G.fuel<=0){G.fuel=0;finish(false);}
        continue;
      }
      const p=pathPos(e.d);e.x=p.x;e.y=p.y;e.a=p.a;
    }
    // башни
    for(let i=0;i<SLOTS.length;i++){
      const t=G.slots[i];if(!t||t.rubble||t.type==='gen')continue;
      if(t.rec>0)t.rec-=dt;t.cd-=dt;if(t.cd>0)continue;
      const cx=SLOTS[i][0]+.5,cy=SLOTS[i][1]+.5,R=rangeOf(t),S=LV[t.type],li=lvOf(t)-1;
      let best=null;
      for(const e of G.enemies){if(e.dead)continue;
        if(Math.hypot(e.x-cx,e.y-cy)<=R&&(!best||e.d>best.d))best=e;}
      if(!best)continue;
      t.aim=Math.atan2(best.y-cy,best.x-cx);t.rec=.14;
      if(t.type==='mg'){
        hurt(best,S.dmg[li]);if(t.f.burn)best.burn=3;
        if(t.f.punct){t.shots++;if(t.shots%3===0)best.stun=1.5;}
        t.cd=1/(S.rate[li]*genK(t.f.rate,.2));
        G.tracers.push({x1:cx,y1:cy,x2:best.x,y2:best.y,t:.07,c:'#ffe9a0'});sfx('mg');
      }else if(t.type==='fl'){
        const r=S.r[li]*genK(t.f.det,.25);
        for(const e of G.enemies){if(e.dead)continue;
          if(Math.hypot(e.x-best.x,e.y-best.y)<=r){hurt(e,S.dmg[li]);if(t.f.vuln)e.vuln=3;}}
        for(let k=0;k<10;k++){const a=Math.random()*6.28,v=Math.random()*r*1.6;
          G.parts.push({x:best.x,y:best.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.4,max:.4,c:Math.random()<.5?'#ff6a1a':'#ffd24a',r:.09});}
        G.tracers.push({x1:cx,y1:cy,x2:best.x,y2:best.y,t:.12,c:'#ff8a2a',w:5});
        t.cd=1/S.rate[li];sfx('fl');
      }else if(t.type==='sp'){
        hurt(best,S.dmg[li]);best.slowT=2;best.slowAmt=Math.min(.75,S.slow[li]+(t.f.elec?.1+.05*t.f.elec:0));
        t.cd=1;G.tracers.push({x1:cx,y1:cy,x2:best.x,y2:best.y,t:.1,c:t.f.elec?'#7fd6ff':'#c9c9c9'});sfx('sp');
      }
    }
    G.enemies=G.enemies.filter(e=>!e.dead);
    if(G.running&&!G.over&&!G.spawnQ.length&&!G.enemies.length)endWave();
  }
  for(const p of G.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
  G.parts=G.parts.filter(p=>p.life>0);
  for(const f of G.floats){f.t-=dt;f.y-=dt*.25;}
  G.floats=G.floats.filter(f=>f.t>0);
  for(const r of G.rings)r.t-=dt;G.rings=G.rings.filter(r=>r.t>0);
  for(const t of G.tracers)t.t-=dt;
  G.tracers=G.tracers.filter(t=>t.t>0);
  // дым от обломков
  SLOTS.forEach((s,i)=>{const t=G.slots[i];if(t&&t.rubble&&Math.random()<dt*2)
    G.parts.push({x:s[0]+.5+(Math.random()-.5)*.4,y:s[1]+.5,vx:0,vy:-.4,life:1.5,max:1.5,c:'#222',r:.09});});
}

function finish(win){
  G.over=true;G.overT=0;G.running=false;G.win=win;
  if(!win){
    boom(.5,9.5,3);boom(.5,9.5,2);G.shake=1;sfx('boom');
    setTimeout(()=>{if(G.over)showEnd();},1600);
  }else setTimeout(()=>{if(G.over)showEnd();},600);
}
function showEnd(){
  $('eTitle').textContent=G.win?'Заправка выстояла!':'Заправка взорвана';
  const names=G.found.map(k=>CBMAP[k].n);
  $('eInfo').innerHTML='Достигнута волна: <b>'+G.wave+'</b> из 10<br>Комбо в этой партии: '+(names.length?names.join(', '):'нет');
  show('sEnd');
}

/* ---------- интерфейс ---------- */
const sheet=$('sheet');let sheetHtml='';
function closeSheet(){if(G)G.sel=-1;sheet.style.display='none';sheetHtml='';}
function refreshSheet(){
  if(!G||G.sel<0){return;}
  const i=G.sel,t=G.slots[i];let h='';
  if(!t||t.rubble){
    h='<div class="h">'+(t?'Обломки: ':'')+'Построить башню</div>';
    for(const k of TKEYS){const d=TT[k];
      h+='<button data-b="'+k+'"'+(G.scrap<d.cost?' disabled':'')+'>'+d.n+' — '+d.cost+'</button>';}
  }else{
    const lk=G.links.filter(l=>l.i===i||l.j===i).map(l=>CBMAP[l.k].n);
    const uc=upCost(t);
    h='<div class="h"><b>'+TT[t.type].n+'</b> · ур. '+lvOf(t)+'/'+MAXLV+' · прочность '+Math.ceil(t.hp)+'/100<br>'
      +statLine(t)+'<br>Связи: '+(lk.length?lk.join(', '):'нет')+'</div>';
    if(uc!=null)h+='<button data-u="1"'+(G.scrap<uc?' disabled':'')+'>Улучшить до ур. '+(lvOf(t)+1)+' — '+uc+'</button>';
    else h+='<div class="h">Максимальный уровень</div>';
    const rc=repairCost(t);
    h+='<button data-r="1"'+(t.hp>=100||G.scrap<rc?' disabled':'')+'>Починить — '+rc+'</button>';
    h+='<button data-s="1" class="alt">Продать +'+sellValue(t)+'</button>';
  }
  if(h!==sheetHtml){sheetHtml=h;sheet.innerHTML=h;}
}
function openSheet(i){
  G.sel=i;sheet.style.display='flex';sheet.style.top=SLOTS[i][1]>=5?'6px':'auto';sheet.style.bottom=SLOTS[i][1]>=5?'auto':'6px';
  sheetHtml='';refreshSheet();
}
sheet.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b||b.disabled||!G||G.sel<0)return;
  if(b.dataset.b)build(G.sel,b.dataset.b);
  else if(b.dataset.u)upgrade(G.sel);
  else if(b.dataset.r)repair(G.sel);
  else if(b.dataset.s)sell(G.sel);
});
cv.addEventListener('pointerdown',ev=>{
  ac();if(!G||G.over)return;
  const r=cv.getBoundingClientRect();
  const c=Math.floor((ev.clientX-r.left-offX)/cs),row=Math.floor((ev.clientY-r.top-offY)/cs);
  const i=(c>=0&&c<COLS)?slotAt(c,row):-1;
  if(i<0||i===G.sel)closeSheet();else openSheet(i);
});
function show(id){
  for(const s of document.querySelectorAll('.scr'))s.style.display='none';
  if(id)$(id).style.display='flex';
  if(id==='sMenu')$('mBest').textContent='Лучший результат: волна '+save.best;
  if(id==='sBook')renderBook();
  if(id==='sSet')$('tSound').textContent='Звук: '+(save.sound?'вкл':'выкл');
}
function renderBook(){
  $('cards').innerHTML=CB.map(c=>save.combos.includes(c.k)
    ?'<div class="card"><b>'+c.n+'</b><br>'+c.e+'<br><i>«'+c.q+'»</i></div>'
    :'<div class="card off">???</div>').join('');
}
function updateWaveBtn(){
  const b=$('bWave');
  if(G.running){b.textContent='Волна идёт…';b.disabled=true;}
  else if(G.wave>=10){b.textContent='Конец';b.disabled=true;}
  else{b.textContent='Начать волну '+(G.wave+1);b.disabled=false;}
}
let shown={};
function hud(){
  const v={s:G.scrap,f:G.fuel,w:G.wave,r:G.running};
  if(shown.s!==v.s)$('hScrap').textContent=v.s;
  if(shown.f!==v.f)$('hFuel').textContent=v.f;
  if(shown.w!==v.w)$('hWave').textContent=v.w;
  if(shown.r!==v.r)updateWaveBtn();
  shown=v;
}
$('bWave').onclick=startWave;
$('bSpeed').onclick=()=>{G.speed=G.speed===1?2:1;$('bSpeed').textContent='×'+G.speed;};
$('bMenu').onclick=()=>{G.over=true;G.running=false;show('sMenu');};
$('mPlay').onclick=()=>{newGame();show(null);ac();};
$('mBook').onclick=()=>show('sBook');
$('mSet').onclick=()=>show('sSet');
$('tSound').onclick=()=>{save.sound=!save.sound;persist();show('sSet');if(save.sound)ac();};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show('sMenu'));
$('eAgain').onclick=()=>{newGame();show(null);};
$('eMenu').onclick=()=>show('sMenu');

/* =====================================================================
   РЕНДЕР (PixiJS): спрайты из assets/*.png, а если файла нет —
   процедурная заглушка. Свет: тёмный слой + «стирающие» источники.
   ===================================================================== */
const CELL=180,PX=256;               // клетка в мире (px) и в текстурах (px)
const ART={                          // имя: [ширина, высота] в клетках
  map:[6,10],slot:[1,1],station:[1,1],rubble:[1,1],
  raider:[1,.75],biker:[.8,.5],armor:[1.2,.9],boss:[2,1],
  mg_base:[1,1],mg_head:[1,1],fl_base:[1,1],fl_head:[1,1],sp_base:[1,1],sp_head:[1,1],gen_base:[1,1]};
const T={};
let app,world,floatLayer,L={},lightRT=null,lightSpr,darkG,vig,warm,fxG,selG,rubbleG;
const TO=[],EO=new Map(),FO=new Map(),lightPool=[],smokePool=[],glowPool=[],dustPool=[];
let ADD,ERASE,MULT;

/* ---------- процедурные текстуры ---------- */
function rrg(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);}
function rnd(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function wheelC(c,x,y,r){c.fillStyle='#121212';c.beginPath();c.arc(x,y,r,0,6.28);c.fill();c.fillStyle='#5b5b5b';c.beginPath();c.arc(x,y,r*.5,0,6.28);c.fill();}
function shadowC(c,x,y,rx,ry){c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,6.28);c.fill();}

const PROC={
  map(g,u){
    const W=COLS*u,H=ROWS*u,R=rnd(11);
    let gr=g.createLinearGradient(0,0,0,H);
    gr.addColorStop(0,'#bf9a62');gr.addColorStop(.55,'#b08850');gr.addColorStop(1,'#9a6e3e');
    g.fillStyle=gr;g.fillRect(0,0,W,H);
    for(let i=0;i<22;i++){
      const x=R()*W,y=R()*H,rx=u*(.8+R()*1.6),ry=u*(.2+R()*.4);
      g.fillStyle=R()<.5?'rgba(255,225,160,.11)':'rgba(60,30,8,.12)';
      g.beginPath();g.ellipse(x,y,rx,ry,R()*.6-.3,0,6.28);g.fill();
    }
    for(let i=0;i<W*H/90;i++){
      g.fillStyle=R()<.5?'rgba(255,232,175,.35)':'rgba(70,40,15,.28)';
      g.fillRect(R()*W,R()*H,2.2,2.2);
    }
    g.strokeStyle='rgba(55,28,8,.28)';g.lineWidth=1.5;
    for(let i=0;i<18;i++){
      let x=R()*W,y=R()*H;g.beginPath();g.moveTo(x,y);
      for(let k=0;k<5;k++){x+=(R()-.5)*u*.6;y+=(R()-.2)*u*.5;g.lineTo(x,y);}
      g.stroke();
    }
    const used=new Set();
    for(let i=0;i<WP.length-1;i++){
      const a=WP[i],b=WP[i+1];
      for(let c=Math.min(a[0],b[0]);c<=Math.max(a[0],b[0]);c++)
        for(let r=Math.min(a[1],b[1]);r<=Math.max(a[1],b[1]);r++)used.add(c+','+r);
    }
    SLOTS.forEach(s=>used.add(s[0]+','+s[1]));
    for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
      if(used.has(c+','+r)||R()<.3)continue;
      const x=(c+.25+R()*.5)*u,y=(r+.25+R()*.5)*u,k=R();
      g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+4,y+6,u*.15,u*.09,0,0,6.28);g.fill();
      if(k<.4){g.fillStyle='#6d6358';g.beginPath();g.ellipse(x,y,u*.14,u*.1,.4,0,6.28);g.fill();
        g.fillStyle='#8c8174';g.beginPath();g.ellipse(x-3,y-3,u*.08,u*.05,.4,0,6.28);g.fill();}
      else if(k<.65){g.fillStyle='#7d3418';g.beginPath();g.arc(x,y,u*.11,0,6.28);g.fill();
        g.fillStyle='#a8512a';g.beginPath();g.arc(x,y,u*.08,0,6.28);g.fill();
        g.strokeStyle='#3a1a0c';g.lineWidth=2;g.beginPath();g.arc(x,y,u*.11,0,6.28);g.stroke();}
      else if(k<.85){g.strokeStyle='#1d1916';g.lineWidth=u*.07;g.beginPath();g.arc(x,y,u*.09,0,6.28);g.stroke();
        g.fillStyle='#4a4239';g.beginPath();g.arc(x,y,u*.035,0,6.28);g.fill();}
      else{g.strokeStyle='#4a3420';g.lineWidth=3;g.beginPath();
        g.moveTo(x,y+u*.1);g.lineTo(x,y-u*.08);g.moveTo(x,y-u*.02);g.lineTo(x+u*.08,y-u*.1);
        g.moveTo(x,y-.04*u);g.lineTo(x-u*.07,y-u*.1);g.stroke();}
    }
    const path=()=>{g.beginPath();PTS.forEach((p,i)=>i?g.lineTo(p[0]*u,p[1]*u):g.moveTo(p[0]*u,p[1]*u));};
    g.lineJoin='round';g.lineCap='round';
    path();g.strokeStyle='rgba(50,28,8,.35)';g.lineWidth=u*1.02;g.stroke();
    path();g.strokeStyle='#76624a';g.lineWidth=u*.9;g.stroke();
    path();g.strokeStyle='#352a23';g.lineWidth=u*.8;g.stroke();
    path();g.strokeStyle='#2b221c';g.lineWidth=u*.46;g.stroke();
    for(const s of SEG){
      const n=Math.floor(s.len*u/3);
      for(let i=0;i<n;i++){
        const t=R()*s.len,l=(R()-.5)*u*.76;
        g.fillStyle=R()<.5?'rgba(255,240,220,.09)':'rgba(0,0,0,.3)';
        g.fillRect((s.x+s.dx*t)*u-s.dy*l,(s.y+s.dy*t)*u+s.dx*l,2.2,2.2);
      }
      for(let i=0;i<3;i++){
        const t=R()*s.len,l=(R()-.5)*u*.4;
        g.fillStyle='rgba(0,0,0,.28)';g.beginPath();
        g.ellipse((s.x+s.dx*t)*u-s.dy*l,(s.y+s.dy*t)*u+s.dx*l,u*.12,u*.06,R()*3,0,6.28);g.fill();
      }
    }
    path();g.lineCap='butt';g.setLineDash([u*.2,u*.3]);
    g.strokeStyle='rgba(224,178,72,.6)';g.lineWidth=Math.max(3,u*.04);g.stroke();g.setLineDash([]);
    g.fillStyle='rgba(255,179,71,.85)';
    g.beginPath();g.moveTo(.5*u,.9*u);g.lineTo(.5*u-14,.55*u);g.lineTo(.5*u+14,.55*u);g.fill();
  },
  slot(g,u){
    const x=-.47*u,y=-.47*u,w=.94*u;
    g.fillStyle='rgba(0,0,0,.4)';rrg(g,x+4,y+7,w,w,12);g.fill();
    const pg=g.createLinearGradient(x,y,x,y+w);pg.addColorStop(0,'#947354');pg.addColorStop(1,'#5a4230');
    g.fillStyle=pg;rrg(g,x,y,w,w,12);g.fill();
    g.strokeStyle='#2a190d';g.lineWidth=4;g.stroke();
    g.fillStyle='rgba(0,0,0,.3)';rrg(g,x+10,y+10,w-20,w-20,9);g.fill();
    g.fillStyle='#d2b88c';
    [[x+9,y+9],[x+w-9,y+9],[x+9,y+w-9],[x+w-9,y+w-9]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],3.5,0,6.28);g.fill();});
  },
  station(g,u){
    g.fillStyle='#4c433a';rrg(g,-.46*u,-.44*u,.92*u,.88*u,12);g.fill();
    g.strokeStyle='#241c16';g.lineWidth=4;g.stroke();
    g.fillStyle='rgba(0,0,0,.35)';rrg(g,-.32*u+5,-.3*u+7,.64*u,.6*u,.16*u);g.fill();
    const tg=g.createLinearGradient(-.32*u,0,.32*u,0);
    tg.addColorStop(0,'#555a5f');tg.addColorStop(.3,'#dfe2e4');tg.addColorStop(.7,'#9aa0a5');tg.addColorStop(1,'#42464a');
    g.fillStyle=tg;rrg(g,-.32*u,-.3*u,.64*u,.6*u,.16*u);g.fill();
    g.strokeStyle='#2c2f33';g.lineWidth=3;g.stroke();
    g.fillStyle='#2c2f33';g.fillRect(-.32*u,-.1*u,.64*u,4);g.fillRect(-.32*u,.1*u,.64*u,4);
    g.fillStyle='#111';rrg(g,-.1*u,-.22*u,.2*u,.44*u,6);g.fill();
    g.fillStyle='#ffb020';g.fillRect(-.08*u,-.05*u,.16*u,.25*u);
    g.fillStyle='#b8321e';g.fillRect(.3*u,-.18*u,.14*u,.3*u);
    g.fillStyle='#ffe3a0';g.fillRect(.33*u,-.14*u,.08*u,.08*u);
  },
  rubble(g,u){
    shadowC(g,4,10,.34*u,.2*u);
    const bits=[[-.26,-.1,.3,.2,'#3d3d3d'],[.0,-.26,.3,.2,'#4b4b4b'],[-.12,.06,.34,.2,'#2f2f2f'],[.14,.0,.2,.22,'#5a3a22'],[-.3,.15,.18,.1,'#7a3a16']];
    for(const b of bits){g.fillStyle=b[4];g.fillRect(b[0]*u,b[1]*u,b[2]*u,b[3]*u);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(b[0]*u,b[1]*u,b[2]*u,4);}
    g.strokeStyle='#8a8a8a';g.lineWidth=4;g.beginPath();g.moveTo(-.2*u,-.2*u);g.lineTo(.1*u,.2*u);g.stroke();
  },
  mg_base(g,u){
    shadowC(g,5,8,.33*u,.3*u);
    for(const p of [[-.27,-.27],[.27,-.27],[-.27,.27],[.27,.27]]){g.fillStyle='#a8946a';g.beginPath();g.ellipse(p[0]*u,p[1]*u,.1*u,.07*u,0,0,6.28);g.fill();}
    const bg=g.createRadialGradient(-.06*u,-.06*u,.03*u,0,0,.3*u);bg.addColorStop(0,'#b9c0c6');bg.addColorStop(1,'#4a5056');
    g.fillStyle=bg;g.beginPath();g.arc(0,0,.29*u,0,6.28);g.fill();
    g.strokeStyle='#22262a';g.lineWidth=4;g.stroke();
  },
  mg_head(g,u){
    g.fillStyle='#2a2e33';g.fillRect(.05*u,-.09*u,.38*u,.055*u);g.fillRect(.05*u,.035*u,.38*u,.055*u);
    g.fillStyle='#14161a';g.fillRect(.4*u,-.1*u,.05*u,.075*u);g.fillRect(.4*u,.025*u,.05*u,.075*u);
    g.fillStyle='#6d747c';rrg(g,-.15*u,-.15*u,.32*u,.3*u,9);g.fill();
    g.strokeStyle='#22262a';g.lineWidth=3;g.stroke();
    g.fillStyle='#5f6e3c';g.fillRect(-.13*u,.07*u,.13*u,.11*u);
    g.fillStyle='#ffd24a';g.fillRect(0,-.015*u,.1*u,.03*u);
  },
  fl_base(g,u){
    shadowC(g,5,8,.33*u,.3*u);
    g.fillStyle='#3a332d';g.beginPath();g.arc(0,0,.3*u,0,6.28);g.fill();
    g.strokeStyle='#e0a020';g.lineWidth=6;g.setLineDash([9,9]);g.stroke();g.setLineDash([]);
    for(const sy of [-1,1]){
      const tg=g.createLinearGradient(0,(sy*.14-.09)*u,0,(sy*.14+.09)*u);tg.addColorStop(0,'#e2552a');tg.addColorStop(.5,'#ff8a52');tg.addColorStop(1,'#8a2a10');
      g.fillStyle=tg;rrg(g,-.3*u,(sy*.14-.09)*u,.32*u,.18*u,9);g.fill();
      g.strokeStyle='#3a1208';g.lineWidth=3;g.stroke();
      g.fillStyle='#2a2a2a';g.fillRect(-.17*u,(sy*.14-.095)*u,.045*u,.19*u);
    }
  },
  fl_head(g,u){
    g.fillStyle='#555';g.fillRect(-.04*u,-.05*u,.34*u,.1*u);
    g.fillStyle='#222';g.fillRect(.26*u,-.08*u,.09*u,.16*u);
    g.fillStyle='#8a8f96';g.beginPath();g.arc(0,0,.1*u,0,6.28);g.fill();
    g.strokeStyle='#22262a';g.lineWidth=3;g.stroke();
  },
  sp_base(g,u){
    shadowC(g,5,8,.33*u,.3*u);
    g.fillStyle='#43484e';g.beginPath();g.arc(0,0,.3*u,0,6.28);g.fill();
    g.strokeStyle='#1c1f22';g.lineWidth=4;g.stroke();
  },
  sp_head(g,u){
    for(let k=0;k<8;k++){
      g.save();g.rotate(k*Math.PI/4);
      const sg=g.createLinearGradient(.1*u,0,.42*u,0);sg.addColorStop(0,'#8a9096');sg.addColorStop(1,'#eef1f3');
      g.fillStyle=sg;g.beginPath();g.moveTo(.1*u,-.075*u);g.lineTo(.44*u,0);g.lineTo(.1*u,.075*u);g.fill();
      g.strokeStyle='#2a2d30';g.lineWidth=2;g.stroke();g.restore();
    }
    const hg=g.createRadialGradient(-4,-4,2,0,0,.17*u);hg.addColorStop(0,'#9aa1a8');hg.addColorStop(1,'#3a3e43');
    g.fillStyle=hg;g.beginPath();g.arc(0,0,.16*u,0,6.28);g.fill();
    g.fillStyle='#c8a050';g.beginPath();g.arc(0,0,.055*u,0,6.28);g.fill();
  },
  gen_base(g,u){
    shadowC(g,5,8,.33*u,.3*u);
    const bg=g.createLinearGradient(0,-.26*u,0,.26*u);bg.addColorStop(0,'#6d9548');bg.addColorStop(1,'#3a5726');
    g.fillStyle=bg;rrg(g,-.3*u,-.26*u,.6*u,.52*u,10);g.fill();
    g.strokeStyle='#1f2f14';g.lineWidth=4;g.stroke();
    g.fillStyle='rgba(0,0,0,.45)';
    for(let k=0;k<4;k++)g.fillRect(-.26*u,(-.19+k*.075)*u,.2*u,.04*u);
    g.fillStyle='#b8651f';g.beginPath();g.arc(.1*u,-.03*u,.13*u,0,6.28);g.fill();
    g.strokeStyle='#e0903a';g.lineWidth=4;g.beginPath();g.arc(.1*u,-.03*u,.085*u,0,6.28);g.stroke();
    g.fillStyle='#ffe14a';g.beginPath();
    g.moveTo(.12*u,-.13*u);g.lineTo(.05*u,-.02*u);g.lineTo(.1*u,-.02*u);g.lineTo(.07*u,.08*u);g.lineTo(.17*u,-.04*u);g.lineTo(.12*u,-.04*u);g.fill();
    g.fillStyle='#222';g.fillRect(-.22*u,.1*u,.18*u,.03*u);g.fillRect(-.14*u,.02*u,.03*u,.18*u);
    g.fillStyle='#777';g.fillRect(.22*u,.14*u,.07*u,.15*u);
    g.fillStyle='#ffd24a';
    for(let k=0;k<4;k++)g.fillRect((-.28+k*.14)*u,.21*u,.07*u,.045*u);
  },
  raider(g,u){
    g.scale(1.3,1.3);
    shadowC(g,.03*u,.07*u,.3*u,.2*u);
    wheelC(g,-.15*u,-.17*u,.075*u);wheelC(g,.15*u,-.17*u,.065*u);wheelC(g,-.15*u,.17*u,.075*u);wheelC(g,.15*u,.17*u,.065*u);
    const bg=g.createLinearGradient(0,-.14*u,0,.14*u);bg.addColorStop(0,'#b0742f');bg.addColorStop(1,'#6e4118');
    g.fillStyle=bg;g.beginPath();
    g.moveTo(-.26*u,-.12*u);g.lineTo(.12*u,-.13*u);g.lineTo(.26*u,-.06*u);g.lineTo(.26*u,.06*u);g.lineTo(.12*u,.13*u);g.lineTo(-.26*u,.12*u);g.closePath();g.fill();
    g.strokeStyle='#2a1808';g.lineWidth=2.5;g.stroke();
    g.strokeStyle='#cfc8bc';g.lineWidth=3;g.beginPath();
    g.moveTo(-.18*u,-.1*u);g.lineTo(-.02*u,-.06*u);g.lineTo(-.02*u,.06*u);g.lineTo(-.18*u,.1*u);g.stroke();
    g.fillStyle='#d4a47a';g.beginPath();g.arc(-.08*u,0,.055*u,0,6.28);g.fill();
    g.fillStyle='#2a2a2a';g.beginPath();g.arc(-.1*u,0,.055*u,Math.PI*.6,Math.PI*1.4,true);g.fill();
    g.fillStyle='#b9b2a6';
    for(const s of[-1,1]){g.beginPath();g.moveTo(.26*u,s*.05*u);g.lineTo(.36*u,s*.07*u);g.lineTo(.26*u,s*.1*u);g.fill();}
    g.fillStyle='#ffe9a0';g.fillRect(.24*u,-.09*u,.03*u,.05*u);g.fillRect(.24*u,.04*u,.03*u,.05*u);
  },
  biker(g,u){
    g.scale(1.6,1.6);
    shadowC(g,.02*u,.05*u,.2*u,.1*u);
    wheelC(g,-.17*u,0,.07*u);wheelC(g,.17*u,0,.07*u);
    g.strokeStyle='#1a1a1a';g.lineWidth=4;g.beginPath();g.moveTo(-.17*u,0);g.lineTo(0,0);g.lineTo(.17*u,0);g.stroke();
    g.fillStyle='#a4352a';g.beginPath();g.ellipse(-.01*u,0,.14*u,.06*u,0,0,6.28);g.fill();
    g.strokeStyle='#999';g.lineWidth=3;g.beginPath();g.moveTo(.1*u,-.1*u);g.lineTo(.1*u,.1*u);g.stroke();
    g.fillStyle='#2b2b2b';g.beginPath();g.ellipse(-.04*u,0,.09*u,.08*u,0,0,6.28);g.fill();
    g.fillStyle='#c9c0b0';g.beginPath();g.arc(-.02*u,0,.055*u,0,6.28);g.fill();
    g.strokeStyle='#e8892a';g.lineWidth=4;g.beginPath();g.moveTo(-.08*u,0);g.lineTo(-.22*u,.02*u);g.stroke();
    g.fillStyle='#ffe9a0';g.fillRect(.2*u,-.02*u,.03*u,.04*u);
  },
  armor(g,u){
    g.scale(1.2,1.2);
    shadowC(g,.04*u,.08*u,.42*u,.26*u);
    for(const x of[-.22,0,.22]){wheelC(g,x*u,-.24*u,.07*u);wheelC(g,x*u,.24*u,.07*u);}
    const bg=g.createLinearGradient(0,-.2*u,0,.2*u);bg.addColorStop(0,'#a3a8ae');bg.addColorStop(1,'#5c6066');
    g.fillStyle=bg;rrg(g,-.38*u,-.2*u,.72*u,.4*u,9);g.fill();
    g.strokeStyle='#1d1f22';g.lineWidth=3;g.stroke();
    g.fillStyle='#6c7076';rrg(g,-.3*u,-.14*u,.4*u,.28*u,6);g.fill();
    g.fillStyle='#d4d7da';
    for(const p of[[-.34,-.16],[-.34,.16],[.3,-.16],[.3,.16],[-.1,-.16],[-.1,.16]]){g.beginPath();g.arc(p[0]*u,p[1]*u,3,0,6.28);g.fill();}
    g.fillStyle='#14171a';g.fillRect(.14*u,-.1*u,.08*u,.2*u);
    g.fillStyle='#ffb020';g.fillRect(.15*u,-.07*u,.04*u,.14*u);
    const rg=g.createLinearGradient(.34*u,0,.52*u,0);rg.addColorStop(0,'#b9bcc0');rg.addColorStop(1,'#6a6e73');
    g.fillStyle=rg;g.beginPath();g.moveTo(.34*u,-.2*u);g.lineTo(.52*u,0);g.lineTo(.34*u,.2*u);g.fill();
    g.strokeStyle='#22252a';g.stroke();
    g.fillStyle='#d8d8d8';
    for(const s of[-1,1]){g.beginPath();g.moveTo(-.1*u,s*.2*u);g.lineTo(0,s*.3*u);g.lineTo(.1*u,s*.2*u);g.fill();}
    g.fillStyle='#ff3a20';g.fillRect(-.37*u,-.1*u,.03*u,.05*u);g.fillRect(-.37*u,.05*u,.03*u,.05*u);
  },
  boss(g,u){
    g.scale(1.4,1.4);
    shadowC(g,.04*u,.1*u,.62*u,.34*u);
    for(const x of[-.4,-.2,.0,.28]){wheelC(g,x*u,-.27*u,.08*u);wheelC(g,x*u,.27*u,.08*u);}
    g.fillStyle='#43302a';rrg(g,-.52*u,-.24*u,.58*u,.48*u,8);g.fill();
    g.strokeStyle='#150d0a';g.lineWidth=3;g.stroke();
    g.fillStyle='#2c1d18';
    for(let k=0;k<4;k++)g.fillRect((-.48+k*.14)*u,-.2*u,.1*u,.4*u);
    g.fillStyle='#b6b0a4';
    for(const s of[-1,1])for(let k=0;k<4;k++){g.beginPath();g.moveTo((-.46+k*.14)*u,s*.24*u);g.lineTo((-.4+k*.14)*u,s*.34*u);g.lineTo((-.34+k*.14)*u,s*.24*u);g.fill();}
    const cg=g.createLinearGradient(0,-.24*u,0,.24*u);cg.addColorStop(0,'#c0301e');cg.addColorStop(1,'#6a150c');
    g.fillStyle=cg;rrg(g,.06*u,-.25*u,.34*u,.5*u,9);g.fill();
    g.strokeStyle='#220806';g.stroke();
    g.fillStyle='#ffb020';g.fillRect(.28*u,-.18*u,.08*u,.36*u);
    g.fillStyle='#d6d2c8';g.beginPath();g.arc(-.1*u,0,.09*u,0,6.28);g.fill();
    g.fillStyle='#111';g.beginPath();g.arc(-.13*u,-.03*u,.02*u,0,6.28);g.arc(-.07*u,-.03*u,.02*u,0,6.28);g.fill();
    g.fillRect(-.12*u,.03*u,.04*u,.04*u);
    g.fillStyle='#9a9a9a';
    for(const s of[-1,1]){g.beginPath();g.arc(.14*u,s*.1*u,.045*u,0,6.28);g.fill();}
    const rg=g.createLinearGradient(.4*u,0,.6*u,0);rg.addColorStop(0,'#a9acb0');rg.addColorStop(1,'#55585c');
    g.fillStyle=rg;g.beginPath();g.moveTo(.4*u,-.25*u);g.lineTo(.6*u,-.08*u);g.lineTo(.6*u,.08*u);g.lineTo(.4*u,.25*u);g.fill();
    g.strokeStyle='#1a1a1a';g.stroke();
    g.fillStyle='#ff4a1a';g.beginPath();g.arc(.37*u,-.2*u,.03*u,0,6.28);g.arc(.37*u,.2*u,.03*u,0,6.28);g.fill();
  }
};
function procTex(n){
  const [wc,hc]=ART[n],cn=document.createElement('canvas');
  cn.width=Math.round(wc*PX);cn.height=Math.round(hc*PX);
  const c=cn.getContext('2d');
  if(n!=='map')c.translate(cn.width/2,cn.height/2);
  PROC[n](c,PX);
  return PIXI.Texture.from(cn);
}
function utilTex(w,h,fn){
  const cn=document.createElement('canvas');cn.width=w;cn.height=h;
  fn(cn.getContext('2d'),w,h);return PIXI.Texture.from(cn);
}
function makeUtilTextures(){
  T.glow=utilTex(128,128,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
  T.smoke=utilTex(64,64,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
  T.cone=utilTex(256,128,(c,w,h)=>{
    const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=g;c.beginPath();c.moveTo(0,h*.42);c.lineTo(w,0);c.lineTo(w,h);c.lineTo(0,h*.58);c.closePath();c.fill();
  });
  T.shadow=utilTex(128,64,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
    g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
    c.save();c.translate(w/2,h/2);c.scale(1,h/w);
    const g2=c.createRadialGradient(0,0,0,0,0,w/2);
    g2.addColorStop(0,'rgba(0,0,0,.55)');g2.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g2;c.fillRect(-w/2,-w/2,w,w);c.restore();
  });
  T.vig=utilTex(256,256,(c,w,h)=>{
    const g=c.createRadialGradient(w/2,h/2,w*.28,w/2,h/2,w*.72);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(6,2,0,.75)');
    c.fillStyle=g;c.fillRect(0,0,w,h);
  });
}
async function loadArt(){
  let real=0;
  await Promise.all(Object.keys(ART).map(async n=>{
    const inl=window.__ASSETS&&window.__ASSETS[n];
    if(!inl&&location.protocol==='file:'){T[n]=procTex(n);return;}
    try{T[n]=await PIXI.Texture.fromURL(inl||('assets/'+n+'.png'));real++;}
    catch(e){T[n]=procTex(n);}
  }));
  // необязательный арт уровней: mg_base2, mg_head3 и т.д.; если файла нет — рисуются запасные значки
  const tryLv=[];
  for(const k of TKEYS)for(const lv of [2,3])for(const part of(k==='gen'?['base']:['base','head'])){
    const n=k+'_'+part+lv,inl=window.__ASSETS&&window.__ASSETS[n];
    if(!inl&&location.protocol==='file:')continue;
    tryLv.push(PIXI.Texture.fromURL(inl||('assets/'+n+'.png')).then(t=>{T[n]=t;real++;}).catch(()=>{}));
  }
  await Promise.all(tryLv);
  return real;
}

/* ---------- сцена ---------- */
const spr=(tex,w,h)=>{const s=new PIXI.Sprite(tex);s.anchor.set(.5);if(w){s.width=w;s.height=h;}return s;};
function fitSprite(s,name){const a=ART[name];s.width=a[0]*CELL;s.height=a[1]*CELL;return s;}

async function initRender(){
  ADD=PIXI.BLEND_MODES.ADD;ERASE=PIXI.BLEND_MODES.ERASE;MULT=PIXI.BLEND_MODES.MULTIPLY;
  app=new PIXI.Application({view:cv,resizeTo:$('cw'),antialias:true,backgroundAlpha:0,
    resolution:Math.min(2,window.devicePixelRatio||1),autoDensity:true});
  makeUtilTextures();
  await loadArt();
  world=new PIXI.Container();app.stage.addChild(world);
  const mk=n=>{const c=new PIXI.Container();world.addChild(c);L[n]=c;return c;};
  const map=new PIXI.Sprite(T.map);map.width=COLS*CELL;map.height=ROWS*CELL;world.addChild(map);
  mk('slots');mk('towers');mk('links');mk('enemies');mk('smoke');mk('fx');
  SLOTS.forEach(s=>{const p=spr(T.slot,CELL,CELL);p.position.set((s[0]+.5)*CELL,(s[1]+.5)*CELL);L.slots.addChild(p);});
  const st=spr(T.station,CELL,CELL);st.position.set(.5*CELL,9.5*CELL);L.slots.addChild(st);
  rubbleG=new PIXI.Graphics();L.slots.addChild(rubbleG);
  selG=new PIXI.Graphics();L.links.addChild(selG);
  fxG=new PIXI.Graphics();fxG.blendMode=ADD;L.fx.addChild(fxG);
  // свет
  darkG=new PIXI.Graphics();
  lightC=new PIXI.Container();lightC.addChild(darkG);
  lightSpr=new PIXI.Sprite();app.stage.addChild(lightSpr);
  warm=new PIXI.Sprite(PIXI.Texture.WHITE);warm.tint=0xffe2c4;warm.blendMode=MULT;app.stage.addChild(warm);
  vig=new PIXI.Sprite(T.vig);app.stage.addChild(vig);
  floatLayer=new PIXI.Container();app.stage.addChild(floatLayer);
  onResize();
  app.renderer.on('resize',onResize);
  app.ticker.add(frameTick);
}
let lightC;
function onResize(){
  const W=app.screen.width,H=app.screen.height;
  cs=Math.max(8,Math.floor(Math.min(W/COLS,H/ROWS)));
  offX=Math.floor((W-cs*COLS)/2);offY=Math.floor((H-cs*ROWS)/2);
  world.scale.set(cs/CELL);floatLayer.scale.set(cs/CELL);
  if(lightRT)lightRT.destroy(true);
  lightRT=PIXI.RenderTexture.create({width:Math.max(2,Math.ceil(W/2)),height:Math.max(2,Math.ceil(H/2))});
  lightSpr.texture=lightRT;lightSpr.scale.set(2);
  vig.width=W;vig.height=H;warm.width=W;warm.height=H;
}
function resetScene(){
  TO.forEach(o=>o&&o.c.destroy({children:true}));TO.length=0;
  for(const o of EO.values())o.c.destroy({children:true});EO.clear();
  for(const o of FO.values())o.destroy();FO.clear();
}

/* ---------- башни ---------- */
function makeTowerObj(i,t){
  const [col,row]=SLOTS[i],c=new PIXI.Container(),key=t.rubble?'rubble':t.type;
  c.position.set((col+.5)*CELL,(row+.5)*CELL);
  const lv=t.rubble?0:lvOf(t),o={c,key,t,lv};
  const lvTex=(part)=>(lv>1&&T[key+'_'+part+lv])||T[key+'_'+part];   // арт уровня, иначе базовый
  if(t.rubble){
    c.addChild(spr(T.rubble,CELL,CELL));o.glow=spr(T.glow,CELL*.5,CELL*.5);o.glow.tint=0xff6a1a;o.glow.blendMode=ADD;c.addChild(o.glow);
  }else{
    const hasLvBase=lv>1&&!!T[key+'_base'+lv];
    c.addChild(spr(lvTex('base'),CELL,CELL));
    if(T[key+'_head']){
      o.head=new PIXI.Container();
      const hasLvHead=lv>1&&!!T[key+'_head'+lv];
      o.headSpr=spr(lvTex('head'),CELL,CELL);
      if(lv>1&&!hasLvHead)o.headSpr.scale.set(o.headSpr.scale.x*(1+.07*(lv-1)));   // без арта: голова крупнее
      o.head.addChild(o.headSpr);
      if(key==='mg'){o.flash=spr(T.glow,CELL*.55,CELL*.55);o.flash.tint=0xffd870;o.flash.blendMode=ADD;o.flash.x=.46*CELL;o.head.addChild(o.flash);}
      if(key==='fl'){o.cone=new PIXI.Sprite(T.cone);o.cone.anchor.set(0,.5);o.cone.tint=0xff7a1a;o.cone.blendMode=ADD;o.cone.x=.33*CELL;o.head.addChild(o.cone);
        o.flash=spr(T.glow,CELL*.4,CELL*.4);o.flash.tint=0xffb040;o.flash.blendMode=ADD;o.flash.x=.36*CELL;o.head.addChild(o.flash);}
      c.addChild(o.head);
    }
    if(key==='gen'){o.glow=spr(T.glow,CELL*1.4,CELL*1.4);o.glow.tint=0xffd24a;o.glow.blendMode=ADD;c.addChild(o.glow);}
    o.up=spr(T.glow,CELL*1.5,CELL*1.5);o.up.tint=0x7fe36a;o.up.blendMode=ADD;o.up.alpha=0;c.addChild(o.up);   // вспышка при улучшении
    if(lv>1){                                                                                                // значки уровня (шевроны)
      const pg=new PIXI.Graphics();
      for(let k=0;k<lv-1;k++){const x=-.4*CELL+k*.11*CELL,y=-.4*CELL;
        pg.lineStyle(5,0x2a1a08,1);pg.moveTo(x,y);pg.lineTo(x+.05*CELL,y-.05*CELL);pg.lineTo(x+.1*CELL,y);
        pg.lineStyle(3,0xffd24a,1);pg.moveTo(x,y);pg.lineTo(x+.05*CELL,y-.05*CELL);pg.lineTo(x+.1*CELL,y);}
      c.addChild(pg);
    }
    o.bar=new PIXI.Container();
    const b0=new PIXI.Sprite(PIXI.Texture.WHITE);b0.tint=0;b0.alpha=.7;b0.width=.72*CELL;b0.height=14;b0.position.set(-.36*CELL,.36*CELL);
    const b1=new PIXI.Sprite(PIXI.Texture.WHITE);b1.height=10;b1.position.set(-.36*CELL+2,.36*CELL+2);
    o.bar.addChild(b0,b1);o.b1=b1;c.addChild(o.bar);
  }
  L.towers.addChild(c);
  return o;
}
function syncTowers(){
  for(let i=0;i<SLOTS.length;i++){
    const t=G.slots[i],key=t?(t.rubble?'rubble':t.type):'';
    let o=TO[i];
    if(o&&(o.key!==key||(t&&!t.rubble&&o.lv!==lvOf(t)))){o.c.destroy({children:true});o=TO[i]=null;}
    if(!t){continue;}
    if(!o)o=TO[i]=makeTowerObj(i,t);
    o.t=t;
    if(t.rubble){o.glow.alpha=.3+.25*Math.sin(G.t*9+i);continue;}
    if(o.up)o.up.alpha=t.upAt!=null?Math.max(0,1-(G.t-t.upAt)/.7)*.9:0;
    if(o.head){
      const rec=t.rec>0?Math.min(1,t.rec/.14):0;
      o.head.rotation=t.aim+(t.type==='sp'&&rec>0?.5:0);
      const k=(t.type==='mg'?14:5)*rec;
      o.head.position.set(-Math.cos(t.aim)*k,-Math.sin(t.aim)*k);
      if(o.flash)o.flash.visible=rec>.45;
      if(o.cone){o.cone.visible=rec>0;o.cone.width=(.25+.5*rec)*CELL;o.cone.height=.3*CELL*(.8+.4*Math.sin(G.t*40));}
    }
    if(o.glow){
      const lin=G.links.some(l=>l.i===i||l.j===i);
      o.glow.visible=lin;o.glow.alpha=.18+.15*Math.sin(G.t*5+i);
    }
    o.bar.visible=t.hp<100;
    if(o.bar.visible){o.b1.width=Math.max(2,(.72*CELL-4)*t.hp/100);o.b1.tint=t.hp>40?0x6ec83a:0xe2452a;}
  }
}

/* ---------- враги ---------- */
function makeEnemyObj(e){
  const c=new PIXI.Container();
  const a=ART[e.type];
  const sh=spr(T.shadow,a[0]*CELL*1.1,a[1]*CELL*.9);sh.position.set(.05*CELL,.08*CELL);
  const bodyC=new PIXI.Container();
  const body=spr(T[e.type],a[0]*CELL,a[1]*CELL);
  const lamp=new PIXI.Sprite(T.cone);lamp.anchor.set(0,.5);lamp.blendMode=ADD;
  lamp.x=a[0]*CELL*.42;lamp.width=CELL*(e.type==='boss'?1.6:1.1);lamp.height=CELL*.6;
  lamp.tint=e.type==='boss'?0xff5a28:0xffe2a0;lamp.alpha=.5;
  const fl=spr(T[e.type],a[0]*CELL,a[1]*CELL);fl.blendMode=ADD;fl.alpha=0;
  bodyC.addChild(body,lamp,fl);
  const spark=spr(T.glow,CELL*.5,CELL*.5);spark.tint=0xffd070;spark.blendMode=ADD;spark.visible=false;
  spark.x=a[0]*CELL*.5;bodyC.addChild(spark);
  const st=new PIXI.Graphics();
  const bar=new PIXI.Container();
  const b0=new PIXI.Sprite(PIXI.Texture.WHITE);b0.tint=0;b0.alpha=.7;
  const w=(e.type==='boss'?.9:.5)*CELL;b0.width=w+4;b0.height=14;b0.position.set(-w/2-2,0);
  const b1=new PIXI.Sprite(PIXI.Texture.WHITE);b1.height=10;b1.position.set(-w/2,2);
  bar.addChild(b0,b1);bar.y=-(e.type==='boss'?.62:.5)*CELL;
  c.addChild(sh,bodyC,st,bar);
  L.enemies.addChild(c);
  return {c,sh,bodyC,fl,spark,st,bar,b1,w,lamp,last:0};
}
function syncEnemies(){
  const seen=new Set();
  for(const e of G.enemies){
    seen.add(e);
    let o=EO.get(e);if(!o){o=makeEnemyObj(e);EO.set(e,o);}
    o.c.position.set(e.x*CELL,e.y*CELL);
    o.bodyC.rotation=e.a;o.sh.rotation=e.a;
    o.fl.alpha=e.flash>0?.7:0;
    o.spark.visible=e.atk;
    if(e.atk)o.spark.scale.set(.5+.25*Math.sin(G.t*40)+.01);
    o.bar.visible=e.hp<e.max;
    if(o.bar.visible){o.b1.width=Math.max(2,o.w*e.hp/e.max);o.b1.tint=e.hp/e.max>.5?0xd7a21e:0xe2452a;}
    const g=o.st;g.clear();
    if(e.burn>0){
      g.beginFill(0xff7a1a,.9);
      for(let k=0;k<3;k++)g.drawCircle((k-1)*.1*CELL,-.12*CELL-Math.abs(Math.sin(G.t*14+k))*.08*CELL,.06*CELL);
      g.endFill();
    }
    if(e.slowT>0){g.lineStyle(4,0x7fd6ff,.9);g.drawCircle(0,0,.34*CELL);}
    if(e.stun>0){g.lineStyle(0);g.beginFill(0xffffff);for(let k=0;k<3;k++){const a=G.t*6+k*2.1;g.drawCircle(Math.cos(a)*.2*CELL,-.28*CELL+Math.sin(a)*.05*CELL,5);}g.endFill();}
  }
  for(const [e,o] of EO)if(!seen.has(e)){o.c.destroy({children:true});EO.delete(e);}
}

/* ---------- эффекты, свет ---------- */
function poolSprite(pool,layer,tex,blend){
  return i=>{
    let s=pool[i];
    if(!s){s=new PIXI.Sprite(tex);s.anchor.set(.5);s.blendMode=blend;layer.addChild(s);pool[i]=s;}
    return s;
  };
}
let getSmoke,getGlow,getDust,lightN=0;
function lightAt(x,y,rad,alpha,tint,tex,rot){
  let s=lightPool[lightN];
  if(!s){s=new PIXI.Sprite(T.glow);s.anchor.set(.5);s.blendMode=ERASE;lightC.addChild(s);lightPool[lightN]=s;}
  lightN++;
  s.visible=true;s.texture=tex||T.glow;
  if(tex===T.cone){s.anchor.set(0,.5);s.rotation=rot||0;s.width=rad*cs;s.height=rad*cs*.8;}
  else{s.anchor.set(.5);s.rotation=0;s.width=s.height=rad*cs;}
  s.alpha=alpha;s.tint=tint||0xffffff;
  s.position.set((offX+x*cs)/2,(offY+y*cs)/2);
}
function syncFx(){
  const sh=G.shake>0?G.shake:0;
  const sx=sh?(Math.random()-.5)*10*sh:0,sy=sh?(Math.random()-.5)*10*sh:0;
  world.position.set(offX+sx,offY+sy);floatLayer.position.set(offX+sx,offY+sy);

  // график: связи, выстрелы, кольца
  const g=fxG;g.clear();
  const pulse=.55+.35*Math.sin(G.t*6);
  for(const l of G.links){
    const a=SLOTS[l.i],b=SLOTS[l.j];
    const x1=(a[0]+.5)*CELL,y1=(a[1]+.5)*CELL,x2=(b[0]+.5)*CELL,y2=(b[1]+.5)*CELL;
    g.lineStyle(16,0xffaa1e,pulse*.4);g.moveTo(x1,y1);g.lineTo(x2,y2);
    g.lineStyle(6,0xfff0aa,.6+pulse*.4);g.moveTo(x1,y1);g.lineTo(x2,y2);
    const k=(G.t*1.4+l.i*.37)%1;
    g.lineStyle(0);g.beginFill(0xffffff,.95);g.drawCircle(x1+(x2-x1)*k,y1+(y2-y1)*k,6);g.endFill();
  }
  for(const t of G.tracers){
    const a=Math.min(1,t.t*12),col=parseInt(t.c.slice(1),16),w=(t.w||2);
    g.lineStyle(w*5,col,a*.45);g.moveTo(t.x1*CELL,t.y1*CELL);g.lineTo(t.x2*CELL,t.y2*CELL);
    g.lineStyle(w*1.4,0xffffff,a);g.moveTo(t.x1*CELL,t.y1*CELL);g.lineTo(t.x2*CELL,t.y2*CELL);
  }
  for(const r of G.rings){
    const f=r.t/r.max;
    g.lineStyle(5+f*8,0xffb347,f);g.drawCircle(r.x*CELL,r.y*CELL,((1-f)*(.8+r.s*.5)+.05)*CELL);
  }
  // станция: шкала топлива и тревога
  g.lineStyle(0);
  for(let k=0;k<10;k++){
    const on=k<G.fuel;
    g.beginFill(on?(G.fuel<=3?0xe2452a:0xffb020):0x2a2420,on?.95:.7);
    g.drawRect((.08+k*.084)*CELL,9.9*CELL,.07*CELL,.08*CELL);g.endFill();
  }
  // выбранная башня
  selG.clear();
  if(G.sel>=0){
    const [c,r]=SLOTS[G.sel],t=G.slots[G.sel];
    if(t&&!t.rubble){
      const R=rangeOf(t);
      if(R>0){selG.lineStyle(4,0xffffff,.7);selG.beginFill(0xffffff,.1);selG.drawCircle((c+.5)*CELL,(r+.5)*CELL,R*CELL);selG.endFill();}
    }
    selG.lineStyle(6,0xffd24a,1);selG.drawRoundedRect(c*CELL+6,r*CELL+6,CELL-12,CELL-12,14);
  }

  // частицы
  let ns=0,ng=0;
  for(const p of G.parts){
    const f=Math.max(0,p.life/p.max);
    const smoke=p.c==='#1c1c1c'||p.c==='#222'||p.c==='#2a2623';
    const s=smoke?getSmoke(ns++):getGlow(ng++);
    s.visible=true;s.position.set(p.x*CELL,p.y*CELL);
    s.tint=smoke?0x2a2623:parseInt(p.c.slice(1),16);
    s.alpha=smoke?f*.55:f;
    const d=p.r*CELL*(smoke?3.2-f*1.2:2.2*(.6+f));
    s.width=s.height=d;
  }
  for(let i=ns;i<smokePool.length;i++)smokePool[i].visible=false;
  for(let i=ng;i<glowPool.length;i++)glowPool[i].visible=false;

  // пыль по ветру
  for(let k=0;k<20;k++){
    const s=getDust(k);
    s.x=(((k*.173+G.t*(.015+k%5*.008))%1.2)-.1)*COLS*CELL;
    s.y=((k*.311+Math.sin(G.t*.4+k)*.02)%1)*ROWS*CELL;
    s.width=(40+k%4*24);s.height=14+k%3*6;s.alpha=.12;
  }

  // плавающий текст
  const cur=new Set();
  for(const f of G.floats){
    cur.add(f);
    let t=FO.get(f);
    if(!t){
      t=new PIXI.Text(f.text,{fontFamily:'Trebuchet MS, Arial',fontSize:44,fontWeight:'bold',fill:f.c,stroke:'#000',strokeThickness:7,lineJoin:'round'});
      t.anchor.set(.5);floatLayer.addChild(t);FO.set(f,t);
    }
    t.position.set(f.x*CELL,f.y*CELL);t.alpha=Math.min(1,f.t);
  }
  for(const [f,t] of FO)if(!cur.has(f)){t.destroy();FO.delete(f);}

  // свет
  const W=app.screen.width,H=app.screen.height;
  const day=G.wave>=8?.46:.36;
  darkG.clear();darkG.beginFill(0x0c0716,day);darkG.drawRect(0,0,W/2,H/2);darkG.endFill();
  lightN=0;
  lightAt(.5,9.5,1.7,.85,0xffffff);
  if(G.fuel<=3)lightAt(.5,9.5,2.2,.4+.3*Math.sin(G.t*8),0xff5030);
  SLOTS.forEach((s,i)=>{
    const t=G.slots[i];if(!t)return;
    const cx=s[0]+.5,cy=s[1]+.5;
    if(t.rubble){lightAt(cx,cy,.9,.35+.2*Math.sin(G.t*9+i),0xffa050);return;}
    lightAt(cx,cy,1.0,.28);
    if(t.type==='gen'&&G.links.some(l=>l.i===i||l.j===i))lightAt(cx,cy,1.5,.55,0xffe080);
    if(t.rec>0){
      if(t.type==='mg')lightAt(cx+Math.cos(t.aim)*.4,cy+Math.sin(t.aim)*.4,1.6,.8,0xffe0a0);
      else if(t.type==='fl')lightAt(cx+Math.cos(t.aim)*.5,cy+Math.sin(t.aim)*.5,2.4,.9,0xffa050);
      else if(t.type==='sp')lightAt(cx,cy,1.3,.45,0xb0e0ff);
    }
  });
  for(const l of G.links){
    const a=SLOTS[l.i],b=SLOTS[l.j];lightAt((a[0]+b[0])/2+.5,(a[1]+b[1])/2+.5,1.3,.5,0xffd870);
  }
  for(const e of G.enemies){
    lightAt(e.x,e.y,e.type==='boss'?2.6:1.2,.55,e.type==='boss'?0xff7040:0xffffff);
    lightAt(e.x+Math.cos(e.a)*.35,e.y+Math.sin(e.a)*.35,e.type==='boss'?3.2:2.4,.7,0xffffff,T.cone,e.a);
    if(e.burn>0)lightAt(e.x,e.y,1.6,.7,0xff8030);
  }
  for(const r of G.rings){const f=r.t/r.max;lightAt(r.x,r.y,(1-f)*3+1.2,f*.95,0xffa040);}
  for(const t of G.tracers)if(t.w){lightAt(t.x2,t.y2,2.2,.8*Math.min(1,t.t*10),0xffa050);}
  for(let i=lightN;i<lightPool.length;i++)lightPool[i].visible=false;
  app.renderer.render(lightC,{renderTexture:lightRT,clear:true});
}

function frameTick(){
  if(!G||document.hidden)return;
  const real=Math.min(.1,app.ticker.deltaMS/1000);
  const sdt=real*G.speed,n=Math.ceil(sdt/.025);
  for(let i=0;i<n;i++)step(sdt/n);
  hud();refreshSheet();humUpdate();
  syncTowers();syncEnemies();syncFx();
}

/* ---------- запуск ---------- */
(async()=>{
  await initRender();
  getSmoke=poolSprite(smokePool,L.smoke,T.smoke,PIXI.BLEND_MODES.NORMAL);
  getGlow=poolSprite(glowPool,L.fx,T.glow,ADD);
  getDust=poolSprite(dustPool,L.fx,T.smoke,ADD);
  dustPool.forEach(s=>s.alpha=.12);
  newGame();show('sMenu');
  window.__benzak={get G(){return G;},build,upgrade,startWave,step,T,app};
  const ld=document.getElementById('loading');if(ld)ld.remove();
})();
})();
