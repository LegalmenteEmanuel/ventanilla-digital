/**
 * Modelo de datos del motor de flujos (workflow) de trámites.
 *
 * Una {@link WorkflowDefinition} es *dato puro* (se guarda como JSON en la base
 * junto al tipo de trámite), de modo que un administrador institucional puede
 * diseñar flujos sin desplegar código. El motor no ejecuta efectos secundarios:
 * los describe con {@link EffectSpec} y la capa de aplicación / los workers los
 * despachan.
 */

/** Rol funcional. Se mantiene como `string` para que las definiciones sean datos. */
export type Role = string;

export type StateType = 'initial' | 'intermediate' | 'terminal';

export interface WorkflowState {
  /** Identificador estable, referenciado por las transiciones. */
  id: string;
  /** Texto mostrado al usuario. */
  label: string;
  type: StateType;
  /**
   * Tiempo objetivo (horas) de permanencia en el estado. Si se supera, el
   * trámite se marca como "SLA vencido" para los tableros de gestión.
   */
  slaHours?: number;
  /**
   * Sólo para estados `terminal`: desenlace del trámite que la capa de
   * aplicación traslada al estado de la solicitud (p. ej. `APROBADA`,
   * `RECHAZADA`, `CANCELADA`).
   */
  terminalOutcome?: string;
}

/** Efecto declarativo a ejecutar tras una transición. */
export interface EffectSpec {
  /** `notify` | `sign` | `generate_pdf` | `webhook` | ... (extensible). */
  type: string;
  /** Parámetros libres, interpretados por el handler del efecto. */
  params?: Record<string, unknown>;
}

export interface WorkflowTransition {
  /** Verbo de la acción: `enviar`, `aprobar`, `rechazar`, `devolver`, ... */
  action: string;
  from: string;
  to: string;
  /** Roles autorizados a ejecutar la acción. No puede quedar vacío. */
  roles: Role[];
  /** Si es `true`, la acción exige un comentario no vacío. */
  requiresComment?: boolean;
  /** Efectos a despachar cuando la transición se aplica. */
  effects?: EffectSpec[];
}

export interface WorkflowDefinition {
  slug: string;
  version: number;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

/** Estado vivo de un trámite concreto. */
export interface WorkflowInstance {
  state: string;
  enteredStateAt: Date;
}

export interface Actor {
  id: string;
  roles: Role[];
}

export interface TransitionRequest {
  action: string;
  comment?: string;
  /**
   * Resultado de un guard de negocio evaluado por la capa de aplicación
   * (p. ej. "el formulario está completo", "el pago fue confirmado").
   * `undefined` = sin guard; `false` = rechazar la transición.
   */
  guardOk?: boolean;
}

export interface Effect extends EffectSpec {
  action: string;
  from: string;
  to: string;
  actorId: string;
}

export interface TransitionResult {
  instance: WorkflowInstance;
  from: string;
  to: string;
  action: string;
  effects: Effect[];
  /** Fecha límite (SLA) del nuevo estado, o `null` si el estado no define SLA. */
  dueAt: Date | null;
  /** `true` si el nuevo estado es terminal. */
  done: boolean;
  /** Desenlace del estado terminal alcanzado, o `null` si no es terminal. */
  outcome: string | null;
}

export interface Verdict {
  ok: boolean;
  reason?: string;
}
