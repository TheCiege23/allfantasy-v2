'use client';

import Link from 'next/link';
import type { PowerRankingTeam } from '@/lib/league-power-rankings/types';
import { MovementIndicators } from './MovementIndicators';
import { getLeagueRosterTabHref } from '@/lib/league-power-rankings';

export interface RankingTableProps {
  leagueId: string;
  teams: PowerRankingTeam[];
}

export function RankingTable({ leagueId, teams }: RankingTableProps) {
  const rosterHref = getLeagueRosterTabHref(leagueId);

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]" data-audit="ranking-table">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-3 font-medium text-white/80">Rank</th>
            <th className="p-3 font-medium text-white/80">Team</th>
            <th className="p-3 font-medium text-white/80">Record</th>
            <th className="p-3 font-medium text-white/80">PF</th>
            <th className="p-3 font-medium text-white/80">PA</th>
            <th className="p-3 font-medium text-white/80">Power</th>
            <th className="p-3 font-medium text-white/80">Movement</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const name = team.displayName || team.username || `Team ${team.rosterId}`;
            const r = team.record;
            return (
              <tr
                key={team.rosterId}
                className="border-b border-white/5 hover:bg-white/5 transition"
                data-audit="team-row"
              >
                <td className="p-3">
                  <span className="font-medium text-amber-400">#{team.rank}</span>
                </td>
                <td className="p-3">
                  <Link
                    href={rosterHref}
                    className="font-medium text-white hover:text-cyan-400 transition"
                    data-audit="team-row-opens-roster-page"
                  >
                    {name}
                  </Link>
                </td>
                <td className="p-3 text-white/80">
                  {r.wins}-{r.losses}
                  {r.ties > 0 ? `-${r.ties}` : ''}
                </td>
                <td className="p-3 text-white/80">{team.pointsFor.toFixed(1)}</td>
                <td className="p-3 text-white/80">{team.pointsAgainst.toFixed(1)}</td>
                <td className="p-3 text-cyan-300">{team.powerScore.toFixed(0)}</td>
                <td className="p-3">
                  <MovementIndicators team={team} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
