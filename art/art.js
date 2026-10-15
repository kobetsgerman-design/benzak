/* Генератор арта «Бензака»: рисует спрайты кодом (металл, ржавчина, шум, фаски)
   и сохраняет их PNG через save_server.py. Вид сверху, техника смотрит вправо. */
const PX=256,SS=2;
const WP=[[0,0],[0,1],[5,1],[5,3],[0,3],[0,5],[5,5],[5,7],[0,7],[0,9]];
const SLOTS=[[0,2],[1,2],[2,2],[3,2],[2,4],[3,4],[4,4],[5,4],[0,6],[1,6],[2,6],[3,6],[1,8],[2,8],[1,9],[2,9],[2,0],[3,0]];
const SIZE={map:[6,10],slot:[1,1],station:[1,1],rubble:[1,1],raider:[1,.75],biker:[.8,.5],armor:[1.2,.9],boss:[2,1],
  mg_base:[1,1],mg_head:[1,1],fl_base:[1,1],fl_head:[1,1],sp_base:[1,1],sp_head:[1,1],gen_base:[1,1]};

const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function rnd(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const NOISE=(()=>{
  const n=256,cv=mk(n,n),c=cv.getContext('2d'),id=c.createImageData(n,n),R=rnd(99);
  for(let i=0;i<n*n;i++){const v=104+R()*92|0;id.data[i*4]=id.data[i*4+1]=id.data[i*4+2]=v;id.data[i*4+3]=255;}
  c.putImageData(id,0,0);
  for(let i=0;i<70;i++){
    const v=R()<.5?255:0;c.fillStyle='rgba('+v+','+v+','+v+','+(.04+R()*.08)+')';
    c.beginPath();c.arc(R()*n,R()*n,6+R()*26,0,6.28);c.fill();
  }
  return cv;
})();

/* построители контуров: возвращают функцию-путь с bbox */
function K(c,u){
  const wrap=(f,bb)=>{f.bb=bb;return f;};
  return{
    rr:(x,y,w,h,r)=>wrap(()=>{c.beginPath();c.roundRect(x*u,y*u,w*u,h*u,r*u);},[x*u,y*u,(x+w)*u,(y+h)*u]),
    circ:(x,y,r)=>wrap(()=>{c.beginPath();c.arc(x*u,y*u,r*u,0,6.2832);},[(x-r)*u,(y-r)*u,(x+r)*u,(y+r)*u]),
    ell:(x,y,rx,ry,rot=0)=>wrap(()=>{c.beginPath();c.ellipse(x*u,y*u,rx*u,ry*u,rot,0,6.2832);},[(x-rx)*u,(y-ry)*u,(x+rx)*u,(y+ry)*u]),
    poly:pts=>{
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});
      return wrap(()=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]*u,p[1]*u):c.moveTo(p[0]*u,p[1]*u));c.closePath();},[x0*u,y0*u,x1*u,y1*u]);
    }
  };
}
/* металл: градиент + шум + ржавчина + царапины + внутренняя тень + контур */
function metal(c,u,path,light,dark,R,o={}){
  const bb=path.bb,w=bb[2]-bb[0],h=bb[3]-bb[1];
  c.save();path();
  const g=c.createLinearGradient(bb[0],bb[1],bb[2],bb[3]);g.addColorStop(0,light);g.addColorStop(1,dark);
  c.fillStyle=g;c.fill();c.clip();
  c.globalCompositeOperation='overlay';c.globalAlpha=o.noise??.6;
  c.drawImage(NOISE,bb[0],bb[1],w,h);
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  const nr=o.rust??4;
  for(let i=0;i<nr;i++){
    const x=bb[0]+R()*w,y=bb[1]+R()*h,r=Math.max(u*.03,(w+h)*(.05+R()*.12));
    const rg=c.createRadialGradient(x,y,0,x,y,r);
    rg.addColorStop(0,'rgba('+(o.rustc||'128,62,22')+','+(.35+R()*.25)+')');rg.addColorStop(1,'rgba(128,62,22,0)');
    c.fillStyle=rg;c.fillRect(x-r,y-r,r*2,r*2);
  }
  for(let i=0;i<(o.scr??5);i++){
    const x=bb[0]+R()*w,y=bb[1]+R()*h,a=R()*6.28,l=u*(.03+R()*.08);
    c.strokeStyle='rgba(255,240,220,'+(.12+R()*.22)+')';c.lineWidth=Math.max(1,u*.004);
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();
  }
  for(let i=0;i<(o.chip??4);i++){
    c.fillStyle='rgba(20,12,8,'+(.3+R()*.3)+')';
    c.fillRect(bb[0]+R()*w,bb[1]+R()*h,u*(.006+R()*.014),u*(.006+R()*.012));
  }
  path();c.lineWidth=u*(o.edge??.05);c.strokeStyle='rgba(0,0,0,.42)';c.stroke();
  c.translate(u*.008,u*.008);path();c.lineWidth=u*.012;c.strokeStyle='rgba(255,235,200,.28)';c.stroke();
  c.restore();
  path();c.lineWidth=Math.max(1.5,u*.012);c.strokeStyle=o.line||'#17100b';c.stroke();
}
function rivet(c,u,x,y,r=.012){
  c.fillStyle='#14100c';c.beginPath();c.arc(x*u,y*u,r*u*1.35,0,6.28);c.fill();
  const g=c.createRadialGradient((x-r*.4)*u,(y-r*.4)*u,0,x*u,y*u,r*u*1.2);g.addColorStop(0,'#f2e2c0');g.addColorStop(1,'#8a7a5c');
  c.fillStyle=g;c.beginPath();c.arc(x*u,y*u,r*u,0,6.28);c.fill();
}
function tire(c,u,x,y,w,h,R){ // протектор поперёк хода (ось x = движение)
  const p=K(c,u).rr(x-w/2,y-h/2,w,h,h*.35);
  c.save();p();c.fillStyle='#161412';c.fill();c.clip();
  c.fillStyle='#2b2723';
  const n=Math.floor(w/.028);
  for(let i=0;i<n;i++)c.fillRect((x-w/2+.014+i*.028)*u,(y-h/2)*u,.013*u,h*u);
  c.globalCompositeOperation='overlay';c.drawImage(NOISE,(x-w/2)*u,(y-h/2)*u,w*u,h*u);
  c.fillStyle='rgba(255,255,255,.08)';c.fillRect((x-w/2)*u,(y-h/2)*u,w*u,h*u*.25);
  c.restore();
  p();c.lineWidth=u*.012;c.strokeStyle='#050403';c.stroke();
}
function glow(c,u,x,y,r,col,a=1){
  c.save();c.globalCompositeOperation='lighter';
  const g=c.createRadialGradient(x*u,y*u,0,x*u,y*u,r*u);
  g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));
  c.fillStyle=g;c.fillRect((x-r)*u,(y-r)*u,r*2*u,r*2*u);c.restore();
}
function tube(c,u,pts,w,col='#b9bec3'){ // стальная труба с бликом
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle='#14110e';c.lineWidth=w*u*1.5;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]*u,p[1]*u):c.moveTo(p[0]*u,p[1]*u));c.stroke();
  c.strokeStyle=col;c.lineWidth=w*u;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]*u,p[1]*u):c.moveTo(p[0]*u,p[1]*u));c.stroke();
  c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=w*u*.3;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]*u,(p[1]-w*.18)*u):c.moveTo(p[0]*u,(p[1]-w*.18)*u));c.stroke();
}
function spike(c,u,x,y,ang,len,w,light='#e9edf0',dark='#6c737a'){
  c.save();c.translate(x*u,y*u);c.rotate(ang);
  c.fillStyle=light;c.beginPath();c.moveTo(0,-w/2*u);c.lineTo(len*u,0);c.lineTo(0,0);c.closePath();c.fill();
  c.fillStyle=dark;c.beginPath();c.moveTo(0,w/2*u);c.lineTo(len*u,0);c.lineTo(0,0);c.closePath();c.fill();
  c.strokeStyle='#14110e';c.lineWidth=u*.008;c.beginPath();c.moveTo(0,-w/2*u);c.lineTo(len*u,0);c.lineTo(0,w/2*u);c.closePath();c.stroke();
  c.restore();
}
function hazard(c,u,path,a=.55){
  c.save();path();c.clip();
  const bb=path.bb;c.translate((bb[0]+bb[2])/2,(bb[1]+bb[3])/2);c.rotate(-.7);
  const L=Math.max(bb[2]-bb[0],bb[3]-bb[1])*1.5,s=u*.06;
  for(let x=-L;x<L;x+=s*2){c.fillStyle='rgba(221,170,40,'+a+')';c.fillRect(x,-L,s,L*2);c.fillStyle='rgba(20,14,8,'+a+')';c.fillRect(x+s,-L,s,L*2);}
  c.restore();
}

const DRAW={};
/* ---------- окружение ---------- */
DRAW.slot=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.rr(-.47,-.47,.94,.94,.08),'#a9885f','#5a432f',R,{rust:6,noise:.65});
  c.save();c.beginPath();c.roundRect(-.47*u,-.47*u,.94*u,.94*u,.08*u);c.roundRect(-.4*u,-.4*u,.8*u,.8*u,.05*u);c.clip('evenodd');
  c.rotate(-.7);for(let x=-u;x<u;x+=u*.12){c.fillStyle='rgba(222,170,40,.55)';c.fillRect(x,-u,u*.06,u*2);c.fillStyle='rgba(18,12,8,.55)';c.fillRect(x+u*.06,-u,u*.06,u*2);}
  c.restore();
  metal(c,u,k.rr(-.37,-.37,.74,.74,.05),'#5a4533','#8e7152',R,{rust:3,edge:.09});
  for(const sx of[-1,1])for(const sy of[-1,1])rivet(c,u,sx*.43,sy*.43,.017);
};
DRAW.station=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.rr(-.47,-.47,.94,.94,.06),'#9a9186','#554e46',R,{rust:2,noise:.9,scr:14});
  c.strokeStyle='rgba(20,12,6,.45)';c.lineWidth=u*.006;
  for(let i=0;i<5;i++){let x=(R()-.5)*.8*u,y=(R()-.5)*.8*u;c.beginPath();c.moveTo(x,y);for(let j=0;j<4;j++){x+=(R()-.5)*.18*u;y+=(R()-.5)*.18*u;c.lineTo(x,y);}c.stroke();}
  hazard(c,u,k.rr(-.47,.38,.94,.09,.01),.6);
  // цистерна (вид сверху: цилиндр)
  const tp=k.rr(-.3,-.38,.42,.76,.18);
  c.save();tp();
  const g=c.createLinearGradient(-.3*u,0,.12*u,0);
  g.addColorStop(0,'#3d4349');g.addColorStop(.22,'#cfd6db');g.addColorStop(.45,'#8c959c');g.addColorStop(.8,'#5a6168');g.addColorStop(1,'#2d3237');
  c.fillStyle=g;c.fill();c.clip();
  c.globalCompositeOperation='overlay';c.globalAlpha=.55;c.drawImage(NOISE,-.3*u,-.38*u,.42*u,.76*u);c.globalAlpha=1;c.globalCompositeOperation='source-over';
  for(let y=-.26;y<.3;y+=.13){c.fillStyle='rgba(0,0,0,.4)';c.fillRect(-.3*u,y*u,.42*u,.022*u);c.fillStyle='rgba(255,255,255,.25)';c.fillRect(-.3*u,(y+.022)*u,.42*u,.008*u);}
  for(let i=0;i<4;i++){const x=-.3*u+R()*.42*u,y=-.38*u+R()*.76*u,r=.08*u;const rg=c.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,'rgba(140,66,24,.45)');rg.addColorStop(1,'rgba(140,66,24,0)');c.fillStyle=rg;c.fillRect(x-r,y-r,r*2,r*2);}
  c.restore();tp();c.lineWidth=u*.014;c.strokeStyle='#14110e';c.stroke();
  metal(c,u,k.circ(-.09,-.12,.085),'#c2c8cc','#5c6268',R,{rust:0,scr:2});
  metal(c,u,k.circ(-.09,.16,.06),'#9aa1a6','#41464b',R,{rust:0,scr:1});
  tube(c,u,[[.12,.1],[.26,.1]],.05,'#8a9096');
  metal(c,u,k.rr(.22,-.2,.22,.42,.03),'#d4442c','#74160e',R,{rust:4});
  metal(c,u,k.rr(.255,-.15,.15,.13,.015),'#1b2a2f','#0b1417',R,{rust:0,scr:0,chip:0});
  c.fillStyle='#ffb020';c.fillRect(.285*u,-.115*u,.09*u,.025*u);c.fillRect(.285*u,-.08*u,.05*u,.02*u);
  tube(c,u,[[.44,.12],[.5,.2],[.5,.33]],.025,'#2a2a2a');
  for(const y of[-.36,.3]){metal(c,u,k.circ(.4,y,.04),'#f2c230','#a07a10',R,{rust:0,scr:0});}
};
DRAW.rubble=(c,u,R)=>{
  const k=K(c,u);
  let g=c.createRadialGradient(0,0,0,0,0,.5*u);g.addColorStop(0,'rgba(0,0,0,.75)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.fillRect(-.5*u,-.5*u,u,u);
  const tones=[['#6a6a6e','#2c2c2f'],['#55555a','#222224'],['#7a4a2c','#3a2012'],['#46464a','#1c1c1e']];
  for(let i=0;i<11;i++){
    const cx=(R()-.5)*.56,cy=(R()-.5)*.56,n=4+(R()*3|0),r=.07+R()*.1,pts=[];
    for(let j=0;j<n;j++){const a=j/n*6.28+R()*.5,rr=r*(.55+R()*.7);pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
    const t=tones[i%tones.length];
    metal(c,u,k.poly(pts),t[0],t[1],R,{rust:3,edge:.03});
  }
  c.save();c.rotate(.6);metal(c,u,k.rr(-.3,-.02,.5,.045,.01),'#8a8a90','#3a3a3e',R,{rust:2});c.restore();
  c.save();c.rotate(-.9);metal(c,u,k.rr(-.2,.1,.4,.035,.01),'#7a4a2c','#3a2012',R,{rust:2});c.restore();
  for(let i=0;i<9;i++){glow(c,u,(R()-.5)*.5,(R()-.5)*.5,.07+R()*.05,'rgba(255,120,30,A)',.8);}
};
/* ---------- башни ---------- */
DRAW.mg_base=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.circ(0,0,.37),'#7c735f','#3e382c',R,{rust:3,noise:.7});
  for(let i=0;i<12;i++){
    const a=i/12*6.28,x=Math.cos(a)*.37,y=Math.sin(a)*.37;
    c.save();c.translate(x*u,y*u);c.rotate(a+1.5708);
    metal(c,u,K(c,u).ell(0,0,.085,.052),'#c9b078','#7d6a3e',R,{rust:0,scr:0,chip:0,edge:.03,noise:.9});
    c.strokeStyle='rgba(60,45,20,.7)';c.lineWidth=u*.006;c.beginPath();c.moveTo(-.05*u,0);c.lineTo(.05*u,0);c.stroke();
    c.restore();
  }
  metal(c,u,k.circ(0,0,.27),'#a9b0b6','#454b52',R,{rust:2,noise:.7});
  c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=u*.014;c.beginPath();c.arc(0,0,.2*u,0,6.28);c.stroke();
  for(let i=0;i<8;i++){const a=i/8*6.28+.2;rivet(c,u,Math.cos(a)*.235,Math.sin(a)*.235,.014);}
};
DRAW.mg_head=(c,u,R)=>{
  const k=K(c,u);
  // стволы
  for(const y of[-.065,.065]){
    metal(c,u,k.rr(.06,y-.025,.4,.05,.012),'#5d636a','#1f2327',R,{rust:0,scr:3,noise:.7});
    metal(c,u,k.rr(.09,y-.04,.16,.08,.015),'#8c939a','#33383d',R,{rust:0,scr:1});
    for(let i=0;i<4;i++){c.fillStyle='#0d0f11';c.beginPath();c.arc((.12+i*.035)*u,(y-.012)*u,.008*u,0,6.28);c.fill();c.beginPath();c.arc((.12+i*.035)*u,(y+.012)*u,.008*u,0,6.28);c.fill();}
    metal(c,u,k.rr(.44,y-.035,.05,.07,.01),'#2a2e33','#0f1114',R,{rust:0,scr:0});
  }
  // корпус
  metal(c,u,k.poly([[-.2,-.17],[.1,-.2],[.17,-.1],[.17,.1],[.1,.2],[-.2,.17]]),'#7f8a74','#3c4434',R,{rust:4,noise:.7});
  metal(c,u,k.rr(-.14,-.12,.2,.24,.04),'#98a18c','#4a5240',R,{rust:2});
  metal(c,u,k.circ(-.05,0,.07),'#59605a','#202420',R,{rust:0,scr:2});
  rivet(c,u,-.18,-.13);rivet(c,u,-.18,.13);rivet(c,u,.1,-.16);rivet(c,u,.1,.16);
  metal(c,u,k.rr(-.2,.17,.16,.1,.015),'#6b7a3c','#2f3818',R,{rust:2}); // ящик
  for(let i=0;i<6;i++){c.fillStyle='#d6b24a';c.beginPath();c.arc((-.17+i*.025)*u,.21*u,.009*u,0,6.28);c.fill();}
  metal(c,u,k.rr(.0,-.2,.08,.04,.01),'#2b3a40','#0c1417',R,{rust:0,scr:0}); // прицел
  c.fillStyle='rgba(120,200,255,.5)';c.fillRect(.012*u,-.188*u,.056*u,.012*u);
};
DRAW.fl_base=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.circ(0,0,.38),'#52483f','#2a241e',R,{rust:4});
  hazard(c,u,k.circ(0,0,.38),.45);
  metal(c,u,k.circ(0,0,.3),'#6a6a6e','#2a2a2e',R,{rust:2});
  for(const y of[-.17,.17]){
    const tp=k.rr(-.36,y-.1,.34,.2,.1);
    c.save();tp();
    const g=c.createLinearGradient(0,(y-.1)*u,0,(y+.1)*u);
    g.addColorStop(0,'#5a1308');g.addColorStop(.3,'#ec5a32');g.addColorStop(.55,'#c4381a');g.addColorStop(1,'#4a0f06');
    c.fillStyle=g;c.fill();c.clip();
    c.globalCompositeOperation='overlay';c.globalAlpha=.6;c.drawImage(NOISE,-.36*u,(y-.1)*u,.34*u,.2*u);c.globalAlpha=1;c.globalCompositeOperation='source-over';
    c.fillStyle='rgba(0,0,0,.45)';c.fillRect(-.28*u,(y-.1)*u,.025*u,.2*u);c.fillRect(-.13*u,(y-.1)*u,.025*u,.2*u);
    c.fillStyle='rgba(255,220,60,.8)';c.fillRect(-.255*u,(y-.1)*u,.012*u,.2*u);
    c.restore();tp();c.lineWidth=u*.013;c.strokeStyle='#120604';c.stroke();
    metal(c,u,k.circ(-.05,y,.03),'#cfd4d8','#51565b',R,{rust:0,scr:0});
    tube(c,u,[[-.02,y],[.05,y*.5],[.1,0]],.03,'#7d8288');
  }
  metal(c,u,k.circ(.0,0,.1),'#a8a39a','#3f3b35',R,{rust:1});
  c.strokeStyle='#d33a20';c.lineWidth=u*.022;c.beginPath();c.arc(0,0,.055*u,0,6.28);c.stroke();
  c.beginPath();c.moveTo(-.055*u,0);c.lineTo(.055*u,0);c.moveTo(0,-.055*u);c.lineTo(0,.055*u);c.stroke();
};
DRAW.fl_head=(c,u,R)=>{
  const k=K(c,u);
  tube(c,u,[[-.1,.15],[-.2,.22],[-.3,.2]],.035,'#26221e');
  metal(c,u,k.rr(-.04,-.06,.4,.12,.025),'#9aa0a6','#383c42',R,{rust:2,scr:5});
  for(let i=0;i<5;i++){metal(c,u,k.rr(.0+i*.065,-.075,.03,.15,.008),'#d2a050','#6a4a1a',R,{rust:0,scr:0,chip:0,edge:.02});}
  c.fillStyle='#b8601c';
  metal(c,u,k.poly([[.36,-.075],[.46,-.12],[.46,.12],[.36,.075]]),'#55585e','#1c1e22',R,{rust:0,scr:1});
  c.fillStyle='#070707';c.beginPath();c.ellipse(.455*u,0,.02*u,.1*u,0,0,6.28);c.fill();
  glow(c,u,.46,0,.08,'rgba(110,190,255,A)',.9);
  metal(c,u,k.circ(0,0,.1),'#b9bdc2','#4a4e54',R,{rust:0,scr:3});
  metal(c,u,k.circ(0,0,.045),'#6f757b','#2a2d31',R,{rust:0,scr:0});
  rivet(c,u,-.06,-.06,.012);rivet(c,u,.06,.06,.012);
};
DRAW.sp_base=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.circ(0,0,.38),'#5e6268','#25282c',R,{rust:3});
  metal(c,u,k.circ(0,0,.31),'#43474d','#1c1e21',R,{rust:2,edge:.07});
  for(let i=0;i<8;i++){const a=i/8*6.28+.39;metal(c,u,k.circ(Math.cos(a)*.34,Math.sin(a)*.34,.028),'#c5c9cc','#51565a',R,{rust:0,scr:0,chip:0});}
  c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=u*.012;c.beginPath();c.arc(0,0,.23*u,0,6.28);c.stroke();
};
DRAW.sp_head=(c,u,R)=>{
  const k=K(c,u);
  for(let i=0;i<8;i++){
    c.save();c.rotate(i*Math.PI/4);
    spike(c,u,.1,0,0,.34,.15,'#f1f4f6','#6a7178');
    c.restore();
  }
  metal(c,u,k.circ(0,0,.17),'#9ba2a8','#363b40',R,{rust:2,scr:6,noise:.7});
  c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=u*.014;c.beginPath();c.arc(0,0,.125*u,0,6.28);c.stroke();
  for(let i=0;i<6;i++){const a=i/6*6.28;rivet(c,u,Math.cos(a)*.145,Math.sin(a)*.145,.012);}
  metal(c,u,k.circ(0,0,.075),'#cdb26a','#6a5622',R,{rust:0,scr:2});
};
DRAW.gen_base=(c,u,R)=>{
  const k=K(c,u);
  metal(c,u,k.rr(-.42,-.36,.84,.72,.07),'#7aa14c','#2f4a1e',R,{rust:6,noise:.7});
  metal(c,u,k.rr(-.38,-.32,.76,.64,.05),'#6a9040','#355221',R,{rust:3,edge:.03,line:'#1f3012'});
  for(let i=0;i<7;i++)metal(c,u,k.rr(-.34,-.28+i*.045,.3,.025,.006),'#1b1f16','#0c0e09',R,{rust:0,scr:0,chip:0,edge:.01});
  // катушка
  metal(c,u,k.circ(.14,-.06,.17),'#d98a38','#7a3d10',R,{rust:2,noise:.8});
  for(let r=.15;r>.04;r-=.025){c.strokeStyle='rgba(60,25,6,.55)';c.lineWidth=u*.01;c.beginPath();c.arc(.14*u,-.06*u,r*u,0,6.28);c.stroke();}
  metal(c,u,k.circ(.14,-.06,.05),'#c9ced2','#4a4f54',R,{rust:0,scr:1});
  // знак молнии
  metal(c,u,k.poly([[-.2,.12],[-.12,.12],[-.16,.2],[-.08,.2],[-.2,.31],[-.16,.22],[-.23,.22]]),'#ffd83a','#a87a00',R,{rust:0,scr:0,chip:0,edge:.01});
  // вентилятор
  metal(c,u,k.circ(.17,.22,.09),'#53575c','#1e2024',R,{rust:0,scr:1});
  for(let i=0;i<6;i++){c.save();c.translate(.17*u,.22*u);c.rotate(i*1.0472);c.fillStyle='#14161a';c.beginPath();c.ellipse(.045*u,0,.045*u,.017*u,0,0,6.28);c.fill();c.restore();}
  // выхлоп и лампы
  metal(c,u,k.circ(.34,.25,.04),'#8a8f94','#2a2d31',R,{rust:2});
  c.fillStyle='#070707';c.beginPath();c.arc(.34*u,.25*u,.022*u,0,6.28);c.fill();
  for(const[x,col]of[[-.3,'#e03a2a'],[-.24,'#3adf5a'],[-.18,'#ffb020']]){
    c.fillStyle=col;c.beginPath();c.arc(x*u,-.3*u,.014*u,0,6.28);c.fill();glow(c,u,x,-.3,.05,col==='#e03a2a'?'rgba(255,60,40,A)':col==='#3adf5a'?'rgba(60,255,100,A)':'rgba(255,180,30,A)',.8);
  }
  tube(c,u,[[.42,-.1],[.5,-.1],[.5,.1],[.4,.14]],.022,'#17140f');
  for(let i=0;i<4;i++){rivet(c,u,-.4+(i%2)*.8,i<2?-.34:.34,.013);}
};
/* ---------- техника (смотрит вправо) ---------- */
DRAW.raider=(c,u,R)=>{
  const k=K(c,u);
  for(const sy of[-1,1]){tire(c,u,-.27,sy*.3,.2,.1,R);tire(c,u,.24,sy*.29,.18,.09,R);}
  metal(c,u,k.rr(-.38,-.21,.78,.42,.05),'#4a4a4e','#17171a',R,{rust:3});
  // двигатель сзади
  metal(c,u,k.rr(-.4,-.13,.14,.26,.03),'#5a5d63','#1f2125',R,{rust:2,scr:6});
  for(const y of[-.08,.08]){tube(c,u,[[-.3,y],[-.44,y*1.3]],.028,'#c4c8cc');}
  // капот
  metal(c,u,k.poly([[.08,-.18],[.32,-.15],[.42,-.08],[.42,.08],[.32,.15],[.08,.18]]),'#d68a3c','#7b4318',R,{rust:6,noise:.7});
  c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=u*.01;
  for(let i=0;i<5;i++){c.beginPath();c.moveTo((.16+i*.045)*u,-.1*u);c.lineTo((.16+i*.045)*u,.1*u);c.stroke();}
  metal(c,u,k.rr(.2,-.045,.1,.09,.02),'#2a2a2c','#0c0c0d',R,{rust:0,scr:0});
  // борта
  for(const sy of[-1,1])metal(c,u,k.rr(-.24,sy>0?.14:-.2,.36,.06,.015),'#a96a2c','#5a3112',R,{rust:4});
  // кабина
  metal(c,u,k.rr(-.26,-.15,.34,.3,.04),'#201d1a','#0c0b0a',R,{rust:0,scr:0});
  // водитель
  metal(c,u,k.ell(-.12,0,.055,.12),'#5a4630','#2a1f12',R,{rust:0,scr:3,edge:.03});
  for(const sy of[-1,1]){spike(c,u,-.12,sy*.115,sy*-1.4,.05,.035,'#d7d9db','#6c6f73');}
  tube(c,u,[[-.1,-.1],[.0,-.05]],.028,'#4a3a28');tube(c,u,[[-.1,.1],[.0,.05]],.028,'#4a3a28');
  c.strokeStyle='#222';c.lineWidth=u*.014;c.beginPath();c.arc(.02*u,0,.065*u,0,6.28);c.stroke();
  metal(c,u,k.circ(-.1,0,.058),'#8a8f94','#33373b',R,{rust:0,scr:2,edge:.03});
  c.fillStyle='#10161a';c.beginPath();c.ellipse(-.075*u,0,.022*u,.042*u,0,0,6.28);c.fill();
  c.fillStyle='rgba(120,200,255,.6)';c.fillRect(-.08*u,-.015*u,.02*u,.01*u);
  // каркас безопасности
  tube(c,u,[[-.24,-.17],[.04,-.17],[.04,.17],[-.24,.17],[-.24,-.17]],.02,'#d0d4d8');
  tube(c,u,[[-.24,-.17],[.04,.17]],.014,'#aeb3b8');tube(c,u,[[-.24,.17],[.04,-.17]],.014,'#aeb3b8');
  // бампер и шипы
  metal(c,u,k.rr(.4,-.21,.05,.42,.015),'#a7acb1','#4a4f54',R,{rust:2});
  for(let i=0;i<6;i++)spike(c,u,.44,-.175+i*.07,0,.09,.04);
  for(const sy of[-1,1]){c.fillStyle='#fff6c8';c.beginPath();c.arc(.4*u,sy*.12*u,.024*u,0,6.28);c.fill();glow(c,u,.42,sy*.12,.1,'rgba(255,240,170,A)',.9);}
};
DRAW.biker=(c,u,R)=>{
  const k=K(c,u);
  tire(c,u,-.27,0,.18,.07,R);tire(c,u,.27,0,.18,.07,R);
  tube(c,u,[[-.27,0],[.0,0],[.2,0],[.27,0]],.026,'#7d8287');
  for(const sy of[-1,1])tube(c,u,[[-.04,sy*.05],[-.32,sy*.075]],.02,'#c8ccd0'); // выхлоп
  metal(c,u,k.rr(-.07,-.055,.12,.11,.03),'#707479','#25282c',R,{rust:1,scr:3});
  metal(c,u,k.rr(.02,-.075,.22,.15,.075),'#c24a2a','#6a1d0e',R,{rust:5,noise:.7});
  metal(c,u,k.ell(-.13,0,.085,.06),'#3a2c20','#150e08',R,{rust:0,scr:3,edge:.03});
  // шарф
  c.strokeStyle='#c8281c';c.lineWidth=u*.04;c.lineCap='round';
  c.beginPath();c.moveTo(-.1*u,.0);c.bezierCurveTo(-.2*u,.06*u,-.28*u,-.04*u,-.4*u,.05*u);c.stroke();
  c.strokeStyle='#8c1810';c.lineWidth=u*.018;c.beginPath();c.moveTo(-.1*u,.0);c.bezierCurveTo(-.2*u,.06*u,-.28*u,-.04*u,-.4*u,.05*u);c.stroke();
  // ноги
  for(const sy of[-1,1]){tube(c,u,[[-.14,sy*.06],[.0,sy*.09],[.06,sy*.095]],.04,'#3b3226');}
  // руль
  tube(c,u,[[.19,-.19],[.2,0],[.19,.19]],.016,'#c8ccd0');
  for(const sy of[-1,1]){c.fillStyle='#14110e';c.fillRect(.175*u,(sy*.19-.02)*u,.05*u,.04*u);}
  // руки
  for(const sy of[-1,1])tube(c,u,[[-.07,sy*.1],[.05,sy*.15],[.18,sy*.18]],.03,'#4a3c2c');
  // торс и плечи с шипами
  metal(c,u,k.ell(-.06,0,.09,.125),'#3a3a40','#15151a',R,{rust:1,scr:5,edge:.04});
  for(const sy of[-1,1]){for(let i=0;i<3;i++)spike(c,u,-.06+(i-1)*.04,sy*.125,sy*1.57,.045,.03,'#d7d9db','#6c6f73');}
  // шлем
  metal(c,u,k.circ(.0,0,.07),'#cfc6b0','#6a6250',R,{rust:2,scr:3});
  c.fillStyle='#0c1418';c.beginPath();c.ellipse(.045*u,0,.02*u,.055*u,0,0,6.28);c.fill();
  c.fillStyle='rgba(110,210,255,.6)';c.fillRect(.04*u,-.04*u,.015*u,.02*u);
  c.fillStyle='#fff6c8';c.beginPath();c.arc(.31*u,0,.028*u,0,6.28);c.fill();glow(c,u,.34,0,.12,'rgba(255,240,170,A)',.9);
};
DRAW.armor=(c,u,R)=>{
  const k=K(c,u);
  for(const sy of[-1,1])for(const x of[-.3,.0,.3])tire(c,u,x,sy*.355,.24,.13,R);
  metal(c,u,k.rr(-.52,-.3,.92,.6,.05),'#989ea5','#40454b',R,{rust:6,noise:.7});
  for(const sy of[-1,1])metal(c,u,k.rr(-.48,sy>0?.22:-.3,.84,.08,.02),'#6c7279','#2c3035',R,{rust:4});
  // крыша
  metal(c,u,k.rr(-.38,-.21,.5,.42,.04),'#b4bac0','#575d63',R,{rust:4});
  c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=u*.008;
  for(const x of[-.22,-.05])c.strokeRect(x*u,-.2*u,.0,.4*u);
  metal(c,u,k.circ(-.2,0,.095),'#7c838a','#2d3238',R,{rust:1,scr:4});
  metal(c,u,k.circ(-.2,0,.055),'#3d4248','#14171a',R,{rust:0,scr:1});
  // пулемёт на крыше
  metal(c,u,k.rr(-.12,-.045,.14,.09,.02),'#5b616a','#202328',R,{rust:0,scr:2});
  tube(c,u,[[0.0,0],[.18,0]],.022,'#2a2e33');
  // капот
  metal(c,u,k.rr(.14,-.24,.24,.48,.04),'#8a9097','#3a3f45',R,{rust:5});
  for(let i=0;i<6;i++){c.fillStyle='rgba(0,0,0,.5)';c.fillRect((.18+i*.035)*u,-.18*u,.014*u,.36*u);}
  // смотровая щель
  metal(c,u,k.rr(.1,-.17,.04,.34,.01),'#0e1418','#05080a',R,{rust:0,scr:0,chip:0});
  c.fillStyle='rgba(255,170,40,.65)';c.fillRect(.112*u,-.06*u,.016*u,.12*u);
  // таран
  const ram=k.poly([[.4,-.32],[.62,-.15],[.66,0],[.62,.15],[.4,.32]]);
  metal(c,u,ram,'#b9bec4','#4e5359',R,{rust:4,noise:.7});
  hazard(c,u,ram,.4);
  c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=u*.012;c.beginPath();c.moveTo(.4*u,0);c.lineTo(.66*u,0);c.moveTo(.4*u,-.16*u);c.lineTo(.64*u,-.07*u);c.moveTo(.4*u,.16*u);c.lineTo(.64*u,.07*u);c.stroke();
  for(const y of[-.12,0,.12])spike(c,u,.64,y,0,.09,.05);
  // боковые шипы
  for(let i=0;i<6;i++)for(const sy of[-1,1])spike(c,u,-.42+i*.15,sy*.3,sy*1.5708,.1,.06);
  // тыл
  for(const y of[-.12,.12]){metal(c,u,k.circ(-.5,y,.045),'#4a4e53','#17191c',R,{rust:2});c.fillStyle='#050505';c.beginPath();c.arc(-.5*u,y*u,.022*u,0,6.28);c.fill();}
  for(const sy of[-1,1]){c.fillStyle='#e0301c';c.fillRect(-.53*u,(sy*.22-.02)*u,.025*u,.04*u);glow(c,u,-.54,sy*.22,.07,'rgba(255,50,30,A)',.8);}
  for(let i=0;i<10;i++)rivet(c,u,-.46+i*.095,i%2?.27:-.27,.012);
};
DRAW.boss=(c,u,R)=>{
  const k=K(c,u);
  for(const sy of[-1,1]){
    for(const x of[-.8,-.62,-.44]){tire(c,u,x,sy*.43,.22,.11,R);tire(c,u,x,sy*.34,.22,.11,R);}
    for(const x of[.0,.22]){tire(c,u,x,sy*.44,.24,.13,R);}
    tire(c,u,.58,sy*.42,.22,.12,R);
  }
  // прицеп
  metal(c,u,k.rr(-1.0,-.32,1.02,.64,.04),'#6a4c3c','#241711',R,{rust:8,noise:.75});
  for(let i=0;i<5;i++)for(const sy of[-1,1]){
    metal(c,u,k.rr(-.96+i*.2,sy>0?.03:-.29,.18,.26,.015),['#7a5a46','#5c4033','#8a6652'][i%3],'#26180f',R,{rust:4,edge:.03});
  }
  for(let i=0;i<5;i++){rivet(c,u,-.9+i*.2,0,.014);}
  metal(c,u,k.rr(-.96,-.035,.94,.07,.01),'#4a4e53','#17191c',R,{rust:2});
  // шипы по бортам
  for(let i=0;i<10;i++)for(const sy of[-1,1])spike(c,u,-.95+i*.1,sy*.31,sy*1.5708,.13,.07);
  for(let i=0;i<4;i++)spike(c,u,-1.0,-.24+i*.16,3.1416,.12,.08);
  // башенки на крыше
  for(const x of[-.7,-.4]){metal(c,u,k.circ(x,0,.1),'#6a7078','#25292e',R,{rust:2,scr:4});tube(c,u,[[x,0],[x+.2,0]],.03,'#1d2024');}
  metal(c,u,k.rr(-.3,-.06,.28,.12,.03),'#9a3a1a','#4a1608',R,{rust:3});
  tube(c,u,[[-.02,0],[.12,0]],.04,'#30333a');
  // сцепка
  metal(c,u,k.rr(.0,-.1,.18,.2,.03),'#7a8086','#2c3035',R,{rust:2});
  // топливные баки
  for(const sy of[-1,1])metal(c,u,k.rr(.2,sy>0?.34:-.46,.34,.12,.06),'#d4dade','#5a6066',R,{rust:2,scr:5});
  // кабина
  metal(c,u,k.rr(.14,-.34,.62,.68,.09),'#d8412a','#5f140c',R,{rust:7,noise:.7});
  metal(c,u,k.rr(.2,-.28,.34,.56,.06),'#c9341f','#6b180e',R,{rust:5,edge:.04});
  metal(c,u,k.rr(.56,-.27,.1,.54,.02),'#141c22','#05090c',R,{rust:0,scr:0,chip:0});
  c.fillStyle='rgba(150,220,255,.35)';c.fillRect(.575*u,-.24*u,.03*u,.2*u);
  for(const y of[-.22,-.07,.07,.22]){c.fillStyle='#ffa020';c.beginPath();c.arc(.72*u,y*u,.018*u,0,6.28);c.fill();glow(c,u,.72,y,.07,'rgba(255,160,30,A)',.8);}
  // капот с черепом
  metal(c,u,k.rr(.66,-.3,.18,.6,.05),'#a82c1a','#4a100a',R,{rust:5});
  c.fillStyle='#e8e2d2';c.beginPath();c.arc(.74*u,0,.09*u,0,6.28);c.fill();
  c.fillStyle='#0b0b0b';c.beginPath();c.ellipse(.77*u,-.035*u,.026*u,.02*u,0,0,6.28);c.ellipse(.77*u,.035*u,.026*u,.02*u,0,0,6.28);c.fill();
  c.fillRect(.66*u,-.014*u,.025*u,.028*u);
  for(let i=-2;i<=2;i++)c.fillRect(.69*u,(i*.02-.006)*u,.014*u,.012*u);
  // выхлопные трубы
  for(const sy of[-1,1]){
    const g=c.createRadialGradient((.4-.01)*u,(sy*.3-.01)*u,0,.4*u,sy*.3*u,.06*u);
    g.addColorStop(0,'#ffffff');g.addColorStop(.6,'#aab0b5');g.addColorStop(1,'#3a3f44');
    c.fillStyle=g;c.beginPath();c.arc(.4*u,sy*.3*u,.058*u,0,6.28);c.fill();
    c.strokeStyle='#14110e';c.lineWidth=u*.012;c.stroke();
    c.fillStyle='#050505';c.beginPath();c.arc(.4*u,sy*.3*u,.032*u,0,6.28);c.fill();
  }
  // бампер с шипами
  metal(c,u,k.rr(.84,-.36,.07,.72,.02),'#b0b5ba','#40454a',R,{rust:3});
  for(let i=0;i<7;i++)spike(c,u,.9,-.33+i*.11,0,.12,.06);
  for(const sy of[-1,1]){c.fillStyle='#fff0b0';c.beginPath();c.arc(.88*u,sy*.2*u,.03*u,0,6.28);c.fill();glow(c,u,.9,sy*.2,.14,'rgba(255,90,40,A)',.8);}
};
/* ---------- карта (вид сверху, 6x10 клеток, дорога змейкой) ---------- */
DRAW.map=(c,u,R)=>{
  const W=6*u,H=10*u;
  const PTS=WP.map(p=>[p[0]+.5,p[1]+.5]);
  let g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#c9a46a');g.addColorStop(.5,'#b78d55');g.addColorStop(1,'#a07440');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  c.globalCompositeOperation='overlay';c.globalAlpha=.55;
  for(let y=0;y<H;y+=256)for(let x=0;x<W;x+=256)c.drawImage(NOISE,x,y);
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
  // песчаные волны
  for(let i=0;i<70;i++){
    const x=R()*W,y=R()*H,l=u*(.5+R()*1.4);
    c.strokeStyle='rgba('+(R()<.5?'255,232,175':'70,40,14')+','+(.08+R()*.1)+')';c.lineWidth=u*(.012+R()*.02);
    c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+l*.3,y-u*.08,x+l*.7,y+u*.08,x+l,y);c.stroke();
  }
  for(let i=0;i<28;i++){
    const x=R()*W,y=R()*H,rx=u*(.7+R()*1.6),ry=u*(.2+R()*.4);
    c.fillStyle=R()<.5?'rgba(255,225,160,.10)':'rgba(60,30,8,.12)';
    c.beginPath();c.ellipse(x,y,rx,ry,R()*.6-.3,0,6.28);c.fill();
  }
  const used=new Set();
  for(let i=0;i<WP.length-1;i++){const a=WP[i],b=WP[i+1];
    for(let cx=Math.min(a[0],b[0]);cx<=Math.max(a[0],b[0]);cx++)for(let cy=Math.min(a[1],b[1]);cy<=Math.max(a[1],b[1]);cy++)used.add(cx+','+cy);}
  const slotCells=new Set(SLOTS.map(s=>s[0]+','+s[1]));
  // дорога
  const path=()=>{c.beginPath();PTS.forEach((p,i)=>i?c.lineTo(p[0]*u,p[1]*u):c.moveTo(p[0]*u,p[1]*u));};
  c.lineJoin='round';c.lineCap='round';
  path();c.strokeStyle='rgba(60,32,8,.4)';c.lineWidth=u*1.1;c.stroke();
  path();c.strokeStyle='#8a7355';c.lineWidth=u*.94;c.stroke();
  path();c.strokeStyle='#4a3b30';c.lineWidth=u*.86;c.stroke();
  path();c.strokeStyle='#3a2e26';c.lineWidth=u*.82;c.stroke();
  // асфальтовая зернистость
  c.save();path();c.lineWidth=u*.82;c.strokeStyle='#000';
  c.globalCompositeOperation='source-over';
  c.restore();
  for(let i=0;i<9;i++){
    const s=SEG[i];
    for(let j=0;j<s.len*u/2.2;j++){
      const t=R()*s.len,l=(R()-.5)*u*.78;
      c.fillStyle=R()<.5?'rgba(255,240,225,.09)':'rgba(0,0,0,.3)';
      c.fillRect((s.x+s.dx*t)*u-s.dy*l,(s.y+s.dy*t)*u+s.dx*l,2.4,2.4);
    }
    // колеи
    for(const off of[-.17,.17]){
      c.strokeStyle='rgba(8,5,3,.28)';c.lineWidth=u*.07;c.lineCap='butt';
      c.beginPath();c.moveTo((s.x-s.dy*off)*u,(s.y+s.dx*off)*u);c.lineTo((s.x+s.dx*s.len-s.dy*off)*u,(s.y+s.dy*s.len+s.dx*off)*u);c.stroke();
    }
    // трещины и пятна
    for(let j=0;j<4;j++){
      let x=(s.x+s.dx*R()*s.len)*u,y=(s.y+s.dy*R()*s.len)*u;c.strokeStyle='rgba(8,5,3,.55)';c.lineWidth=2;
      c.beginPath();c.moveTo(x,y);for(let q=0;q<5;q++){x+=(R()-.5)*u*.14;y+=(R()-.5)*u*.14;c.lineTo(x,y);}c.stroke();
    }
    for(let j=0;j<2;j++){
      const t=R()*s.len,l=(R()-.5)*u*.4;c.fillStyle='rgba(0,0,0,.3)';
      c.beginPath();c.ellipse((s.x+s.dx*t)*u-s.dy*l,(s.y+s.dy*t)*u+s.dx*l,u*.13,u*.07,R()*3,0,6.28);c.fill();
    }
  }
  path();c.lineCap='butt';c.setLineDash([u*.2,u*.32]);c.strokeStyle='rgba(226,180,70,.7)';c.lineWidth=u*.045;c.stroke();c.setLineDash([]);
  // кромка: песчаные заносы
  for(let i=0;i<9;i++){
    const s=SEG[i];
    for(let j=0;j<s.len*5;j++){
      const t=R()*s.len,side=R()<.5?-1:1,l=side*u*.46;
      c.fillStyle='rgba(222,190,130,'+(.2+R()*.3)+')';
      c.beginPath();c.ellipse((s.x+s.dx*t)*u-s.dy*l,(s.y+s.dy*t)*u+s.dx*l,u*(.05+R()*.07),u*.03,R()*3,0,6.28);c.fill();
    }
  }
  // камни и декор на свободных клетках
  const rock=(x,y,r)=>{
    const n=7,pts=[];for(let i=0;i<n;i++){const a=i/n*6.28+R()*.4,rr=r*(.7+R()*.5);pts.push([x+Math.cos(a)*rr,y+Math.sin(a)*rr*.85]);}
    c.fillStyle='rgba(0,0,0,.28)';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]+r*.25,p[1]+r*.3):c.moveTo(p[0]+r*.25,p[1]+r*.3));c.fill();
    const gg=c.createLinearGradient(x-r,y-r,x+r,y+r);gg.addColorStop(0,'#b09a80');gg.addColorStop(1,'#5a4a3a');
    c.fillStyle=gg;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill();
    c.strokeStyle='rgba(30,18,8,.6)';c.lineWidth=2;c.stroke();
    c.strokeStyle='rgba(255,240,215,.35)';c.beginPath();c.moveTo(pts[0][0],pts[0][1]);c.lineTo(pts[1][0],pts[1][1]);c.lineTo(pts[2][0],pts[2][1]);c.stroke();
  };
  const barrel=(x,y)=>{
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+5,y+7,u*.1,u*.09,0,0,6.28);c.fill();
    const gg=c.createRadialGradient(x-6,y-6,2,x,y,u*.11);gg.addColorStop(0,'#c8683a');gg.addColorStop(1,'#5a2410');
    c.fillStyle=gg;c.beginPath();c.arc(x,y,u*.105,0,6.28);c.fill();c.strokeStyle='#2a0f06';c.lineWidth=3;c.stroke();
    c.strokeStyle='rgba(20,8,4,.7)';c.lineWidth=2;c.beginPath();c.arc(x,y,u*.065,0,6.28);c.stroke();
  };
  const tyre=(x,y)=>{
    c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(x+5,y+7,u*.12,u*.1,0,0,6.28);c.fill();
    c.strokeStyle='#161412';c.lineWidth=u*.07;c.beginPath();c.arc(x,y,u*.09,0,6.28);c.stroke();
    c.fillStyle='#55504a';c.beginPath();c.arc(x,y,u*.035,0,6.28);c.fill();
  };
  const wreck=(x,y,a)=>{
    c.save();c.translate(x,y);c.rotate(a);
    c.fillStyle='rgba(0,0,0,.3)';c.fillRect(-u*.2+6,-u*.1+8,u*.4,u*.2);
    c.fillStyle='#5a3a26';c.fillRect(-u*.2,-u*.1,u*.4,u*.2);
    c.fillStyle='#7a4a2c';c.fillRect(-u*.2,-u*.1,u*.4,u*.07);
    c.fillStyle='#1a1512';c.fillRect(-u*.06,-u*.08,u*.14,u*.16);
    c.fillStyle='#0a0908';for(const sy of[-1,1]){c.fillRect(-u*.16,sy*u*.1-u*.02,u*.08,u*.05);c.fillRect(u*.08,sy*u*.1-u*.02,u*.08,u*.05);}
    c.restore();
  };
  const bones=(x,y)=>{c.strokeStyle='#e6dcc4';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(x-u*.09,y);c.lineTo(x+u*.09,y+u*.02);c.moveTo(x-u*.05,y-u*.06);c.lineTo(x+u*.06,y+u*.07);c.stroke();c.fillStyle='#e6dcc4';c.beginPath();c.arc(x,y-u*.02,u*.04,0,6.28);c.fill();};
  for(let cx=0;cx<6;cx++)for(let cy=0;cy<10;cy++){
    if(used.has(cx+','+cy))continue;
    const free=!slotCells.has(cx+','+cy);
    const x=(cx+.2+R()*.6)*u,y=(cy+.2+R()*.6)*u;
    if(!free){ // под плитой — только лёгкий песок
      if(R()<.5)rock(x,y,u*.07);
      continue;
    }
  }
  // декор в незанятых клетках (не под башнями)
  for(let cx=0;cx<6;cx++)for(let cy=0;cy<10;cy++){
    if(used.has(cx+','+cy))continue;
    const x=(cx+.5)*u,y=(cy+.5)*u;
    const k=R();
    if(k<.25){rock(x-u*.12,y,u*.13);rock(x+u*.14,y+u*.1,u*.09);}
    else if(k<.45){barrel(x,y);}
    else if(k<.6){tyre(x,y);}
    else if(k<.72){wreck(x,y,R()*3);}
    else if(k<.82){bones(x,y);}
  }
  // въезд
  c.fillStyle='rgba(255,170,60,.9)';c.beginPath();c.moveTo(.5*u,.92*u);c.lineTo(.5*u-18,.52*u);c.lineTo(.5*u+18,.52*u);c.fill();
  // дымка и пятна гари
  for(let i=0;i<10;i++){const x=R()*W,y=R()*H,r=u*(.4+R()*.7);const rg=c.createRadialGradient(x,y,0,x,y,r);rg.addColorStop(0,'rgba(30,18,8,.18)');rg.addColorStop(1,'rgba(30,18,8,0)');c.fillStyle=rg;c.fillRect(x-r,y-r,r*2,r*2);}
};
/* SEG для карты */
const PTSF=WP.map(p=>[p[0]+.5,p[1]+.5]),SEG=[];
for(let i=0;i<PTSF.length-1;i++){const dx=PTSF[i+1][0]-PTSF[i][0],dy=PTSF[i+1][1]-PTSF[i][1],len=Math.hypot(dx,dy);SEG.push({x:PTSF[i][0],y:PTSF[i][1],dx:dx/len,dy:dy/len,len});}

/* ---------- сборка ---------- */
function render(name){
  const [wc,hc]=SIZE[name],R=rnd(name.split('').reduce((a,ch)=>a*31+ch.charCodeAt(0),7));
  const isMap=name==='map',ss=isMap?1:SS;
  const big=mk(Math.round(wc*PX*ss),Math.round(hc*PX*ss)),c=big.getContext('2d');
  if(!isMap)c.translate(big.width/2,big.height/2);
  DRAW[name](c,PX*ss,R);
  if(isMap)return big;
  const out=mk(Math.round(wc*PX),Math.round(hc*PX)),o=out.getContext('2d');
  o.imageSmoothingQuality='high';o.drawImage(big,0,0,out.width,out.height);
  return out;
}
async function saveAll(server){
  const names=Object.keys(SIZE),res={};
  for(const n of names){
    const cv=render(n);
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
    if(server){const r=await fetch(server+'/'+n+'.png',{method:'POST',body:blob});res[n]=r.ok?blob.size:'ERR';}
    document.getElementById('out').appendChild(Object.assign(cv,{title:n,style:'background:#555;margin:6px;max-width:260px'}));
  }
  return res;
}
