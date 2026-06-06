"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import PageState from "../shared/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { createCsrfHeaders } from "../../lib/csrf-client";

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

const SORT_OPTIONS = {
  updated_desc: [{ id: "updatedAt", desc: true }],
  updated_asc: [{ id: "updatedAt", desc: false }],
  title_asc: [{ id: "title", desc: false }],
  title_desc: [{ id: "title", desc: true }],
  responses_desc: [{ id: "responseCount", desc: true }],
  responses_asc: [{ id: "responseCount", desc: false }],
};

export default function CampaignsManager() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
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

  const campaignStats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((campaign) => campaign.isPublished).length;
    const disabled = total - active;
    const responsesCount = campaigns.reduce((sum, campaign) => sum + Number(campaign.responseCount || 0), 0);
    return { total, active, disabled, responsesCount };
  }, [campaigns]);

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    setCampaignError("");

    try {
      const response = await fetch("/api/admin/campaigns", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load campaigns.");
      }

      const nextCampaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];
      setCampaigns(nextCampaigns);
    } catch (error) {
      setCampaignError(error.message || "Unable to load campaigns.");
    } finally {
      setLoadingCampaigns(false);
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

      setStatusSuccess(`Campaign ${payload.campaign.isPublished ? "enabled" : "disabled"} successfully.`);
      await loadCampaigns();
    } catch (error) {
      setCampaignError(error.message || "Unable to update campaign status.");
    } finally {
      setUpdatingCampaignId(null);
    }
  }

  async function deleteCampaign(campaign) {
    if (!campaign?.id || deletingCampaignId) return;

    const confirmed = window.confirm(`Delete \"${campaign.title}\" and all responses?`);
    if (!confirmed) return;

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
      await loadCampaigns();
    } catch (error) {
      setCampaignError(error.message || "Unable to delete campaign.");
    } finally {
      setDeletingCampaignId(null);
    }
  }

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

          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(`/admin/campaigns/${campaign.id}`);
                }}
              >
                View
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isUpdating || isDeleting}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleCampaignState(campaign);
                }}
              >
                {isUpdating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {isUpdating ? "Updating..." : campaign.isPublished ? "Disable" : "Enable"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeleting || isUpdating}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteCampaign(campaign);
                }}
              >
                {isDeleting ? <Spinner className="mr-2 h-4 w-4" /> : null}
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          );
        },
      },
    ],
    [deletingCampaignId, router, updatingCampaignId]
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
  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Create outreach campaigns, publish forms, and manage incoming responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Total campaigns</p>
              <p className="mt-2 text-2xl font-semibold">{campaignStats.total}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Active</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-success)]">{campaignStats.active}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Disabled</p>
              <p className="mt-2 text-2xl font-semibold">{campaignStats.disabled}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Responses</p>
              <p className="mt-2 text-2xl font-semibold">{formatCount(campaignStats.responsesCount)}</p>
            </div>
          </div>

          {campaignError ? <p className="text-sm text-[color:var(--ui-destructive)]">{campaignError}</p> : null}
          {statusSuccess ? <p className="text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Campaign Library</CardTitle>
          <CardDescription>Manage campaigns with search, filter, and sorting controls.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <PageState
            status={loadingCampaigns ? "loading" : campaignError ? "error" : !hasCampaigns ? "empty" : "loaded"}
            resourceLabel="campaigns"
            errorMessage={campaignError}
            onRetry={loadCampaigns}
            createAction={
              <Button type="button" size="sm" onClick={() => router.push("/admin/campaigns/new")}>Add Campaign</Button>
            }
          >
            <div className="overflow-hidden rounded-2xl border border-[color:var(--ui-border)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--ui-border)] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full min-w-[260px] max-w-[560px]">
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
                    <SelectTrigger className="w-[140px]">
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
                    <SelectTrigger className="w-[190px]">
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
                  className="bg-black text-white hover:bg-black/90 dark:bg-black dark:text-white"
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
                        className="cursor-pointer"
                        onClick={() => router.push(`/admin/campaigns/${row.original.id}`)}
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
                  {Object.keys(rowSelection || {}).length ? (
                    <p>{table.getFilteredSelectedRowModel().rows.length} selected</p>
                  ) : null}
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
          </PageState>
        </CardContent>
      </Card>
    </div>
  );
}
