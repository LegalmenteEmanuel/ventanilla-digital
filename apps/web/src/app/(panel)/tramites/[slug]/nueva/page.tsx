import { notFound } from 'next/navigation';

import { prisma } from '@vd/db';

import { NuevaSolicitudForm } from '@/components/nueva-solicitud-form';
import { Card } from '@/components/ui';
import type { JsonSchema } from '@/lib/schema';

export default async function NuevaSolicitudPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proc = await prisma.procedureType.findFirst({
    where: { slug, active: true },
    include: { institution: { select: { name: true } } },
  });
  if (!proc) notFound();

  return (
    <div className="max-w-xl">
      <p className="text-xs uppercase tracking-wide text-slate-400">{proc.institution.name}</p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">{proc.name}</h1>
      {proc.description && <p className="mt-1 text-sm text-slate-600">{proc.description}</p>}

      <Card className="mt-6">
        <NuevaSolicitudForm slug={proc.slug} schema={proc.formSchema as unknown as JsonSchema} />
      </Card>
    </div>
  );
}
