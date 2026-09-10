import type { WorkflowDefinition } from './types.ts';

/**
 * Flujo de ejemplo: "Constancia laboral".
 *
 *   borrador ──enviar──▶ enviada ──tomar──▶ en_revision ─┬─aprobar──▶ aprobada (fin)
 *      ▲                                                  ├─rechazar─▶ rechazada (fin)
 *      └──────────────── devolver ────────────────────────┘
 *
 * Se usa en el seed de la base y en las pruebas del motor.
 */
export const constanciaLaboralWorkflow: WorkflowDefinition = {
  slug: 'constancia-laboral',
  version: 1,
  states: [
    { id: 'borrador', label: 'Borrador', type: 'initial' },
    { id: 'enviada', label: 'Enviada', type: 'intermediate', slaHours: 24 },
    { id: 'en_revision', label: 'En revisión', type: 'intermediate', slaHours: 72 },
    { id: 'aprobada', label: 'Aprobada', type: 'terminal', terminalOutcome: 'APROBADA' },
    { id: 'rechazada', label: 'Rechazada', type: 'terminal', terminalOutcome: 'RECHAZADA' },
  ],
  transitions: [
    {
      action: 'enviar',
      from: 'borrador',
      to: 'enviada',
      roles: ['ciudadano'],
      effects: [{ type: 'notify', params: { template: 'solicitud_recibida', to: 'citizen' } }],
    },
    {
      action: 'tomar',
      from: 'enviada',
      to: 'en_revision',
      roles: ['funcionario'],
    },
    {
      action: 'devolver',
      from: 'en_revision',
      to: 'borrador',
      roles: ['funcionario', 'revisor'],
      requiresComment: true,
      effects: [{ type: 'notify', params: { template: 'solicitud_devuelta', to: 'citizen' } }],
    },
    {
      action: 'aprobar',
      from: 'en_revision',
      to: 'aprobada',
      roles: ['revisor'],
      effects: [
        { type: 'sign', params: { document: 'constancia' } },
        { type: 'generate_pdf', params: { template: 'constancia', withQr: true } },
        { type: 'notify', params: { template: 'solicitud_aprobada', to: 'citizen' } },
      ],
    },
    {
      action: 'rechazar',
      from: 'en_revision',
      to: 'rechazada',
      roles: ['revisor'],
      requiresComment: true,
      effects: [{ type: 'notify', params: { template: 'solicitud_rechazada', to: 'citizen' } }],
    },
  ],
};
