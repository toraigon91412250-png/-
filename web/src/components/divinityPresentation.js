import {DIV_SKILLS} from '../data/divinity.js';

// Translate the divinity command into the existing presentation queue's vocabulary.
// This module is deliberately visual-only: it never reads or changes battle rules.
export function divinityVisualProfile(command,battle){
 const skill=DIV_SKILLS[command];
 const action=skill?.base||(skill?.guard?'guard':command);
 return {
  action,
  authority:skill?.power||(command==='power'?battle?.powers?.[0]:null),
  skillName:skill?.name||null,
  authoritySkill:!!skill?.power,
  awakening:command==='apotheosis'
 };
}
