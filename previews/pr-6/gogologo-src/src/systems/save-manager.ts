// localStorage-based persistence for the best score. Every read/write is
// wrapped in try/catch — private browsing or storage quota errors must
// never block gameplay, same defensive pattern as garabatos/script.js's
// save-throttle helpers elsewhere in this repo.
const BEST_SCORE_KEY = 'gogologo-best-score';

export function getBestScore(): number {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  } catch {
    return 0;
  }
}

export function setBestScoreIfHigher(score: number): void {
  try {
    if (score > getBestScore()) {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    }
  } catch {
    // Ignore — persistence is a nice-to-have, not core functionality.
  }
}
