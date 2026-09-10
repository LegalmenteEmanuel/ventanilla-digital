'use client';

import type { FieldDef, JsonSchema } from '@/lib/schema';

/**
 * Renderiza campos de formulario a partir de un JSON Schema (subconjunto:
 * object → properties de tipo string/number/boolean, enum, format date,
 * pattern, maxLength). La validación real es del lado del servidor.
 */
export function JsonSchemaForm({
  schema,
  defaults = {},
  disabled = false,
}: {
  schema: JsonSchema;
  defaults?: Record<string, unknown>;
  disabled?: boolean;
}) {
  const entries = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);

  return (
    <div className="space-y-4">
      {entries.map(([name, def]) => (
        <Field
          key={name}
          name={name}
          def={def}
          required={required.has(name)}
          defaultValue={defaults[name]}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function Field({
  name,
  def,
  required,
  defaultValue,
  disabled,
}: {
  name: string;
  def: FieldDef;
  required: boolean;
  defaultValue: unknown;
  disabled: boolean;
}) {
  const label = def.title ?? name;
  const base =
    'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100';

  if (def.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name={name}
          defaultChecked={Boolean(defaultValue)}
          disabled={disabled}
          className="h-4 w-4 rounded border-slate-300"
        />
        {label}
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {def.enum ? (
        <select
          name={name}
          required={required}
          disabled={disabled}
          defaultValue={(defaultValue as string) ?? ''}
          className={base}
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {def.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : def.maxLength && def.maxLength > 160 ? (
        <textarea
          name={name}
          required={required}
          disabled={disabled}
          rows={4}
          maxLength={def.maxLength}
          defaultValue={(defaultValue as string) ?? ''}
          className={base}
        />
      ) : (
        <input
          type={inputType(def)}
          name={name}
          required={required}
          disabled={disabled}
          pattern={def.pattern}
          maxLength={def.maxLength}
          defaultValue={(defaultValue as string | number | undefined) ?? ''}
          className={base}
        />
      )}
      {def.description && (
        <span className="mt-1 block text-xs text-slate-400">{def.description}</span>
      )}
    </label>
  );
}

function inputType(def: FieldDef): string {
  if (def.type === 'number' || def.type === 'integer') return 'number';
  if (def.format === 'date') return 'date';
  if (def.format === 'email') return 'email';
  return 'text';
}
