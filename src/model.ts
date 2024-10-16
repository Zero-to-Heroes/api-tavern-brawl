export interface TavernBrawlStats {
	readonly lastUpdateDate: Date;
	readonly info: BrawlInfo;
	readonly stats: readonly StatForClass[];
}

export interface StatForClass {
	readonly playerClass: string;
	readonly matches: number;
	readonly wins?: number;
	readonly mostPopularDeckGames: number;
	readonly winrate: number;
	readonly bestDecksWinrate: number;
	readonly bestDecks: readonly DeckStat[];
}

export interface DeckStat {
	readonly playerClass: string;
	readonly decklist: string;
	readonly matches: number;
	readonly wins: number;
	readonly winrate: number;
	readonly earliestDate?: string;
	readonly scenarioId?: number;
}

export interface BrawlInfo {
	readonly scenarioId: number;
	readonly startDate: Date;
	readonly name: string;
	readonly description: string;
}
