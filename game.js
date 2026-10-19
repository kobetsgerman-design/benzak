
(()=>{
'use strict';
const COLS=6,ROWS=10;
/* ---------- кампания: карты идут одна за другой ----------
   WP — путь по клеткам (ось-выровненные отрезки), SLOTS — места под башни, art — имя текстуры карты,
   hp/cnt — множители здоровья и количества врагов, start/bonus — стартовый лом и награда за волну,
   dark — затемнение в начале и в конце карты, warm — тон света, vig — сила виньетки */
const MAPS=[
  {id:'wasteland',n:'Пустошь',art:'map',
   WP:[[0,0],[0,1],[5,1],[5,3],[0,3],[0,5],[5,5],[5,7],[0,7],[0,9]],
   SLOTS:[[0,2],[1,2],[2,2],[3,2],[2,4],[3,4],[4,4],[5,4],[0,6],[1,6],[2,6],[3,6],[1,8],[2,8],[1,9],[2,9],[2,0],[3,0]],
   hp:1,cnt:1,start:100,bonus:20,dark:[.10,.30],warm:0xfff1de,vig:.5,
   amb:{n:20,a:.12,tint:0xffffff,spd:1,dir:'x',w:40,h:14},grade:[.12,.08,1.0]},
  {id:'dunes',n:'Дюны',art:'map_dunes',
   WP:[[5,0],[5,2],[1,2],[1,4],[4,4],[4,6],[0,6],[0,8],[3,8],[3,9]],
   SLOTS:[[4,1],[2,1],[3,1],[2,3],[3,3],[4,3],[0,3],[1,5],[2,5],[3,5],[5,4],[1,7],[2,7],[3,7],[2,9],[4,8]],
   hp:1.15,cnt:1.1,start:90,bonus:17,dark:[.05,.26],warm:0xfff4dc,vig:.4,
   amb:{n:34,a:.2,tint:0xffe6b0,spd:12,dir:'x',w:70,h:6},grade:[.08,.1,1.04],
   decor:{set:'dunes',seed:7,dens:.72,items:[
     {i:1,w:3,sz:.62,k:'rock'},{i:2,w:3,sz:.46,k:'rock'},{i:3,w:3,sz:.34,k:'pebble'},
     {i:4,w:3,sz:.5,k:'sway'},{i:5,w:2,sz:.36,k:'sway'},{i:6,w:1,sz:.55,k:'bone',max:1},
     {i:7,w:1,sz:.95,k:'wreck',max:1},{i:8,w:1,sz:.4,k:'rock',max:2},{i:9,w:1,sz:.44,k:'rock',max:2}]}},
  {id:'city',n:'Руины города',art:'map_city',
   WP:[[0,0],[0,3],[2,3],[2,1],[4,1],[4,5],[1,5],[1,7],[5,7],[5,9],[2,9]],
   SLOTS:[[1,1],[1,2],[3,2],[3,3],[1,4],[2,4],[3,4],[2,6],[3,6],[4,6],[1,8],[2,8],[3,8],[5,2],[5,5],[1,0]],
   hp:1.2,cnt:1.15,start:80,bonus:15,dark:[.16,.38],warm:0xeaf0ff,vig:.6,
   amb:{n:46,a:.2,tint:0xb8d0ff,spd:.9,dir:'y',w:3,h:64},grade:[-.04,.14,.98]}];
let MI=0,MAP=MAPS[0],WP=MAP.WP,SLOTS=MAP.SLOTS,PTS=[],SEG=[],TOT=0,NB=[],EXIT=[0,9],FLEN=1,FA=0;
const TT={
  mg:{n:'Пулемёт',cost:30,range:2.5,up:[25,45]},
  fl:{n:'Огнемёт',cost:50,range:2,up:[40,70]},
  sp:{n:'Шипомёт',cost:40,range:2,up:[35,60]},
  gen:{n:'Генератор',cost:35,range:0,up:[30,50]},
  tes:{n:'Тесла',cost:60,range:2.2,up:[50,80]},
  mor:{n:'Миномёт',cost:70,range:3.6,up:[55,90]}};
const TKEYS=['mg','fl','sp','gen','tes','mor'];
/* уровни башен 1..3: значения по индексу уровня; у генератора усиливается бонус комбо */
const MAXLV=3;
const LV={
  mg:{dmg:[8,12,18],rate:[2,2.5,3],range:[2.5,2.8,3.1]},
  fl:{dmg:[20,28,38],rate:[.7,.8,.9],range:[2,2.2,2.4],r:[1,1.15,1.3]},
  sp:{dmg:[3,5,8],slow:[.4,.5,.6],range:[2,2.2,2.4]},
  gen:{},
  tes:{dmg:[14,20,28],rate:[1,1.1,1.2],range:[2.2,2.4,2.6],jmp:[2,2,3]},
  mor:{dmg:[40,60,85],rate:[.35,.4,.45],range:[3.6,4,4.4],r:[.9,1,1.1]}};
const lvOf=t=>t.lv||1;
/* 3-й уровень — выбор пути A или B */
const BR={
  mg:{a:{n:'Очередь',e:'скорострельность ×1,5'},b:{n:'Бронебой',e:'урон ×1,6, пробивает броню щитовика'}},
  fl:{a:{n:'Напалм',e:'поджигает цель, радиус +25%'},b:{n:'Дальний огонь',e:'дальность +0,6, урон +25%'}},
  sp:{a:{n:'Ледяные',e:'замедление +20%, каждое 4-е попадание замораживает'},b:{n:'Разрывные',e:'урон ×2,2 и взрыв вокруг цели'}},
  gen:{a:{n:'Перегруз',e:'бонус комбо сильнее на 60%'},b:{n:'Ремонтник',e:'чинит соседние башни, 2 ед/с'}},
  tes:{a:{n:'Дуга',e:'молния прыгает ещё на 2 цели'},b:{n:'Шок',e:'каждый удар оглушает на 0,8 с'}},
  mor:{a:{n:'Кассета',e:'3 снаряда разлетаются вокруг цели'},b:{n:'Фугас',e:'радиус +40%, урон +30%'}}};
const genLv=t=>lvOf(t)+(t.br==='a'?.6:0);
/* активные способности: перезарядка идёт только во время волны */
const AB={air:{n:'Воздушный удар',cd:45,e:'удар по выбранной точке'},rep:{n:'Ремонт',cd:60,e:'чинит все башни'},emp:{n:'ЭМИ',cd:70,e:'оглушает всех врагов'}};
const genK=(k,v)=>k?1+v*(k+1):1;          // множитель комбо от уровня генератора (ур.1 = ×1.4/×1.5)
function rangeOf(t){const S=LV[t.type];return S.range?(S.range[lvOf(t)-1]+(t.type==='fl'&&t.br==='b'?.6:0))*(t.f&&t.f.elec?genK(t.f.elec,.25):1):0;}
function upCost(t){const lv=lvOf(t);return lv>=MAXLV?null:TT[t.type].up[lv-1];}
function sellValue(t){return Math.floor((t.inv||TT[t.type].cost)*.5);}
function statLine(t){
  if(lvOf(t)===MAXLV&&t.br)return BR[t.type][t.br].n+': '+BR[t.type][t.br].e;
  const S=LV[t.type],lv=lvOf(t),n=lv<MAXLV,f=(a,u)=>n?a[lv-1]+u+' → '+a[lv]+u:a[lv-1]+u;
  if(t.type==='mg')return 'Урон '+f(S.dmg,'')+' · скорострельность '+f(S.rate,'/с')+' · дальность '+f(S.range,'');
  if(t.type==='fl')return 'Урон '+f(S.dmg.map((d,i)=>Math.round(d*S.rate[i])),'/с')+' · радиус '+f(S.r,'')+' · дальность '+f(S.range,'');
  if(t.type==='sp')return 'Урон '+f(S.dmg,'')+' · замедление '+(n?Math.round(S.slow[lv-1]*100)+'% → '+Math.round(S.slow[lv]*100)+'%':Math.round(S.slow[lv-1]*100)+'%')+' · дальность '+f(S.range,'');
  if(t.type==='tes')return 'Урон '+f(S.dmg,'')+' · дальность '+f(S.range,'')+' · прыжков '+(S.jmp[lv-1]+(t.br==='a'?2:0));
  if(t.type==='mor')return 'Урон '+f(S.dmg,'')+' · радиус '+f(S.r,'')+' · дальность '+f(S.range,'');
  return 'Усиление комбо соседей: +'+25*(lv+1)+'%'+(n?' → +'+25*(lv+2)+'%':'');
}
const EN={
  raider:{hp:40,sp:1.3,leak:1,rew:3,reach:0},
  biker:{hp:25,sp:2.2,leak:1,rew:3,reach:0},
  armor:{hp:120,sp:.8,leak:2,rew:10,reach:1,dps:15},
  shield:{hp:100,sp:.9,leak:2,rew:8,reach:0,arm:.35},       // щитовик: пулемёт и шипы бьют вдвое слабее, огонь — полностью
  sniper:{hp:60,sp:1.0,leak:1,rew:7,reach:2.0,dps:6},
  drone:{hp:45,sp:1.6,leak:1,rew:5,reach:0,fly:true},       // дрон летит напрямик; огнемёт, шипы и миномёт его не достают
  medic:{hp:80,sp:.85,leak:1,rew:9,reach:0,heal:6},         // лекарь чинит врагов вокруг, пока не оглушён     // штурмовик: останавливается и стреляет по башням издалека
  boss:{hp:900,sp:.5,leak:10,rew:100,reach:2,dps:28}};
/* 12 волн на каждой карте; здоровье растёт с волной, плюс множитель карты (MAP.hp/MAP.cnt) */
const WAVES=[
  {raider:8},{raider:10,biker:4},{raider:8,biker:6,armor:2},{raider:10,armor:2,drone:4},{raider:8,biker:8,armor:2,shield:1},
  {raider:12,armor:4,shield:2,medic:1},{biker:10,armor:4,sniper:1,drone:6},{raider:12,biker:8,armor:5,shield:2,sniper:1,medic:2},
  {raider:14,biker:8,armor:6,shield:3,sniper:2,drone:6},{armor:7,shield:4,sniper:3,biker:10,medic:3},
  {raider:16,biker:12,armor:7,shield:4,sniper:3,drone:8,medic:3},{boss:1,raider:10,armor:6,shield:4,sniper:3,drone:6,medic:3}];
const NWAVES=WAVES.length;
const CB=[
  {k:'fl+mg',n:'Зажигательные патроны',e:'Попадания пулемёта поджигают цель: 4 урона в секунду в течение 3 секунд',q:'Искра в гильзе — и пустошь горит ярче.'},
  {k:'mg+sp',n:'Пробитые колёса',e:'Каждый 3-й выстрел пулемёта обездвиживает цель на 1,5 секунды',q:'Без колёс даже король дороги — просто груда железа.'},
  {k:'gen+mg',n:'Форсаж',e:'Скорость стрельбы пулемёта +40%',q:'Мотор ревёт, ствол раскалён — спать будем потом.'},
  {k:'fl+sp',n:'Горящий заслон',e:'Враги в зоне огня получают на 20% больше урона в течение 3 секунд',q:'Кто прошёл через огонь, тот уже не вернётся прежним.'},
  {k:'fl+gen',n:'Детонация',e:'Радиус урона огнемёта по области +50%',q:'Здесь всё горит. Даже воздух.'},
  {k:'gen+sp',n:'Электрозабор',e:'Радиус замедления +50%, замедление растёт с 40% до 55%',q:'Проволока поёт, а гости пляшут.'}];
CB.push(
  {k:'gen+tes',n:'Перегрузка сети',e:'Цепная молния Теслы прыгает на одну цель дальше',q:'Искра бежит по проводам быстрее мысли.'},
  {k:'sp+tes',n:'Мокрый асфальт',e:'По замедленным врагам молния бьёт вдвое сильнее',q:'Колючая проволока — отличный проводник.'},
  {k:'fl+mor',n:'Зажигательные снаряды',e:'Снаряды миномёта поджигают врагов',q:'Что не взорвалось, то горит.'},
  {k:'gen+mor',n:'Усиленный заряд',e:'Радиус взрыва миномёта +30%',q:'Больше пороха — больше радости.'});
const CBMAP={};CB.forEach(c=>CBMAP[c.k]=c);
const FLAG={'mg>fl':'burn','mg>sp':'punct','mg>gen':'rate','fl>sp':'vuln','fl>gen':'det','sp>gen':'elec','tes>gen':'chain','tes>sp':'wet','mor>fl':'napalm','mor>gen':'big'};

/* ---------- сохранение ---------- */
let save={best:0,combos:[],sound:true,level:0,stars:{},ach:[],kills:0};
try{const s=JSON.parse(localStorage.getItem('benzak')||'null');if(s)save=Object.assign(save,s);}catch(e){}
function persist(){try{localStorage.setItem('benzak',JSON.stringify(save));}catch(e){}}

/* ---------- достижения ---------- */
const ACH=[
  {id:'lv3',n:'Мастер на все руки',d:'Улучшить башню до 3-го уровня'},
  {id:'combo3',n:'Комбинатор',d:'Собрать 3 разных комбо за одну партию'},
  {id:'allcombo',n:'Книга закрыта',d:'Открыть все комбо в Книге комбо'},
  {id:'alltypes',n:'Арсенал',d:'Построить все типы башен за одну партию'},
  {id:'air3',n:'Ковровая бомбардировка',d:'Убить воздушным ударом 3 врагов сразу'},
  {id:'boss',n:'Король дороги',d:'Победить босса'},
  {id:'flawless',n:'Без единой капли',d:'Пройти карту, не потеряв топлива'},
  {id:'campaign',n:'Бензак спасён',d:'Пройти все три карты'},
  {id:'kills100',n:'Охотник',d:'Уничтожить 100 врагов'},
  {id:'kills1000',n:'Истребитель',d:'Уничтожить 1000 врагов'},
  {id:'rich',n:'Барон лома',d:'Накопить 500 лома'}];
function ach(id){
  if(save.ach.includes(id))return;
  const a=ACH.find(x=>x.id===id);if(!a)return;
  save.ach.push(id);persist();
  const t=document.getElementById('toast');
  if(t){t.innerHTML='<b>Достижение!</b> '+a.n;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');}
  try{sfx('combo');}catch(e){}
}
const starsOf=f=>f>=10?3:f>=7?2:1;                 // звёзды за карту: 1 — победа, 2 — топлива ≥7, 3 — без потерь
const starStr=n=>'★'.repeat(n)+'☆'.repeat(3-n);

/* ---------- путь и соседи ---------- */
function setMap(i){            // переключает путь, слоты, соседей и выход на карту i
  MI=i;MAP=MAPS[i];WP=MAP.WP;SLOTS=MAP.SLOTS;
  PTS=WP.map(p=>[p[0]+.5,p[1]+.5]);SEG=[];TOT=0;
  for(let k=0;k<PTS.length-1;k++){
    const dx=PTS[k+1][0]-PTS[k][0],dy=PTS[k+1][1]-PTS[k][1],len=Math.hypot(dx,dy);
    SEG.push({x:PTS[k][0],y:PTS[k][1],dx:dx/len,dy:dy/len,len,s:TOT});TOT+=len;
  }
  EXIT=WP[WP.length-1];
  FLEN=Math.hypot(EXIT[0]+.5-PTS[0][0],EXIT[1]+.5-PTS[0][1]);FA=Math.atan2(EXIT[1]+.5-PTS[0][1],EXIT[0]+.5-PTS[0][0]);   // прямая для летающих
  NB=SLOTS.map((s,a)=>{const r=[];SLOTS.forEach((o,b)=>{if(b!==a&&Math.abs(o[0]-s[0])+Math.abs(o[1]-s[1])===1)r.push(b);});return r;});
}
setMap(0);
function pathPos(d){
  for(const s of SEG)if(d<=s.s+s.len){const t=d-s.s;return{x:s.x+s.dx*t,y:s.y+s.dy*t,a:Math.atan2(s.dy,s.dx)};}
  const s=SEG[SEG.length-1];return{x:s.x+s.dx*s.len,y:s.y+s.dy*s.len,a:Math.atan2(s.dy,s.dx)};
}
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
function newGame(level){
  if(level!=null&&level!==MI)setMap(level);
  try{resetScene();}catch(e){}
  G={scrap:MAP.start,fuel:10,wave:0,running:false,over:false,overT:0,speed:1,slots:SLOTS.map(()=>null),
     enemies:[],parts:[],floats:[],tracers:[],rings:[],spawnQ:[],spawnT:0,sel:-1,links:[],found:[],t:0,shake:0,slowT:0,alert:0,map:MI,dq:[],cd:{air:0,rep:0,emp:0},strikes:[],shells:[],aim:null};
  G.floats.push({x:3,y:4.6,text:'Карта '+(MI+1)+' · '+MAP.n,t:3,c:'#ffd24a'});
  try{applyMapScene();}catch(e){}
  $('bSpeed').textContent='×1';$('hWaveMax').textContent=NWAVES;closeSheet();updateWaveBtn();
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
      let f=FLAG[a.type+'>'+b.type];if(f)a.f[f]=Math.max(a.f[f]||0,b.type==='gen'?genLv(b):1);
      f=FLAG[b.type+'>'+a.type];if(f)b.f[f]=Math.max(b.f[f]||0,a.type==='gen'?genLv(a):1);
      if(!old.has(i+'-'+j))born.push({i,j,k});
    }
  });
  return born;
}
function announce(born){
  for(const l of born){
    const c=CBMAP[l.k],[x1,y1]=SLOTS[l.i],[x2,y2]=SLOTS[l.j];
    G.floats.push({x:(x1+x2)/2+.5,y:(y1+y2)/2+.2,text:c.n,t:2.2,c:'#ffd24a'});
    if(!G.found.includes(l.k)){G.found.push(l.k);if(G.found.length>=3)ach('combo3');}
    if(!save.combos.includes(l.k)){save.combos.push(l.k);persist();sfx('combo');if(save.combos.length>=CB.length)ach('allcombo');}
    else sfx('buy');
  }
}

/* ---------- действия игрока ---------- */
function build(i,type){
  const d=TT[type];if(G.over||G.scrap<d.cost)return;
  const s=G.slots[i];if(s&&!s.rubble)return;
  (G.types=G.types||new Set()).add(type);if(G.types.size>=TKEYS.length)ach('alltypes');
  G.scrap-=d.cost;G.slots[i]={type,hp:100,cd:0,shots:0,aim:0,f:{},lv:1,inv:d.cost};
  announce(recompute());sfx('buy');closeSheet();
}
function sell(i){
  const t=G.slots[i];if(!t||t.rubble)return;
  G.scrap+=sellValue(t);G.slots[i]=null;recompute();sfx('buy');closeSheet();
}
function upgrade(i,br){
  const t=G.slots[i];if(!t||t.rubble||G.over)return;
  const c=upCost(t);if(c==null||G.scrap<c)return;
  if(lvOf(t)===2){if(br!=='a'&&br!=='b')br='a';t.br=br;}   // на 3-й уровень — с выбором пути (по умолчанию A)
  G.scrap-=c;t.lv=lvOf(t)+1;t.inv=(t.inv||TT[t.type].cost)+c;t.hp=100;t.upAt=G.t;
  const [col,row]=SLOTS[i];
  G.floats.push({x:col+.5,y:row+.2,text:t.br?BR[t.type][t.br].n:'Уровень '+t.lv,t:1.8,c:'#7fe36a'});
  if(t.lv===3)ach('lv3');
  announce(recompute());sfx('combo');
}
function useAbility(k){
  if(!G||G.over||G.cd[k]>0)return;
  if(k==='air'){G.aim=G.aim==='air'?null:'air';closeSheet();return;}
  if(k==='rep'){
    let n=0;G.slots.forEach((t,i)=>{if(t&&!t.rubble&&t.hp<100){t.hp=100;n++;const [c,r]=SLOTS[i];G.floats.push({x:c+.5,y:r+.2,text:'+',t:1.1,c:'#7fe36a',s:34});}});
    G.cd.rep=AB.rep.cd;sfx('buy');
    G.floats.push({x:3,y:4.6,text:n?'Башни отремонтированы':'Ремонтировать нечего',t:1.6,c:'#7fe36a'});
  }
  if(k==='emp'){
    for(const e of G.enemies)if(!e.dead)e.stun=Math.max(e.stun,2.5);
    G.rings.push({x:3,y:5,t:.8,max:.8,s:5});G.shake=.3;G.cd.emp=AB.emp.cd;sfx('combo');
    G.floats.push({x:3,y:4.6,text:'ЭМИ!',t:1.4,c:'#9fe0ff'});
  }
}
function airStrike(x,y){G.strikes.push({x,y,t:.9});G.cd.air=AB.air.cd;G.aim=null;sfx('buy');}
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
  if(G.running||G.over||G.wave>=NWAVES)return;ac();
  const w=WAVES[G.wave];G.wave++;
  const q=[];for(const k in w){const c=k==='boss'?w[k]:Math.round(w[k]*MAP.cnt);for(let n=0;n<c;n++)q.push(k);}
  for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]];}
  const bi=q.indexOf('boss');if(bi>=0){q.splice(bi,1);q.splice(Math.min(4,q.length),0,'boss');}
  G.spawnQ=q;G.spawnT=.5;G.running=true;updateWaveBtn();
}
function endWave(){
  G.running=false;G.scrap+=MAP.bonus;
  if(G.scrap>=500)ach('rich');if(save.kills>=100)ach('kills100');if(save.kills>=1000)ach('kills1000');persist();
  if(G.wave>save.best){save.best=G.wave;persist();}
  if(G.wave>=NWAVES){finish(true);return;}
  updateWaveBtn();
}

/* ---------- игровой цикл ---------- */
function boom(x,y,s){
  const lim=G.parts.length>650;                       // защита производительности: при перегрузе только вспышка и кольцо
  G.rings.push({x,y,t:.45,max:.45,s});G.rings.push({x,y,t:.7,max:.7,s:s*1.6});
  G.dq.push({x,y,s:Math.min(1.3,.3+.25*s),a:.34});     // подпалина на земле
  G.parts.push({x,y,vx:0,vy:0,life:.2,max:.2,k:'fl',c:'#ffffff',r:.22+.13*s});       // белая вспышка
  if(lim)return;
  for(let i=0;i<5+4*s;i++){const a=Math.random()*6.28,v=.2+Math.random()*1.1*s;       // огненный шар
    G.parts.push({x:x+Math.cos(a)*.08,y:y+Math.sin(a)*.08,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.15,life:.4+Math.random()*.4,max:.8,k:'fl',c:'#ff9a2a',r:.13+Math.random()*.1*(1+s*.4)});}
  for(let i=0;i<10+8*s;i++){const a=Math.random()*6.28,v=1.5+Math.random()*3.5*s;       // раскалённые искры с гравитацией
    G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,g:5,life:.5+Math.random()*.6,max:1,c:'#ffd070',r:.02+Math.random()*.02});}
  for(let i=0;i<3+3*s;i++){const a=Math.random()*6.28,v=1+Math.random()*2.2*s;         // тёмные обломки
    G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1.2,g:6,life:.7+Math.random()*.6,max:1.3,k:'deb',c:'#3a322c',r:.04+Math.random()*.04});}
  for(let i=0;i<4+4*s;i++)G.parts.push({x:x+(Math.random()-.5)*.25,y,vx:(Math.random()-.5)*.6,vy:-.45-Math.random()*.8,life:1.1+Math.random()*1.1,max:2.2,c:'#1c1c1c',r:.1+Math.random()*.12});   // дым
}
function hurt(e,d,src){          // src: 'mg' | 'sp' | иначе (огонь/горение) — броня щитовика гасит пули и шипы
  if(e.dead)return;
  const arm=EN[e.type].arm;if(arm&&(src==='mg'||src==='sp'))d*=1-arm;
  if(e.vuln>0)d*=1.2;
  e.hp-=d;e.flash=.08;
  if(e.hp<=0){
    e.dead=true;G.scrap+=EN[e.type].rew;save.kills++;if(e.type==='boss')ach('boss');
    G.floats.push({x:e.x,y:e.y-.15,text:'+'+EN[e.type].rew,t:.85,c:'#ffd24a',s:30});
    boom(e.x,e.y,e.type==='boss'?3:.6);sfx(e.type==='boss'?'boom':'clang');
    {const big=(e.type==='boss')?4:(e.type==='armor'||e.type==='shield'||e.type==='medic')?2:1;      // колёса и броня разлетаются
     for(let k=0;k<4*big;k++){const a=Math.random()*6.28,v=1.4+Math.random()*2.6;
       G.parts.push({x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-1,g:5.5,life:.8+Math.random()*.7,max:1.5,k:'deb',c:'#2a2623',r:.06+Math.random()*.05});}}
    if(e.type==='boss'){G.slowT=1.0;G.alert=.5;}
    if(e.type==='boss')G.shake=.6;
  }
}
function makeEnemy(type,d){
  const E=EN[type],hp=Math.round(E.hp*MAP.hp*(1+.05*(G.wave-1))),p=E.fly?{x:PTS[0][0],y:PTS[0][1],a:FA}:pathPos(d);
  return {type,d,fly:!!E.fly,x:p.x,y:p.y,a:(d>0||E.fly)?p.a:Math.PI/2,hp,max:hp,slowT:0,slowAmt:0,burn:0,stun:0,vuln:0,flash:0,dead:false,atk:false,ph:Math.random()*6};
}
function step(dt){
  G.t+=dt;
  if(G.shake>0)G.shake-=dt;
  if(G.over){G.overT+=dt;}
  else{
    if(G.running){
      for(const k in G.cd)if(G.cd[k]>0)G.cd[k]=Math.max(0,G.cd[k]-dt);       // перезарядка идёт только во время волны
      G.spawnT-=dt;
      if(G.spawnQ.length&&G.spawnT<=0){
        const type=G.spawnQ.shift();
        G.enemies.push(makeEnemy(type,0));
        if(type==='boss'){G.slowT=1.6;G.alert=.6;G.shake=.9;sfx('boom');G.floats.push({x:3,y:4.3,text:'БОСС',t:2.8,c:'#ff5a3a',s:96});G.floats.push({x:3,y:5.2,text:'Боевая фура',t:2.8,c:'#ffd070',s:44});}
        G.spawnT=type==='boss'?1.5:(type==='biker'?.55:.85);
      }
    }
    // снаряды миномётов
    for(const sh of G.shells){
      sh.t-=dt;
      if(sh.t<=0&&!sh.done){
        sh.done=true;boom(sh.x,sh.y,.8+sh.r);G.shake=Math.max(G.shake,.12);sfx('boom');
        for(const e of G.enemies)if(!e.dead&&!e.fly&&Math.hypot(e.x-sh.x,e.y-sh.y)<=sh.r){hurt(e,sh.dmg,'mor');if(sh.nap)e.burn=Math.max(e.burn,4);}
      }
    }
    G.shells=G.shells.filter(sh=>!sh.done);
    // воздушные удары
    for(const st of G.strikes){
      st.t-=dt;
      if(st.t<=0&&!st.done){
        st.done=true;boom(st.x,st.y,2.4);G.shake=.5;sfx('boom');
        let kk=0;for(const e of G.enemies)if(!e.dead&&Math.hypot(e.x-st.x,e.y-st.y)<=1.25){hurt(e,170,'air');e.burn=Math.max(e.burn,3);if(e.dead)kk++;}
        if(kk>=3)ach('air3');
      }
    }
    G.strikes=G.strikes.filter(st=>!st.done);
    // враги
    for(const e of G.enemies){
      if(e.dead)continue;const E=EN[e.type];
      if(e.burn>0){e.burn-=dt;hurt(e,4*dt,'fl');if(e.dead)continue;}
      if(e.slowT>0)e.slowT-=dt;if(e.stun>0)e.stun-=dt;if(e.vuln>0)e.vuln-=dt;if(e.flash>0)e.flash-=dt;
      e.atk=false;
      if(Math.random()<dt*(e.type==='boss'?10:3)){
        G.parts.push({x:e.x-Math.cos(e.a)*.3,y:e.y-Math.sin(e.a)*.3-.08,vx:-Math.cos(e.a)*.2+(Math.random()-.5)*.2,vy:-.35,life:.8,max:.8,c:'#2a2623',r:.06+Math.random()*.05});
      }
      if(e.type==='boss'){                       // фазы босса: подмога на 66%, ярость на 33%
        const f=e.hp/e.max;
        if(!e.p1&&f<.66){e.p1=1;for(let k=0;k<5;k++)G.enemies.push(makeEnemy('raider',Math.max(0,e.d-.6-k*.45)));
          G.floats.push({x:e.x,y:Math.max(1,e.y-.5),text:'Босс зовёт подмогу!',t:2.2,c:'#ff8a5a'});G.shake=.5;sfx('boom');}
        if(!e.p2&&f<.33){e.p2=1;G.floats.push({x:e.x,y:Math.max(1,e.y-.5),text:'Ярость!',t:2.2,c:'#ff5a3a'});G.shake=.6;sfx('boom');}
      }
      if(e.stun>0)continue;
      if(E.heal){                                // лекарь чинит врагов вокруг
        for(const o of G.enemies){if(o===e||o.dead||o.hp>=o.max)continue;
          if(Math.hypot(o.x-e.x,o.y-e.y)<=1.3){o.hp=Math.min(o.max,o.hp+E.heal*dt);if(Math.random()<dt*3)G.parts.push({x:o.x,y:o.y-.1,vx:0,vy:-.6,life:.6,max:.6,c:'#7fe36a',r:.03});}}
      }
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
      const sp=E.sp*(e.slowT>0?1-e.slowAmt:1)*(e.p2?1.6:1);
      e.d+=sp*dt;
      if(e.d>=(EN[e.type].fly?FLEN:TOT)){
        e.dead=true;e.leaked=true;G.fuel-=E.leak;sfx('leak');G.shake=.3;
        G.floats.push({x:EXIT[0]+.5,y:EXIT[1],text:'-'+E.leak,t:1.2,c:'#ff5a3a'});
        if(G.fuel<=0){G.fuel=0;finish(false);}
        continue;
      }
      if(E.fly){const k=e.d/FLEN;e.x=PTS[0][0]+(EXIT[0]+.5-PTS[0][0])*k;e.y=PTS[0][1]+(EXIT[1]+.5-PTS[0][1])*k;e.a=FA;e.fly=true;}
      else{const p=pathPos(e.d);e.x=p.x;e.y=p.y;e.a=p.a;}
    }
    // башни
    for(let i=0;i<SLOTS.length;i++){
      const t=G.slots[i];
      if(t&&!t.rubble&&t.type==='gen'&&t.br==='b')for(const j of NB[i]){const o=G.slots[j];if(o&&!o.rubble&&o.hp<100)o.hp=Math.min(100,o.hp+2*dt);}   // ветка «Ремонтник»
      if(t&&!t.rubble&&t.hp<60){                      // повреждённая башня дымит, а при критическом уроне горит
        const px=SLOTS[i][0]+.5,py=SLOTS[i][1]+.5;
        if(Math.random()<dt*(t.hp<30?9:4))G.parts.push({x:px+(Math.random()-.5)*.4,y:py-.1,vx:(Math.random()-.5)*.2,vy:-.5,life:1.1,max:1.1,c:'#2a2623',r:.08+Math.random()*.05});
        if(t.hp<30&&Math.random()<dt*7)G.parts.push({x:px+(Math.random()-.5)*.35,y:py+(Math.random()-.5)*.2,vx:0,vy:-.8,life:.45,max:.45,k:'fl',c:'#ff8a1a',r:.05+Math.random()*.03});
      }
      if(!t||t.rubble||t.type==='gen')continue;
      if(t.rec>0)t.rec-=dt;t.cd-=dt;if(t.cd>0)continue;
      const cx=SLOTS[i][0]+.5,cy=SLOTS[i][1]+.5,R=rangeOf(t),S=LV[t.type],li=lvOf(t)-1;
      let best=null;
      for(const e of G.enemies){if(e.dead)continue;
        if(e.fly&&(t.type==='fl'||t.type==='sp'||t.type==='mor'))continue;     // огонь, шипы и мины по воздуху не бьют
        if(Math.hypot(e.x-cx,e.y-cy)<=R&&(!best||e.d>best.d))best=e;}
      if(!best)continue;
      t.aim=Math.atan2(best.y-cy,best.x-cx);t.rec=.14;
      if(t.type==='mg'){
        hurt(best,S.dmg[li]*(t.br==='b'?1.6:1),t.br==='b'?'pierce':'mg');if(t.f.burn)best.burn=3;
        if(t.f.punct){t.shots++;if(t.shots%3===0)best.stun=1.5;}
        t.cd=1/(S.rate[li]*(t.br==='a'?1.5:1)*genK(t.f.rate,.2));
        G.tracers.push({x1:cx,y1:cy,x2:best.x,y2:best.y,t:.07,c:'#ffe9a0'});sfx('mg');
        {const pa=t.aim+1.55;G.parts.push({x:cx+Math.cos(t.aim)*.15,y:cy+Math.sin(t.aim)*.15,vx:Math.cos(pa)*1.6+(Math.random()-.5)*.4,vy:Math.sin(pa)*1.6-.2,life:.45,max:.45,c:'#ffd060',r:.022});}   // гильза
      }else if(t.type==='fl'){
        // непрерывная струя пламени: тик каждые 0.1 с, средний урон в секунду прежний (dmg × rate)
        const r=S.r[li]*genK(t.f.det,.25)*(t.br==='a'?1.25:1),tick=S.dmg[li]*S.rate[li]*.1*(t.br==='b'?1.25:1);
        for(const e of G.enemies){if(e.dead)continue;
          if(Math.hypot(e.x-best.x,e.y-best.y)<=r){hurt(e,tick);if(t.f.vuln)e.vuln=3;if(t.br==='a')e.burn=Math.max(e.burn,4);}}
        const ang=t.aim,dist=Math.hypot(best.x-cx,best.y-cy),mx=cx+Math.cos(ang)*.3,my=cy+Math.sin(ang)*.3;
        for(let k=0;k<7;k++){            // язык пламени: частицы летят от сопла к цели, растут и гаснут (жёлтый → оранжевый → красный)
          const a=ang+(Math.random()-.5)*.34,v=Math.max(2.2,Math.min(7.5,dist/.42))*(.75+Math.random()*.4);
          G.parts.push({x:mx,y:my,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.42+Math.random()*.16,max:.58,k:'fl',c:'#ffb030',r:.1+Math.random()*.06});}
        for(let k=0;k<3;k++){            // очаг огня на цели
          G.parts.push({x:best.x+(Math.random()-.5)*r,y:best.y+(Math.random()-.5)*r,vx:(Math.random()-.5)*.8,vy:-.4-Math.random()*.9,life:.35+Math.random()*.25,max:.6,k:'fl',c:'#ff8a1a',r:.12+Math.random()*.07});}
        if(Math.random()<.35)G.parts.push({x:best.x,y:best.y-.1,vx:(Math.random()-.5)*.4,vy:-.5-Math.random()*.4,life:.9,max:.9,c:'#2a2623',r:.09});
        if(Math.random()<.5)G.parts.push({x:best.x+(Math.random()-.5)*r,y:best.y,vx:(Math.random()-.5)*.5,vy:-.9-Math.random()*.6,life:.8,max:.8,c:'#ffd070',r:.018});   // уголёк
        t.tx=best.x;t.ty=best.y;t.fd=dist;
        if(Math.random()<.05)G.dq.push({x:best.x,y:best.y,s:.26,a:.16});
        t.cd=.1;t.rec=.2;
        if((t.snd=(t.snd||0)-.1)<=0){sfx('fl');t.snd=.5;}
      }else if(t.type==='sp'){
        const sd=S.dmg[li]*(t.br==='b'?2.2:1);
        hurt(best,sd,'sp');best.slowT=2;best.slowAmt=Math.min(.8,S.slow[li]+(t.f.elec?.1+.05*t.f.elec:0)+(t.br==='a'?.2:0));
        if(t.br==='a'&&((t.shots=(t.shots||0)+1)%4===0))best.stun=Math.max(best.stun,1);
        if(t.br==='b'){for(const o of G.enemies)if(o!==best&&!o.dead&&Math.hypot(o.x-best.x,o.y-best.y)<=.6)hurt(o,sd*.5,'sp');G.rings.push({x:best.x,y:best.y,t:.3,max:.3,s:.2});}
        t.cd=1;G.tracers.push({x1:cx,y1:cy,x2:best.x,y2:best.y,t:.1,c:t.f.elec?'#7fd6ff':'#c9c9c9'});sfx('sp');
      }else if(t.type==='tes'){
        const jm=S.jmp[li]+(t.br==='a'?2:0)+(t.f.chain?1:0),hit=new Set([best]);
        let cur=best,from={x:cx,y:cy},d=S.dmg[li];
        for(let j=0;j<=jm&&cur;j++){
          hurt(cur,d*(t.f.wet&&cur.slowT>0?2:1),'tes');if(t.br==='b')cur.stun=Math.max(cur.stun,.8);
          G.tracers.push({x1:from.x,y1:from.y,x2:cur.x,y2:cur.y,t:.14,c:'#9fe0ff',w:3,z:1});
          from=cur;d*=.72;let nx=null,nd=1.15;
          for(const o of G.enemies){if(o.dead||hit.has(o))continue;const dd=Math.hypot(o.x-cur.x,o.y-cur.y);if(dd<nd){nd=dd;nx=o;}}
          if(nx)hit.add(nx);cur=nx;
        }
        t.cd=1/S.rate[li];sfx('sp');
      }else if(t.type==='mor'){
        const rr=S.r[li]*(t.br==='b'?1.4:1)*(t.f.big?1.3:1),n=t.br==='a'?3:1,dm=S.dmg[li]*(t.br==='b'?1.3:1)*(n>1?.6:1);
        const sp0=EN[best.type].sp*(best.slowT>0?1-best.slowAmt:1);
        const lead=best.fly?{x:best.x,y:best.y}:pathPos(Math.min(TOT,best.d+sp0*.9));          // стреляет с упреждением
        for(let k=0;k<n;k++)G.shells.push({x0:cx,y0:cy,x:lead.x+(k?(Math.random()-.5)*1.2:0),y:lead.y+(k?(Math.random()-.5)*1.2:0),t:.9,max:.9,r:rr,dmg:dm,nap:!!t.f.napalm});
        t.cd=1/S.rate[li];sfx('clang');
      }
    }
    G.enemies=G.enemies.filter(e=>!e.dead);
    if(G.running&&!G.over&&!G.spawnQ.length&&!G.enemies.length)endWave();
  }
  for(const p of G.parts){if(p.g)p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
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
    boom(EXIT[0]+.5,EXIT[1]+.5,3);boom(EXIT[0]+.5,EXIT[1]+.5,2);G.shake=1;sfx('boom');
    setTimeout(()=>{if(G.over)showEnd();},1600);
  }else setTimeout(()=>{if(G.over)showEnd();},600);
}
function showEnd(){
  const last=MI>=MAPS.length-1;
  if(G.win&&!last&&save.level<MI+1){save.level=MI+1;persist();}
  if(G.win&&last){save.level=MAPS.length;persist();ach('campaign');}
  const st=G.win?starsOf(G.fuel):0;
  if(G.win){save.stars[MI]=Math.max(save.stars[MI]||0,st);persist();if(st===3)ach('flawless');}
  $('eTitle').textContent=G.win?(last?'Кампания пройдена!':'Карта «'+MAP.n+'» пройдена'):'Заправка взорвана';
  const names=G.found.map(k=>CBMAP[k].n);
  $('eInfo').innerHTML='Карта '+(MI+1)+' из '+MAPS.length+' · '+MAP.n+(G.win?'<br><span class="stars">'+starStr(st)+'</span>':'')+'<br>Достигнута волна: <b>'+G.wave+'</b> из '+NWAVES
    +'<br>Комбо в этой партии: '+(names.length?names.join(', '):'нет')
    +(G.win&&!last?'<br><b>Дальше: '+MAPS[MI+1].n+'</b> (враги сильнее)':'');
  $('eNext').style.display=(G.win&&!last)?'':'none';
  $('eAgain').textContent=G.win?(last?'Пройти заново':'Сыграть эту карту ещё раз'):'Ещё раз';
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
    if(uc!=null&&lvOf(t)===2){
      h+='<div class="h">Уровень 3: выберите путь</div>';
      for(const b of['a','b'])h+='<button data-u="'+b+'"'+(G.scrap<uc?' disabled':'')+'><b>'+BR[t.type][b].n+'</b> — '+uc+'<br><small>'+BR[t.type][b].e+'</small></button>';
    }else if(uc!=null)h+='<button data-u="1"'+(G.scrap<uc?' disabled':'')+'>Улучшить до ур. '+(lvOf(t)+1)+' — '+uc+'</button>';
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
  else if(b.dataset.u)upgrade(G.sel,b.dataset.u==='1'?null:b.dataset.u);
  else if(b.dataset.r)repair(G.sel);
  else if(b.dataset.s)sell(G.sel);
});
cv.addEventListener('pointerdown',ev=>{
  ac();if(!G||G.over)return;
  const r=cv.getBoundingClientRect();
  const c=Math.floor((ev.clientX-r.left-offX)/cs),row=Math.floor((ev.clientY-r.top-offY)/cs);
  if(G.aim==='air'){airStrike((ev.clientX-r.left-offX)/cs,(ev.clientY-r.top-offY)/cs);return;}
  const i=(c>=0&&c<COLS)?slotAt(c,row):-1;
  if(i<0||i===G.sel)closeSheet();else openSheet(i);
});
function show(id){
  for(const s of document.querySelectorAll('.scr'))s.style.display='none';
  if(id)$(id).style.display='flex';
  if(id==='sMenu'){
    const lv=Math.min(save.level,MAPS.length-1);
    $('mBest').textContent='Лучший результат: волна '+save.best+' · открыто карт: '+Math.min(MAPS.length,save.level+1)+' из '+MAPS.length;
    $('mPlay').textContent=save.level>0?'Продолжить: '+MAPS[lv].n:'Играть';
    $('mNew').style.display=save.level>0?'':'none';
    $('mStars').innerHTML=MAPS.map((m,i)=>'<span>'+m.n+' <b>'+starStr(save.stars[i]||0)+'</b></span>').join('');
    $('mAch').textContent='Достижения ('+save.ach.length+'/'+ACH.length+')';
  }
  if(id==='sBook')renderBook();
  if(id==='sAch')renderAch();
  if(id==='sSet')$('tSound').textContent='Звук: '+(save.sound?'вкл':'выкл');
}
function renderAch(){
  $('achList').innerHTML=ACH.map(a=>save.ach.includes(a.id)
    ?'<div class="card"><b>★ '+a.n+'</b><br>'+a.d+'</div>'
    :'<div class="card off"><b>'+a.n+'</b><br><i>'+a.d+'</i></div>').join('');
}
function renderBook(){
  $('cards').innerHTML=CB.map(c=>save.combos.includes(c.k)
    ?'<div class="card"><b>'+c.n+'</b><br>'+c.e+'<br><i>«'+c.q+'»</i></div>'
    :'<div class="card off">???</div>').join('');
}
function updateWaveBtn(){
  const b=$('bWave');
  if(G.running){b.textContent='Волна идёт…';b.disabled=true;}
  else if(G.wave>=NWAVES){b.textContent='Конец';b.disabled=true;}
  else{b.textContent='Начать волну '+(G.wave+1);b.disabled=false;}
}
let shown={};
const iconSrc=n=>(window.__ASSETS&&window.__ASSETS[n])||('assets/'+n+'.png');
function nextWaveHTML(){
  if(G.wave>=NWAVES)return '';
  const w=WAVES[G.wave];let h='<span class="nl">Далее:</span>';
  for(const k in w){const c=k==='boss'?w[k]:Math.round(w[k]*MAP.cnt);h+='<span class="chip'+(k==='boss'?' boss':'')+'"><img src="'+iconSrc(k)+'" alt="'+k+'"><b>×'+c+'</b></span>';}
  return h;
}
let abShown='';
function hudAbil(){
  const parts=[];
  for(const k in AB){
    const el=document.querySelector('[data-a="'+k+'"]');if(!el)continue;
    const cdp=G.cd[k]>0?Math.round(G.cd[k]/AB[k].cd*100):0;
    el.querySelector('.cd').style.height=cdp+'%';
    el.querySelector('.t').textContent=G.cd[k]>0?Math.ceil(G.cd[k]):'';
    el.classList.toggle('on',G.aim===k);el.classList.toggle('rdy',G.cd[k]<=0);
    parts.push(cdp);
  }
  const key=G.wave+'|'+G.running+'|'+G.aim;
  if(key!==abShown){abShown=key;
    $('nextw').innerHTML=G.aim==='air'?'<span class="nl hint">Выберите точку на карте для удара</span>':(G.running?'':nextWaveHTML());
  }
  if(G.running&&G.aim!=='air'){const n=G.enemies.length+G.spawnQ.length;$('nextw').innerHTML='<span class="nl">Врагов: <b>'+n+'</b></span>';abShown='';}
}
function hud(){
  hudAbil();
  const v={s:G.scrap,f:G.fuel,w:G.wave,r:G.running};
  if(shown.s!==v.s)$('hScrap').textContent=v.s;
  if(shown.f!==v.f)$('hFuel').textContent=v.f;
  if(shown.w!==v.w)$('hWave').textContent=v.w;
  if(shown.r!==v.r)updateWaveBtn();
  shown=v;
}
$('abil').addEventListener('click',ev=>{const b=ev.target.closest('[data-a]');if(b)useAbility(b.dataset.a);});
$('bWave').onclick=startWave;
$('bSpeed').onclick=()=>{G.speed=G.speed===1?2:1;$('bSpeed').textContent='×'+G.speed;};
$('bMenu').onclick=()=>{G.over=true;G.running=false;show('sMenu');};
$('mPlay').onclick=()=>{newGame(Math.min(save.level,MAPS.length-1));show(null);ac();};
$('mNew').onclick=()=>{save.level=0;persist();newGame(0);show(null);ac();};
$('mBook').onclick=()=>show('sBook');
$('mAch').onclick=()=>show('sAch');
$('mSet').onclick=()=>show('sSet');
$('tSound').onclick=()=>{save.sound=!save.sound;persist();show('sSet');if(save.sound)ac();};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show('sMenu'));
$('eAgain').onclick=()=>{newGame(G.win&&MI>=MAPS.length-1?0:MI);show(null);};
$('eNext').onclick=()=>{newGame(MI+1);show(null);};
$('eMenu').onclick=()=>show('sMenu');

/* =====================================================================
   РЕНДЕР (PixiJS): спрайты из assets/*.png, а если файла нет —
   процедурная заглушка. Свет: тёмный слой + «стирающие» источники.
   ===================================================================== */
const CELL=180,PX=256;               // клетка в мире (px) и в текстурах (px)
const ART={                          // имя: [ширина, высота] в клетках
  map:[6,10],map_dunes:[6,10],map_city:[6,10],slot:[1,1],station:[1,1],rubble:[1,1],
  raider:[1,.75],biker:[.8,.5],armor:[1.2,.9],shield:[1.2,.9],sniper:[1.05,.8],drone:[.75,.75],medic:[1.15,.85],boss:[2,1],
  tes_base:[1,1],tes_head:[1,1],mor_base:[1,1],mor_head:[1,1],
  mg_base:[1,1],mg_head:[1,1],fl_base:[1,1],fl_head:[1,1],sp_base:[1,1],sp_head:[1,1],gen_base:[1,1]};
const T={};
let cmf,grain,alertS,decalRT,decalSpr,stampS,mapSpr,app,world,floatLayer,L={},lightRT=null,lightSpr,darkG,vig,warm,fxG,selG,rubbleG;
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
    {const ex=PTS[0][0]*u;g.beginPath();g.moveTo(ex,.9*u);g.lineTo(ex-14,.55*u);g.lineTo(ex+14,.55*u);g.fill();}
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
/* запасная процедурная графика для карт кампании и новых врагов */
function mapProc(i){return(g,u)=>{const keep=MI;setMap(i);try{PROC.map(g,u);}finally{setMap(keep);}};}
PROC.map_dunes=mapProc(1);PROC.map_city=mapProc(2);
PROC.shield=PROC.armor;PROC.sniper=PROC.raider;PROC.medic=PROC.armor;PROC.drone=PROC.biker;
PROC.tes_base=PROC.sp_base;PROC.tes_head=PROC.sp_head;PROC.mor_base=PROC.mg_base;PROC.mor_head=PROC.mg_head;
function procTex(n){
  const [wc,hc]=ART[n],cn=document.createElement('canvas');
  cn.width=Math.round(wc*PX);cn.height=Math.round(hc*PX);
  const c=cn.getContext('2d');
  if(!n.startsWith('map'))c.translate(cn.width/2,cn.height/2);
  PROC[n](c,PX);
  return PIXI.Texture.from(cn);
}
function utilTex(w,h,fn){
  const cn=document.createElement('canvas');cn.width=w;cn.height=h;
  fn(cn.getContext('2d'),w,h);return PIXI.Texture.from(cn);
}
function makeUtilTextures(){
  T.grain=utilTex(128,128,(c,w,h)=>{const id=c.createImageData(w,h),R=rnd(7);for(let i=0;i<w*h;i++){const v=R()*255|0;id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}c.putImageData(id,0,0);});
  T.tread=utilTex(16,16,(c,w,h)=>{c.fillStyle='rgba(0,0,0,.55)';c.fillRect(0,0,5,h);c.fillStyle='rgba(255,235,200,.16)';c.fillRect(6,0,2,h);});
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
    let ok=false;
    for(const ext of(inl?['']:(n.startsWith('map')?['jpg','png']:['png','jpg']))){
      try{T[n]=await PIXI.Texture.fromURL(inl||('assets/'+n+'.'+ext));real++;ok=true;break;}catch(e){}
    }
    if(!ok)T[n]=procTex(n);
  }));
  // необязательный арт уровней: mg_base2, mg_head3 и т.д.; если файла нет — рисуются запасные значки
  const tryLv=[];
  for(const k of TKEYS)for(const lv of [2,3,'3a','3b'])for(const part of(k==='gen'?['base']:['base','head'])){
    const n=k+'_'+part+lv,inl=window.__ASSETS&&window.__ASSETS[n];
    if(!inl&&location.protocol==='file:')continue;
    tryLv.push(PIXI.Texture.fromURL(inl||('assets/'+n+'.png')).then(t=>{T[n]=t;real++;}).catch(()=>{}));
  }
  await Promise.all(tryLv);
  const tryProps=[];
  for(const m of MAPS)if(m.decor)for(const it of m.decor.items){
    const n='prop_'+m.decor.set+'_'+it.i,inl=window.__ASSETS&&window.__ASSETS[n];
    if(!inl&&location.protocol==='file:')continue;
    tryProps.push(PIXI.Texture.fromURL(inl||('assets/props/'+m.decor.set+'_'+it.i+'.png')).then(t=>{T[n]=t;}).catch(()=>{}));
  }
  await Promise.all(tryProps);
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
  mapSpr=new PIXI.Sprite(T[MAP.art]||T.map);mapSpr.width=COLS*CELL;mapSpr.height=ROWS*CELL;world.addChild(mapSpr);
  mk('decals');mk('props');mk('slots');mk('towers');mk('links');mk('enemies');mk('smoke');mk('fx');
  decalRT=PIXI.RenderTexture.create({width:COLS*CELL/2,height:ROWS*CELL/2});
  decalSpr=new PIXI.Sprite(decalRT);decalSpr.scale.set(2);L.decals.addChild(decalSpr);
  stampS=new PIXI.Sprite(T.glow);stampS.anchor.set(.5);
  rubbleG=new PIXI.Graphics();
  applyMapScene();
  selG=new PIXI.Graphics();L.links.addChild(selG);
  fxG=new PIXI.Graphics();fxG.blendMode=ADD;L.fx.addChild(fxG);
  // свет
  darkG=new PIXI.Graphics();
  lightC=new PIXI.Container();lightC.addChild(darkG);
  lightSpr=new PIXI.Sprite();app.stage.addChild(lightSpr);
  warm=new PIXI.Sprite(PIXI.Texture.WHITE);warm.tint=0xffe2c4;warm.blendMode=MULT;app.stage.addChild(warm);
  vig=new PIXI.Sprite(T.vig);app.stage.addChild(vig);
  cmf=new PIXI.ColorMatrixFilter();world.filters=[cmf];                          // единый цветокор сцены (по биомам)
  grain=new PIXI.TilingSprite(T.grain,2048,2048);grain.alpha=.035;app.stage.addChild(grain);
  alertS=new PIXI.Sprite(PIXI.Texture.WHITE);alertS.tint=0xff2a10;alertS.alpha=0;alertS.blendMode=ADD;app.stage.addChild(alertS);
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
/* штамп в слой следов (колеи, подпалины): дёшево, копится на земле */
function stamp(tex,x,y,size,tint,alpha,rot){
  if(!decalRT)return;
  stampS.texture=tex;stampS.position.set(x*CELL/2,y*CELL/2);stampS.width=stampS.height=size*CELL/2;
  stampS.tint=tint;stampS.alpha=alpha;stampS.rotation=rot||0;
  app.renderer.render(stampS,{renderTexture:decalRT,clear:false});
}
const WR=[];                       // дымящиеся остовы подбитой техники
function addWreck(e){
  const a=ART[e.type],c=new PIXI.Container();c.position.set(e.x*CELL,e.y*CELL);c.rotation=e.a;
  const b=spr(T[e.type],a[0]*CELL,a[1]*CELL);b.tint=0x2b2723;
  const g=spr(T.glow,CELL*.9,CELL*.9);g.tint=0xff7a20;g.blendMode=ADD;
  c.addChild(b,g);L.decals.addChild(c);
  WR.push({c,b,g,born:G.t,max:e.type==='boss'?9:(e.type==='armor'||e.type==='shield')?5:3.2,x:e.x,y:e.y});
}
const PROPS=[];                     // живой декор карты: качающиеся кусты, дымящие остовы
function buildDecor(){
  if(!L.props)return;
  L.props.removeChildren().forEach(c=>c.destroy({children:true}));PROPS.length=0;
  const D=MAP.decor;if(!D)return;
  const R=rnd(D.seed),road=new Set();
  for(let k=0;k<WP.length-1;k++){const a=WP[k],b=WP[k+1];
    for(let c=Math.min(a[0],b[0]);c<=Math.max(a[0],b[0]);c++)for(let r=Math.min(a[1],b[1]);r<=Math.max(a[1],b[1]);r++)road.add(c+','+r);}
  SLOTS.forEach(sl=>road.add(sl[0]+','+sl[1]));
  const bag=[];D.items.forEach(it=>{for(let n=0;n<it.w;n++)bag.push(it);});
  const used={};
  for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){
    if(road.has(c+','+r)||R()>D.dens)continue;
    const n=1+(R()<.35?1:0);                                         // в части клеток два предмета
    for(let q=0;q<n;q++){
      const it=bag[Math.floor(R()*bag.length)];
      if(it.max&&(used[it.i]||0)>=it.max)continue;
      const tex=T['prop_'+D.set+'_'+it.i];if(!tex)continue;used[it.i]=(used[it.i]||0)+1;
      const sc=it.sz*CELL/Math.max(tex.width,tex.height)*(.85+R()*.3);
      const x=(c+.2+R()*.6)*CELL,y=(r+.2+R()*.6)*CELL,rot=it.k==='wreck'?(R()<.5?0:Math.PI)+(R()-.5)*.35:R()*6.28;
      const cn=new PIXI.Container();cn.position.set(x,y);
      const sh=new PIXI.Sprite(tex);sh.anchor.set(.5);sh.scale.set(sc*1.02);sh.tint=0;sh.alpha=.34;sh.rotation=rot;
      const off=Math.max(tex.width,tex.height)*sc*.07;sh.position.set(off*.8,off*1.1);          // тень от света сверху-слева
      const sp=new PIXI.Sprite(tex);sp.anchor.set(.5);sp.scale.set(sc);sp.rotation=rot;
      cn.addChild(sh,sp);L.props.addChild(cn);
      PROPS.push({cn,sp,sh,k:it.k,x:x/CELL,y:y/CELL,rot,ph:R()*6.28,sc});
    }
  }
}
function applyMapScene(){        // перестраивает карту, площадки и заправку под текущую карту кампании
  if(!mapSpr||!L.slots)return;
  if(decalRT)app.renderer.render(new PIXI.Container(),{renderTexture:decalRT,clear:true});
  mapSpr.texture=T[MAP.art]||T.map;
  buildDecor();
  L.slots.removeChildren();
  SLOTS.forEach(s=>{const ao=spr(T.glow,CELL*1.5,CELL*1.5);ao.tint=0;ao.alpha=.28;ao.position.set((s[0]+.5)*CELL+5,(s[1]+.5)*CELL+8);L.slots.addChild(ao);});
  SLOTS.forEach(s=>{const p=spr(T.slot,CELL,CELL);p.position.set((s[0]+.5)*CELL,(s[1]+.5)*CELL);L.slots.addChild(p);});
  const st=spr(T.station,CELL,CELL);st.position.set((EXIT[0]+.5)*CELL,(EXIT[1]+.5)*CELL);L.slots.addChild(st);
  L.slots.addChild(rubbleG);
  if(warm)warm.tint=MAP.warm;
  if(cmf){const g=MAP.grade;cmf.reset();cmf.saturate(g[0],true);cmf.contrast(g[1],true);cmf.brightness(g[2],true);}
  if(vig)vig.alpha=MAP.vig;
}
function resetScene(){
  WR.forEach(w=>w.c.destroy({children:true}));WR.length=0;
  TO.forEach(o=>o&&o.c.destroy({children:true}));TO.length=0;
  for(const o of EO.values())o.c.destroy({children:true});EO.clear();
  for(const o of FO.values())o.destroy();FO.clear();
}

/* ---------- башни ---------- */
function makeTowerObj(i,t){
  const [col,row]=SLOTS[i],c=new PIXI.Container(),key=t.rubble?'rubble':t.type;
  c.position.set((col+.5)*CELL,(row+.5)*CELL);
  const lv=t.rubble?0:lvOf(t),o={c,key,t,lv,br:t.br};
  const lvTex=(part)=>(lv===3&&t.br&&T[key+'_'+part+'3'+t.br])||(lv>1&&T[key+'_'+part+lv])||T[key+'_'+part];   // арт ветки → арт уровня → базовый
  if(t.rubble){
    c.addChild(spr(T.rubble,CELL,CELL));o.glow=spr(T.glow,CELL*.5,CELL*.5);o.glow.tint=0xff6a1a;o.glow.blendMode=ADD;c.addChild(o.glow);
  }else{
    const sh=spr(lvTex('base'),CELL*1.02,CELL*1.02);sh.tint=0;sh.alpha=.4;sh.position.set(.055*CELL,.08*CELL);c.addChild(sh);   // тень-силуэт: свет сверху-слева
    o.hsh=null;
    o.baseSpr=spr(lvTex('base'),CELL,CELL);o.bs=o.baseSpr.scale.x;c.addChild(o.baseSpr);
    if(T[key+'_head']){
      o.head=new PIXI.Container();
      o.headSpr=spr(lvTex('head'),CELL,CELL);
      if(lv>1&&lvTex('head')===T[key+'_head'])o.headSpr.scale.set(o.headSpr.scale.x*(1+.07*(lv-1)));   // без арта: голова крупнее
      o.head.addChild(o.headSpr);
      o.hsh=spr(lvTex('head'),CELL,CELL);o.hsh.tint=0;o.hsh.alpha=.34;c.addChildAt(o.hsh,1);   // тень головы (поворачивается с ней)
      if(key==='mg'){o.flash=spr(T.glow,CELL*.55,CELL*.55);o.flash.tint=0xffd870;o.flash.blendMode=ADD;o.flash.x=.46*CELL;o.head.addChild(o.flash);}
      if(key==='fl'){o.pilot=spr(T.glow,CELL*.22,CELL*.22);o.pilot.tint=0xffa040;o.pilot.blendMode=ADD;o.pilot.x=.34*CELL;o.head.addChild(o.pilot);
        o.cone=new PIXI.Sprite(T.cone);o.cone.anchor.set(0,.5);o.cone.tint=0xff7a1a;o.cone.blendMode=ADD;o.cone.x=.33*CELL;o.head.addChild(o.cone);
        o.flash=spr(T.glow,CELL*.4,CELL*.4);o.flash.tint=0xffb040;o.flash.blendMode=ADD;o.flash.x=.36*CELL;o.head.addChild(o.flash);}
      c.addChild(o.head);
    }
    if(key==='gen'){o.glow=spr(T.glow,CELL*1.4,CELL*1.4);o.glow.tint=0xffd24a;o.glow.blendMode=ADD;c.addChild(o.glow);}
    o.up=spr(T.glow,CELL*1.5,CELL*1.5);o.up.tint=0x7fe36a;o.up.blendMode=ADD;o.up.alpha=0;c.addChild(o.up);   // вспышка при улучшении
    if(lv>1){                                                                                                // значки уровня (шевроны)
      const pg=new PIXI.Graphics();
      for(let k=0;k<lv-1;k++){const x=-.4*CELL+k*.11*CELL,y=-.4*CELL;
        pg.lineStyle(5,0x2a1a08,1);pg.moveTo(x,y);pg.lineTo(x+.05*CELL,y-.05*CELL);pg.lineTo(x+.1*CELL,y);
        pg.lineStyle(3,t.br==='b'?0x7fd6ff:0xffd24a,1);pg.moveTo(x,y);pg.lineTo(x+.05*CELL,y-.05*CELL);pg.lineTo(x+.1*CELL,y);}
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
    if(o&&(o.key!==key||(t&&!t.rubble&&(o.lv!==lvOf(t)||o.br!==t.br)))){o.c.destroy({children:true});o=TO[i]=null;}
    if(!t){continue;}
    if(!o)o=TO[i]=makeTowerObj(i,t);
    o.t=t;
    if(t.rubble){o.glow.alpha=.3+.25*Math.sin(G.t*9+i);continue;}
    if(o.up)o.up.alpha=t.upAt!=null?Math.max(0,1-(G.t-t.upAt)/.7)*.9:0;
    if(o.head){
      const rec=t.rec>0?Math.min(1,t.rec/.14):0;
      o.head.rotation=t.aim+(t.type==='sp'&&rec>0?.5:0);
      if(o.hsh){o.hsh.rotation=o.head.rotation+(t.type==='sp'?(t.sa||0):0);o.hsh.position.set(.055*CELL-Math.cos(t.aim)*(t.type==='mg'?14:5)*rec,.1*CELL-Math.sin(t.aim)*(t.type==='mg'?14:5)*rec);}
      const k=(t.type==='mg'?14:5)*rec;
      o.head.position.set(-Math.cos(t.aim)*k,-Math.sin(t.aim)*k);
      if(o.flash)o.flash.visible=rec>.45;
      if(o.baseSpr)o.baseSpr.scale.set(o.bs*(1+.018*rec));                       // база «просаживается» при выстреле
      if(o.pilot)o.pilot.alpha=rec>0?0:.4+.25*Math.sin(G.t*13+i*1.7);            // дежурный огонёк сопла
      if(t.type==='sp'){t.sv=(t.sv||0)*.95+(rec>0?.1:0);t.sa=(t.sa||0)+t.sv;o.headSpr.rotation=t.sa;}   // барабан раскручивается
      if(o.cone){o.cone.visible=rec>0;o.cone.width=(.25+.5*rec)*CELL;o.cone.height=.3*CELL*(.8+.4*Math.sin(G.t*40));}
    }
    if(o.glow){
      const lin=G.links.some(l=>l.i===i||l.j===i);
      o.glow.visible=lin;o.glow.alpha=.18+.15*Math.sin(G.t*5+i);
      if(t.type==='gen'&&o.baseSpr)o.baseSpr.scale.set(o.bs*(1+(lin?.012:.004)*Math.sin(G.t*22+i)));   // вибрация генератора
    }
    o.bar.visible=t.hp<100;
    if(o.bar.visible){o.b1.width=Math.max(2,(.72*CELL-4)*t.hp/100);o.b1.tint=t.hp>40?0x6ec83a:0xe2452a;}
  }
}

/* ---------- враги ---------- */
/* колёса на спрайтах техники: [x,y,w,h] в % от размера спрайта (смотрит вправо); поверх рисуется бегущий протектор */
const WHEELS={
  raider:[[9,14,20,12],[66,17,17,10],[9,73,20,12],[66,73,17,10]],
  biker:[[12,47.5,10,8],[80,51.5,13,5]],
  armor:[[12,23.5,15,8],[29,23.5,15,8],[60.5,25.5,14,7],[12,70,15,8],[29,70,15,8],[60.5,70,14,6.5]],
  shield:[[12,23.5,15,8],[29,23.5,15,8],[62,26,11,4.5],[12,70,15,8],[29,70,15,8],[62,71,11,6.5]],
  sniper:[[15,23,15,8],[57,24,15,8],[15,71,16,8],[60,73,16,8]],
  boss:[[12,31,9,3.8],[22,31,9,3.8],[50,32,8,4.5],[59,32,7,4.5],[80,33,9,3.5],[12,66,9,4.5],[22,66,9,4.5],[50,66,8,4],[59,66,7,4],[80,65,8,3.2]]};
function makeEnemyObj(e){
  const c=new PIXI.Container();
  const a=ART[e.type];
  const sh=spr(T[e.type],a[0]*CELL,a[1]*CELL);sh.tint=0;sh.alpha=.38;sh.position.set(.06*CELL,.09*CELL);
  const bodyC=new PIXI.Container();
  const body=spr(T[e.type],a[0]*CELL,a[1]*CELL);
  const lamp=new PIXI.Sprite(T.cone);lamp.anchor.set(0,.5);lamp.blendMode=ADD;
  lamp.x=a[0]*CELL*.42;lamp.width=CELL*(e.type==='boss'?1.6:1.1);lamp.height=CELL*.6;
  lamp.tint=e.type==='boss'?0xff5a28:0xffe2a0;lamp.alpha=.5;
  const fl=spr(T[e.type],a[0]*CELL,a[1]*CELL);fl.blendMode=ADD;fl.alpha=0;
  const trs=[],Wd=a[0]*CELL,Hd=a[1]*CELL;
  for(const r of(WHEELS[e.type]||[])){
    const t=new PIXI.TilingSprite(T.tread,r[2]/100*Wd,r[3]/100*Hd);
    t.position.set(r[0]/100*Wd-Wd/2,r[1]/100*Hd-Hd/2);t.tileScale.set(1.3);t.alpha=.85;trs.push(t);
  }
  bodyC.addChild(body,...trs,lamp,fl);
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
  return {c,sh,bodyC,body,trs,fl,spark,st,bar,b1,w,lamp,last:0};
}
function syncEnemies(){
  const seen=new Set();
  for(const e of G.enemies){
    seen.add(e);
    let o=EO.get(e);if(!o){o=makeEnemyObj(e);EO.set(e,o);}
    o.c.position.set(e.x*CELL,e.y*CELL);
    o.bodyC.rotation=e.a+Math.sin(G.t*9+e.ph)*.012;o.sh.rotation=e.a;
    o.bodyC.y=Math.sin(G.t*12+e.ph)*(e.type==='boss'?1.5:2.2);          // лёгкая тряска подвески
    if(o.lx===undefined){o.lx=e.x;o.ly=e.y;}
    else if(!e.fly&&(e.x-o.lx)**2+(e.y-o.ly)**2>.0121){                       // колея за колёсами
      const nx=-Math.sin(e.a),ny=Math.cos(e.a),off=e.type==='boss'?.28:e.type==='biker'?0:.14;
      if(off){stamp(T.glow,e.x+nx*off,e.y+ny*off,.07,0,.12);stamp(T.glow,e.x-nx*off,e.y-ny*off,.07,0,.12);}
      else stamp(T.glow,e.x,e.y,.06,0,.12);
      o.lx=e.x;o.ly=e.y;
    }
    if(e.fly){o.bodyC.y=-.2*CELL+Math.sin(G.t*6+e.ph)*3;o.sh.position.set(.2*CELL,.32*CELL);o.sh.alpha=.28;}
    o.fl.alpha=e.flash>0?.7:0;
    for(const t of o.trs)t.tilePosition.x=e.d*CELL*.9;                  // протектор бежит с реальной скоростью
    const hf=e.hp/e.max;
    o.body.tint=hf<.25?0xa89888:hf<.5?0xcfc0b0:0xffffff;                  // потёртая, закопчённая броня
    if(hf<.5&&Math.random()<.05)G.parts.push({x:e.x-Math.cos(e.a)*.25,y:e.y-Math.sin(e.a)*.25-.05,vx:(Math.random()-.5)*.2,vy:-.4,life:.9,max:.9,c:'#2a2623',r:.07+Math.random()*.04});
    if(hf<.25&&Math.random()<.08)G.parts.push({x:e.x-Math.cos(e.a)*.2+(Math.random()-.5)*.2,y:e.y-Math.sin(e.a)*.2,vx:0,vy:-.7,life:.4,max:.4,k:'fl',c:'#ff8a1a',r:.045});
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
  for(const [e,o] of EO)if(!seen.has(e)){if(e.dead&&!e.leaked)addWreck(e);o.c.destroy({children:true});EO.delete(e);}
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
  if(grain){grain.width=app.screen.width;grain.height=app.screen.height;grain.tilePosition.set(Math.random()*128,Math.random()*128);}
  if(alertS){alertS.width=app.screen.width;alertS.height=app.screen.height;alertS.alpha=Math.max(0,G.alert)*.35;}
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
    const sa=G.slots[l.i],sb=G.slots[l.j];
    if(sa&&sb&&(sa.type==='gen'||sb.type==='gen')&&Math.random()<.8){          // электрическая дуга от генератора
      const n=7,amp=.07*CELL,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,pts=[];
      for(let q=0;q<=n;q++){const j=(q===0||q===n)?0:(Math.random()-.5)*2*amp;pts.push([x1+dx*q/n+nx*j,y1+dy*q/n+ny*j]);}
      g.lineStyle(7,0x7fd0ff,.28);pts.forEach((pt,q)=>q?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]));
      g.lineStyle(2.4,0xe8f8ff,.95);pts.forEach((pt,q)=>q?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]));
    }
  }
  for(const t of G.tracers){
    const a=Math.min(1,t.t*12),col=parseInt(t.c.slice(1),16),w=(t.w||2);
    if(!t.w&&!t.z){                                   // пуля-трассер: яркая полоска летит от ствола к цели
      if(!t.m)t.m=t.t;const k=Math.min(1,1-t.t/t.m+.25),k0=Math.max(0,k-.45);
      const ax=t.x1+(t.x2-t.x1)*k0,ay=t.y1+(t.y2-t.y1)*k0,bx=t.x1+(t.x2-t.x1)*k,by=t.y1+(t.y2-t.y1)*k;
      g.lineStyle(8,col,.22);g.moveTo(ax*CELL,ay*CELL);g.lineTo(bx*CELL,by*CELL);
      g.lineStyle(3,0xffffff,.95);g.moveTo(ax*CELL,ay*CELL);g.lineTo(bx*CELL,by*CELL);
      continue;
    }
    if(t.z){                                           // зигзаг-молния Теслы
      const dx=t.x2-t.x1,dy=t.y2-t.y1,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,pts=[];
      for(let q=0;q<=6;q++){const j=(q===0||q===6)?0:(Math.random()-.5)*.14;pts.push([(t.x1+dx*q/6+nx*j)*CELL,(t.y1+dy*q/6+ny*j)*CELL]);}
      g.lineStyle(9,col,a*.35);pts.forEach((pt,q)=>q?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]));
      g.lineStyle(2.6,0xffffff,a);pts.forEach((pt,q)=>q?g.lineTo(pt[0],pt[1]):g.moveTo(pt[0],pt[1]));
      continue;
    }
    g.lineStyle(w*5,col,a*.45);g.moveTo(t.x1*CELL,t.y1*CELL);g.lineTo(t.x2*CELL,t.y2*CELL);
    g.lineStyle(w*1.4,0xffffff,a);g.moveTo(t.x1*CELL,t.y1*CELL);g.lineTo(t.x2*CELL,t.y2*CELL);
  }
  for(const sh of G.shells){                          // снаряд миномёта летит по дуге
    const k=1-sh.t/sh.max,px=(sh.x0+(sh.x-sh.x0)*k)*CELL,py=(sh.y0+(sh.y-sh.y0)*k)*CELL,h=Math.sin(Math.PI*k)*.7*CELL;
    g.lineStyle(3,0xff6a3a,.45);g.drawCircle(sh.x*CELL,sh.y*CELL,sh.r*CELL*(.5+.5*k));
    g.lineStyle(0);g.beginFill(0,.28);g.drawEllipse(px,py,7,4);g.endFill();
    g.beginFill(0x2a2623);g.drawCircle(px,py-h,7);g.endFill();g.beginFill(0xffb050,.9);g.drawCircle(px+1,py-h-1,3);g.endFill();
  }
  for(const st of G.strikes){                         // метка воздушного удара
    const f=Math.max(0,st.t/.9),cx0=st.x*CELL,cy0=st.y*CELL;
    g.lineStyle(5,0xff4a2a,.9);g.drawCircle(cx0,cy0,1.25*CELL*(.35+.65*f));
    g.lineStyle(3,0xffd070,.9);g.moveTo(cx0-.3*CELL,cy0);g.lineTo(cx0+.3*CELL,cy0);g.moveTo(cx0,cy0-.3*CELL);g.lineTo(cx0,cy0+.3*CELL);
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
    g.drawRect((EXIT[0]+.08+k*.084)*CELL,(EXIT[1]+.9)*CELL,.07*CELL,.08*CELL);g.endFill();
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
    const smoke=p.k==='deb'||p.c==='#1c1c1c'||p.c==='#222'||p.c==='#2a2623';
    const s=smoke?getSmoke(ns++):getGlow(ng++);
    s.visible=true;s.position.set(p.x*CELL,p.y*CELL);
    if(p.k==='deb'){s.tint=0x3a322c;s.alpha=Math.min(1,f*2.2);s.width=s.height=p.r*CELL*1.7;continue;}
    if(p.k==='fl'){                                     // пламя: цвет по возрасту, частица растёт и тает
      s.tint=f>.66?0xfff0a0:f>.36?0xffa020:0xff4a10;
      s.alpha=Math.min(1,f*1.6)*.85;
      s.width=s.height=p.r*CELL*(1.6+(1-f)*2.4);
      continue;
    }
    s.tint=smoke?0x2a2623:parseInt(p.c.slice(1),16);
    s.alpha=smoke?f*.55:f;
    const d=p.r*CELL*(smoke?3.2-f*1.2:2.2*(.6+f));
    s.width=s.height=d;
  }
  for(let i=ns;i<smokePool.length;i++)smokePool[i].visible=false;
  for(let i=ng;i<glowPool.length;i++)glowPool[i].visible=false;

  for(const p of PROPS){                              // ветер качает кусты и перекати-поле, остов дымит
    if(p.k==='sway'){const a=Math.sin(G.t*1.6+p.ph)*.06+Math.sin(G.t*.7+p.ph*2)*.03;p.sp.rotation=p.rot+a;p.sh.rotation=p.rot+a;}
    if(p.k==='wreck'&&Math.random()<.05)G.parts.push({x:p.x,y:p.y,vx:.12+Math.random()*.15,vy:-.35,life:1.7,max:1.7,c:'#1c1c1c',r:.07+Math.random()*.05});
  }
  // подпалины и остовы
  while(G.dq.length){const d=G.dq.pop();stamp(T.smoke,d.x,d.y,d.s,0x1a1410,d.a,Math.random()*6);}
  for(let i=WR.length-1;i>=0;i--){
    const w=WR[i],age=G.t-w.born,f=1-age/w.max;
    if(f<=0){w.c.destroy({children:true});WR.splice(i,1);continue;}
    w.b.alpha=Math.min(1,f*2);w.g.alpha=(.45+.35*Math.sin(G.t*18+i))*f;
    if(Math.random()<.25)G.parts.push({x:w.x+(Math.random()-.5)*.3,y:w.y,vx:(Math.random()-.5)*.3,vy:-.5,life:1,max:1,c:'#2a2623',r:.07+Math.random()*.05});
  }
  // погода по картам: пыль, песчаные струи, дождь
  const am=MAP.amb;
  for(let k=0;k<am.n;k++){
    const s=getDust(k);s.visible=true;s.tint=am.tint;s.alpha=am.a;
    if(am.dir==='y'){
      s.x=((k*.137+Math.sin(G.t*.3+k)*.01)%1)*COLS*CELL;
      s.y=(((k*.311+G.t*am.spd*(.5+(k%4)*.2))%1.15)-.08)*ROWS*CELL;
      s.width=am.w;s.height=am.h;
    }else{
      s.x=(((k*.173+G.t*am.spd*(.015+k%5*.008))%1.2)-.1)*COLS*CELL;
      s.y=((k*.311+Math.sin(G.t*.4+k)*.02)%1)*ROWS*CELL;
      s.width=am.w+k%4*24;s.height=am.h+k%3*4;
    }
  }
  for(let k=am.n;k<dustPool.length;k++)dustPool[k].visible=false;

  // плавающий текст
  const cur=new Set();
  for(const f of G.floats){
    cur.add(f);
    let t=FO.get(f);
    if(!t){
      t=new PIXI.Text(f.text,{fontFamily:'Trebuchet MS, Arial',fontSize:f.s||44,fontWeight:'bold',fill:f.c,stroke:'#000',strokeThickness:7,lineJoin:'round'});
      t.anchor.set(.5);floatLayer.addChild(t);FO.set(f,t);
    }
    t.position.set(f.x*CELL,f.y*CELL);t.alpha=Math.min(1,f.t);
  }
  for(const [f,t] of FO)if(!cur.has(f)){t.destroy();FO.delete(f);}

  // свет
  const W=app.screen.width,H=app.screen.height;
  const day=MAP.dark[0]+(MAP.dark[1]-MAP.dark[0])*Math.min(1,G.wave/NWAVES);
  darkG.clear();darkG.beginFill(0x0c0716,day);darkG.drawRect(0,0,W/2,H/2);darkG.endFill();
  lightN=0;
  lightAt(EXIT[0]+.5,EXIT[1]+.5,1.7,.85,0xffffff);
  if(G.fuel<=3)lightAt(EXIT[0]+.5,EXIT[1]+.5,2.2,.4+.3*Math.sin(G.t*8),0xff5030);
  SLOTS.forEach((s,i)=>{
    const t=G.slots[i];if(!t)return;
    const cx=s[0]+.5,cy=s[1]+.5;
    if(t.rubble){lightAt(cx,cy,.9,.35+.2*Math.sin(G.t*9+i),0xffa050);return;}
    lightAt(cx,cy,1.0,.28);
    if(t.type==='gen'&&G.links.some(l=>l.i===i||l.j===i))lightAt(cx,cy,1.5,.55,0xffe080);
    if(t.rec>0){
      if(t.type==='mg')lightAt(cx+Math.cos(t.aim)*.4,cy+Math.sin(t.aim)*.4,1.6,.8,0xffe0a0);
      else if(t.type==='fl'){lightAt(cx+Math.cos(t.aim)*.5,cy+Math.sin(t.aim)*.5,2.4,.9,0xffa050);
        if(t.tx!=null)lightAt(t.tx,t.ty,2.2,.75+.15*Math.sin(G.t*30),0xff9040);}
      else if(t.type==='sp')lightAt(cx,cy,1.3,.45,0xb0e0ff);
    }
  });
  for(const l of G.links){
    const a=SLOTS[l.i],b=SLOTS[l.j];lightAt((a[0]+b[0])/2+.5,(a[1]+b[1])/2+.5,1.3,.5,0xffd870);
    if((G.slots[l.i]&&G.slots[l.i].type==='gen')||(G.slots[l.j]&&G.slots[l.j].type==='gen'))lightAt((a[0]+b[0])/2+.5,(a[1]+b[1])/2+.5,1.7,.3+.3*Math.random(),0x9fe0ff);
  }
  for(const e of G.enemies){
    lightAt(e.x,e.y,e.type==='boss'?2.6:1.2,.55,e.type==='boss'?0xff7040:0xffffff);
    lightAt(e.x+Math.cos(e.a)*.35,e.y+Math.sin(e.a)*.35,e.type==='boss'?3.2:2.4,.7,0xffffff,T.cone,e.a);
    if(e.burn>0)lightAt(e.x,e.y,1.6,.7,0xff8030);
  }
  for(const r of G.rings){const f=r.t/r.max;lightAt(r.x,r.y,(1-f)*3+1.2,f*.95,0xffa040);}
  for(const w of WR)lightAt(w.x,w.y,1.1,.45*Math.max(0,1-(G.t-w.born)/w.max),0xff8030);   // тлеющие остовы светятся
  for(const t of G.tracers)if(t.w&&!t.z){lightAt(t.x2,t.y2,2.2,.8*Math.min(1,t.t*10),0xffa050);}
  for(const t of G.tracers)if(t.z)lightAt(t.x2,t.y2,1.4,.6*Math.min(1,t.t*8),0x9fe0ff);
  for(let i=lightN;i<lightPool.length;i++)lightPool[i].visible=false;
  app.renderer.render(lightC,{renderTexture:lightRT,clear:true});
}

function frameTick(){
  if(!G||document.hidden)return;
  const real=Math.min(.1,app.ticker.deltaMS/1000);
  if(G.slowT>0)G.slowT-=real;
  if(G.alert>0)G.alert=Math.max(0,G.alert-real*.45);
  const sdt=real*G.speed*(G.slowT>0?.45:1),n=Math.ceil(sdt/.025);
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
  newGame();show('sMenu');
  window.__benzak={get G(){return G;},EN,build,upgrade,useAbility,airStrike,BR,startWave,step,newGame,T,app,MAPS,WAVES,EN,get NW(){return NWAVES;}};
  const ld=document.getElementById('loading');if(ld)ld.remove();
})();
})();
