export interface ReplaySummaryDbRow {
	readonly creationDate: string;
	readonly playerClass: string;
	readonly playerDecklist: string;
	readonly result: string;
	readonly scenarioId: number;
	readonly application: string;
}
