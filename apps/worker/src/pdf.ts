import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface ConstanciaCtx {
  code: string;
  institution: string;
  procedureName: string;
  citizenName: string;
  formData: Record<string, unknown>;
  issuedAt: Date;
  verificationCode: string;
  verifyUrl: string;
  documentHash: string;
}

const BRAND = '#1e3a8a';
const MUTED = '#475569';

/** Genera el PDF de la constancia con QR de verificación. */
export async function renderConstancia(ctx: ConstanciaCtx): Promise<Buffer> {
  const qr = await QRCode.toBuffer(ctx.verifyUrl, { margin: 1, width: 132 });

  const doc = new PDFDocument({
    size: 'A4',
    margin: 56,
    info: { Title: `Constancia ${ctx.code}` },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );

  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(18).text(ctx.institution.toUpperCase());
  doc.moveDown(0.2);
  doc
    .fillColor(MUTED)
    .font('Helvetica')
    .fontSize(10)
    .text('Ventanilla Digital · Documento emitido electrónicamente');
  doc
    .moveTo(56, doc.y + 8)
    .lineTo(539, doc.y + 8)
    .strokeColor('#cbd5e1')
    .stroke();
  doc.moveDown(1.5);

  doc
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(15)
    .text(ctx.procedureName.toUpperCase(), { align: 'center' });
  doc.moveDown(1.5);

  doc
    .fillColor('#0f172a')
    .font('Helvetica')
    .fontSize(11)
    .text(
      `Por este medio se hace constar que ${ctx.citizenName} presentó la solicitud identificada ` +
        `con el código ${ctx.code}, la cual fue revisada y aprobada conforme al procedimiento vigente.`,
      { align: 'justify', lineGap: 3 },
    );
  doc.moveDown(1);

  doc.font('Helvetica-Bold').fontSize(11).text('Datos de la solicitud');
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor(MUTED);
  for (const [k, v] of Object.entries(ctx.formData)) {
    doc.text(`•  ${k}: ${String(v)}`);
  }
  doc.moveDown(1.5);

  doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
  doc.text(`Emitido el ${ctx.issuedAt.toLocaleString('es-HN')}`);
  doc.moveDown(2);

  const y = doc.y;
  doc.image(qr, 56, y, { width: 110 });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text('Verificación en línea', 180, y + 6)
    .fillColor('#0f172a')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(ctx.verificationCode, 180, y + 20)
    .font('Helvetica')
    .fillColor(MUTED)
    .fontSize(8)
    .text(ctx.verifyUrl, 180, y + 40)
    .text(`SHA-256: ${ctx.documentHash}`, 180, y + 54, { width: 320 });

  doc.end();
  return done;
}
