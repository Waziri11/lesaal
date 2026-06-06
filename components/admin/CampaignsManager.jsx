"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
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

export default function CampaignsManager() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [updatingCampaignId, setUpdatingCampaignId] = useState(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);

  const campaignsForTable = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const aTime = Number(new Date(a.updatedAt || a.createdAt || 0));
      const bTime = Number(new Date(b.updatedAt || b.createdAt || 0));
      return bTime - aTime;
    });
  }, [campaigns]);

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
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            type="button"
            variant="ghost"
            className="-ml-3 h-8 px-3"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Campaign Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-semibold">{row.original.title}</p>
            <p className="text-xs text-[color:var(--ui-muted-foreground)]">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "targetMarket",
        header: "Target Market",
        cell: ({ row }) => row.original.targetMarket || "-",
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => getDurationLabel(row.original),
      },
      {
        accessorKey: "responseCount",
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
        id: "status",
        accessorFn: (row) => getStatus(row).value,
        filterFn: (row, columnId, value) => {
          const expected = String(value || "").trim().toLowerCase();
          if (!expected) return true;
          return String(row.getValue(columnId) || "").toLowerCase() === expected;
        },
        header: "Status",
        cell: ({ row }) => {
          const status = getStatus(row.original);
          return <Badge variant={status.variant}>{status.label}</Badge>;
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        enableSorting: false,
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
    data: campaignsForTable,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
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
        pageSize: 10,
      },
    },
  });

  const hasCampaigns = campaigns.length > 0;
  const filteredRowsCount = table.getFilteredRowModel().rows.length;

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
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Campaign Library</CardTitle>
              <CardDescription>Sort, filter, and search campaigns, then open details from the table.</CardDescription>
            </div>
            <Button size="sm" onClick={() => router.push("/admin/campaigns/new")}>+ New Campaign</Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <PageState
            status={loadingCampaigns ? "loading" : campaignError ? "error" : !hasCampaigns ? "empty" : "loaded"}
            resourceLabel="campaigns"
            errorMessage={campaignError}
            onRetry={loadCampaigns}
            createAction={
              <Button type="button" size="sm" onClick={() => router.push("/admin/campaigns/new")}>Add Campaign</Button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  placeholder="Search by title, slug, market, or description"
                  className="w-full max-w-md"
                />

                <div className="flex items-center gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Badge variant="secondary">{filteredRowsCount} listed</Badge>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-[color:var(--ui-border)]">
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
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center text-[color:var(--ui-muted-foreground)]">
                          No campaigns match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[color:var(--ui-muted-foreground)]">
                  Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    Previous
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    Next
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
