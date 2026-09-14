import { expect, type Page } from '@playwright/test';
import { catalog } from '../../data/catalog';
import type { State } from '../../lib/domain';
export async function finishMixed(page: Page) {
  for (let n = 0; n < 250; n++) {
    if (await page.getByRole('heading', { name: 'These words are yours.' }).isVisible()) return;
    await expect(page.locator('.session-save')).toContainText('Your place is saved');
    const state = await page.evaluate<State>(
      () => JSON.parse(localStorage.getItem('lexiloop-demo-v1')!).state,
    );
    const draft = state.workspace!.sessions.learn!;
    const word = catalog.find((w) => w.word === draft.words[draft.index])!;
    const step = draft.steps[draft.step];
    if (await page.getByLabel('Type the word').isVisible()) {
      await page.getByLabel('Type the word').fill(word.word);
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    } else if (await page.locator('.answer-options').isVisible()) {
      const type = {
        Understand: 'meaning',
        Context: 'context',
        Distinguish: 'distinction',
        Apply: 'application',
      }[step as string];
      await page
        .locator('.answer-options button')
        .nth(word.exercises.find((e) => e.type === type)!.answer)
        .click();
      await page.getByRole('button', { name: 'Check answer', exact: true }).click();
    } else if (step === 'Make it yours') {
      await page
        .getByLabel('Your own sentence')
        .fill(`I used ${word.word} in my conversation today.`);
    } else if (step === 'Recap') await page.getByLabel('I know it well').check();
    await page
      .getByRole('button', { name: step === 'Recap' ? 'Save & continue' : 'Continue', exact: true })
      .click();
  }
  throw new Error('Mixed session did not finish within the expected bound');
}
