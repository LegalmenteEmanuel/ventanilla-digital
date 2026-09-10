/** La definición del workflow no es consistente y no puede instanciarse. */
export class InvalidWorkflowError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Definición de workflow inválida:\n- ${problems.join('\n- ')}`);
    this.name = 'InvalidWorkflowError';
    this.problems = problems;
  }
}

/** La transición solicitada no está permitida para el actor/estado actual. */
export class TransitionDeniedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = 'TransitionDeniedError';
    this.reason = reason;
  }
}
