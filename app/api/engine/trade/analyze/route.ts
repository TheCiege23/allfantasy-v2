[{
	"resource": "/c:/Users/Guap_/allfantasy-v2-main/app/api/engine/trade/analyze/route.ts",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '{ [k: string]: unknown; sport: string; format: string; assetsA: any[]; assetsB: any[]; leagueId?: string | undefined; league_id?: string | undefined; teamAName?: string | undefined; teamBName?: string | undefined; rosterIdA?: number | undefined; rosterIdB?: number | undefined; leagueContext?: any; newsAdjustments?: ...' is not assignable to type 'TradeEngineRequest & { rosterIdA?: number | undefined; rosterIdB?: number | undefined; newsAdjustments?: unknown; }'.\n  Type '{ [k: string]: unknown; sport: string; format: string; assetsA: any[]; assetsB: any[]; leagueId?: string | undefined; league_id?: string | undefined; teamAName?: string | undefined; teamBName?: string | undefined; rosterIdA?: number | undefined; rosterIdB?: number | undefined; leagueContext?: any; newsAdjustments?: ...' is not assignable to type 'TradeEngineRequest'.\n    Types of property 'format' are incompatible.\n      Type 'string' is not assignable to type 'LeagueFormat'.",
	"source": "ts",
	"startLineNumber": 58,
	"startColumn": 11,
	"endLineNumber": 58,
	"endColumn": 29,
	"modelVersionId": 3,
	"origin": "extHost1"
}]