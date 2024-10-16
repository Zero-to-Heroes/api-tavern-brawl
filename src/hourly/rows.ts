import { ServerlessMysql } from 'serverless-mysql';
import { ReplaySummaryDbRow } from '../internal-model';

export const loadRows = async (
	mysql: ServerlessMysql,
	scenarioId: number,
	startDate: Date,
): Promise<readonly ReplaySummaryDbRow[]> => {
	const query = `
            SELECT creationDate, playerClass, playerDecklist, result, scenarioId  
            FROM replay_summary
            FORCE INDEX (ix_tavernBrawl)
            WHERE gameMode = 'tavern-brawl'
            AND creationDate >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            AND scenarioId = ${scenarioId};
        `;
	console.log('running query', query);
	const result: readonly ReplaySummaryDbRow[] = await mysql.query(query);
	return result;
};
