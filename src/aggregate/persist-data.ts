import { S3 } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { BUCKET } from '../build-tavern-brawl-stats';
import { FINAL_STATS_KEY } from '../config';
import { BrawlInfo, StatForClass, TavernBrawlStats } from '../model';

export const saveStats = async (stats: readonly StatForClass[], brawlInfo: BrawlInfo, s3: S3): Promise<void> => {
	const result: TavernBrawlStats = {
		lastUpdateDate: new Date(),
		info: brawlInfo,
		stats: stats,
	};
	await s3.writeFile(gzipSync(JSON.stringify(result)), BUCKET, FINAL_STATS_KEY, 'application/json', 'gzip');
};
