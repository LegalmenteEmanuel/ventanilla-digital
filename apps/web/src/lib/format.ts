export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDay(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-HN', { dateStyle: 'medium' });
}

/** Etiquetas en español para las acciones del flujo. */
export const ACTION_LABELS: Record<string, string> = {
  enviar: 'Enviar solicitud',
  tomar: 'Tomar caso',
  aprobar: 'Aprobar',
  rechazar: 'Rechazar',
  devolver: 'Devolver al ciudadano',
};

export const DANGER_ACTIONS = new Set(['rechazar', 'devolver']);

export const STATE_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_revision: 'En revisión',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
};

export function humanState(state: string): string {
  return STATE_LABELS[state] ?? state.replace(/_/g, ' ');
}
