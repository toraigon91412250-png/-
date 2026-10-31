import test from 'node:test';import assert from 'node:assert/strict';
import {resonanceTrialReason,RESONANCE_TRIAL_BOSSES} from '../web/src/utils/resonanceTrial20.js';
test('20-floor bosses keep all ten agreed cooperative breakpoints',()=>{
 assert.equal(RESONANCE_TRIAL_BOSSES[1],'黒翼を狩る白騎士');
 assert.equal(RESONANCE_TRIAL_BOSSES[3],'傷を映す堕天使');
 assert.equal(RESONANCE_TRIAL_BOSSES[19],'静寂の門');
 assert.equal(RESONANCE_TRIAL_BOSSES[20],'選択を喰らう神座');
 assert.equal(Object.keys(RESONANCE_TRIAL_BOSSES).length,11);
});
test('trial requires existing unending throne victory',()=>{
 assert.match(resonanceTrialReason({divinity:{cooperation:{},infiniteWins:0}}),/無窮/);
 assert.equal(resonanceTrialReason({divinity:{cooperation:{},infiniteWins:1}}),null);
});
