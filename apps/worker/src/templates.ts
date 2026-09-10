/** Plantillas de notificación. Texto plano; `ctx` trae los datos de la solicitud. */
export interface TemplateCtx {
  code: string;
  procedure: string;
  comment?: string | null;
}

type Template = (ctx: TemplateCtx) => { subject: string; body: string };

export const templates: Record<string, Template> = {
  solicitud_recibida: (c) => ({
    subject: `Recibimos tu solicitud ${c.code}`,
    body: `Tu solicitud de "${c.procedure}" (${c.code}) fue registrada y está en cola de atención.`,
  }),
  solicitud_devuelta: (c) => ({
    subject: `Tu solicitud ${c.code} necesita correcciones`,
    body: `Un funcionario devolvió la solicitud ${c.code}. Observación: ${c.comment ?? 'sin detalle'}. Corrige y vuelve a enviarla.`,
  }),
  solicitud_aprobada: (c) => ({
    subject: `Tu solicitud ${c.code} fue aprobada`,
    body: `La solicitud ${c.code} de "${c.procedure}" fue aprobada y firmada. Ya puedes descargar el documento con su código de verificación.`,
  }),
  solicitud_rechazada: (c) => ({
    subject: `Tu solicitud ${c.code} fue rechazada`,
    body: `La solicitud ${c.code} fue rechazada. Motivo: ${c.comment ?? 'sin detalle'}.`,
  }),
};

export function render(name: string, ctx: TemplateCtx): { subject: string; body: string } {
  const tpl = templates[name];
  if (tpl) return tpl(ctx);
  return {
    subject: `Actualización de tu solicitud ${ctx.code}`,
    body: `La solicitud ${ctx.code} cambió de estado.`,
  };
}
