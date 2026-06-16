import { ReportPayload } from '../../types/report';
import { esc } from '../helpers';

type RiskTone = 'ok' | 'warn' | 'fail';
interface RiskCheck {
  label: string;
  value: string;
  tone: RiskTone;
}

function check(label: string, hit: boolean, hitLabel = 'Detected', okLabel = 'Clear', toneIfHit: RiskTone = 'fail'): RiskCheck {
  return {
    label,
    value: hit ? hitLabel : okLabel,
    tone: hit ? toneIfHit : 'ok',
  };
}

function pillFor(tone: RiskTone): string {
  switch (tone) {
    case 'ok':
      return '✓';
    case 'warn':
      return '!';
    case 'fail':
      return '✕';
  }
}

export function renderRiskChecks(payload: ReportPayload): string {
  const r = payload.report_data;
  const checks: RiskCheck[] = [
    check('Insurance write-off', !!r?.has_writeoff, 'Recorded'),
    check('Stolen (police)', !!r?.is_stolen, 'Reported stolen'),
    check('Outstanding finance', !!r?.has_finance, 'Active'),
    check('Scrapped', !!r?.is_scrapped, 'Scrapped'),
    check('Imported', !!r?.history?.imported, 'Yes', 'No', 'warn'),
    check('Exported', !!r?.history?.exported, 'Yes', 'No', 'warn'),
    check(
      'High keeper turnover',
      !!r?.has_high_keeper_turnover,
      'Yes',
      'Normal',
      'warn',
    ),
    check(
      'Certificate of destruction',
      !!r?.history?.certificate_of_destruction,
      'Issued',
    ),
    check(
      'Cherished plate transfer',
      !!r?.history?.cherished_transfer,
      'Yes',
      'No',
      'warn',
    ),
  ];

  const cells = checks
    .map(
      (c) => `
        <div class="risk ${c.tone}">
          <div class="pill">${pillFor(c.tone)}</div>
          <div>
            <div class="label">${esc(c.label)}</div>
            <div class="value">${esc(c.value)}</div>
          </div>
        </div>
      `,
    )
    .join('');

  return `
    <section class="section no-break">
      <div class="section-title"><span class="icon">⚠</span> Risk Checks Summary</div>
      <div class="risk-grid">${cells}</div>
    </section>
  `;
}
