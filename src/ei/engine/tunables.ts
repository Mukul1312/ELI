/**
 * Centralized v1 defaults registry for all EI thresholds, caps, and policy defaults.
 * 
 * Source references:
 * - EI_Engine_Taxonomy.md sections 6.1-6.2
 * - EI_Protocol_1_Ignition.md lines 108-124
 * - EI_Protocol_2_Activation.md lines 110-116
 * - EI_Protocol_3_Verification.md lines 81-94
 * - EI_Spec.md section 4.8 (Strategic Adjustment)
 * - EI_Spec.md section 4.14 (Adaptive Tightness Policy)
 */

// ============================================================================
// Risk-Trigger Thresholds (from EI_Engine_Taxonomy.md 6.1)
// ============================================================================

export const SILENCE_DAYS_THRESHOLD = 2;
export const OPEN_LOOPS_THRESHOLD = 3;
export const VERIFICATION_RATE_LOW = 0.60;
export const VERIFICATION_RATE_HEALTHY = 0.75;
export const SCHEDULE_MISSES_THRESHOLD = 2;
export const AVOIDANT_EXITS_THRESHOLD = 2;
export const SKIP_COUNT_THRESHOLD = 3;

// ============================================================================
// Protocol 1 (Ignition) Defaults
// ============================================================================

// Scope caps by mode (minutes)
export const P1_RESCUE_SCOPE_MIN = 10;
export const P1_RESCUE_SCOPE_MAX = 30;
export const P1_NEUTRAL_SCOPE_MIN = 30;
export const P1_NEUTRAL_SCOPE_MAX = 60;
export const P1_BOOST_SCOPE_MIN = 45;
export const P1_BOOST_SCOPE_MAX = 90;

// Minimum questions by mode
export const P1_RESCUE_MIN_QUESTIONS = 1;
export const P1_NEUTRAL_MIN_QUESTIONS_MIN = 1;
export const P1_NEUTRAL_MIN_QUESTIONS_MAX = 3;
export const P1_BOOST_MIN_QUESTIONS = 3;

// ============================================================================
// Protocol 2 (Activation) Defaults
// ============================================================================

// Timebox ranges by mode (minutes)
export const P2_RESCUE_TIMEBOX_MIN = 2;
export const P2_RESCUE_TIMEBOX_MAX = 10;
export const P2_NEUTRAL_TIMEBOX_MIN = 10;
export const P2_NEUTRAL_TIMEBOX_MAX = 25;
export const P2_BOOST_TIMEBOX_MIN = 25;
export const P2_BOOST_TIMEBOX_MAX = 60;

// Escalation thresholds
export const P2_REPLAN_CAP_DEFAULT = 2;
export const STALL_LATENCY_THRESHOLD_MIN = 15; // minutes
export const STALL_COUNT_ESCALATION = 2; // stalls in 7d window
export const REPLAN_LOOP_ESCALATION = 2; // replan loops in 7d window

// Micro-start defaults (P2-R1)
export const P2_MICRO_START_MIN_SEC = 30;
export const P2_MICRO_START_MAX_SEC = 120;

// Two-minute rule (P2-R2)
export const P2_TWO_MINUTE_RULE_MIN = 2; // minutes

// ============================================================================
// Protocol 3 (Verification) Defaults
// ============================================================================

// Minimum questions by mode
export const P3_RESCUE_MIN_QUESTIONS = 1;
export const P3_NEUTRAL_MIN_QUESTIONS_MIN = 1;
export const P3_NEUTRAL_MIN_QUESTIONS_MAX = 3;
export const P3_BOOST_MIN_QUESTIONS = 5;

// Scheduling defaults
export const SCHEDULE_GRACE_HOURS = 12;
export const DEFAULT_TARGET_LATENCY_HOURS = 48;

// Anti-gaming threshold
export const ANTI_GAMING_TIME_PER_Q_SEC = 10; // seconds per question

// Timebox ranges for VerifyNow (seconds)
export const P3_RESCUE_TIMEBOX_MIN_SEC = 120;
export const P3_RESCUE_TIMEBOX_MAX_SEC = 240;
export const P3_NEUTRAL_TIMEBOX_MIN_SEC = 300;
export const P3_NEUTRAL_TIMEBOX_MAX_SEC = 600;
export const P3_BOOST_TIMEBOX_MIN_SEC = 600;
export const P3_BOOST_TIMEBOX_MAX_SEC = 1200;

// Escalation thresholds
export const P3_AVOIDANT_EXITS_ESCALATION = 2; // in 7d window
export const P3_SCHEDULE_MISSES_ESCALATION = 2; // in 7d window
export const P3_SKIP_COUNT_ESCALATION = 3; // in 7d window

// ============================================================================
// Strategic Adjustment Defaults (from EI_Spec.md 4.8)
// ============================================================================

// Recovery mode dial values
export const SA_RECOVERY_SCOPE_MULTIPLIER_MIN = 0.6;
export const SA_RECOVERY_SCOPE_MULTIPLIER_MAX = 0.8;
export const SA_RECOVERY_DIFFICULTY_DELTA = 0; // or -1 if extremely low state
export const SA_RECOVERY_MIN_QUESTIONS = 1;
export const SA_RECOVERY_SCHEDULE_ALLOWED = true;
export const SA_RECOVERY_DUE_IN_HOURS = 24;
export const SA_RECOVERY_MAX_OPEN_LOOPS = 2;

// Difficulty Raise (Coaster) mode
export const SA_COASTER_DIFFICULTY_DELTA = 1;
export const SA_COASTER_SCOPE_MULTIPLIER = 1.0;
export const SA_COASTER_MIN_QUESTIONS_MIN = 3;
export const SA_COASTER_MIN_QUESTIONS_MAX = 5;

// Technique Pivot (Grinder) mode
export const SA_GRINDER_SCOPE_MULTIPLIER = 1.0;
export const SA_GRINDER_DIFFICULTY_DELTA = 0;
export const SA_GRINDER_MIN_QUESTIONS = 3;
// Forces quality verification format (error_log/recall)

// Close Loops First / Integrity Clamp mode
export const SA_INTEGRITY_SCOPE_MULTIPLIER_MIN = 0.8;
export const SA_INTEGRITY_SCOPE_MULTIPLIER_MAX = 1.0;
export const SA_INTEGRITY_MAX_OPEN_LOOPS = 2;
// scheduleAllowed = false if scheduleMisses >= 2

// Ambition Delta thresholds
export const AMBITION_DELTA_OVERREACH = 3; // DeltaA >= +3
export const AMBITION_DELTA_SANDBAGGING = -3; // DeltaA <= -3

// ============================================================================
// Adaptive Tightness Policy (from EI_Spec.md 4.14)
// ============================================================================

// Loose level thresholds (all must be true)
export const TIGHTNESS_LOOSE_VERIFICATION_RATE_MIN = 0.75;
export const TIGHTNESS_LOOSE_OPEN_LOOPS_MAX = 2;
export const TIGHTNESS_LOOSE_SCHEDULE_MISSES_MAX = 1;
export const TIGHTNESS_LOOSE_SILENCE_DAYS_MAX = 1;

// Tight level thresholds (any triggers Tight)
export const TIGHTNESS_TIGHT_OPEN_LOOPS_MIN = 3;
export const TIGHTNESS_TIGHT_SILENCE_DAYS_MIN = 2;
export const TIGHTNESS_TIGHT_VERIFICATION_RATE_MAX = 0.60;
export const TIGHTNESS_TIGHT_SCHEDULE_MISSES_MIN = 2;
export const TIGHTNESS_TIGHT_AVOIDANT_EXITS_MIN = 2;
export const TIGHTNESS_TIGHT_SKIP_COUNT_MIN = 3;

// ============================================================================
// Score Computation Weights (from EI_Protocol_1_Ignition.md Appendix)
// ============================================================================

export const STATE_SCORE_BASE = 5;

// Energy weights (1-5 scale)
export const ENERGY_WEIGHTS = [-2, -1, 0, 1, 2]; // indexed by (energy - 1)

// Sleep bucket adjustments
export const SLEEP_UNDER_6_ADJUSTMENT = -2;
export const SLEEP_6_TO_7_ADJUSTMENT = -1;
export const SLEEP_7_TO_8_ADJUSTMENT = 0;
export const SLEEP_8_PLUS_ADJUSTMENT = 1;

// Pressure weights (1-5 scale)
export const PRESSURE_WEIGHTS = [1, 0, -1, -2, -3]; // indexed by (pressure - 1)

// Backlog pressure weights (1-5 scale)
export const BACKLOG_PRESSURE_WEIGHTS = [1, 0, -1, -2, -3]; // indexed by (backlogPressure - 1)

// Intent score timebox thresholds (minutes -> score)
export const INTENT_TIMEBOX_10_30_SCORE = 3;
export const INTENT_TIMEBOX_31_60_SCORE = 5;
export const INTENT_TIMEBOX_61_90_SCORE = 7;
export const INTENT_TIMEBOX_90_PLUS_SCORE = 9;

// Intent score question count thresholds
export const INTENT_QUESTIONS_1_3_SCORE = 3;
export const INTENT_QUESTIONS_4_10_SCORE = 5;
export const INTENT_QUESTIONS_11_20_SCORE = 7;
export const INTENT_QUESTIONS_20_PLUS_SCORE = 9;

// Difficulty tier add-ons
export const DIFFICULTY_EASY_ADDON = 0;
export const DIFFICULTY_MED_ADDON = 1;
export const DIFFICULTY_HARD_ADDON = 2;
export const DIFFICULTY_ADVANCED_ADDON = 3;

// ============================================================================
// Classification Thresholds
// ============================================================================

// P1 Label thresholds
export const P1_LOW_ENERGY_THRESHOLD = 2; // energy <= 2
export const P1_HIGH_ENERGY_THRESHOLD = 4; // energy >= 4
export const P1_HIGH_PRESSURE_THRESHOLD = 4; // pressure >= 4
export const P1_HIGH_BACKLOG_THRESHOLD = 4; // backlogPressure >= 4
export const P1_HIGH_ENERGY_PRESSURE_MAX = 2; // pressure <= 2
export const P1_HIGH_ENERGY_BACKLOG_MAX = 3; // backlogPressure <= 3

// P2 Label thresholds
export const P2_STALLED_LATENCY_THRESHOLD = 15; // minutes
export const P2_STALLED_REPLAN_THRESHOLD = 2; // replans before start
export const P2_FLOWING_LATENCY_MAX = 3; // minutes

// P3 Label thresholds
export const P3_AVOIDANT_VERIFICATION_RATE_MAX = 0.60;
export const P3_AVOIDANT_OPEN_LOOPS_MIN = 3;
export const P3_AVOIDANT_SILENCE_DAYS_MIN = 2;
export const P3_CONFIDENT_VERIFICATION_RATE_MIN = 0.75;
export const P3_CONFIDENT_OPEN_LOOPS_MAX = 2;

// ============================================================================
// Review Windows (for Strategic Adjustment and aggregates)
// ============================================================================

export const REVIEW_WINDOW_DAYS_7 = 7;
export const REVIEW_WINDOW_DAYS_14 = 14;
export const SA_REVIEW_WINDOW_MIN_DAYS = 7;
export const SA_REVIEW_WINDOW_MAX_DAYS = 14;

// ============================================================================
// Frozen TUNABLES Object (for test overrides)
// ============================================================================

export const TUNABLES = Object.freeze({
  // Risk thresholds
  SILENCE_DAYS_THRESHOLD,
  OPEN_LOOPS_THRESHOLD,
  VERIFICATION_RATE_LOW,
  VERIFICATION_RATE_HEALTHY,
  SCHEDULE_MISSES_THRESHOLD,
  AVOIDANT_EXITS_THRESHOLD,
  SKIP_COUNT_THRESHOLD,

  // P1 defaults
  P1_RESCUE_SCOPE_MIN,
  P1_RESCUE_SCOPE_MAX,
  P1_NEUTRAL_SCOPE_MIN,
  P1_NEUTRAL_SCOPE_MAX,
  P1_BOOST_SCOPE_MIN,
  P1_BOOST_SCOPE_MAX,
  P1_RESCUE_MIN_QUESTIONS,
  P1_NEUTRAL_MIN_QUESTIONS_MIN,
  P1_NEUTRAL_MIN_QUESTIONS_MAX,
  P1_BOOST_MIN_QUESTIONS,

  // P2 defaults
  P2_RESCUE_TIMEBOX_MIN,
  P2_RESCUE_TIMEBOX_MAX,
  P2_NEUTRAL_TIMEBOX_MIN,
  P2_NEUTRAL_TIMEBOX_MAX,
  P2_BOOST_TIMEBOX_MIN,
  P2_BOOST_TIMEBOX_MAX,
  P2_REPLAN_CAP_DEFAULT,
  STALL_LATENCY_THRESHOLD_MIN,
  STALL_COUNT_ESCALATION,
  REPLAN_LOOP_ESCALATION,
  P2_MICRO_START_MIN_SEC,
  P2_MICRO_START_MAX_SEC,
  P2_TWO_MINUTE_RULE_MIN,

  // P3 defaults
  P3_RESCUE_MIN_QUESTIONS,
  P3_NEUTRAL_MIN_QUESTIONS_MIN,
  P3_NEUTRAL_MIN_QUESTIONS_MAX,
  P3_BOOST_MIN_QUESTIONS,
  SCHEDULE_GRACE_HOURS,
  DEFAULT_TARGET_LATENCY_HOURS,
  ANTI_GAMING_TIME_PER_Q_SEC,
  P3_RESCUE_TIMEBOX_MIN_SEC,
  P3_RESCUE_TIMEBOX_MAX_SEC,
  P3_NEUTRAL_TIMEBOX_MIN_SEC,
  P3_NEUTRAL_TIMEBOX_MAX_SEC,
  P3_BOOST_TIMEBOX_MIN_SEC,
  P3_BOOST_TIMEBOX_MAX_SEC,
  P3_AVOIDANT_EXITS_ESCALATION,
  P3_SCHEDULE_MISSES_ESCALATION,
  P3_SKIP_COUNT_ESCALATION,

  // Strategic Adjustment
  SA_RECOVERY_SCOPE_MULTIPLIER_MIN,
  SA_RECOVERY_SCOPE_MULTIPLIER_MAX,
  SA_RECOVERY_DIFFICULTY_DELTA,
  SA_RECOVERY_MIN_QUESTIONS,
  SA_RECOVERY_SCHEDULE_ALLOWED,
  SA_RECOVERY_DUE_IN_HOURS,
  SA_RECOVERY_MAX_OPEN_LOOPS,
  SA_COASTER_DIFFICULTY_DELTA,
  SA_COASTER_SCOPE_MULTIPLIER,
  SA_COASTER_MIN_QUESTIONS_MIN,
  SA_COASTER_MIN_QUESTIONS_MAX,
  SA_GRINDER_SCOPE_MULTIPLIER,
  SA_GRINDER_DIFFICULTY_DELTA,
  SA_GRINDER_MIN_QUESTIONS,
  SA_INTEGRITY_SCOPE_MULTIPLIER_MIN,
  SA_INTEGRITY_SCOPE_MULTIPLIER_MAX,
  SA_INTEGRITY_MAX_OPEN_LOOPS,
  AMBITION_DELTA_OVERREACH,
  AMBITION_DELTA_SANDBAGGING,

  // Tightness policy
  TIGHTNESS_LOOSE_VERIFICATION_RATE_MIN,
  TIGHTNESS_LOOSE_OPEN_LOOPS_MAX,
  TIGHTNESS_LOOSE_SCHEDULE_MISSES_MAX,
  TIGHTNESS_LOOSE_SILENCE_DAYS_MAX,
  TIGHTNESS_TIGHT_OPEN_LOOPS_MIN,
  TIGHTNESS_TIGHT_SILENCE_DAYS_MIN,
  TIGHTNESS_TIGHT_VERIFICATION_RATE_MAX,
  TIGHTNESS_TIGHT_SCHEDULE_MISSES_MIN,
  TIGHTNESS_TIGHT_AVOIDANT_EXITS_MIN,
  TIGHTNESS_TIGHT_SKIP_COUNT_MIN,

  // Score computation
  STATE_SCORE_BASE,
  ENERGY_WEIGHTS,
  SLEEP_UNDER_6_ADJUSTMENT,
  SLEEP_6_TO_7_ADJUSTMENT,
  SLEEP_7_TO_8_ADJUSTMENT,
  SLEEP_8_PLUS_ADJUSTMENT,
  PRESSURE_WEIGHTS,
  BACKLOG_PRESSURE_WEIGHTS,
  INTENT_TIMEBOX_10_30_SCORE,
  INTENT_TIMEBOX_31_60_SCORE,
  INTENT_TIMEBOX_61_90_SCORE,
  INTENT_TIMEBOX_90_PLUS_SCORE,
  INTENT_QUESTIONS_1_3_SCORE,
  INTENT_QUESTIONS_4_10_SCORE,
  INTENT_QUESTIONS_11_20_SCORE,
  INTENT_QUESTIONS_20_PLUS_SCORE,
  DIFFICULTY_EASY_ADDON,
  DIFFICULTY_MED_ADDON,
  DIFFICULTY_HARD_ADDON,
  DIFFICULTY_ADVANCED_ADDON,

  // Classification
  P1_LOW_ENERGY_THRESHOLD,
  P1_HIGH_ENERGY_THRESHOLD,
  P1_HIGH_PRESSURE_THRESHOLD,
  P1_HIGH_BACKLOG_THRESHOLD,
  P1_HIGH_ENERGY_PRESSURE_MAX,
  P1_HIGH_ENERGY_BACKLOG_MAX,
  P2_STALLED_LATENCY_THRESHOLD,
  P2_STALLED_REPLAN_THRESHOLD,
  P2_FLOWING_LATENCY_MAX,
  P3_AVOIDANT_VERIFICATION_RATE_MAX,
  P3_AVOIDANT_OPEN_LOOPS_MIN,
  P3_AVOIDANT_SILENCE_DAYS_MIN,
  P3_CONFIDENT_VERIFICATION_RATE_MIN,
  P3_CONFIDENT_OPEN_LOOPS_MAX,

  // Review windows
  REVIEW_WINDOW_DAYS_7,
  REVIEW_WINDOW_DAYS_14,
  SA_REVIEW_WINDOW_MIN_DAYS,
  SA_REVIEW_WINDOW_MAX_DAYS,
});
