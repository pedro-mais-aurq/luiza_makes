import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyRouteTarget} from '../src/lib/routes.mjs';
test('normalização do frontend preserva consultas e caminho base',()=>{
 assert.equal(legacyRouteTarget('/admin'),'/#/admin');
 assert.equal(legacyRouteTarget('/admin/'),'/#/admin');
 assert.equal(legacyRouteTarget('/agendar','?servico=noiva'),'/#/agendar?servico=noiva');
 assert.equal(legacyRouteTarget('/luiza/admin','','/luiza/'),'/luiza/#/admin');
 assert.equal(legacyRouteTarget('/administrator'),null);
 assert.equal(legacyRouteTarget('/api/admin'),null);
 assert.equal(legacyRouteTarget('/images/luiza.webp'),null);
 assert.equal(legacyRouteTarget('/other/admin','','/luiza/'),null);
});
