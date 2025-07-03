import { groupByFunction } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { ReplaySummaryDbRow } from '../internal-model';
import { DeckStat } from '../model';

export const buildDeckStats = (
	rows: readonly ReplaySummaryDbRow[],
	allCards: AllCardsService,
	scenarioId: number,
): readonly DeckStat[] => {
	rows = rows.filter(r => isMinVersion(r.application.replace('firestone-', ''), '15.15.5'))
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


const isMinVersion = (version: string, targetVersion: string): boolean => {
	const currentVersion = version;
	// If the current version is lower than the minimum required version, we don't send the email
	// Versions are in the format Major.minor.patch
	const currentVersionParts = currentVersion.split('.');
	const minVersionParts = targetVersion.split('.');
	// Compare versions
	const currentVersionNumber =
		parseInt(currentVersionParts[0]) * 10000 +
		parseInt(currentVersionParts[1]) * 100 +
		parseInt(currentVersionParts[2]);
	const minVersionNumber =
		parseInt(minVersionParts[0]) * 10000 + parseInt(minVersionParts[1]) * 100 + parseInt(minVersionParts[2]);

	return currentVersionNumber >= minVersionNumber;
};