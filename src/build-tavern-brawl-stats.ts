/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnection, groupByFunction, logBeforeTimeout, logger, S3 } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { Context } from 'aws-lambda';
import { gzipSync } from 'zlib';
import { BrawlInfo, DeckStat, StatForClass, TavernBrawlStats } from './model';

export const BUCKET = 'static.zerotoheroes.com';
export const FILE_KEY = `api/tavern-brawl/tavern-brawl-stats.gz.json`;

export const s3 = new S3();
const allCards = new AllCardsService();

// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.
// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event, context: Context): Promise<any> => {
	await buildNewStats(event, context);
};

const buildNewStats = async (event, context: Context) => {
	const cleanup = logBeforeTimeout(context);
	logger.log('event', event);
	await allCards.initializeCardsDb();

	const currentBrawlScenarioId = await getLatestBrawlScenarioId();
	const startDate = await getStartDate(currentBrawlScenarioId);
	const allBrawlGames = await loadAllBrawlGames(currentBrawlScenarioId);
	const validGames = allBrawlGames.filter(g => g.result === 'won' || g.result === 'lost');
	const statsByClass = buildStatsByClass(validGames);
	const brawlInfo = await loadBrawlInfo(currentBrawlScenarioId, startDate);
	await saveStats(statsByClass, brawlInfo);

	cleanup();
	return { statusCode: 200, body: null };
};

const saveStats = async (stats: readonly StatForClass[], brawlInfo: BrawlInfo): Promise<void> => {
	const result: TavernBrawlStats = {
		lastUpdateDate: new Date(),
		info: brawlInfo,
		stats: stats,
	};
	await s3.writeFile(gzipSync(JSON.stringify(result)), BUCKET, FILE_KEY, 'application/json', 'gzip');
};

const buildStatsByClass = (rows: readonly InternalReplaySummaryRow[]): readonly StatForClass[] => {
	const gamesByClass = groupByFunction((row: InternalReplaySummaryRow) => row.playerClass)(rows);
	return Object.values(gamesByClass).map(games => buildStatsForClass(games));
};

const buildStatsForClass = (rows: readonly InternalReplaySummaryRow[]): StatForClass => {
	if (!rows?.length) {
		return null;
	}

	const groupedByList = groupByFunction((row: InternalReplaySummaryRow) => row.playerDecklist)(rows);
	const unfilteredLists = Object.values(groupedByList)
		.map(games => games.filter(g => !!g?.playerDecklist))
		.filter(games => games.length > 5)
		.map(games => {
			const ref = games[0];
			return {
				playerClass: rows[0].playerClass,
				decklist: ref.playerDecklist,
				matches: games.length,
				winrate: games.filter(g => g.result === 'won').length / games.length,
			};
		})
		.sort((a, b) => b.matches - a.matches);
	const matchesThreshold = 10;
	const decksToIncludes = 20;
	const bestDecklists: readonly DeckStat[] = unfilteredLists
		.filter(stats => stats.matches > matchesThreshold)
		.sort((a, b) => b.winrate - a.winrate)
		.slice(0, decksToIncludes);
	const otherDecks = unfilteredLists
		.filter(stats => stats.matches > 0)
		.filter(stats => stats.matches <= matchesThreshold)
		.slice(0, decksToIncludes - bestDecklists.length);
	const finalDecks = [...bestDecklists, ...otherDecks];
	const stat: StatForClass = {
		playerClass: rows[0].playerClass,
		matches: rows.length,
		winrate: rows.filter(r => r.result === 'won').length / rows.length,
		bestDecks: finalDecks,
	};
	return stat;
};

const loadBrawlInfo = async (scenarioId: number, startDate: Date): Promise<BrawlInfo> => {
	return {
		scenarioId: scenarioId,
		startDate: startDate,
		name: null,
		description: null,
	};
};

const loadAllBrawlGames = async (scenarioId: number): Promise<readonly InternalReplaySummaryRow[]> => {
	const query = `
		SELECT creationDate, playerClass, playerDecklist, result, scenarioId  
		FROM replay_summary
		FORCE INDEX (ix_tavernBrawl)
		WHERE gameMode = 'tavern-brawl'
		AND creationDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
		AND scenarioId = ${scenarioId};
	`;
	const mysql = await getConnection();
	console.log('running query', query);
	const result: readonly InternalReplaySummaryRow[] = await mysql.query(query);
	await mysql.end();
	return result;
};

const getStartDate = async (scenarioId: number): Promise<Date> => {
	const query = `
		SELECT creationDate
		FROM replay_summary
		WHERE gameMode = 'tavern-brawl'
		AND creationDate >= DATE_SUB(NOW(), INTERVAL 10 DAY)
		AND scenarioId = ${scenarioId}
		ORDER BY id ASC
		LIMIT 1;
	`;
	const mysql = await getConnection();
	const result: readonly InternalReplaySummaryRow[] = await mysql.query(query);
	await mysql.end();
	return result[0].creationDate;
};

const getLatestBrawlScenarioId = async (): Promise<number> => {
	const query = `
		SELECT scenarioId
		FROM replay_summary
		WHERE gameMode = 'tavern-brawl'
		ORDER BY id DESC
		LIMIT 1;
	`;
	const mysql = await getConnection();
	const result: readonly InternalReplaySummaryRow[] = await mysql.query(query);
	await mysql.end();
	return result[0].scenarioId;
};

interface InternalReplaySummaryRow {
	readonly creationDate: Date;
	readonly scenarioId: number;
	readonly playerClass: string;
	readonly result: 'won' | 'lost' | 'tied';
	readonly playerDecklist: string;
}
