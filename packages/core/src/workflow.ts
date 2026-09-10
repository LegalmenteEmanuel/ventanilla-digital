import { InvalidWorkflowError, TransitionDeniedError } from './errors.ts';
import { validateDefinition } from './validate.ts';
import type {
  Actor,
  Effect,
  TransitionRequest,
  TransitionResult,
  Verdict,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowState,
  WorkflowTransition,
} from './types.ts';

const HOUR_MS = 3_600_000;

/**
 * Máquina de estados de un trámite. Es **pura**: no toca base de datos ni red.
 * `apply()` devuelve el nuevo estado y una lista de {@link Effect} declarativos
 * que la capa de aplicación (o un worker de cola) se encarga de ejecutar.
 */
export class WorkflowEngine {
  private readonly def: WorkflowDefinition;
  private readonly states: Map<string, WorkflowState>;

  constructor(def: WorkflowDefinition) {
    const problems = validateDefinition(def);
    if (problems.length > 0) throw new InvalidWorkflowError(problems);
    this.def = def;
    this.states = new Map(def.states.map((s) => [s.id, s]));
  }

  /** Id del estado inicial (garantizado único por la validación). */
  get initialState(): string {
    return this.def.states.find((s) => s.type === 'initial')!.id;
  }

  /** Crea la instancia inicial de un trámite nuevo. */
  start(now = new Date()): WorkflowInstance {
    return { state: this.initialState, enteredStateAt: now };
  }

  isTerminal(stateId: string): boolean {
    return this.states.get(stateId)?.type === 'terminal';
  }

  /** Transiciones que el actor puede ejecutar ahora mismo. */
  availableActions(instance: WorkflowInstance, actor: Actor): WorkflowTransition[] {
    return this.def.transitions.filter(
      (t) => t.from === instance.state && actor.roles.some((r) => t.roles.includes(r)),
    );
  }

  /** ¿Se puede aplicar `req` sobre `instance` como `actor`? Sin efectos secundarios. */
  can(instance: WorkflowInstance, actor: Actor, req: TransitionRequest): Verdict {
    const t = this.match(instance.state, req.action);
    if (!t) {
      return { ok: false, reason: `No existe la acción "${req.action}" desde "${instance.state}"` };
    }
    if (!actor.roles.some((r) => t.roles.includes(r))) {
      return { ok: false, reason: `El rol del usuario no autoriza la acción "${req.action}"` };
    }
    if (t.requiresComment && !req.comment?.trim()) {
      return { ok: false, reason: `La acción "${req.action}" requiere un comentario` };
    }
    if (req.guardOk === false) {
      return { ok: false, reason: `Una regla de negocio impide la acción "${req.action}"` };
    }
    return { ok: true };
  }

  /**
   * Aplica la transición. Lanza {@link TransitionDeniedError} si `can()` la rechaza.
   * No muta `instance`: devuelve una instancia nueva.
   */
  apply(
    instance: WorkflowInstance,
    actor: Actor,
    req: TransitionRequest,
    now = new Date(),
  ): TransitionResult {
    const verdict = this.can(instance, actor, req);
    if (!verdict.ok) throw new TransitionDeniedError(verdict.reason!);

    const t = this.match(instance.state, req.action)!;
    const next: WorkflowInstance = { state: t.to, enteredStateAt: now };
    const effects: Effect[] = (t.effects ?? []).map((e) => ({
      ...e,
      action: t.action,
      from: t.from,
      to: t.to,
      actorId: actor.id,
    }));

    return {
      instance: next,
      from: t.from,
      to: t.to,
      action: t.action,
      effects,
      dueAt: this.dueAt(next),
      done: this.isTerminal(t.to),
    };
  }

  /** Fecha límite del estado de `instance` según su SLA, o `null` si no define SLA. */
  dueAt(instance: WorkflowInstance): Date | null {
    const sla = this.states.get(instance.state)?.slaHours;
    if (!sla) return null;
    return new Date(instance.enteredStateAt.getTime() + sla * HOUR_MS);
  }

  /** `true` si el SLA del estado actual ya venció respecto a `now`. */
  isOverdue(instance: WorkflowInstance, now = new Date()): boolean {
    const due = this.dueAt(instance);
    return due !== null && now.getTime() > due.getTime();
  }

  private match(from: string, action: string): WorkflowTransition | undefined {
    return this.def.transitions.find((t) => t.from === from && t.action === action);
  }
}
