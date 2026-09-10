import type { WorkflowDefinition } from './types.ts';

/**
 * Revisa una definición de workflow y devuelve la lista de problemas
 * estructurales. Lista vacía = definición válida.
 *
 * Reglas:
 *  - exactamente un estado `initial`;
 *  - al menos un estado `terminal`;
 *  - toda transición referencia estados existentes en `from` y `to`;
 *  - los estados `terminal` no tienen transiciones de salida;
 *  - no hay pares `(from, action)` duplicados (transición ambigua);
 *  - toda transición tiene al menos un rol;
 *  - todos los estados son alcanzables desde el estado inicial.
 */
export function validateDefinition(def: WorkflowDefinition): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const s of def.states) {
    if (ids.has(s.id)) problems.push(`Estado duplicado: "${s.id}"`);
    ids.add(s.id);
  }

  const initials = def.states.filter((s) => s.type === 'initial');
  if (initials.length !== 1) {
    problems.push(`Debe haber exactamente un estado inicial (hay ${initials.length})`);
  }
  if (!def.states.some((s) => s.type === 'terminal')) {
    problems.push('Debe haber al menos un estado terminal');
  }

  const terminal = new Set(def.states.filter((s) => s.type === 'terminal').map((s) => s.id));
  const seenPair = new Set<string>();
  for (const t of def.transitions) {
    if (!ids.has(t.from))
      problems.push(`Transición "${t.action}": estado origen inexistente "${t.from}"`);
    if (!ids.has(t.to))
      problems.push(`Transición "${t.action}": estado destino inexistente "${t.to}"`);
    if (terminal.has(t.from)) {
      problems.push(`Transición "${t.action}": sale del estado terminal "${t.from}"`);
    }
    if (t.roles.length === 0) {
      problems.push(`Transición "${t.action}" desde "${t.from}": sin roles autorizados`);
    }
    const pair = `${t.from}::${t.action}`;
    if (seenPair.has(pair)) {
      problems.push(`Transición ambigua: "${t.action}" definida más de una vez desde "${t.from}"`);
    }
    seenPair.add(pair);
  }

  if (initials.length === 1) {
    const start = initials[0]!.id;
    const reachable = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const t of def.transitions) {
        if (t.from === cur && ids.has(t.to) && !reachable.has(t.to)) {
          reachable.add(t.to);
          queue.push(t.to);
        }
      }
    }
    for (const s of def.states) {
      if (!reachable.has(s.id)) problems.push(`Estado inalcanzable desde "${start}": "${s.id}"`);
    }
  }

  return problems;
}
