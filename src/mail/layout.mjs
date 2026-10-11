function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shared Mid-Side transactional shell — dark studio, red CTA.
 * @param {{ headline: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string, metaRows?: { label: string, value: string }[], preheader?: string, footerNote?: string }} opts
 */
export function renderEmailLayout({
  headline,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  metaRows = [],
  preheader = "",
  footerNote = "",
}) {
  const metaBlock =
    metaRows.length === 0
      ? ""
      : `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;">
          ${metaRows
            .map(
              (row) => `<tr>
              <td style="padding:8px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
              <td style="padding:8px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;color:#FFFFFF;vertical-align:top;">${escapeHtml(row.value)}</td>
            </tr>`,
            )
            .join("")}
        </table>`;

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<p style="margin:28px 0 0;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#FF0000;color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:14px 22px;">${escapeHtml(ctaLabel)}</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#0A0A0A;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#111111;border:1px solid #1F1F1F;">
          <tr>
            <td style="padding:28px 28px 8px;border-bottom:1px solid #1F1F1F;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.16em;color:#FF0000;text-transform:uppercase;">Mid-Side Audio</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.2;color:#FFFFFF;font-weight:800;">${escapeHtml(headline)}</h1>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#E5E7EB;">${bodyHtml}</div>
              ${metaBlock}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #1F1F1F;">
              <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:1.5;color:#6B7280;">
                kemenamusic.com/mixing${footerNote ? `<br />${escapeHtml(footerNote)}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export { escapeHtml };
