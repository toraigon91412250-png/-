const specialBattleHistory=new WeakMap();
export function recordSpecialBattleAction(b,row){const rows=specialBattleHistory.get(b)||[];rows.push(row);specialBattleHistory.set(b,rows);}
export function specialBattleActions(b){return specialBattleHistory.get(b)||[];}
