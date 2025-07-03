import { S3 } from '@firestone-hs/aws-lambda-utils';
import { HOURLY_KEY, STATS_BUCKET } from '../config';
import { DeckStat } from '../model';

export const loadHourlyDataFromS3 = async (currentBrawlScenarioId: number, s3: S3): Promise<readonly DeckStat[]> => {
	const hoursBack: number = 7 * 24;
	const fileNames: readonly string[] = buildFileNames(hoursBack);
	// console.debug('fileNames', timePeriod, mmrPercentile, fileNames);
	const fileResults = await Promise.all(fileNames.map((fileName) => loadHourlyDeckStatFromS3(fileName, s3)));
	return fileResults.flat().filter((result) => !!result && result.scenarioId === currentBrawlScenarioId);
};

const loadHourlyDeckStatFromS3 = async (fileName: string, s3: S3): Promise<readonly DeckStat[]> => {
	try {
		const fileKey = HOURLY_KEY.replace('%startDate%', fileName);
		const data = await s3.readGzipContent(STATS_BUCKET, fileKey, 1);
		const result: readonly DeckStat[] = JSON.parse(data);
		return result;
	} catch (e) {
		return [];
	}
};

const buildFileNames = (hoursBack: number): readonly string[] => {
	// Build a list of file names, in the form YYYY-MM-dd (e.g. 2020-05-01)
	// that start from the day before the current date and go back in time
	const fileNames: string[] = [];
	const now = new Date();
	for (let i = 0; i < hoursBack; i++) {
		const date = new Date(now.getTime() - i * 60 * 60 * 1000);
		date.setMinutes(0);
		date.setSeconds(0);
		date.setMilliseconds(0);
		// The date in the format YYYY-MM-ddTHH:mm:ss.sssZ
		const dateStr = date.toISOString();
		fileNames.push(`${dateStr}`);
	}
	return fileNames;
};
