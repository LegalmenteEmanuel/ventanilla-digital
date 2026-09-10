import { notFound } from 'next/navigation';

import { WorkflowEngine, type WorkflowDefinition } from '@vd/core';

import { TransitionForm, type TransitionOption } from '@/components/transition-form';
import { Card, StateBadge } from '@/components/ui';
import { getRequestByCode } from '@/lib/data';
import { ACTION_LABELS, DANGER_ACTIONS, fmtDate, humanState } from '@/lib/format';
import { effectiveRoles, institutionIds, requireSession } from '@/lib/rbac';

export default async function RequestDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await requireSession();

  const req = await getRequestByCode(code);
  if (!req) notFound();

  const owner = req.citizen.id === session.user.id;
  const sameInstitution = institutionIds(session).includes(req.procedureType.institutionId);
  if (!owner && !sameInstitution) notFound();

  const engine = new WorkflowEngine(
    req.procedureType.workflowDefinition as unknown as WorkflowDefinition,
  );
  const actor = { id: session.user.id, roles: effectiveRoles(session, req.citizen.id) };
  const options: TransitionOption[] = engine
    .availableActions({ state: req.currentState, enteredStateAt: req.updatedAt }, actor)
    .map((t) => ({
      action: t.action,
      label: ACTION_LABELS[t.action] ?? t.action,
      requiresComment: t.requiresComment,
      danger: DANGER_ACTIONS.has(t.action),
    }));

  const formData = req.formData as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{req.code}</h1>
          <p className="text-sm text-slate-500">
            {req.procedureType.name} · {req.procedureType.institution.name}
          </p>
        </div>
        <StateBadge state={req.currentState} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-slate-500">Solicitante</p>
          <p className="mt-1 text-sm font-medium">{req.citizen.name ?? req.citizen.email}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Enviada</p>
          <p className="mt-1 text-sm font-medium">{fmtDate(req.submittedAt)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500">Límite SLA</p>
          <p className="mt-1 text-sm font-medium">{fmtDate(req.dueAt)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold text-slate-900">Datos del formulario</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {Object.entries(formData).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="text-sm text-slate-800">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {req.signature?.pdfStorageKey && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Documento firmado</h2>
            <p className="text-sm text-slate-500">
              Código de verificación:{' '}
              <span className="font-mono">{req.signature.verificationCode}</span>
            </p>
          </div>
          <a
            href={`/api/solicitudes/${req.code}/pdf`}
            className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Descargar PDF
          </a>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-slate-900">Acciones</h2>
        <div className="mt-3">
          <TransitionForm code={req.code} options={options} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-slate-900">Historial</h2>
        <ol className="mt-3 space-y-3">
          {req.transitions.map((t) => (
            <li key={t.id} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <div>
                <p className="text-slate-800">
                  <span className="font-medium">{ACTION_LABELS[t.action] ?? t.action}</span>{' '}
                  <span className="text-slate-400">·</span> {humanState(t.fromState)} →{' '}
                  {humanState(t.toState)}
                </p>
                <p className="text-xs text-slate-400">
                  {t.actor.name ?? t.actor.email} · {fmtDate(t.createdAt)}
                </p>
                {t.comment && (
                  <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-slate-600">{t.comment}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
