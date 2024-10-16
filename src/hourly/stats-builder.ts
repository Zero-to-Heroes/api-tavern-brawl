import { groupByFunction } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { ReplaySummaryDbRow } from '../internal-model';
import { DeckStat } from '../model';

export const buildDeckStats = (
	rows: readonly ReplaySummaryDbRow[],
	allCards: AllCardsService,
	scenarioId: number,
): readonly DeckStat[] => {
	const groupedByDeck = groupByFunction((row: ReplaySummaryDbRow) => row.playerDecklist)(rows);
	rows = null;
	const deckStats: readonly DeckStat[] = Object.keys(groupedByDeck)
		.map((decklist) => {
			const deckRows: readonly ReplaySummaryDbRow[] = groupedByDeck[decklist];
			const refRow = deckRows[0];
			const result: DeckStat = {
				earliestDate: refRow.creationDate,
				playerClass: refRow.playerClass,
				decklist: decklist,
				matches: deckRows.length,
				wins: deckRows.filter((row) => row.result === 'won').length,
				winrate: null,
				scenarioId: scenarioId,
			};
			return result;
		})
		.filter((deck) => !!deck);
	return deckStats;
};
