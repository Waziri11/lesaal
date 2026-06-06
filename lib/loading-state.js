export const LOADING_TEXT_INITIAL = "loading";
export const LOADING_TEXT_SLOW = "loading more than expected.....please be patient";
export const LOADING_TEXT_HEAVY = "Almost there.... Heavy loads here";
export const LOADING_TEXT_STUCK = "Definitely something is wrong..... try to reload";

export function getLoadingMessageForElapsedMs(elapsedMs = 0) {
  if (elapsedMs >= 20000) {
    return LOADING_TEXT_STUCK;
  }

  if (elapsedMs >= 12000) {
    return LOADING_TEXT_HEAVY;
  }

  if (elapsedMs >= 6000) {
    return LOADING_TEXT_SLOW;
  }

  return LOADING_TEXT_INITIAL;
}
