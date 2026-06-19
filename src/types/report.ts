/**
 * Type definitions for the Motovo vehicle report payload.
 *
 * These types are intentionally permissive (most fields are optional/nullable)
 * because the upstream UKVehicleData feed varies between vehicles. The PDF
 * template must defensively render missing values as "—".
 */

export type ReportStatus = 'pass' | 'warnings' | 'fail' | string;

export interface VehicleInfo {
  vrm?: string;
  vin?: string;
  make?: string;
  range?: string;
  model?: string;
  model_variant?: string;
  series?: string;
  derivative?: string;
  year?: number | null;
  first_registration?: string | null;
  fuel_type?: string;
  powertrain_type?: string;
  transmission?: string;
  number_of_gears?: number | null;
  drive_type?: string;
  driving_axle?: string;
  body_style?: string;
  colour?: string;
  doors?: number | null;
  seats?: number | null;
  engine_size?: string;
  engine_capacity_cc?: number | null;
  engine_capacity_litres?: number | null;
  engine_power_bhp?: number | null;
  torque_nm?: number | null;
  euro_status?: string;
  combined_mpg?: number | null;
  co2?: number | null;
  max_speed_mph?: number | null;
  zero_to_sixty?: number | null;
  ncap_rating?: string | number | null;
  wheel_plan?: string;
  country_of_origin?: string;
  platform_name?: string;
}

export interface KeeperChange {
  number_of_previous_keepers?: number | null;
  keeper_start_date?: string | null;
  previous_keeper_disposal_date?: string | null;
}

export interface PlateChange {
  date?: string | null;
  vrm?: string;
}

export interface HistoryInfo {
  keeper_changes?: KeeperChange[];
  colour_changes?: Array<{ date?: string | null; colour?: string }>;
  plate_changes?: PlateChange[];
  v5c_dates?: Array<{ date?: string | null }>;
  imported?: boolean;
  exported?: boolean;
  is_scrapped?: boolean;
  certificate_of_destruction?: boolean;
  cherished_transfer?: boolean;
}

export interface PoliceInfo {
  is_stolen?: boolean;
  stolen_date?: string | null;
  added_to_pnc?: string | null;
  current_status?: string;
  police_force?: string;
}

export interface WriteoffRecord {
  category?: string;
  status?: string;
  loss_date?: string | null;
  theft_indicator?: string;
  insurer?: string;
  miaftr_date?: string | null;
  cause_of_damage?: string;
  damage_areas?: string[];
}

export interface WriteoffInfo {
  records?: WriteoffRecord[];
}

export interface FinanceRecord {
  finance_company?: string;
  agreement_date?: string | null;
  agreement_term?: string;
  agreement_number?: string;
  agreement_type?: string;
  contact_number?: string;
}

export interface FinanceInfo {
  records?: FinanceRecord[];
}

export type AdvisoryType = 'ADVISORY' | 'MAJOR' | 'MINOR' | 'DANGEROUS' | 'PRS' | 'FAIL' | string;

export interface Advisory {
  type?: AdvisoryType;
  text?: string;
}

export interface MotTest {
  test_date?: string | null;
  result?: string;
  passed?: boolean;
  odometer?: number | null;
  odometer_unit?: string;
  expiry_date?: string | null;
  unreadable_odometer?: boolean;
  advisories?: Advisory[];
}

export interface MileagePoint {
  date?: string | null;
  mileage?: number | null;
  result?: string;
}

export interface MotInfo {
  latest_test_date?: string | null;
  mot_due_date?: string | null;
  tests?: MotTest[];
  mileage_trend?: MileagePoint[];
}

export interface ValuationInfo {
  trade_retail?: number | null;
  trade_poor?: number | null;
  trade_average?: number | null;
  private_clean?: number | null;
  private_average?: number | null;
  dealer_forecourt?: number | null;
  part_exchange?: number | null;
  auction?: number | null;
  on_the_road?: number | null;
  valuation_mileage?: number | null;
  valuation_book?: string;
  vehicle_description?: string;
  valuation_time?: string;
  base_midpoint?: number | null;
  optional_equipment_count?: number | null;
  optional_equipment_total?: number | null;
  optional_uplift?: number | null;
  suggested_sale_price?: number | null;
}

export interface SpecItem {
  category?: string;
  name?: string;
  description?: string;
  fitment?: string;
  package_items?: unknown[];
}

export interface SpecificationInfo {
  standard?: SpecItem[];
  optional?: SpecItem[];
}

/**
 * Structured VED rate from VDG (forward-compat). When the upstream feed
 * supplies a 12-month rate object we honour it directly; otherwise we fall
 * back to the V149 calculator in runningCosts.ts.
 */
export interface VedRateObject {
  standard_twelve_months?: number | null;
  premium_twelve_months?: number | null;
  is_premium_vehicle?: boolean;
}

export interface TaxInfo {
  is_valid?: boolean;
  tax_due_date?: string | null;
  mot_status?: string;
  mot_due_date?: string | null;
  co2?: number | null;
  ved_rate?: number | string | VedRateObject | null;
  ved_12m?: number | null;
  ved_6m?: number | null;
}

export interface CodesInfo {
  ukvd_id?: string;
  uvc?: string;
  vin_last5?: string;
  engine_number?: string;
}

export interface ImagesInfo {
  primary?: string;
  all?: string[];
}

export interface ReportData {
  registration_number?: string;
  overall_status?: ReportStatus;
  is_stolen?: boolean;
  is_scrapped?: boolean;
  has_finance?: boolean;
  has_writeoff?: boolean;
  has_high_keeper_turnover?: boolean;
  vehicle?: VehicleInfo;
  history?: HistoryInfo;
  police?: PoliceInfo;
  writeoff?: WriteoffInfo;
  finance?: FinanceInfo;
  mot?: MotInfo;
  valuation?: ValuationInfo;
  specification?: SpecificationInfo;
  tax?: TaxInfo;
  codes?: CodesInfo;
  images?: ImagesInfo;
}

export interface ReportPayload {
  id?: string;
  registration_number?: string;
  year?: number | null;
  make?: string;
  model?: string;
  derivative?: string;
  image_url?: string;
  has_writeoff_flag?: boolean;
  has_stolen_flag?: boolean;
  has_finance_flag?: boolean;
  has_high_keeper_turnover?: boolean;
  latest_mileage?: number | null;
  overall_status?: ReportStatus;
  description?: string | null;
  expires_at?: string | null;
  generated_at?: string | null;
  created_date?: string | null;
  updated_date?: string | null;
  dealer_user_email?: string | null;
  report_data?: ReportData;
}
