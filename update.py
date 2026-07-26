#!/usr/bin/env python3
# ============================================================
# David's Lottery Analysis - daily data updater (Python)
# Fetches the latest official Illinois results and merges new draws
# into the IL_DATA block inside index.html. Powerball & Mega Millions
# are NOT touched here - the page loads those live from the national feed.
#
# Uses curl_cffi to impersonate a real Chrome browser (TLS fingerprint),
# which gets past the bot-protection that plain requests trip (HTTP 403).
# ============================================================
import json, re, sys
from curl_cffi import requests

MONTHS = {'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06',
          'Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'}

# Illinois games to maintain, and their shape
GAMES = {
    'lotto':         {'type':'ball',  'main':6, 'extra':True },   # 6 numbers + Extra Shot, no time
    'luckydaylotto': {'type':'ball',  'main':5, 'extra':False},   # 5 numbers, midday/evening
    'pick3':         {'type':'digit', 'digits':3},                # 3 digits + Fireball
    'pick4':         {'type':'digit', 'digits':4},                # 4 digits + Fireball
}

IMPERSONATE = ['chrome124', 'chrome120', 'chrome110', 'chrome99']

def fetch_html(game):
    url = f'https://www.illinoislottery.com/dbg/results/{game}'
    last = None
    for imp in IMPERSONATE:
        try:
            r = requests.get(url, impersonate=imp, timeout=30)
            if r.status_code == 200 and '/dbg/results/' in r.text:
                return r.text
            last = Exception(f'HTTP {r.status_code}')
        except Exception as e:
            last = e
    raise last or Exception('all impersonation attempts failed')

def parse_line(game, line):
    m = re.search(r'([A-Z][a-z]{2}) (\d{1,2}), (\d{4})', line)
    if not m:
        return None
    date = f'{m.group(3)}-{MONTHS[m.group(1)]}-{int(m.group(2)):02d}'
    tod = re.search(r'\b(midday|evening)\b', line, re.I)
    t = tod.group(1).lower() if tod else None
    rest = line[m.end():]
    rest = re.sub(r'\b(midday|evening)\b', ' ', rest, flags=re.I)
    rest = re.split(r'LOTTO\s*MILLION', rest, flags=re.I)[0]   # drop Lotto's secondary draws
    nums = [int(x) for x in re.findall(r'\d+', rest)]
    cfg = GAMES[game]
    if cfg['type'] == 'ball':
        if cfg.get('extra'):                    # lotto: 6 main + extra shot
            if len(nums) < 7:
                return None
            return {'d': date, 'n': nums[:6], 's': nums[6]}
        if len(nums) < cfg['main']:
            return None
        return {'d': date, 't': t, 'n': nums[:cfg['main']], 's': None}
    else:                                        # pick3 / pick4: digits + fireball
        if len(nums) < cfg['digits'] + 1:
            return None
        return {'d': date, 't': t, 'g': nums[:cfg['digits']], 'f': nums[cfg['digits']]}

def fetch_game(game):
    html = fetch_html(game)
    out = []
    for m in re.finditer(rf'/dbg/results/{game}/draw/\d+"?[^>]*>(.*?)</a>', html, re.S):
        line = re.sub(r'<[^>]+>', ' ', m.group(1))
        line = re.sub(r'\s+', ' ', line).strip()
        rec = parse_line(game, line)
        if rec:
            out.append(rec)
    return out

def torder(t):
    return 2 if t == 'evening' else 1 if t == 'midday' else 0

def key_of(r):
    return r['d'] + '|' + (r.get('t') or '')

def merge(existing, fresh):
    seen = {key_of(r) for r in existing}
    add = [r for r in fresh if key_of(r) not in seen]
    alld = add + existing
    alld.sort(key=lambda r: (r['d'], torder(r.get('t'))), reverse=True)
    return alld, len(add)

def main():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    START, END = '/* IL_DATA_START */', '/* IL_DATA_END */'
    s, e = html.find(START), html.find(END)
    if s < 0 or e < 0:
        print('IL_DATA markers not found'); sys.exit(1)
    block = html[s + len(START):e]
    jtext = re.sub(r'^\s*const\s+IL_DATA\s*=\s*', '', block).strip()
    jtext = re.sub(r';\s*$', '', jtext)
    data = json.loads(jtext)

    total = 0
    for game in GAMES:
        try:
            fresh = fetch_game(game)
            if not fresh:
                print(f'WARN {game}: parsed 0 draws (site format may have changed)'); continue
            merged, added = merge(data[game]['draws'], fresh)
            data[game]['draws'] = merged
            data[game]['seededThrough'] = merged[0]['d']
            total += added
            print(f'{game}: +{added} new (now {len(merged)}, latest {merged[0]["d"]})')
        except Exception as ex:
            print(f'ERROR {game}: {ex}')

    new_block = f'{START}\nconst IL_DATA = {json.dumps(data, indent=2)};\n{END}'
    html = html[:s] + new_block + html[e + len(END):]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Done. {total} new draw(s) written.')

if __name__ == '__main__':
    main()
