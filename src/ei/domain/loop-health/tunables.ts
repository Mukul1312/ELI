/**
 * Classification tunables for LoopHealth.
 * Extracted from engine/tunables; domain owns these for LHA.
 * Engine re-exports for backward compatibility.
 */

// Risk thresholds
export const SILENCE_DAYS_THRESHOLD = 2;
export const OPEN_LOOPS_THRESHOLD = 3;

// P1 Label thresholds
export const P1_LOW_ENERGY_THRESHOLD = 2;
export const P1_HIGH_ENERGY_THRESHOLD = 4;
export const P1_HIGH_PRESSURE_THRESHOLD = 4;
export const P1_HIGH_BACKLOG_THRESHOLD = 4;
export const P1_HIGH_ENERGY_PRESSURE_MAX = 2;
export const P1_HIGH_ENERGY_BACKLOG_MAX = 3;

// P2 Label thresholds
export const P2_STALLED_LATENCY_THRESHOLD = 15;
export const P2_STALLED_REPLAN_THRESHOLD = 2;
export const P2_FLOWING_LATENCY_MAX = 3;

// P3 Label thresholds
export const P3_AVOIDANT_VERIFICATION_RATE_MAX = 0.60;
export const P3_AVOIDANT_OPEN_LOOPS_MIN = 3;
export const P3_AVOIDANT_SILENCE_DAYS_MIN = 2;
export const P3_CONFIDENT_VERIFICATION_RATE_MIN = 0.75;
export const P3_CONFIDENT_OPEN_LOOPS_MAX = 2;
