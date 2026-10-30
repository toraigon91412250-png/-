from pathlib import Path
import json,csv,collections,hashlib
root=Path(__file__).resolve().parent
load=lambda p:json.loads((root/p).read_text())
labels=['raw-32-21001','A-32-21001','B-32-21001','C-32-21001','holdout-A','holdout-B','guard-metrics','final-runtime']
mat={label:load(label+'/summary.json') for label in labels}
summary={'matrices':{label:{'routes':r['totalRoutes'],'battles':r['battles'],'clear20':sum(g['clear20'] for g in r['groups']),'ex':sum(g['ex'] for g in r['groups']),'timeouts':sum(g['timeouts'] for g in r['groups']),'normalMax':max(g['normalMax'] for g in r['groups'])} for label,r in mat.items()},'tiers':{},'phases':{},'profiles':{},'paired':{},'diagnostics':[],'targetPairs':[]}
for label in labels:
 r=mat[label];summary['tiers'][label]={tier:{'n':sum(g['n'] for g in r['groups'] if g['tier']==tier),'clear20':sum(g['clear20'] for g in r['groups'] if g['tier']==tier),'ex':sum(g['ex'] for g in r['groups'] if g['tier']==tier)} for tier in ['low','standard','high']}
# Same starting state, individual seed outcomes: do not hide swaps in group net totals.
paired={id:{'n':0,'gainedWins':0,'lostWins':0,'same':0,'commonWins':0,'roundDeltaCommonWins':0,'receivedDeltaCommonWins':0,'focusHits':0,'focusDamageDelta':0} for id in ['B','C']}
with (root/'paired.jsonl').open() as f:
 for line in f:
  row=json.loads(line);a=row['results']['A']
  for id in paired:
   b=row['results'][id];p=paired[id];p['n']+=1;p['gainedWins']+=int(not a['win'] and b['win']);p['lostWins']+=int(a['win'] and not b['win']);p['same']+=int(a['win']==b['win']);p['focusHits']+=b['focusHits'];p['focusDamageDelta']+=b['focusDamageDelta'] or 0
   if a['win'] and b['win']:p['commonWins']+=1;p['roundDeltaCommonWins']+=b['steps']-a['steps'];p['receivedDeltaCommonWins']+=b['received']-a['received']
summary['paired']=paired
phase=collections.defaultdict(lambda:{'n':0,'wins':0,'rounds':0,'received':0});target=collections.defaultdict(lambda:{'routes':0,'targetReached':0,'firstEquip':collections.Counter(),'activeBattles':0,'activeRounds':0})
# Export all action use counts and rates, not just summary means.
with (root/'actions.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['matrix','profile','mark','tier','strategy','action','uses','rate'])
 for label,r in mat.items():
  for g in r['groups']:
   for action,count in g['uses'].items():w.writerow([label,g['profile'],g['mark'],g['tier'],g['strategy'],action,count,g['rates'][action]])
diagnosticConditions=set()
with (root/'final-runtime/routes.jsonl').open() as f:
 for line in f:
  route=json.loads(line);s=route['scenario'];key='/'.join([s['profile'],s['mark'],s['tier'],s['strategy']]);t=target[key];t['routes']+=1;pair=load('study-config.json')['profiles'][s['profile']];matched=[]
  for b in route['fights']:
   if b['mode']=='normal':
    section='1-5' if b['floor']<=5 else '6-10' if b['floor']<=10 else '11-15' if b['floor']<=15 else '16-19' if b['floor']<20 else '20'
    p=phase[key+'/'+section];p['n']+=1;p['wins']+=int(b['win']);p['rounds']+=b['steps'];p['received']+=b['received']
    if b['state']['equipped']==pair:matched.append(b)
  if matched:t['targetReached']+=1;t['firstEquip'][matched[0]['floor']]+=1;t['activeBattles']+=len(matched);t['activeRounds']+=sum(b['steps'] for b in matched)
  if not route['ex'] and key not in diagnosticConditions:
   diagnosticConditions.add(key)
   b=route['fights'][-1];summary['diagnostics'].append({'scenario':s,'cleared':route['clears'],'mode':b['mode'],'floor':b['floor'],'steps':b['steps'],'result':b['result'],'phase':b['phase'],'phaseRounds':b['phaseRounds'],'endingLog':b.get('endingLog'),'finalHP':b['finalHP'],'enemyHP':b['enemyHP'],'totalSpent':route['ledger']['trainingP']+route['ledger']['markP']})
summary['phases']={key:{**p,'meanRounds':p['rounds']/p['n']} for key,p in phase.items()}
summary['targetPairs']=[{'condition':key,**value,'firstEquip':dict(value['firstEquip'])} for key,value in target.items()]
summary['profileNames']={'wing-abyss':'黒翼＋深淵','wing-king':'黒翼＋堕天王','judge-abyss':'断罪＋深淵','wing-fallen':'黒翼＋堕天','abyss-king':'深淵＋堕天王'}
(root/'analysis.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps({'matrices':summary['matrices'],'paired':paired},ensure_ascii=False,indent=2))
