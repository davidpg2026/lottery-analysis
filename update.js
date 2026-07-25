/* ============================================================
   David's Lottery Analysis — daily data updater
   Runs in GitHub Actions each morning. Fetches the latest official
   Illinois results and merges any new draws into the IL_DATA block
   inside index.html. Powerball & Mega Millions are NOT touched here —
   the page loads those live from the national feed.
   No external dependencies (uses Node 20+ built-in fetch).
   ============================================================ */
const fs = require('fs');

const MONTHS = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};

// Which Illinois games to maintain, and their shape
const GAMES = {
  lotto:         {type:'ball',  main:6, extra:true },   // 6 numbers + Extra Shot, no time
  luckydaylotto: {type:'ball',  main:5, extra:false},   // 5 numbers, midday/evening
  pick3:         {type:'digit', digits:3},              // 3 digits + Fireball
  pick4:         {type:'digit', digits:4}               // 4 digits + Fireball
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/125.0 Safari/537.36';

function parseLine(game, line) {
  const md = line.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{4})/);
  if (!md) return null;
  const date = `${md[3]}-${MONTHS[md[1]]}-${String(md[2]).padStart(2,'0')}`;
  const tod  = (line.match(/\b(midday|evening)\b/i) || [])[1];
  const t    = tod ? tod.toLowerCase() : null;
  let rest = line.slice(line.indexOf(md[0]) + md[0].length);
  rest = rest.replace(/\b(midday|evening)\b/i, ' ');
  rest = rest.split(/LOTTO\s*MILLION/i)[0];        // drop Lotto's secondary draws
  const nums = (rest.match(/\d+/g) || []).map(Number);
  const cfg = GAMES[game];
  if (cfg.type === 'ball') {
    if (cfg.extra) {                                // lotto: 6 main + extra shot
      if (nums.length < 7) return null;
      return {d:date, n:nums.slice(0,6), s:nums[6]};
    }
    if (nums.length < cfg.main) return null;
    return {d:date, t, n:nums.slice(0,cfg.main), s:null};
  } else {                                          // pick3 / pick4: digits + fireball
    if (nums.length < cfg.digits + 1) return null;
    return {d:date, t, g:nums.slice(0,cfg.digits), f:nums[cfg.digits]};
  }
}

async function fetchGame(game) {
  const url = `https://www.illinoislottery.com/dbg/results/${game}`;
  const res = await fetch(url, {headers:{'User-Agent':UA}});
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  // Each result is an <a> link to /dbg/results/<game>/draw/<id>
  const re = new RegExp(`/dbg/results/${game}/draw/\\d+"[^>]*>([\\s\\S]*?)</a>`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const line = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const rec = parseLine(game, line);
    if (rec) out.push(rec);
  }
  return out;
}

const torder = t => (t === 'evening' ? 2 : t === 'midday' ? 1 : 0);
const keyOf  = r => r.d + '|' + (r.t || '');

function mergeGame(existing, fresh) {
  const seen = new Set(existing.map(keyOf));
  const add  = fresh.filter(r => !seen.has(keyOf(r)));
  const all  = add.concat(existing);
  all.sort((a,b) => a.d !== b.d ? (a.d < b.d ? 1 : -1) : (torder(b.t) - torder(a.t)));
  return {all, added: add.length};
}

(async () => {
  const FILE = 'index.html';
  let html = fs.readFileSync(FILE, 'utf8');
  const START = '/* IL_DATA_START */', END = '/* IL_DATA_END */';
  const s = html.indexOf(START), e = html.indexOf(END);
  if (s < 0 || e < 0) { console.error('IL_DATA markers not found'); process.exit(1); }

  const block = html.slice(s + START.length, e);
  const jsonText = block.replace(/^\s*const\s+IL_DATA\s*=\s*/, '').replace(/;\s*$/, '').trim();
  const data = JSON.parse(jsonText);

  let totalAdded = 0;
  for (const game of Object.keys(GAMES)) {
    try {
      const fresh = await fetchGame(game);
      if (!fresh.length) { console.log(`WARN ${game}: parsed 0 draws (site format may have changed)`); continue; }
      const {all, added} = mergeGame(data[game].draws, fresh);
      data[game].draws = all;
      data[game].seededThrough = all[0].d;
      totalAdded += added;
      console.log(`${game}: +${added} new (now ${all.length}, latest ${all[0].d})`);
    } catch (err) {
      console.log(`ERROR ${game}: ${err.message}`);
    }
  }

  const newBlock = `${START}\nconst IL_DATA = ${JSON.stringify(data, null, 2)};\n${END}`;
  html = html.slice(0, s) + newBlock + html.slice(e + END.length);
  fs.writeFileSync(FILE, html);
  console.log(`Done. ${totalAdded} new draw(s) written.`);
})();
