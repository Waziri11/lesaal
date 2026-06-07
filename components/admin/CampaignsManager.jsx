"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleOff,
  Filter,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { createCsrfHeaders } from "../../lib/csrf-client";
import Swal from "sweetalert2";

const SORT_OPTIONS = {
  updated_desc: [{ id: "updatedAt", desc: true }],
  updated_asc: [{ id: "updatedAt", desc: false }],
  title_asc: [{ id: "title", desc: false }],
  title_desc: [{ id: "title", desc: true }],
  responses_desc: [{ id: "responseCount", desc: true }],
  responses_asc: [{ id: "responseCount", desc: false }],
};

const MENU_ITEM_CLASS =
  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-[color:var(--ui-accent)]";

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatInteger(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatPercent(value) {
  return `${Math.max(0, Math.round(Number(value) || 0))}%`;
}

function formatAxisCount(value) {
  const numeric = Number(value) || 0;

  if (numeric >= 1000) {
    return `${Math.round(numeric / 100) / 10}k`;
  }

  return String(Math.round(numeric));
}

function formatShortDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getNiceStep(maxValue) {
  const safe = Math.max(1, Number(maxValue) || 0);
  const roughStep = safe / 3;
  const power = 10 ** Math.floor(Math.log10(Math.max(1, roughStep)));
  const normalized = roughStep / power;

  if (normalized <= 1) return power;
  if (normalized <= 2) return 2 * power;
  if (normalized <= 5) return 5 * power;
  return 10 * power;
}

function toPathNumber(value) {
  return Number(value).toFixed(2);
}

function buildSmoothLinePath(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return "";
  }

  let path = `M ${toPathNumber(points[0].x)} ${toPathNumber(points[0].y)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const following = points[index + 2] || next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current.y + (next.y - previous.y) / 6;
    const controlPoint2X = next.x - (following.x - current.x) / 6;
    const controlPoint2Y = next.y - (following.y - current.y) / 6;

    path += ` C ${toPathNumber(controlPoint1X)} ${toPathNumber(controlPoint1Y)},`;
    path += ` ${toPathNumber(controlPoint2X)} ${toPathNumber(controlPoint2Y)},`;
    path += ` ${toPathNumber(next.x)} ${toPathNumber(next.y)}`;
  }

  return path;
}

function getDurationLabel(campaign) {
  const createdAt = new Date(campaign.createdAt);
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;

  if (Number.isNaN(createdAt.getTime()) || !deadline || Number.isNaN(deadline.getTime())) {
    return "No deadline";
  }

  const days = Math.max(1, Math.ceil((deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  return `${formatDate(createdAt)} to ${formatDate(deadline)} (${days} days)`;
}

function getStatus(campaign) {
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;
  const isExpired = deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

  if (!campaign.isPublished) {
    return { value: "disabled", label: "Disabled", variant: "default" };
  }

  if (isExpired) {
    return { value: "expired", label: "Expired", variant: "secondary" };
  }

  return { value: "active", label: "Active", variant: "success" };
}

function getCampaignAvatarStyle(campaign) {
  const title = String(campaign?.title || "");
  let seed = 0;

  for (let index = 0; index < title.length; index += 1) {
    seed = (seed + title.charCodeAt(index) * (index + 3)) % 360;
  }

  const hue = seed || 210;
  const secondaryHue = (hue + 38) % 360;

  return {
    background: `radial-gradient(circle at 30% 30%, hsl(${hue} 90% 86%), hsl(${secondaryHue} 64% 62%))`,
  };
}

export default function CampaignsManager() {
  const trendDays = 30;
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [responseTrendSeries, setResponseTrendSeries] = useState([]);
  const [responseTrendRange, setResponseTrendRange] = useState({ start: "", end: "" });
  const [trendError, setTrendError] = useState("");
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState("updated_desc");
  const [sorting, setSorting] = useState(SORT_OPTIONS.updated_desc);
  const [columnFilters, setColumnFilters] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [updatingCampaignId, setUpdatingCampaignId] = useState(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);
  const [openingCampaignId, setOpeningCampaignId] = useState(null);
  const [isOpeningCampaign, startOpenCampaignTransition] = useTransition();

  const campaignStats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((campaign) => campaign.isPublished).length;
    const disabled = total - active;
    const responsesCount = campaigns.reduce((sum, campaign) => sum + Number(campaign.responseCount || 0), 0);
    const campaignsWithResponses = campaigns.filter((campaign) => Number(campaign.responseCount || 0) > 0).length;
    const activeRate = total ? (active / total) * 100 : 0;
    const disabledRate = total ? (disabled / total) * 100 : 0;
    const responseCoverageRate = total ? (campaignsWithResponses / total) * 100 : 0;

    return { total, active, disabled, responsesCount, activeRate, disabledRate, responseCoverageRate };
  }, [campaigns]);

  const campaignStatCards = useMemo(() => {
    const hasCampaigns = campaignStats.total > 0;
    const showNeutralRate = !hasCampaigns;

    return [
      {
        key: "listed",
        label: "Campaigns listed",
        value: formatInteger(campaignStats.total),
        Icon: ListChecks,
        trend: formatPercent(campaignStats.activeRate),
        trendTone: showNeutralRate
          ? "text-[color:var(--ui-muted-foreground)]"
          : campaignStats.activeRate >= 50
            ? "text-[color:var(--ui-success)]"
            : "text-[color:var(--ui-destructive)]",
        trendDirection: showNeutralRate ? "neutral" : campaignStats.activeRate >= 50 ? "up" : "down",
      },
      {
        key: "active",
        label: "Active campaigns",
        value: formatInteger(campaignStats.active),
        Icon: CircleCheck,
        trend: formatPercent(campaignStats.activeRate),
        trendTone: showNeutralRate
          ? "text-[color:var(--ui-muted-foreground)]"
          : "text-[color:var(--ui-success)]",
        trendDirection: showNeutralRate ? "neutral" : "up",
      },
      {
        key: "disabled",
        label: "Disabled campaigns",
        value: formatInteger(campaignStats.disabled),
        Icon: CircleOff,
        trend: formatPercent(campaignStats.disabledRate),
        trendTone: showNeutralRate
          ? "text-[color:var(--ui-muted-foreground)]"
          : campaignStats.disabled > 0
            ? "text-[color:var(--ui-destructive)]"
            : "text-[color:var(--ui-success)]",
        trendDirection: showNeutralRate ? "neutral" : campaignStats.disabled > 0 ? "down" : "up",
      },
      {
        key: "responses",
        label: "Responses logged",
        value: formatCount(campaignStats.responsesCount),
        Icon: MessageSquare,
        trend: formatPercent(campaignStats.responseCoverageRate),
        trendTone:
          campaignStats.responseCoverageRate > 0 ? "text-[color:var(--ui-success)]" : "text-[color:var(--ui-muted-foreground)]",
        trendDirection: campaignStats.responseCoverageRate > 0 ? "up" : "neutral",
      },
    ];
  }, [campaignStats]);

  const responseTrendChart = useMemo(() => {
    const series = Array.isArray(responseTrendSeries) ? responseTrendSeries : [];

    if (!series.length) {
      return null;
    }

    const chartWidth = 1200;
    const chartHeight = 260;
    const padding = { top: 14, right: 20, bottom: 34, left: 48 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const counts = series.map((point) => Number(point.count) || 0);
    const maxCount = Math.max(0, ...counts);
    const step = getNiceStep(maxCount || 1);
    let yMax = step * 3;

    while (yMax < maxCount) {
      yMax += step;
    }

    const xDenominator = Math.max(1, series.length - 1);
    const points = series.map((point, index) => {
      const x = padding.left + (index / xDenominator) * innerWidth;
      const y = padding.top + innerHeight - (Math.min(yMax, Number(point.count) || 0) / yMax) * innerHeight;

      return { x, y };
    });

    const linePath = buildSmoothLinePath(points);
    const baselineY = padding.top + innerHeight;
    const areaPath =
      linePath && points.length
        ? `${linePath} L ${toPathNumber(points[points.length - 1].x)} ${toPathNumber(baselineY)} L ${toPathNumber(points[0].x)} ${toPathNumber(
            baselineY
          )} Z`
        : "";

    const firstLabel = series[0]?.label || "";
    const midLabel = series[Math.floor(series.length / 2)]?.label || "";
    const lastLabel = series[series.length - 1]?.label || "";
    const totalResponses = counts.reduce((sum, value) => sum + value, 0);
    const tickValues = [0, step, step * 2, yMax];
    const tickLines = tickValues.map((value) => ({
      value,
      y: padding.top + innerHeight - (value / yMax) * innerHeight,
    }));

    return {
      chartWidth,
      chartHeight,
      padding,
      baselineY,
      linePath,
      areaPath,
      firstLabel,
      midLabel,
      lastLabel,
      totalResponses,
      tickLines,
    };
  }, [responseTrendSeries]);

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    setLoadingTrend(true);
    setCampaignError("");
    setTrendError("");

    try {
      const [campaignsResponse, trendResponse] = await Promise.all([
        fetch("/api/admin/campaigns", { cache: "no-store" }),
        fetch(`/api/admin/campaigns/responses-trend?days=${trendDays}`, { cache: "no-store" }),
      ]);

      const campaignsPayload = await campaignsResponse.json();

      if (!campaignsResponse.ok) {
        throw new Error(campaignsPayload.error || "Unable to load campaigns.");
      }

      setCampaigns(Array.isArray(campaignsPayload.campaigns) ? campaignsPayload.campaigns : []);

      const trendPayload = await trendResponse.json().catch(() => ({}));

      if (trendResponse.ok) {
        setResponseTrendSeries(Array.isArray(trendPayload?.series) ? trendPayload.series : []);
        setResponseTrendRange({
          start: String(trendPayload?.range?.start || ""),
          end: String(trendPayload?.range?.end || ""),
        });
      } else if (trendResponse.status === 401) {
        throw new Error(trendPayload?.error || "Unauthorized");
      } else {
        setTrendError(trendPayload?.error || "Unable to load response trend.");
        setResponseTrendSeries([]);
        setResponseTrendRange({ start: "", end: "" });
      }
    } catch (error) {
      setCampaignError(error.message || "Unable to load campaigns.");
    } finally {
      setLoadingCampaigns(false);
      setLoadingTrend(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function toggleCampaignState(campaign) {
    if (!campaign?.id || updatingCampaignId) return;

    setUpdatingCampaignId(campaign.id);
    setCampaignError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          isPublished: !campaign.isPublished,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update campaign status.");
      }

      const nextStateLabel = payload.campaign.isPublished ? "enabled" : "disabled";
      setStatusSuccess(`Campaign ${nextStateLabel} successfully.`);
      await Swal.fire({
        icon: "success",
        title: "Campaign updated",
        text: `Campaign ${nextStateLabel} successfully.`,
        timer: 1400,
        showConfirmButton: false,
      });
      await loadCampaigns();
    } catch (error) {
      const message = error.message || "Unable to update campaign status.";
      setCampaignError(message);
      await Swal.fire({
        icon: "error",
        title: "Update failed",
        text: message,
      });
    } finally {
      setUpdatingCampaignId(null);
    }
  }

  async function deleteCampaign(campaign) {
    if (!campaign?.id || deletingCampaignId) return;

    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete campaign?",
      text: `Delete "${campaign.title}" and all responses?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
      focusCancel: true,
    });
    if (!decision.isConfirmed) return;

    setDeletingCampaignId(campaign.id);
    setCampaignError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete campaign.");
      }

      setStatusSuccess("Campaign deleted successfully.");
      await Swal.fire({
        icon: "success",
        title: "Campaign deleted",
        text: "Campaign deleted successfully.",
        timer: 1400,
        showConfirmButton: false,
      });
      await loadCampaigns();
    } catch (error) {
      const message = error.message || "Unable to delete campaign.";
      setCampaignError(message);
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: message,
      });
    } finally {
      setDeletingCampaignId(null);
    }
  }

  const openCampaign = useCallback(
    (campaign) => {
      if (!campaign?.id || isOpeningCampaign) return;

      setOpeningCampaignId(campaign.id);
      startOpenCampaignTransition(() => {
        router.push(`/admin/campaigns/${campaign.id}`);
      });
    },
    [isOpeningCampaign, router]
  );

  const columns = useMemo(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all campaigns on page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.title}`}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
      {
        id: "title",
        accessorFn: (row) => String(row.title || ""),
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Campaign name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 shrink-0 rounded-full border border-white/30 shadow-sm" style={getCampaignAvatarStyle(row.original)} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[color:var(--ui-foreground)]">{row.original.title}</p>
              <p className="truncate text-xs text-[color:var(--ui-muted-foreground)]">/{row.original.slug}</p>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (row) => getStatus(row).value,
        filterFn: (row, columnId, value) => {
          const expected = String(value || "").trim().toLowerCase();
          if (!expected) return true;
          return String(row.getValue(columnId) || "").toLowerCase() === expected;
        },
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const status = getStatus(row.original);
          return <Badge variant={status.variant}>{status.label}</Badge>;
        },
      },
      {
        id: "targetMarket",
        accessorFn: (row) => String(row.targetMarket || ""),
        header: "Target market",
        cell: ({ row }) => row.original.targetMarket || "-",
      },
      {
        id: "duration",
        accessorFn: (row) => {
          const created = Number(new Date(row.createdAt || 0));
          const deadline = row.deadline ? Number(new Date(row.deadline)) : Number.POSITIVE_INFINITY;
          return Number.isFinite(deadline) ? deadline - created : created;
        },
        header: "Duration",
        cell: ({ row }) => getDurationLabel(row.original),
      },
      {
        id: "responseCount",
        accessorFn: (row) => Number(row.responseCount || 0),
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Responses
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => Number(row.original.responseCount || 0),
      },
      {
        id: "updatedAt",
        accessorFn: (row) => Number(new Date(row.updatedAt || row.createdAt || 0)),
        header: () => null,
        cell: () => null,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const campaign = row.original;
          const isUpdating = updatingCampaignId === campaign.id;
          const isDeleting = deletingCampaignId === campaign.id;
          const isOpening = isOpeningCampaign && openingCampaignId === campaign.id;

          return (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label="Open actions menu">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-1">
                  <button
                    type="button"
                    className={MENU_ITEM_CLASS}
                    disabled={isUpdating || isDeleting || isOpeningCampaign}
                    onClick={() => openCampaign(campaign)}
                  >
                    {isOpening ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isOpening ? "Opening..." : "View campaign"}
                  </button>
                  <button
                    type="button"
                    className={MENU_ITEM_CLASS}
                    disabled={isUpdating || isDeleting || isOpeningCampaign}
                    onClick={() => toggleCampaignState(campaign)}
                  >
                    {isUpdating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isUpdating ? "Updating..." : campaign.isPublished ? "Disable campaign" : "Enable campaign"}
                  </button>
                  <button
                    type="button"
                    className={`${MENU_ITEM_CLASS} text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]`}
                    disabled={isDeleting || isUpdating || isOpeningCampaign}
                    onClick={() => deleteCampaign(campaign)}
                  >
                    {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isDeleting ? "Deleting..." : "Delete campaign"}
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        },
      },
    ],
    [deletingCampaignId, isOpeningCampaign, openCampaign, openingCampaignId, updatingCampaignId]
  );

  const table = useReactTable({
    data: campaigns,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    globalFilterFn: (row, _, filterValue) => {
      const query = String(filterValue || "").trim().toLowerCase();
      if (!query) return true;

      const campaign = row.original;
      const searchable = [campaign.title, campaign.slug, campaign.description, campaign.targetMarket]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  const filteredRowsCount = table.getFilteredRowModel().rows.length;
  const pagination = table.getState().pagination;
  const pageStart = filteredRowsCount ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const pageEnd = filteredRowsCount ? Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredRowsCount) : 0;
  if (loadingCampaigns) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[color:var(--ui-muted-foreground)]">
          <Spinner className="h-5 w-5" />
          <span>Loading campaigns...</span>
        </div>
      </section>
    );
  }

  if (campaignError && !campaigns.length) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-6">
          <p className="text-sm text-[color:var(--ui-destructive)]">{campaignError}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={loadCampaigns}>
            Retry
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2 px-1">
        <h2 className="text-2xl font-semibold text-[color:var(--ui-foreground)]">Campaign Library</h2>
        <p className="text-sm text-[color:var(--ui-muted-foreground)]">Search, filter, and manage campaigns from one clean table.</p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {campaignStatCards.map((stat) => {
            const TrendIcon = stat.trendDirection === "down" ? TrendingDown : TrendingUp;

            return (
              <article
                key={stat.key}
                className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[color:var(--ui-muted-foreground)]">{stat.label}</p>
                  <span className="inline-flex h-6 w-6 items-center justify-center text-[color:var(--ui-muted-foreground)]">
                    <stat.Icon className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-2.5 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-3 py-2">
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-2xl font-semibold tracking-tight text-[color:var(--ui-foreground)]">{stat.value}</p>
                    <p className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${stat.trendTone}`}>
                      {stat.trendDirection === "neutral" ? null : <TrendIcon className="h-3.5 w-3.5" />}
                      {stat.trend}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {campaignError ? <p className="text-sm text-[color:var(--ui-destructive)]">{campaignError}</p> : null}
        {statusSuccess ? <p className="text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
      </div>

      <div className="w-full rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3.5 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[color:var(--ui-foreground)]">Responses over time</h3>
            <p className="text-sm text-[color:var(--ui-muted-foreground)]">
              {responseTrendRange.start && responseTrendRange.end
                ? `${formatShortDate(responseTrendRange.start)} - ${formatShortDate(responseTrendRange.end)}`
                : `Last ${trendDays} days`}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Total responses</p>
            <p className="text-xl font-semibold text-[color:var(--ui-foreground)]">{formatInteger(responseTrendChart?.totalResponses || 0)}</p>
          </div>
        </div>

        {loadingTrend ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-12 text-sm text-[color:var(--ui-muted-foreground)]">
            <Spinner className="h-4 w-4" />
            <span>Loading response trend...</span>
          </div>
        ) : trendError ? (
          <div className="mt-6 flex items-center justify-center py-12">
            <p className="text-sm text-[color:var(--ui-destructive)]">{trendError}</p>
          </div>
        ) : responseTrendChart ? (
          <div className="mt-4">
            <svg
              viewBox={`0 0 ${responseTrendChart.chartWidth} ${responseTrendChart.chartHeight}`}
              className="h-auto w-full"
              role="img"
              aria-label={`Responses over the last ${trendDays} days`}
            >
              <defs>
                <linearGradient id="campaign-responses-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.35)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.02)" />
                </linearGradient>
              </defs>

              {responseTrendChart.tickLines.map((tick) => (
                <g key={tick.value}>
                  <line
                    x1={responseTrendChart.padding.left}
                    y1={tick.y}
                    x2={responseTrendChart.chartWidth - responseTrendChart.padding.right}
                    y2={tick.y}
                    stroke="rgba(148, 163, 184, 0.28)"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={responseTrendChart.padding.left - 12}
                    y={tick.y + 5}
                    textAnchor="end"
                    fontSize="12"
                    fill="rgba(148, 163, 184, 0.92)"
                  >
                    {formatAxisCount(tick.value)}
                  </text>
                </g>
              ))}

              {responseTrendChart.areaPath ? (
                <path d={responseTrendChart.areaPath} fill="url(#campaign-responses-area-fill)" />
              ) : null}

              {responseTrendChart.linePath ? (
                <path
                  d={responseTrendChart.linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              <text
                x={responseTrendChart.padding.left}
                y={responseTrendChart.chartHeight - 10}
                textAnchor="start"
                fontSize="12"
                fill="rgba(148, 163, 184, 0.95)"
              >
                {responseTrendChart.firstLabel}
              </text>
              <text
                x={responseTrendChart.chartWidth / 2}
                y={responseTrendChart.chartHeight - 10}
                textAnchor="middle"
                fontSize="12"
                fill="rgba(148, 163, 184, 0.95)"
              >
                {responseTrendChart.midLabel}
              </text>
              <text
                x={responseTrendChart.chartWidth - responseTrendChart.padding.right}
                y={responseTrendChart.chartHeight - 10}
                textAnchor="end"
                fontSize="12"
                fill="rgba(148, 163, 184, 0.95)"
              >
                {responseTrendChart.lastLabel}
              </text>
            </svg>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center py-12">
            <p className="text-sm text-[color:var(--ui-muted-foreground)]">No responses yet to visualize.</p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]">
        <div className="flex flex-col gap-3 border-b border-[color:var(--ui-border)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:min-w-0 lg:flex-1 lg:flex-nowrap">
            <div className="relative w-full sm:min-w-[260px] lg:min-w-[320px] lg:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted-foreground)]" />
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search campaigns..."
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px] lg:w-[150px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortOption}
              onValueChange={(value) => {
                setSortOption(value);
                setSorting(SORT_OPTIONS[value] || SORT_OPTIONS.updated_desc);
              }}
            >
              <SelectTrigger className="w-full sm:w-[190px] lg:w-[210px]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <SelectValue placeholder="Sort" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Newest first</SelectItem>
                <SelectItem value="updated_asc">Oldest first</SelectItem>
                <SelectItem value="title_asc">Name A-Z</SelectItem>
                <SelectItem value="title_desc">Name Z-A</SelectItem>
                <SelectItem value="responses_desc">Most responses</SelectItem>
                <SelectItem value="responses_asc">Least responses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            className="h-10 shrink-0 bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white"
            onClick={() => router.push("/admin/campaigns/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New campaign
          </Button>
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${isOpeningCampaign ? "pointer-events-none opacity-80" : ""}`}
                  onClick={() => openCampaign(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[color:var(--ui-muted-foreground)]">
                  No campaigns match your current search/filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ui-border)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm text-[color:var(--ui-muted-foreground)]">
            <p>Showing {pageStart} to {pageEnd} of {filteredRowsCount} campaigns</p>
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={String(pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {Object.keys(rowSelection || {}).length ? <p>{table.getFilteredSelectedRowModel().rows.length} selected</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm text-[color:var(--ui-muted-foreground)]">
              {table.getPageCount() ? table.getState().pagination.pageIndex + 1 : 0} / {Math.max(1, table.getPageCount())}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isOpeningCampaign ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-4 py-3 text-sm text-[color:var(--ui-foreground)] shadow-lg">
            <Spinner className="h-4 w-4" />
            <span>Opening campaign...</span>
          </div>
        </div>
      ) : null}

    </section>
  );
}
