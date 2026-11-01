/* Дымовой тест: вставить в консоль игры (http://localhost:8777/). Запускает все 4 карты, строит 6 башен,
   улучшает, пускает волну с разными врагами и собирает ошибки. В конце выводит одну строку: ОК или ОШИБКИ.
   Запуск:  await __smoke()   */
window.__smoke=async function(){
  const B=window.__benzak,errs=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
  const onE=e=>errs.push(e.message||String(e.reason));
  window.addEventListener('error',onE);window.addEventListener('unhandledrejection',onE);
  B.save.story={0:1,1:1,2:1,3:1};
  const log=[];
  try{
    for(let m=0;m<4;m++){
      await B.playMap(m);await wait(700);
      const G=B.G;G.scrap=99999;
      ['mg','fl','sp','gen','tes','mor'].forEach((t,i)=>B.build(i+1,t));
      await wait(200);B.upgrade(1);B.upgrade(2);await wait(100);B.upgrade(1);B.upgrade(2);
      const types=['raider','biker','armor','shield','sniper','drone','medic','warboy','vaulter','doof','boss'];
      types.forEach((t,i)=>{const e=B.makeEnemy(t,1+i*.6);if(e)G.enemies.push(e);});
      B.startWave();B.useAbility&&B.useAbility('emp');
      await wait(3500);
      log.push(B.MAPS[m].id+':'+G.enemies.length+'en');
    }
  }catch(e){errs.push('исключение: '+(e&&e.message||e));}
  window.removeEventListener('error',onE);window.removeEventListener('unhandledrejection',onE);
  const r=errs.length?'ОШИБКИ ('+errs.length+'): '+[...new Set(errs)].slice(0,4).join(' | '):'ОК: '+log.join(', ');
  console.log(r);return r;
};
