type RankingRow = {
  id: string;
  nickname: string;
  averageScore?: number;
};

type RankingTableProps = {
  rows: RankingRow[];
};

export default function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Nickname
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Average Score
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-sm font-medium text-slate-800">
                {row.nickname}
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">
                {typeof row.averageScore === "number"
                  ? row.averageScore.toFixed(2)
                  : "No submission yet"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
