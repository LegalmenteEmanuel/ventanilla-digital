import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  InvalidWorkflowError,
  TransitionDeniedError,
  WorkflowEngine,
  constanciaLaboralWorkflow,
  validateDefinition,
  type Actor,
  type WorkflowDefinition,
} from '../src/index.ts';

const ciudadano: Actor = { id: 'u-citizen', roles: ['ciudadano'] };
const funcionario: Actor = { id: 'u-officer', roles: ['funcionario'] };
const revisor: Actor = { id: 'u-reviewer', roles: ['revisor'] };

function engine() {
  return new WorkflowEngine(constanciaLaboralWorkflow);
}

test('el estado inicial es "borrador"', () => {
  assert.equal(engine().initialState, 'borrador');
  assert.equal(engine().start().state, 'borrador');
});

test('camino feliz: borrador -> enviada -> en_revision -> aprobada', () => {
  const e = engine();
  let inst = e.start(new Date('2026-01-01T00:00:00Z'));

  inst = e.apply(inst, ciudadano, { action: 'enviar' }).instance;
  assert.equal(inst.state, 'enviada');

  inst = e.apply(inst, funcionario, { action: 'tomar' }).instance;
  assert.equal(inst.state, 'en_revision');

  const res = e.apply(inst, revisor, { action: 'aprobar' });
  assert.equal(res.instance.state, 'aprobada');
  assert.equal(res.done, true);
  assert.equal(res.outcome, 'APROBADA');
  assert.ok(e.isTerminal(res.instance.state));

  const effectTypes = res.effects.map((x) => x.type);
  assert.deepEqual(effectTypes, ['sign', 'generate_pdf', 'notify']);
  assert.equal(res.effects[0]?.actorId, revisor.id);
  assert.equal(res.effects[0]?.from, 'en_revision');
});

test('un rol sin permiso no puede ejecutar la acción', () => {
  const e = engine();
  const inRevision = { state: 'en_revision', enteredStateAt: new Date() };
  assert.equal(e.can(inRevision, ciudadano, { action: 'aprobar' }).ok, false);
  assert.throws(() => e.apply(inRevision, ciudadano, { action: 'aprobar' }), TransitionDeniedError);
});

test('acción inexistente desde el estado actual es rechazada', () => {
  const e = engine();
  const verdict = e.can(e.start(), revisor, { action: 'aprobar' });
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason ?? '', /No existe la acción/);
});

test('requiresComment: "rechazar" exige comentario', () => {
  const e = engine();
  const inRevision = { state: 'en_revision', enteredStateAt: new Date() };
  assert.equal(e.can(inRevision, revisor, { action: 'rechazar' }).ok, false);
  assert.equal(
    e.can(inRevision, revisor, { action: 'rechazar', comment: '  ' }).ok,
    false,
    'un comentario en blanco no cuenta',
  );
  assert.equal(
    e.can(inRevision, revisor, { action: 'rechazar', comment: 'Falta el documento X' }).ok,
    true,
  );
});

test('guardOk=false bloquea la transición', () => {
  const e = engine();
  const inst = e.start();
  assert.equal(e.can(inst, ciudadano, { action: 'enviar', guardOk: false }).ok, false);
  assert.equal(e.can(inst, ciudadano, { action: 'enviar', guardOk: true }).ok, true);
});

test('dueAt aplica el SLA del estado destino', () => {
  const e = engine();
  const t0 = new Date('2026-03-10T08:00:00Z');
  let inst = e.start(t0);
  inst = e.apply(inst, ciudadano, { action: 'enviar' }, t0).instance;
  const res = e.apply(inst, funcionario, { action: 'tomar' }, t0);
  // en_revision => slaHours 72
  assert.equal(res.dueAt?.toISOString(), new Date('2026-03-13T08:00:00Z').toISOString());
  assert.equal(e.isOverdue(res.instance, new Date('2026-03-14T00:00:00Z')), true);
  assert.equal(e.isOverdue(res.instance, new Date('2026-03-11T00:00:00Z')), false);
});

test('estado terminal no tiene SLA ni acciones', () => {
  const e = engine();
  const aprobada = { state: 'aprobada', enteredStateAt: new Date() };
  assert.equal(e.dueAt(aprobada), null);
  assert.deepEqual(e.availableActions(aprobada, revisor), []);
});

test('availableActions lista solo lo permitido para el rol y estado', () => {
  const e = engine();
  const enviada = { state: 'enviada', enteredStateAt: new Date() };
  assert.deepEqual(
    e.availableActions(enviada, funcionario).map((t) => t.action),
    ['tomar'],
  );
  assert.deepEqual(e.availableActions(enviada, ciudadano), []);
});

test('validateDefinition detecta estado destino inexistente', () => {
  const bad: WorkflowDefinition = {
    slug: 'malo',
    version: 1,
    states: [
      { id: 'a', label: 'A', type: 'initial' },
      { id: 'b', label: 'B', type: 'terminal' },
    ],
    transitions: [{ action: 'ir', from: 'a', to: 'inexistente', roles: ['x'] }],
  };
  const problems = validateDefinition(bad);
  assert.ok(problems.some((p) => p.includes('inexistente')));
  assert.throws(() => new WorkflowEngine(bad), InvalidWorkflowError);
});

test('validateDefinition exige exactamente un estado inicial', () => {
  const twoInitials: WorkflowDefinition = {
    slug: 'dos-inicios',
    version: 1,
    states: [
      { id: 'a', label: 'A', type: 'initial' },
      { id: 'b', label: 'B', type: 'initial' },
      { id: 'c', label: 'C', type: 'terminal' },
    ],
    transitions: [
      { action: 'ir', from: 'a', to: 'c', roles: ['x'] },
      { action: 'ir', from: 'b', to: 'c', roles: ['x'] },
    ],
  };
  assert.ok(
    validateDefinition(twoInitials).some((p) => p.includes('exactamente un estado inicial')),
  );
});

test('validateDefinition detecta estados inalcanzables y transiciones ambiguas', () => {
  const def: WorkflowDefinition = {
    slug: 'raro',
    version: 1,
    states: [
      { id: 'a', label: 'A', type: 'initial' },
      { id: 'b', label: 'B', type: 'terminal' },
      { id: 'huerfano', label: 'Huérfano', type: 'intermediate' },
    ],
    transitions: [
      { action: 'ir', from: 'a', to: 'b', roles: ['x'] },
      { action: 'ir', from: 'a', to: 'b', roles: ['y'] },
    ],
  };
  const problems = validateDefinition(def);
  assert.ok(problems.some((p) => p.includes('inalcanzable')));
  assert.ok(problems.some((p) => p.includes('ambigua')));
});

test('el flujo de ejemplo es válido', () => {
  assert.deepEqual(validateDefinition(constanciaLaboralWorkflow), []);
});
