/** Horizontal position (0..1) of the answer action button, shared so the
 * Submit and Next buttons land on the same spot and the player's pointer can
 * stay put. Continuous mode tracks the η slider; interval mode pins to 0. */
export const answerPosition = $state({ fraction: 0.5 });
