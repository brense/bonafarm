import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import { ID_PATTERN } from "../model/types.ts";
import { can } from "../org/roles.ts";
import { useOrg } from "../org/useOrg.ts";
import { useOrgData } from "../org/useOrgData.ts";
import {
  STATUS_LABEL,
  adviseFeed,
  consumptionPerWeek,
  deliverySchedule,
  estimateShuteStock,
  type AdviceStatus,
} from "../stock/advice.ts";
import {
  completeYears,
  consumptionPerMonth,
  monthStart,
  monthlyStats,
  seasonality,
  shuteStats,
} from "../stock/consumption.ts";
import { useMutationDialog } from "../stock/mutationDialogContext.ts";
import { CardSurface } from "../stock/SearchList.tsx";
import { formatAmount, stockPerFeed, unitLabel } from "../stock/stock.ts";
import { useFeedLogs } from "../stock/useFeedLogs.ts";
import BarChart from "./feed/BarChart.tsx";
import ChangesTimeline from "../stock/changes/ChangesTimeline.tsx";
import { dateShort, monthYear } from "../stock/changes/format.ts";
import SeasonSection from "./feed/SeasonSection.tsx";
import ShuteCard from "./feed/ShuteCard.tsx";
import StorageStockCard from "./feed/StorageStockCard.tsx";
import Page from "./Page.tsx";

const ADVICE_WEEKS = 12;

const CHIP_COLOR: Record<
  AdviceStatus,
  "error" | "warning" | "default" | "success" | "info"
> = {
  critical: "error",
  warning: "warning",
  ok: "success",
  overstock: "info",
  inactive: "default",
};

function agoLabel(days: number): string {
  if (days === 0) return "vandaag";
  if (days === 1) return "gisteren";
  return `${days} dagen geleden`;
}

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return "±0";
  return r > 0 ? `+${formatAmount(r)}` : `−${formatAmount(-r)}`;
}

function SkeletonCard({ title }: { title: string }) {
  return (
    <CardSurface>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Skeleton variant="rounded" height={90} />
      </Box>
    </CardSurface>
  );
}

/** One feed: stock, advice and how consumption compares to last year. */
export default function FeedPage() {
  const { feedId = "" } = useParams();
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const { orgId, roles } = useOrg();
  const { feeds, storages, storageTypes, items, loading } = useOrgData();
  const valid = ID_PATTERN.test(feedId);
  const logs = useFeedLogs(orgId, valid ? feedId : null);
  const [nowMs] = useState(() => Date.now());
  const openMutation = useMutationDialog();
  const mayChange = can(roles, "feed");
  const schedule = useMemo(() => deliverySchedule(new Date(nowMs)), [nowMs]);

  const row = useMemo(
    () =>
      stockPerFeed(feeds, storages, storageTypes, items).find(
        (r) => r.feedId === feedId,
      ),
    [feeds, storages, storageTypes, items, feedId],
  );

  const computed = useMemo(() => {
    if (!row || logs === null) return null;
    const ratePerWeek = consumptionPerWeek(
      logs,
      row.feedId,
      nowMs,
      ADVICE_WEEKS,
    );
    const lastDelivery = logs
      .filter((l) => l.feedId === row.feedId && l.type === "delivery")
      .at(-1);
    const shute = row.isShute
      ? estimateShuteStock(logs, row.feedId, nowMs, ratePerWeek)
      : null;
    const advice = adviseFeed({
      stock: shute ? Math.max(row.total, shute.onHand) : row.total,
      ratePerWeek,
      isShute: row.isShute,
      lastDeliveryMs: shute
        ? shute.lastDeliveryMs
        : (lastDelivery?.timestampMs ?? null),
      nowMs,
      schedule,
    });
    return { ratePerWeek, shute, advice };
  }, [row, logs, nowMs, schedule]);

  const newestFirst = useMemo(
    () => (logs ? [...logs].reverse() : null),
    [logs],
  );
  const stats = useMemo(
    () => (logs ? monthlyStats(logs, feedId, nowMs) : null),
    [logs, feedId, nowMs],
  );

  const detail = useMemo(() => {
    if (!logs) return null;
    const now = new Date(nowMs);
    const y = now.getFullYear();
    const m = now.getMonth();
    const perMonth = consumptionPerMonth(
      logs,
      feedId,
      monthStart(y, m - 11),
      nowMs,
    );
    const monthStarts = Array.from(
      { length: 12 },
      (_, k) => new Date(y, m - 11 + k, 1),
    );
    return {
      monthStarts,
      monthValues: monthStarts.map(
        (d) =>
          perMonth.get(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          ) ?? 0,
      ),
      seasonality: seasonality(logs, feedId, nowMs),
      completeYears: completeYears(logs, feedId, nowMs),
      shute: shuteStats(logs, feedId),
    };
  }, [logs, feedId, nowMs]);

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!valid || !row) return <Navigate to="/stock" replace />;

  const { unit } = row;
  const advice = computed?.advice ?? null;
  const rate = computed?.ratePerWeek ?? 0;
  const shute = computed?.shute ?? null;
  const amount = shute ? Math.max(row.total, shute.onHand) : row.total;
  const rough = row.isShute || row.inStable;
  const mayOrder = can(roles, "order");
  const nextDate = dateShort.format(schedule.next);

  /** Two short lines: how long the stock lasts, and the usage it is based on. */
  let stockLine: string | null = null;
  let usageLine: string | null = null;
  if (advice && rate > 0 && advice.dueInDays !== null) {
    const days = advice.dueInDays;
    stockLine =
      days <= 0
        ? rough
          ? "Mogelijk niet genoeg voorraad"
          : "Voorraad is op"
        : `Nog ${rough ? "±" : ""}${days} dagen voorraad`;
    usageLine = `Gem. verbruik per week ${formatAmount(rate)} ${unitLabel(unit, rate)}`;
  } else if (advice && rate === 0) {
    usageLine = "Geen verbruik in de laatste 12 weken";
  }

  // The card takes the same tint as the row on the stock list when the feed may run out.
  const tint =
    advice?.status === "critical"
      ? "error"
      : advice?.status === "warning"
        ? "warning"
        : null;
  const summarySx = tint
    ? (t: Theme) => ({
        bgcolor: alpha(t.palette[tint].main, 0.1),
        borderLeft: `4px solid ${t.palette[tint].main}`,
      })
    : undefined;

  // Desktop: summary, Voorraad (if any) and Wijzigingen fill column 1; Verbruik spans those rows in column 2.
  const hasStorage = row.perStorage.length > 0;
  const lastLeftRow = hasStorage ? 3 : 2;

  const delta = stats ? signed(stats.thisMonth - stats.lastYearToDate) : "";

  return (
    <Page title={row.name} maxWidth={wide ? "lg" : "md"}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "minmax(0, 1fr) minmax(0, 1fr)",
          },
          gridTemplateRows: { md: hasStorage ? "auto auto 1fr" : "auto 1fr" },
          alignItems: "start",
        }}
      >
        <Box sx={{ gridColumn: { md: "1" }, gridRow: { md: "1" } }}>
          <CardSurface sx={summarySx}>
            <Box sx={{ p: 2 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Typography variant="h6" component="h2">
                  {row.name}
                </Typography>
                {advice && (
                  <Chip
                    size="small"
                    label={STATUS_LABEL[advice.status]}
                    color={CHIP_COLOR[advice.status]}
                    variant={advice.status === "ok" ? "outlined" : "filled"}
                  />
                )}
              </Stack>
              <Typography variant="h3" component="p">
                {shute ? "≈ " : ""}
                {formatAmount(amount)}{" "}
                <Typography
                  component="span"
                  variant="h6"
                  color="text.secondary"
                >
                  {unitLabel(unit, amount)}
                </Typography>
              </Typography>
              {stockLine && (
                <Typography variant="body2" color="text.secondary">
                  {stockLine}
                </Typography>
              )}
              {usageLine && (
                <Typography variant="body2" color="text.secondary">
                  {usageLine}
                </Typography>
              )}
              {advice && advice.daysSinceDelivery !== null && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="p"
                >
                  Laatste levering {agoLabel(advice.daysSinceDelivery)}
                </Typography>
              )}
              {mayOrder && advice && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" component="h3">
                    Bestel advies
                  </Typography>
                  {advice.status === "inactive" ? (
                    <Typography variant="body2" color="text.secondary">
                      Niet in gebruik: geen verbruik en geen voorraad.
                    </Typography>
                  ) : advice.orderQty > 0 ? (
                    <>
                      <Typography variant="h5" component="p">
                        {formatAmount(advice.orderQty)}{" "}
                        {unitLabel(unit, advice.orderQty)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Niets te bestellen voor de levering van {nextDate}.
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </CardSurface>
        </Box>

        {hasStorage && (
          <Box sx={{ gridColumn: { md: "1" }, gridRow: { md: "2" } }}>
            <StorageStockCard
              unit={unit}
              swipeMax={feeds.get(feedId)?.swipeMax}
              mayChange={mayChange}
              onChange={(storageId, signedAmount) =>
                openMutation({
                  feedId,
                  direction: signedAmount < 0 ? "out" : "in",
                  amount: Math.abs(signedAmount),
                  storageId,
                })
              }
              rows={row.perStorage.map((st) => ({
                storageId: st.storageId,
                name: st.storageName,
                amount: st.amount,
              }))}
            />
          </Box>
        )}

        <Stack
          spacing={2}
          sx={{
            gridColumn: { md: "2" },
            gridRow: { md: `1 / span ${lastLeftRow}` },
          }}
        >
          <CardSurface>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" component="h2">
                Verbruik
              </Typography>
              {stats ? (
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="h4" component="p">
                      {formatAmount(stats.average ?? 0)}{" "}
                      <Typography
                        component="span"
                        variant="h6"
                        color="text.secondary"
                      >
                        {unitLabel(unit, stats.average ?? 0)}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      gemiddeld per maand, laatste 12 maanden
                    </Typography>
                  </Box>
                  <Box>
                    <Stack
                      direction="row"
                      spacing={2}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Deze maand
                        </Typography>
                        <Typography variant="h6" component="p">
                          {formatAmount(stats.thisMonth)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Zelfde periode vorig jaar
                        </Typography>
                        <Typography variant="h6" component="p">
                          {formatAmount(stats.lastYearToDate)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Verschil
                        </Typography>
                        <Typography variant="h6" component="p">
                          {delta}
                        </Typography>
                      </Box>
                    </Stack>
                    {stats.lastYearFull !== stats.lastYearToDate && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        vorig jaar hele maand:{" "}
                        {formatAmount(stats.lastYearFull)}
                      </Typography>
                    )}
                  </Box>
                  {detail && (
                    <BarChart
                      labels={detail.monthStarts.map(monthYear)}
                      values={detail.monthValues}
                      average={stats.average}
                      unit={unit}
                      highlightLast
                      title={`Verbruik per maand, ${monthYear(detail.monthStarts[0])} t/m ${monthYear(detail.monthStarts[11])}`}
                    />
                  )}
                  {detail && (
                    <SeasonSection
                      seasonality={detail.seasonality}
                      years={detail.completeYears}
                      unit={unit}
                    />
                  )}
                </Stack>
              ) : (
                <Skeleton variant="rounded" height={120} />
              )}
            </Box>
          </CardSurface>
          {row.isShute &&
            (detail ? (
              <ShuteCard {...detail.shute} nowMs={nowMs} />
            ) : (
              <SkeletonCard title="Koker" />
            ))}
        </Stack>

        <Box
          sx={{ gridColumn: { md: "1" }, gridRow: { md: String(lastLeftRow) } }}
        >
          <ChangesTimeline
            logs={newestFirst}
            nowMs={nowMs}
            perspective={{
              kind: "feed",
              storageName: (id) => storages.get(id)?.name ?? id,
            }}
          />
        </Box>
      </Box>
    </Page>
  );
}
