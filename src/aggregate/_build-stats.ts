import { S3, getConnection } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import { getLatestBrawlScenarioId, loadBrawlInfo } from '../brawl-utils';
import { DeckStat } from '../model';
import { saveStats } from './persist-data';
import { loadHourlyDataFromS3 } from './s3-loader';
import { buildStatsByClass, mergeStats } from './stats-builder';

const allCards = new AllCardsService();
export const s3 = new S3();
const lambda = new AWS.Lambda();

export default async (event, context: Context): Promise<any> => {
	await allCards.initializeCardsDb();

	const mysql = await getConnection();
	const currentBrawlScenarioId = await getLatestBrawlScenarioId(mysql);

	const hourlyData: readonly DeckStat[] = await loadHourlyDataFromS3(currentBrawlScenarioId, s3);
	const mergedStats: readonly DeckStat[] = mergeStats(hourlyData, allCards);
	const statsByClass = buildStatsByClass(mergedStats);
	const startDate = mergedStats.map((s) => new Date(s.earliestDate)).reduce((a, b) => (a < b ? a : b));
	const brawlInfo = await loadBrawlInfo(currentBrawlScenarioId, startDate, s3);
	await saveStats(statsByClass, brawlInfo, s3);
	console.log('stats saved');
	return { statusCode: 200, body: null };
};
