import { groupByFunction } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { DECKS_TO_INCLUDE_PER_CLASS } from '../config';
import { DeckStat, StatForClass } from '../model';

export const mergeStats = (hourlyData: readonly DeckStat[], allCards: AllCardsService): readonly DeckStat[] => {
	const groupedByDeck = groupByFunction((stat: DeckStat) => stat.decklist)(hourlyData);
	const result = Object.keys(groupedByDeck).map((decklist) => {
		const deckStats: readonly DeckStat[] = groupedByDeck[decklist];
		const refStat = deckStats[0];
		const matches = deckStats.map((stat) => stat.matches).reduce((a, b) => a + b);
		const wins = deckStats.map((stat) => stat.wins).reduce((a, b) => a + b);
		const allDates = deckStats.map((stat) => new Date(stat.earliestDate).getTime()).filter((date) => !isNaN(date));
		if (!allDates.length) {
			allDates.push(new Date().getTime());
		}
		try {
			new Date(Math.min(...allDates)).toISOString();
		} catch (e) {
			console.error('could not parse date', allDates, deckStats);
		}
		const result: DeckStat = {
			earliestDate: new Date(Math.min(...allDates)).toISOString(),
			playerClass: refStat.playerClass,
			decklist: decklist,
			matches: matches,
			wins: wins,
			winrate: wins / matches,
			scenarioId: refStat.scenarioId,
		};
		return result;
	});
	return result;
};

export const buildStatsByClass = (decks: readonly DeckStat[]): readonly StatForClass[] => {
	const gamesByClass = groupByFunction((deck: DeckStat) => deck.playerClass)(decks);
	return Object.values(gamesByClass).map((games) => buildStatsForClass(games));
};

const buildStatsForClass = (decks: readonly DeckStat[]): StatForClass => {
	const totalMatches = decks.map((deck) => deck.matches).reduce((a, b) => a + b);
	const totalWins = decks.map((deck) => deck.wins).reduce((a, b) => a + b);

	const sortedDecks = [...decks].sort((a, b) => b.matches - a.matches);
	const mostPopularDeckGames = sortedDecks[0]?.matches;
	const matchesThreshold = Math.max(10, mostPopularDeckGames / 5);
	const bestDecklists = sortedDecks
		.filter((stats) => stats.matches > matchesThreshold)
		.sort((a, b) => b.winrate - a.winrate)
		.slice(0, DECKS_TO_INCLUDE_PER_CLASS);
	const otherDecks =
		bestDecklists.length < DECKS_TO_INCLUDE_PER_CLASS
			? sortedDecks
					.filter((stats) => stats.matches > 0)
					.filter((stats) => stats.matches <= matchesThreshold)
					.slice(0, DECKS_TO_INCLUDE_PER_CLASS - bestDecklists.length)
			: [];
	const finalDecks = [...bestDecklists, ...otherDecks];

	const result: StatForClass = {
		playerClass: decks[0].playerClass,
		matches: totalMatches,
		wins: totalWins,
		winrate: totalWins / totalMatches,
		bestDecksWinrate:
			finalDecks.map((d) => d.wins).reduce((a, b) => a + b, 0) /
			finalDecks.map((d) => d.matches).reduce((a, b) => a + b, 0),
		mostPopularDeckGames: mostPopularDeckGames,
		bestDecks: finalDecks,
	};
	return result;
};
