import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

export interface FieldDef {
  type?: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  enum?: string[];
  format?: string;
  pattern?: string;
  maxLength?: number;
  minLength?: number;
}

export interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, FieldDef>;
}

/** Convierte los strings de un FormData a los tipos que declara el schema. */
export function coerce(schema: JsonSchema, formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(schema.properties ?? {})) {
    const raw = formData.get(key);
    if (def.type === 'boolean') {
      out[key] = raw === 'on' || raw === 'true';
      continue;
    }
    if (raw == null || raw === '') continue;
    if (def.type === 'number' || def.type === 'integer') {
      const n = Number(raw);
      out[key] = Number.isNaN(n) ? raw : n;
      continue;
    }
    out[key] = String(raw);
  }
  return out;
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

/** Valida `data` contra un JSON Schema. Frontera de confianza: no confiar en el cliente. */
export function validate(schema: unknown, data: unknown): ValidationResult {
  const fn = ajv.compile(schema as object);
  if (fn(data)) return { ok: true };
  const errors = (fn.errors ?? []).map((e) => {
    const field =
      e.instancePath.replace(/^\//, '') ||
      (e.params as { missingProperty?: string }).missingProperty ||
      '';
    return field ? `${field}: ${e.message}` : (e.message ?? 'valor inválido');
  });
  return { ok: false, errors };
}
