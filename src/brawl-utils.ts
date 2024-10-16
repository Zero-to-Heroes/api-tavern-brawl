import { S3 } from '@firestone-hs/aws-lambda-utils';
import { ServerlessMysql } from 'serverless-mysql';
import { ReplaySummaryDbRow } from './internal-model';
import { BrawlInfo } from './model';

export const loadBrawlInfo = async (scenarioId: number, startDate: Date, s3: S3): Promise<BrawlInfo> => {
	const brawlConfigStr = await s3.readContentAsString(
		'static.zerotoheroes.com',
		'hearthstone/data/tavern-brawls.json',
	);
	const brawlConfig: readonly BrawlConfig[] = !brawlConfigStr?.length ? null : JSON.parse(brawlConfigStr);
	const config = brawlConfig.find((c) => c.scenarioId === scenarioId);
	return {
		scenarioId: scenarioId,
		startDate: startDate,
		name: config?.name,
		description: null,
	};
};

export const getLatestBrawlScenarioId = async (mysql: ServerlessMysql): Promise<number> => {
	const query = `
		SELECT scenarioId
		FROM replay_summary
		WHERE gameMode = 'tavern-brawl'
		ORDER BY id DESC
		LIMIT 1;
	`;
	const result: readonly ReplaySummaryDbRow[] = await mysql.query(query);
	return result[0].scenarioId;
};

interface BrawlConfig {
	readonly scenarioId: number;
	readonly name: string;
}
