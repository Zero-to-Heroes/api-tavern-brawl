import { S3 } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { HOURLY_DECK_STATS_GAMES_THRESHOLD, HOURLY_KEY, STATS_BUCKET } from '../config';
import { DeckStat } from '../model';

export const saveDeckStats = async (deckStats: readonly DeckStat[], startDate: Date, s3: S3): Promise<void> => {
	const filtered = deckStats.filter((d) => d.matches > HOURLY_DECK_STATS_GAMES_THRESHOLD);
	const gzippedResult = gzipSync(JSON.stringify(filtered));
	const destination = HOURLY_KEY.replace('%startDate%', startDate.toISOString());
	await s3.writeFile(gzippedResult, STATS_BUCKET, destination, 'application/json', 'gzip');
};
