import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePoints} from '../src/lib/mapPoints.js';

test('accepts an array of points',()=>assert.deepEqual(normalizePoints([{lat:11.341,lng:77.717}]),[{lat:11.341,lng:77.717}]));
test('parses JSON text from the API',()=>assert.deepEqual(normalizePoints('[{"lat":11.341,"lng":77.717}]'),[{lat:11.341,lng:77.717}]));
test('handles JSON encoded twice',()=>assert.deepEqual(normalizePoints(JSON.stringify(JSON.stringify([{lat:11.341,lng:77.717}]))),[{lat:11.341,lng:77.717}]));
test('rejects null and non-arrays',()=>{assert.deepEqual(normalizePoints(null),[]);assert.deepEqual(normalizePoints({lat:11,lng:77}),[]);assert.deepEqual(normalizePoints('{invalid'),[]);});
test('filters invalid coordinates',()=>assert.deepEqual(normalizePoints([{lat:91,lng:77},{lat:'11.341',lng:'77.717'},{lat:null,lng:4}]),[{lat:11.341,lng:77.717}]));
