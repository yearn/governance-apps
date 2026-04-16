import { formatAddress } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  formatTeamsUsd,
  getFinancialNetState,
  type TeamRecord,
} from "@/lib/clients/teams";
import { teamsCopy } from "../messages";

type TeamsDirectoryProps = {
  teams: TeamRecord[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  state: "ready" | "loading" | "empty";
};

export function TeamsDirectory({
  teams,
  selectedTeamId,
  onSelectTeam,
  state,
}: TeamsDirectoryProps) {
  if (state === "loading") {
    return (
      <Card className="space-y-4" aria-busy="true">
        <DirectoryHeader
          title={teamsCopy.directory.loadingTitle}
          description={teamsCopy.directory.loadingBody}
        />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-box border border-border px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_0.9fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr]"
            >
              {Array.from({ length: 7 }, (_, itemIndex) => (
                <Skeleton key={itemIndex} className="h-6 w-full" />
              ))}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (state === "empty") {
    return (
      <Card className="space-y-4">
        <DirectoryHeader
          title={teamsCopy.directory.emptyTitle}
          description={teamsCopy.directory.emptyBody}
        />
        <div className="rounded-box border border-dashed border-border bg-app px-5 py-6">
          <p className="text-sm text-text-secondary">{teamsCopy.directory.emptyHint}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <DirectoryHeader
        title={teamsCopy.directory.title}
        description={teamsCopy.directory.description}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teamsCopy.directory.headers.team}</TableHead>
            <TableHead>{teamsCopy.directory.headers.owner}</TableHead>
            <TableHead>{teamsCopy.directory.headers.status}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.revenue}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.cost}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.net}</TableHead>
            <TableHead className="text-right">{teamsCopy.directory.headers.action}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const status = teamsCopy.statuses[team.status];
            const net = getFinancialNetState(team.currentPeriod);
            const isSelected = team.id === selectedTeamId;
            const netToneClassName =
              net.tone === "profit"
                ? "text-green-700"
                : net.tone === "loss"
                  ? "text-red-700"
                  : "text-text-primary";

            return (
              <TableRow key={team.id} data-state={isSelected ? "selected" : undefined}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-text-primary">{team.name}</span>
                      {isSelected && (
                        <Badge variant="brand">{teamsCopy.directory.selected}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {team.id}
                      {team.readOnlyReason
                        ? ` • ${teamsCopy.readOnlyReasons[team.readOnlyReason]}`
                        : ""}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-number text-text-secondary">
                  {formatAddress(team.owner)}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatTeamsUsd(team.currentPeriod.revenueUsd)}
                </TableCell>
                <TableCell className="text-right font-number text-text-primary">
                  {formatTeamsUsd(team.currentPeriod.costUsd)}
                </TableCell>
                <TableCell className={`text-right font-number font-bold ${netToneClassName}`}>
                  {formatTeamsUsd(net.value)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant={isSelected ? "primary" : "secondary"}
                    onClick={() => onSelectTeam(team.id)}
                    aria-label={`Open ${team.name} workspace`}
                  >
                    {teamsCopy.directory.openWorkspace}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function DirectoryHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}
