/**
 * Edge-case smoke test. Renders four synthetic payloads that between them
 * exercise every wording change from the July 2026 client reviews:
 *
 *   1) scrapped.pdf  — mild-hybrid petrol, missing mileage, 1 keeper,
 *                      MOT-not-yet-due, SORN, scrap + CoD banners,
 *                      cherished transfer with previous plates, no image.
 *   2) stolen.pdf    — pure EV, PNC stolen marker (renders own section
 *                      and the strongest red critical banner), active
 *                      finance MARKER (no records supplied), unknown
 *                      cherished status.
 *   3) hybrid.pdf    — full-hybrid petrol, detailed finance record with
 *                      masked reference number, tax expired in the past
 *                      ("Tax expired" not "Next due"), material valuation
 *                      mileage discrepancy warning.
 *   4) public.pdf    — same JSON as sample.json but rendered with
 *                      `report_mode: "public"` so dealer valuations are
 *                      hidden and the wording changes.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { generateReportPdf, closeBrowser } from '../src/services/pdfService';
import type { ReportPayload } from '../src/types/report';

const OUT_DIR = path.join(__dirname, '..', 'out');

function stripImageUrls<T extends ReportPayload>(p: T): T {
  return {
    ...p,
    image_url: undefined,
    report_data: p.report_data
      ? {
          ...p.report_data,
          images: {},
        }
      : p.report_data,
  };
}

const scrappedPayload: ReportPayload = {
  id: 'edge-scrapped-01',
  registration_number: 'AB24XYZ',
  year: 2024,
  make: 'Ford',
  model: 'Puma',
  derivative: 'ST-Line X 1.0 EcoBoost mHEV',
  latest_mileage: null,
  overall_status: 'fail',
  has_writeoff_flag: false,
  has_stolen_flag: false,
  has_finance_flag: false,
  has_high_keeper_turnover: false,
  generated_at: new Date().toISOString(),
  report_data: {
    registration_number: 'AB24XYZ',
    overall_status: 'fail',
    is_stolen: false,
    is_scrapped: true,
    has_finance: false,
    has_writeoff: false,
    has_high_keeper_turnover: false,
    vehicle: {
      vrm: 'AB24XYZ',
      vin: 'Permission Required',
      make: 'Ford',
      range: 'Puma',
      model: 'Puma ST-Line X',
      derivative: 'ST-Line X 1.0 EcoBoost mHEV',
      year: 2024,
      first_registration: '15-06-2024',
      fuel_type: 'Petrol MHEV',
      powertrain_type: 'Mild Hybrid',
      transmission: 'Manual',
      body_style: 'Hatchback',
      colour: 'Blue',
      doors: 5, seats: 5,
      engine_size: '1.0L',
      engine_capacity_cc: 999,
      engine_power_bhp: 155,
      co2: 129,
      combined_mpg: 51.4,
    },
    history: {
      keeper_changes: [
        { number_of_previous_keepers: 1, keeper_start_date: '15-06-2024' },
      ],
      colour_changes: [],
      plate_changes: [
        { date: '10-02-2025', vrm: 'AB24 XYZ' },
        { date: '12-08-2024', vrm: 'MJ24 XXX' },
      ],
      v5c_dates: [],
      imported: false, exported: false,
      is_scrapped: true, certificate_of_destruction: true,
      cherished_transfer: true,
    },
    police: { is_stolen: false, current_status: '', police_force: '' },
    writeoff: { records: [] },
    finance: { records: [] },
    mot: {
      latest_test_date: null,
      mot_due_date: '15-06-2027',
      tests: [],
      mileage_trend: [],
    },
    valuation: {
      trade_retail: 21000, trade_average: 19500, trade_poor: 17800,
      private_clean: 22500, private_average: 20800,
      dealer_forecourt: 24000, part_exchange: 20000, auction: 18700,
      on_the_road: 27500,
      valuation_mileage: 8000,
      valuation_book: 'Direct',
      vehicle_description: 'Ford Puma ST-Line X 1.0 EcoBoost mHEV [Petrol / Manual]',
      valuation_time: new Date().toISOString(),
      base_midpoint: 21200,
      optional_uplift: 0,
      suggested_sale_price: 21200,
    },
    specification: {
      standard: [
        { category: 'Safety & Security Features', name: 'Lane Keeping Aid', description: 'Active Lane Assist' },
        { category: 'Interior Features', name: 'Cruise Control', description: 'Adaptive Cruise Control' },
      ],
      optional: [
        { category: 'Interior Features', name: 'Panoramic Roof', description: 'Full-length glass sunroof' },
      ],
    },
    tax: {
      is_valid: false,
      tax_due_date: null,
      mot_status: '',
      mot_due_date: '15-06-2027',
      co2: 129,
    } as unknown as NonNullable<ReportPayload['report_data']>['tax'],
    codes: { ukvd_id: 'V-EDGE01', engine_number: 'ENG-EDGE-001' },
    images: {},
  },
};
(scrappedPayload.report_data!.tax as unknown as { status: string }).status = 'SORN Notified';

const stolenPayload: ReportPayload = {
  id: 'edge-stolen-01',
  registration_number: 'EV25BEV',
  year: 2025,
  make: 'Tesla',
  model: 'Model 3',
  derivative: 'Long Range Dual Motor',
  image_url: 'https://cdn.example.com/no-image/placeholder.png', // placeholder pattern
  latest_mileage: 4212,
  overall_status: 'fail',
  has_writeoff_flag: false,
  has_stolen_flag: true,
  has_finance_flag: true,
  has_high_keeper_turnover: false,
  generated_at: new Date().toISOString(),
  report_data: {
    registration_number: 'EV25BEV',
    overall_status: 'fail',
    is_stolen: true, is_scrapped: false,
    has_finance: true, has_writeoff: false,
    vehicle: {
      vrm: 'EV25BEV',
      vin: '5YJ3E1EA7NF123456',
      make: 'Tesla', range: 'Model 3', model: 'Model 3 Long Range',
      derivative: 'Long Range Dual Motor',
      year: 2025, first_registration: '02-05-2025',
      fuel_type: 'Electric', powertrain_type: 'BEV',
      transmission: 'Automatic', body_style: 'Saloon',
      colour: 'White', doors: 5, seats: 5,
      engine_size: 'Electric motor',
      engine_capacity_cc: 1499, // deliberately wrong ICE cc from feed
      engine_power_bhp: 434,
      combined_mpg: 3.7, // mpg-e style figure
    },
    history: {
      keeper_changes: [
        { number_of_previous_keepers: 2, keeper_start_date: '20-08-2025' },
        { number_of_previous_keepers: 1, keeper_start_date: '02-05-2025' },
      ],
      colour_changes: [],
      plate_changes: [], // no data returned
      v5c_dates: [],
      imported: false, exported: false,
      is_scrapped: false, certificate_of_destruction: false,
      // cherished_transfer flag intentionally omitted
    },
    police: {
      is_stolen: true,
      stolen_date: '01-11-2025',
      added_to_pnc: '02-11-2025',
      current_status: 'ACTIVE',
      police_force: 'Metropolitan Police',
    },
    // Feed misfiled a theft entry inside writeoff.records — should NOT
    // trigger a "category check advised" observation any more.
    writeoff: {
      records: [
        { category: '', status: 'THEFT MARKER', theft_indicator: 'STOLEN', damage_areas: [] },
      ],
    },
    // Marker-only finance (no records array).
    finance: { records: [] },
    mot: {
      latest_test_date: null,
      mot_due_date: '02-05-2028',
      tests: [],
      mileage_trend: [],
    },
    valuation: {
      trade_retail: 34000, trade_average: 32000,
      private_clean: 36500, private_average: 34500,
      dealer_forecourt: 38000, part_exchange: 33000, auction: 31000,
      on_the_road: 45990,
      valuation_mileage: 4200,
      valuation_book: 'Direct',
      vehicle_description: 'Tesla Model 3 Long Range Dual Motor [Electric / Automatic]',
      valuation_time: new Date().toISOString(),
      base_midpoint: 34500,
      suggested_sale_price: 34500,
    },
    specification: { standard: [], optional: [] },
    tax: {
      is_valid: true,
      tax_due_date: '01-05-2027',
      mot_status: 'Valid',
      mot_due_date: '02-05-2028',
      co2: 0,
    },
    codes: { ukvd_id: 'V-EV01' },
    images: {},
  },
};

const hybridPayload: ReportPayload = {
  id: 'edge-hybrid-01',
  registration_number: 'HY23ABC',
  year: 2023,
  make: 'Toyota',
  model: 'Yaris',
  derivative: '1.5 Hybrid Design CVT',
  latest_mileage: 45620,
  overall_status: 'warnings',
  has_writeoff_flag: false,
  has_stolen_flag: false,
  has_finance_flag: true,
  has_high_keeper_turnover: false,
  generated_at: new Date().toISOString(),
  report_data: {
    registration_number: 'HY23ABC',
    overall_status: 'warnings',
    is_stolen: false, is_scrapped: false,
    has_finance: true, has_writeoff: false,
    vehicle: {
      vrm: 'HY23ABC',
      vin: 'JTDKARBU00N1234567',
      make: 'Toyota', model: 'Yaris', derivative: '1.5 Hybrid Design CVT',
      year: 2023, first_registration: '18-03-2023',
      fuel_type: 'Petrol Hybrid Electric',
      powertrain_type: 'Full Hybrid',
      transmission: 'Automatic', number_of_gears: 1,
      body_style: 'Hatchback', colour: 'Silver',
      doors: 5, seats: 5,
      engine_size: '1.5L',
      engine_capacity_cc: 1490,
      engine_power_bhp: 116,
      co2: 92,
      combined_mpg: 68.9,
    },
    history: {
      keeper_changes: [
        { number_of_previous_keepers: 2, keeper_start_date: '01-09-2024' },
        { number_of_previous_keepers: 1, keeper_start_date: '18-03-2023' },
      ],
      colour_changes: [],
      plate_changes: [],
      v5c_dates: [],
      imported: false, exported: false,
      is_scrapped: false, certificate_of_destruction: false,
      cherished_transfer: false, // explicit "No" so we can render the confirmed original-plate wording
    },
    police: { is_stolen: false, current_status: '', police_force: '' },
    writeoff: { records: [] },
    finance: {
      records: [
        {
          finance_company: 'Toyota Financial Services',
          agreement_type: 'HP',
          agreement_date: '18-03-2023',
          agreement_term: '48 months',
          agreement_number: 'TFS-123456789012',
          contact_number: '0344 701 6202',
        },
      ],
    },
    mot: {
      latest_test_date: '10-03-2026',
      mot_due_date: '17-03-2027',
      tests: [
        { test_date: '10-03-2026', passed: true, odometer: 44100, odometer_unit: 'mi', expiry_date: '17-03-2027', advisories: [] },
      ],
      mileage_trend: [
        { date: '10-03-2026', mileage: 44100 },
      ],
    },
    valuation: {
      trade_retail: 15500, trade_average: 14200,
      private_clean: 16800, private_average: 15600,
      dealer_forecourt: 17500, part_exchange: 14800, auction: 13500,
      on_the_road: 24200,
      valuation_mileage: 20000, // deliberately different from latest_mileage
      valuation_book: 'Direct',
      vehicle_description: 'Toyota Yaris 1.5 Hybrid Design CVT [Petrol / Automatic]',
      valuation_time: new Date().toISOString(),
      base_midpoint: 15700,
      suggested_sale_price: 15700,
    },
    specification: {
      standard: [
        { category: 'Safety', name: 'Toyota Safety Sense', description: 'Pre-Collision System + AEB' },
        { category: 'Interior', name: 'Touchscreen', description: '9\" Multimedia Display' },
      ],
      optional: [],
    },
    tax: {
      is_valid: false,
      tax_due_date: '18-03-2026', // in the past — should be "Tax expired" not "Next due"
      mot_status: 'Valid',
      mot_due_date: '17-03-2027',
      co2: 92,
    },
    codes: { ukvd_id: 'V-HY01' },
    images: {},
  },
};

async function generate(name: string, payload: ReportPayload) {
  const start = Date.now();
  const pdf = await generateReportPdf(payload);
  const outPath = path.join(OUT_DIR, `${name}.pdf`);
  await fs.writeFile(outPath, pdf);
  console.log(`Wrote ${outPath} (${(pdf.length / 1024).toFixed(1)} KB) in ${Date.now() - start}ms`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // Regenerate the standard sample first — using it fresh here also proves
  // request isolation: if the previous BMW-fallback bug ever came back it
  // would show through on the four unrelated vehicles below.
  const raw = await fs.readFile(path.join(__dirname, '..', '..', 'sample.json'), 'utf-8');
  const sample = JSON.parse(raw) as ReportPayload;
  await generate('sample', sample);
  await generate('public', { ...sample, report_mode: 'public' });

  // Ensure the edge-case payloads never fall back to any bundled image.
  await generate('scrapped', stripImageUrls(scrappedPayload));
  await generate('stolen', stolenPayload); // placeholder URL — should be filtered
  await generate('hybrid', stripImageUrls(hybridPayload));

  await closeBrowser();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
