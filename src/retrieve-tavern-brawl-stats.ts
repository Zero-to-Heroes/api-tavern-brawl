import { gzipSync } from 'zlib';
import { BUCKET, FILE_KEY, s3 } from './build-tavern-brawl-stats';

export default async (event): Promise<any> => {
	const statsStr = await s3.readGzipContent(BUCKET, FILE_KEY);
	const gzippedResults = !!statsStr?.length ? gzipSync(statsStr).toString('base64') : null;
	const response = {
		statusCode: 200,
		isBase64Encoded: true,
		body: gzippedResults,
		headers: {
			'Content-Type': 'application/json',
			'Content-Encoding': 'gzip',
		},
	};
	return response;
};
