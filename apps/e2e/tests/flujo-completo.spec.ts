import { expect, test, type Page } from '@playwright/test';

/**
 * Recorre el flujo completo de un trámite a través de la UI real, con los
 * tres roles y el efecto asíncrono del worker (firma + PDF):
 *
 *   ciudadana crea y envía → funcionario toma el caso → revisor aprueba
 *   → el worker firma y genera el PDF → descarga autenticada → verificación pública
 *
 * Requiere infra + apps/web + apps/worker corriendo con los datos del seed
 * (ver README → "Pruebas end-to-end").
 */

const PASSWORD = 'Password123!';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => url.pathname === '/solicitudes');
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.waitForURL((url) => url.pathname === '/');
}

test('una solicitud recorre crear → tomar → aprobar → firmar → verificar', async ({ page }) => {
  const identidad = String(Date.now()).padEnd(13, '0').slice(0, 13);

  // 1. La ciudadana llena el formulario dinámico y envía la solicitud.
  await login(page, 'ana@correo.local');
  await page.goto('/tramites/constancia-laboral/nueva');
  await page.locator('input[name="nombreCompleto"]').fill('Ana Torres (E2E)');
  await page.locator('input[name="identidad"]').fill(identidad);
  await page.locator('input[name="cargo"]').fill('Analista QA');
  await page.locator('select[name="motivo"]').selectOption('Trámite bancario');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();

  await page.waitForURL((url) => /^\/solicitudes\/VD-\d{4}-[0-9A-F]{8}$/.test(url.pathname));
  const code = page.url().split('/').pop()!;
  await expect(page.getByTestId('state-badge')).toHaveText('Enviada');
  await logout(page);

  // 2. El funcionario toma el caso desde su bandeja.
  await login(page, 'funcionario@alcaldia-demo.local');
  await page.goto(`/solicitudes/${code}`);
  await page.getByRole('button', { name: 'Tomar caso' }).click();
  await expect(page.getByTestId('state-badge')).toHaveText('En revisión');
  await logout(page);

  // 3. El revisor aprueba.
  await login(page, 'revisor@alcaldia-demo.local');
  await page.goto(`/solicitudes/${code}`);
  await page.getByRole('button', { name: 'Aprobar' }).click();
  await expect(page.getByTestId('state-badge')).toHaveText('Aprobada', { timeout: 10_000 });

  // 4. El worker procesa sign → generate_pdf de forma asíncrona: se espera
  //    a que el enlace de descarga aparezca (revalida la página).
  const downloadLink = page.getByRole('link', { name: 'Descargar PDF' });
  await expect(downloadLink).toBeVisible({ timeout: 20_000 });

  const href = await downloadLink.getAttribute('href');
  expect(href).toBeTruthy();
  const pdfResponse = await page.request.get(href!);
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()['content-type']).toBe('application/pdf');

  const verificationCode = await page.getByTestId('verification-code').textContent();
  expect(verificationCode).toMatch(/^VD-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  await logout(page);

  // 5. Cualquiera verifica el documento sin autenticarse.
  await page.goto(`/verificar/${verificationCode}`);
  await expect(page.getByText('Documento auténtico')).toBeVisible();

  // ... y la API pública responde lo mismo.
  const api = await page.request.get(`/api/verificar/${verificationCode}`);
  const body = await api.json();
  expect(body).toMatchObject({ valid: true, solicitud: code });
});

test('el portal de verificación rechaza un código inexistente', async ({ page }) => {
  await page.goto('/verificar/VD-0000-0000-0000');
  await expect(page.getByText('Documento no encontrado')).toBeVisible();

  const api = await page.request.get('/api/verificar/VD-0000-0000-0000');
  expect(api.status()).toBe(404);
});
