export const initialOwned=['player-blue','pet-pup','cannon-iron','laptop-core','hands-bare'];
export const initialEquipped={Player:'player-blue',Companion:'pet-pup',Cannon:'cannon-iron',Laptop:'laptop-core',Accessories:'hands-bare'};
export const items=[
 {id:'player-blue',cat:'Player',name:'Blue Runner',cell:0,asset:'armor',runAsset:'sprites',runStart:0,tier:0,hue:0},
 {id:'player-ninja',cat:'Player',name:'Ember Runner',cell:0,asset:'armor',runAsset:'sprites',runStart:0,tier:1,hue:140},
 {id:'player-hero',cat:'Player',name:'Violet Vanguard',cell:0,asset:'armor',runAsset:'sprites',runStart:0,tier:2,hue:50},
 {id:'player-astro',cat:'Player',name:'Solar Champion',cell:0,asset:'armor',runAsset:'sprites',runStart:0,tier:3,hue:190},
 {id:'armor-leather',cat:'Player',name:'Trailguard Armor',cell:1,asset:'armor',runAsset:'armor',runStart:4,tier:1,hue:0},
 {id:'armor-knight',cat:'Player',name:'Silver Knight',cell:2,asset:'armor',runAsset:'armor',runStart:8,tier:2,hue:0},
 {id:'armor-solar',cat:'Player',name:'Solar Exosuit',cell:3,asset:'armor',runAsset:'armor',runStart:12,tier:3,hue:0},
 {id:'pet-pup',cat:'Companion',name:'Scout Fox',cell:13,tier:0,hue:0},
 {id:'pet-fox',cat:'Companion',name:'Mint Fox',cell:13,tier:1,hue:100},
 {id:'pet-bot',cat:'Companion',name:'Spirit Fox',cell:13,tier:2,hue:200},
 {id:'pet-dragon',cat:'Companion',name:'Aurora Fox',cell:13,tier:3,hue:260},
 {id:'pet-unicorn',cat:'Companion',name:'Rainbow Unicorn',cell:0,asset:'companions-gear',tier:3,hue:0},
 {id:'pet-emerald',cat:'Companion',name:'Emerald Dragon',cell:1,asset:'companions-gear',tier:2,hue:0},
 {id:'pet-phoenix',cat:'Companion',name:'Ember Phoenix',cell:2,asset:'companions-gear',tier:3,hue:0,flying:true},
 {id:'pet-orbit',cat:'Companion',name:'Orbit Bot',cell:3,asset:'companions-gear',tier:1,hue:0,flying:true},
 {id:'pet-wolf',cat:'Companion',name:'Moonwolf Pup',cell:4,asset:'companions-gear',tier:1,hue:0},
 {id:'pet-griffin',cat:'Companion',name:'Sunwing Griffin',cell:5,asset:'companions-gear',tier:2,hue:0},
 {id:'pet-golem',cat:'Companion',name:'Crystal Guardian',cell:6,asset:'companions-gear',tier:3,hue:0},
 {id:'pet-starcat',cat:'Companion',name:'Starlight Cat',cell:7,asset:'companions-gear',tier:2,hue:0,flying:true},
 {id:'cannon-iron',cat:'Cannon',name:'Iron Cannon',cell:8,tier:0,hue:0},
 {id:'cannon-rocket',cat:'Cannon',name:'Amethyst Cannon',cell:8,tier:2,hue:50},
 {id:'cannon-crystal',cat:'Cannon',name:'Golden Thunder',cell:8,tier:3,hue:180},
 {id:'laptop-core',cat:'Laptop',name:'Core Terminal',cell:12,tier:0,hue:0},
 {id:'laptop-cyber',cat:'Laptop',name:'Violet Terminal',cell:12,tier:2,hue:110},
 {id:'laptop-alien',cat:'Laptop',name:'Solar Terminal',cell:12,tier:3,hue:200},
 {id:'hands-bare',cat:'Accessories',name:'No accessories',cell:12,typingCell:15,tier:0,hue:0},
 {id:'hands-gloves',cat:'Accessories',name:'Tactical Gloves',cell:8,typingCell:9,asset:'companions-gear',tier:1,hue:0},
 {id:'hands-bracelets',cat:'Accessories',name:'Golden Bracelets',cell:10,typingCell:11,asset:'companions-gear',tier:2,hue:0},
 {id:'hands-gauntlets',cat:'Accessories',name:'Cyber Gauntlets',cell:12,typingCell:13,asset:'companions-gear',tier:3,hue:0},
 {id:'hands-moonstone',cat:'Accessories',name:'Moonstone Jewelry',cell:14,typingCell:15,asset:'companions-gear',tier:2,hue:0}
];
export const levels=[null,{title:'Monster Chase',time:90,target:10},{title:'Catch the Words',time:40,target:5},{title:'Cannon Shooter',time:20,target:6},{title:'Bomb Defuser',time:45,target:10}];
export const sentences=[['the','brave','fox','runs','quickly'],['my','little','dog','loves','sunny','days'],['we','found','a','secret','path'],['the','silver','moon','shines','tonight'],['birds','sing','above','the','trees'],['a','clever','wizard','cast','the','spell'],['our','team','finished','the','race'],['bright','stars','fill','the','sky'],['the','happy','cat','jumps','high'],['friends','always','help','each','other'],['rain','makes','the','garden','grow'],['she','opened','the','ancient','book']];
export const crates=[{name:'Spark Chest',cost:150,tier:1,copy:'Uncommon armor, companions, gloves and colors.',color:'#2be4ff'},{name:'Pulse Chest',cost:350,tier:2,copy:'Rare armor, mythical companions and jewelry.',color:'#aa72ff'},{name:'Nova Chest',cost:700,tier:3,copy:'Legendary armor, unicorns and extraordinary gear.',color:'#ffd061'}];
export function frameRect(asset='sprites',cell=0){
 const row=Math.floor(cell/4),col=cell%4,edges=asset==='armor'?[0,345,637,935,1254]:asset==='companions-gear'?[0,337,646,931,1254]:[0,313.5,627,940.5,1254];
 if(asset==='companions-gear'&&row===0)return [[0,0,312,337],[319,0,309,337],[632,0,334,337],[972,0,282,337]][col];
 return [col*313.5+2,edges[row]+2,309.5,edges[row+1]-edges[row]-4];
}
