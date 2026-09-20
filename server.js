import {initialOwned,initialEquipped,items,levels,crates} from './shared/catalog.js';
const json=(value,status=200,headers={})=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store',...headers}});
const db=(env)=>{if(!env.DB)throw new Error('Database unavailable');return env.DB;};
const cleanProfile=p=>({name:p.name,coins:p.coins,owned:[...new Set([...initialOwned,...JSON.parse(p.owned)])],equipped:{...initialEquipped,...JSON.parse(p.equipped)},admin:p.admin_until>Date.now()});
export async function api(request,env){
 try{
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='POST'&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Invalid origin'},403);
 const id=request.headers.get('cookie')?.match(/(?:^|; )sprint=([a-f0-9-]+)/)?.[1];
 let p=id?await db(env).prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first():null;
 if(path==='/api/profile'&&request.method==='POST'){
   const body=await request.json(),name=String(body.name||'').trim().slice(0,16);if(!name)return json({error:'Please enter your name'},400);
   const pid=p?.id||crypto.randomUUID();
   if(p)await db(env).prepare('UPDATE profiles SET name=? WHERE id=?').bind(name,pid).run();
   else await db(env).prepare('INSERT INTO profiles (id,name,coins,owned,equipped,admin_until) VALUES (?,?,450,?,?,0)').bind(pid,name,JSON.stringify(initialOwned),JSON.stringify(initialEquipped)).run();
   p=await db(env).prepare('SELECT * FROM profiles WHERE id=?').bind(pid).first();return json(cleanProfile(p),200,{'set-cookie':`sprint=${pid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`});
 }
 if(path==='/api/profile')return json(p?cleanProfile(p):null);
 if(path==='/api/ranks'){
   const level=Number(url.searchParams.get('level'));if(!levels[level])return json({error:'Invalid level'},400);
   const page=Math.max(0,Number(url.searchParams.get('page'))||0);
   const results=await db(env).prepare('SELECT id,name,level,duration,status,correct,loadout,admin,ended FROM runs WHERE level=? AND ended IS NOT NULL AND status=\'won\' AND admin=0 AND correct=? ORDER BY duration ASC,ended ASC,id ASC LIMIT 50 OFFSET ?').bind(level,levels[level].target,page*50).all();return json(results.results);
 }
 if(!p)return json({error:'Choose a player name first'},401);
 const admin=p.admin_until>Date.now();
 if(path==='/api/admin'&&request.method==='POST'){
   const body=await request.json();if(body.logout){await db(env).prepare('UPDATE profiles SET admin_until=0 WHERE id=?').bind(p.id).run();return json({ok:true});}
   if(!env.ADMIN_PASSWORD)return json({error:'Admin access is not configured'},503);
   if(body.password!==env.ADMIN_PASSWORD)return json({error:'Incorrect password'},403);
   await db(env).prepare('UPDATE profiles SET admin_until=? WHERE id=?').bind(Date.now()+3600000,p.id).run();return json({ok:true});
 }
 if(path==='/api/equip'&&request.method==='POST'){
   const {id:itemId}=await request.json(),item=items.find(x=>x.id===itemId);if(!item||(!admin&&!initialOwned.includes(itemId)&&!JSON.parse(p.owned).includes(itemId)))return json({error:'Item is locked'},403);
   const eq={...initialEquipped,...JSON.parse(p.equipped),[item.cat]:itemId};await db(env).prepare('UPDATE profiles SET equipped=? WHERE id=?').bind(JSON.stringify(eq),p.id).run();return json({...cleanProfile(p),equipped:eq});
 }
 if(path==='/api/chest'&&request.method==='POST'){
   const {tier}=await request.json(),crate=crates[tier-1];if(!crate)return json({error:'Unknown chest'},400);
   const owned=JSON.parse(p.owned),pool=items.filter(x=>x.tier===tier&&!owned.includes(x.id));if(!pool.length)return json({error:'You own every item in this chest'},409);
   if(!admin&&p.coins<crate.cost)return json({error:'Not enough coins'},400);
   const prize=pool[Math.floor(Math.random()*pool.length)];owned.push(prize.id);
   const update=await db(env).prepare('UPDATE profiles SET coins=coins-?,owned=? WHERE id=? AND owned=? AND coins>=?').bind(admin?0:crate.cost,JSON.stringify(owned),p.id,p.owned,admin?0:crate.cost).run();if(update.meta.changes!==1)return json({error:'Balance changed. Please try again.'},409);
   return json({prize,profile:{...cleanProfile(p),coins:p.coins-(admin?0:crate.cost),owned:[...new Set([...initialOwned,...owned])]}});
 }
 if(path==='/api/start'&&request.method==='POST'){
   const {level}=await request.json();if(!levels[level])return json({error:'Invalid level'},400);
   const rid=crypto.randomUUID();await db(env).prepare('INSERT INTO runs (id,player,name,level,started,status,loadout,admin) VALUES (?,?,?,?,?,\'playing\',?,?)').bind(rid,p.id,p.name,level,Date.now(),p.equipped,admin?1:0).run();return json({id:rid,admin});
 }
 if(path==='/api/finish'&&request.method==='POST'){
   const b=await request.json(),run=await db(env).prepare('SELECT * FROM runs WHERE id=? AND player=?').bind(String(b.id),p.id).first();if(!run)return json({error:'Match not found'},404);if(run.ended)return json({profile:cleanProfile(p),saved:true,reward:0,ranked:run.status==='won'&&!run.admin});
   if(!['won','lost','abandoned'].includes(b.status))return json({error:'Invalid result'},400);
   const duration=Math.max(0,Math.round(Number(b.duration))),correct=Math.max(0,Math.min(levels[run.level].target,Number(b.correct)||0));if(!Number.isFinite(duration)||duration>Date.now()-run.started+2000)return json({error:'Invalid match time'},400);
   if(b.status==='won'&&correct!==levels[run.level].target)return json({error:'Incomplete match'},400);
   const reward=b.status==='won'&&!run.admin?Math.max(80,300-Math.floor(duration/1000)*2+run.level*25):0;
   await db(env).batch([
    db(env).prepare('UPDATE profiles SET coins=coins+? WHERE id=? AND EXISTS (SELECT 1 FROM runs WHERE id=? AND ended IS NULL)').bind(reward,p.id,run.id),
    db(env).prepare('UPDATE runs SET ended=?,duration=?,correct=?,status=? WHERE id=? AND ended IS NULL').bind(Date.now(),duration,correct,b.status,run.id)
   ]);p=await db(env).prepare('SELECT * FROM profiles WHERE id=?').bind(p.id).first();return json({profile:cleanProfile(p),reward,saved:true,ranked:b.status==='won'&&!run.admin});
 }
 return json({error:'Not found'},404);
 }catch(e){console.error(e);return json({error:'Could not reach the game database. Please try again.'},503);}
}
