import Link from 'next/link';

const FEATURES = [
  {
    title: 'Trámites como dato',
    body: 'Cada trámite define su formulario (JSON Schema) y su flujo (máquina de estados con roles y SLA). Publicar uno nuevo no requiere desplegar código.',
  },
  {
    title: 'Flujo con trazabilidad',
    body: 'Enviar, tomar, aprobar, rechazar o devolver. Cada movimiento queda en un historial inmutable con autor, fecha y comentario.',
  },
  {
    title: 'Firma digital',
    body: 'Al aprobar, el acto se firma (RSA-SHA256) y se emite un PDF con código QR de verificación.',
  },
  {
    title: 'Verificación pública',
    body: 'Cualquier persona valida la autenticidad de un documento con su código, sin necesidad de cuenta.',
  },
];

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight text-blue-900">
          Ventanilla Digital
        </span>
        <div className="flex gap-3 text-sm">
          <Link
            href="/verificar"
            className="rounded-md px-3 py-1.5 text-slate-600 hover:text-slate-900"
          >
            Verificar documento
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800"
          >
            Ingresar
          </Link>
        </div>
      </header>

      <section className="mt-20 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
          Plataforma GovTech
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Gestión de trámites institucionales, de principio a fin.
        </h1>
        <p className="mt-5 text-lg text-slate-600">
          Catálogo de trámites, formularios dinámicos, motor de flujos configurable, firma digital
          de los actos aprobados y un portal público para verificar su autenticidad.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            Entrar a la plataforma
          </Link>
          <Link
            href="/verificar"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Verificar un documento
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">{f.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-20 border-t border-slate-200 pt-6 text-sm text-slate-400">
        Proyecto de portafolio · TypeScript · Next.js · PostgreSQL · Redis
      </footer>
    </div>
  );
}
