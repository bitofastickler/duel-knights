/* ───────────────────────── the roster ─────────────────────────
   Add a knight by adding an entry here. Fields:
     look    armour colours and shape (see knight.js) — alt is used when both sides pick the same knight
     weapon  a key into WEAPONS (weapons.js)
     stats   overrides of BASE_STATS (fighter.js); anything left out stays at the default
     ai      overrides of the AI's plan weights (brain.js): circle, pressure, heavy, feint, bait
     rating  1–5 pips shown on the select screen (display only)
     lines   end-screen text: `fall` when you beat them, `win` when they beat you */
export const ROSTER=[
  {
    id:'caldwin',name:'Ser Caldwin',title:'the Azure',
    blurb:'A steady blade. Three-cut combo, sound guard, nothing to hide.',
    look:{steel:0x9aa3b0,rough:.34,trim:0xc9a24a,mail:0x4a4f58,cloth:0x2a6be0,blade:0xdde4ee,emblem:'azure',helm:'plume',trailColor:0x9fc4ff},
    alt:{cloth:0x8a2a2a,trailColor:0xffb0a0},
    weapon:'sword',
    stats:{stam:106,regen:34},
    ai:{},
    rating:{health:3,power:3,speed:3,guard:3},
    lines:{fall:'The Azure banner is lowered',win:'The Azure banner holds'},
  },
  {
    id:'varkos',name:'Varkos',title:'the Ashen King',
    blurb:'Broad and patient. His overheads land harder and his guard barely gives.',
    look:{steel:0x2c2c33,rough:.38,trim:0x9a6b2a,mail:0x1c1c20,cloth:0x7a1210,blade:0xb8b0aa,emblem:'ashen',helm:'horned',scale:1.06,capeL:.84,trailColor:0xff9a70},
    alt:{cloth:0x3a3a44,trim:0x8a8f99,trailColor:0xc0c8ff},
    weapon:'sword',
    stats:{hp:104,speed:3.4,atkSpeed:.96,heavyDmg:1.08,guard:.86},
    ai:{heavy:.55,feint:.45,pressure:1.1},
    rating:{health:4,power:4,speed:2,guard:4},
    lines:{fall:'The Ashen King falls',win:'The crown stays cold'},
  },
  {
    id:'ysolde',name:'Ysolde',title:'the Thorn',
    blurb:'Quick cuts, cheap dodges, and a riposte that punishes every mistake. She cannot take much.',
    look:{steel:0xb6bbb4,rough:.28,trim:0xa7b2ae,mail:0x3a403a,cloth:0x1f5a34,blade:0xe8ecef,emblem:'thorn',helm:'crest',crest:0x2e9a52,scale:.96,bulk:.85,capeW:.38,capeL:.64,trailColor:0x9dffc0},
    alt:{cloth:0x5a1f4e,crest:0x9a2e86,trailColor:0xffa0e8},
    weapon:'sword',
    stats:{hp:86,stam:110,speed:3.9,regen:36,dodgeCost:15,dodgeSpeed:9.4,atkSpeed:1.1,dmg:.85,riposte:1.5},
    ai:{pressure:1.6,bait:.8,heavy:.15,circle:.9},
    rating:{health:2,power:2,speed:5,guard:2},
    lines:{fall:'The Thorn is cut down',win:'Too quick for your guard'},
  },
  {
    id:'brann',name:'Brann',title:'the Bellbreaker',
    blurb:'Slow, huge, and armed with a flanged mace. Every blow drains your guard and bleeds through the shield.',
    look:{steel:0x6e5c4a,rough:.5,trim:0xb07a3a,mail:0x2e2620,cloth:0x5a3a1c,blade:0x8f8b86,emblem:'bell',helm:'great',scale:1.1,bulk:1.25,capeW:.46,capeL:.76,eyes:false,trailColor:0xffc070},
    alt:{cloth:0x24343e,trim:0x8a96a0,trailColor:0xa0d8ff},
    weapon:'mace',
    stats:{hp:110,speed:3.05,regen:28,dodgeCost:24,dodgeSpeed:7.8},
    ai:{heavy:.7,pressure:1.2,bait:.2,feint:.2},
    rating:{health:5,power:5,speed:1,guard:3},
    lines:{fall:'The Bellbreaker falls silent',win:'The bell tolls for you'},
  },
];
export const CHARACTERS=Object.fromEntries(ROSTER.map(c=>[c.id,c]));
