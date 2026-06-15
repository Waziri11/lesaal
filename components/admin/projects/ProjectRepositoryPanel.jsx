"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  FolderClosed,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { createCsrfHeaders } from "../../../lib/csrf-client";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";

const DEFAULT_PAGE_SIZE = 40;
const GOOGLE_API_SCRIPT_URL = "https://apis.google.com/js/api.js";

let googleApiScriptPromise = null;

function createDefaultRepository(projectId, projectName) {
  return {
    projectId,
    projectName,
    folderId: "",
    folderName: "",
    folderUrl: "",
    linkedAt: "",
  };
}

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function formatFileSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "—";
  if (size < 1024) return `${size} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let unitIndex = -1;
  let value = size;

  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);

  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

function mapOauthErrorCodeToMessage(code) {
  const value = String(code || "").trim();

  if (!value) return "";

  const dictionary = {
    access_denied: "Google access was denied. You can reconnect whenever ready.",
    invalid_state: "Google login session expired. Please try connecting again.",
    callback_failed: "Google callback failed. Please retry the connection.",
    migration_required: "Google Drive integration requires the latest database migration.",
    refresh_token_missing: "Google did not return offline access. Please reconnect again.",
    connect_unavailable: "Google Drive connection is unavailable right now.",
    missing_code: "Google callback did not include an authorization code.",
  };

  return dictionary[value] || `Google authorization error: ${value}`;
}

function loadGoogleApiScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Picker is only available in the browser."));
  }

  if (window.gapi && window.google?.picker) {
    return Promise.resolve();
  }

  if (!googleApiScriptPromise) {
    googleApiScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_API_SCRIPT_URL}"]`);

      if (existingScript) {
        if (window.gapi) {
          resolve();
          return;
        }

        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google API script.")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_API_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google API script."));
      document.head.appendChild(script);
    });
  }

  return googleApiScriptPromise;
}

function ensureGooglePickerReady() {
  return loadGoogleApiScript().then(
    () =>
      new Promise((resolve, reject) => {
        if (window.google?.picker && window.gapi) {
          resolve();
          return;
        }

        if (!window.gapi?.load) {
          reject(new Error("Google Picker library is unavailable."));
          return;
        }

        window.gapi.load("picker", {
          callback: () => resolve(),
          onerror: () => reject(new Error("Unable to initialize Google Picker.")),
          timeout: 10000,
          ontimeout: () => reject(new Error("Google Picker initialization timed out.")),
        });
      })
  );
}

export default function ProjectRepositoryPanel({ projectId, projectName }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);
  const activeFilesQueryRef = useRef("");
  const [connection, setConnection] = useState({ connected: false, account: null });
  const [repository, setRepository] = useState(() => createDefaultRepository(projectId, projectName));
  const [files, setFiles] = useState([]);
  const [filesQueryInput, setFilesQueryInput] = useState("");
  const [activeFilesQuery, setActiveFilesQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState("");
  const [loadingRepositoryState, setLoadingRepositoryState] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingMoreFiles, setLoadingMoreFiles] = useState(false);
  const [openingPicker, setOpeningPicker] = useState(false);
  const [bindingFolder, setBindingFolder] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  const connectHref = useMemo(() => {
    return `/api/admin/integrations/google-drive/connect?returnTo=${encodeURIComponent(pathname || `/admin/projects/${projectId}`)}`;
  }, [pathname, projectId]);

  const resetFiles = useCallback(() => {
    setFiles([]);
    setNextPageToken("");
  }, []);

  const loadFiles = useCallback(
    async ({ folderId, append = false, pageToken = "", query = activeFilesQueryRef.current } = {}) => {
      if (!folderId) {
        resetFiles();
        return;
      }

      if (append) {
        setLoadingMoreFiles(true);
      } else {
        setLoadingFiles(true);
      }

      if (!append) {
        setStatusError("");
      }

      try {
        const url = new URL(`/api/admin/projects/${projectId}/repository/files`, window.location.origin);
        url.searchParams.set("pageSize", String(DEFAULT_PAGE_SIZE));

        if (query) {
          url.searchParams.set("query", query);
        }

        if (pageToken) {
          url.searchParams.set("pageToken", pageToken);
        }

        const response = await fetch(url.toString(), { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load repository files.");
        }

        const incomingFiles = Array.isArray(payload.files) ? payload.files : [];
        setNextPageToken(String(payload.nextPageToken || ""));
        activeFilesQueryRef.current = query;
        setActiveFilesQuery(query);

        if (append) {
          setFiles((current) => [...current, ...incomingFiles]);
        } else {
          setFiles(incomingFiles);
        }
      } catch (error) {
        setStatusError(error.message || "Unable to load repository files.");
      } finally {
        if (append) {
          setLoadingMoreFiles(false);
        } else {
          setLoadingFiles(false);
        }
      }
    },
    [projectId, resetFiles]
  );

  const loadRepositoryState = useCallback(
    async ({ loadFilesAfter = true } = {}) => {
      setLoadingRepositoryState(true);
      setStatusError("");

      try {
        const response = await fetch(`/api/admin/integrations/google-drive/status?projectId=${projectId}`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load repository status.");
        }

        setConnection({
          connected: Boolean(payload.connected),
          account: payload.account || null,
        });

        const nextRepository = payload.repository || createDefaultRepository(projectId, projectName);
        setRepository(nextRepository);

        if (!loadFilesAfter) {
          return;
        }

        if (nextRepository.folderId) {
          await loadFiles({
            folderId: nextRepository.folderId,
            append: false,
            query: activeFilesQueryRef.current,
          });
        } else {
          resetFiles();
        }
      } catch (error) {
        setStatusError(error.message || "Unable to load repository status.");
      } finally {
        setLoadingRepositoryState(false);
      }
    },
    [loadFiles, projectId, projectName, resetFiles]
  );

  useEffect(() => {
    loadRepositoryState();
  }, [loadRepositoryState]);

  useEffect(() => {
    const connectedFlag = searchParams.get("gd_connected");
    const oauthError = searchParams.get("gd_error");

    if (connectedFlag !== "1" && !oauthError) {
      return;
    }

    if (connectedFlag === "1") {
      setStatusMessage("Google Drive account connected successfully.");
      setStatusError("");
      void loadRepositoryState();
    } else if (oauthError) {
      setStatusError(mapOauthErrorCodeToMessage(oauthError));
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("gd_connected");
    nextParams.delete("gd_error");
    const serialized = nextParams.toString();
    const nextPath = serialized ? `${pathname}?${serialized}` : pathname;
    router.replace(nextPath);
  }, [searchParams, pathname, router, loadRepositoryState]);

  async function handleBindFolder({ folderId, folderName, folderUrl }) {
    if (!folderId) {
      return;
    }

    setBindingFolder(true);
    setStatusError("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/repository`, {
        method: "PUT",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          driveFolderId: folderId,
          driveFolderName: folderName,
          driveFolderUrl: folderUrl,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to link project folder.");
      }

      setRepository(payload.repository || createDefaultRepository(projectId, projectName));
      setStatusMessage("Project repository folder linked successfully.");
      setStatusError("");

      if (payload?.repository?.folderId) {
        await loadFiles({
          folderId: payload.repository.folderId,
          append: false,
          query: activeFilesQuery,
        });
      }
    } catch (error) {
      setStatusError(error.message || "Unable to link project folder.");
    } finally {
      setBindingFolder(false);
    }
  }

  async function openFolderPicker() {
    if (openingPicker || bindingFolder) {
      return;
    }

    setOpeningPicker(true);
    setStatusError("");

    try {
      const tokenResponse = await fetch("/api/admin/integrations/google-drive/picker-token", { cache: "no-store" });
      const tokenPayload = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenPayload.error || "Unable to initialize Google Picker.");
      }

      await ensureGooglePickerReady();

      const pickerNamespace = window.google?.picker;
      if (!pickerNamespace) {
        throw new Error("Google Picker did not initialize correctly.");
      }

      const folderView = new pickerNamespace.DocsView(pickerNamespace.ViewId.FOLDERS);
      folderView.setIncludeFolders(true);
      folderView.setSelectFolderEnabled(true);

      const picker = new pickerNamespace.PickerBuilder()
        .setAppId(String(tokenPayload.appId || ""))
        .setDeveloperKey(String(tokenPayload.developerKey || ""))
        .setOAuthToken(String(tokenPayload.accessToken || ""))
        .setTitle("Select a Google Drive folder")
        .enableFeature(pickerNamespace.Feature.SUPPORT_DRIVES)
        .addView(folderView)
        .setCallback((data) => {
          const action = data?.[pickerNamespace.Response.ACTION];

          if (action === pickerNamespace.Action.PICKED) {
            const selected = data?.[pickerNamespace.Response.DOCUMENTS]?.[0];
            void handleBindFolder({
              folderId: selected?.[pickerNamespace.Document.ID],
              folderName: selected?.[pickerNamespace.Document.NAME],
              folderUrl: selected?.[pickerNamespace.Document.URL],
            });
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      setStatusError(error.message || "Unable to open Google Picker.");
    } finally {
      setOpeningPicker(false);
    }
  }

  async function handleUploadInputChange(event) {
    const file = event?.target?.files?.[0];
    event.target.value = "";

    if (!(file instanceof File)) {
      return;
    }

    if (!repository.folderId) {
      setStatusError("Select a Google Drive folder before uploading files.");
      return;
    }

    setUploadingFile(true);
    setStatusError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/admin/projects/${projectId}/repository/files`, {
        method: "POST",
        headers: createCsrfHeaders(),
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to upload file.");
      }

      setStatusMessage(`Uploaded "${payload?.file?.name || file.name}" to Google Drive.`);
      await loadFiles({
        folderId: repository.folderId,
        append: false,
        query: activeFilesQuery,
      });
    } catch (error) {
      setStatusError(error.message || "Unable to upload file.");
    } finally {
      setUploadingFile(false);
    }
  }

  const canLoadMore = Boolean(nextPageToken);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Project Repository</CardTitle>
          <CardDescription>
            Link this project to a Google Drive folder. Files stay visible in both Google Drive and this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusError ? <p className="text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
          {statusMessage ? <p className="text-sm text-[color:var(--ui-success)]">{statusMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Google Account</CardTitle>
            <CardDescription>Connect the Google account used for project repository access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Status</p>
              <p>{connection.connected ? "Connected" : "Not connected"}</p>
            </div>

            {connection.account ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Email</p>
                  <p>{connection.account.email || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Display Name</p>
                  <p>{connection.account.displayName || "—"}</p>
                </div>
              </>
            ) : null}

            <Button asChild>
              <a href={connectHref}>{connection.connected ? "Reconnect Google Account" : "Connect Google Account"}</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repository Folder</CardTitle>
            <CardDescription>Choose the Google Drive folder used by this project repository.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Linked Folder</p>
              <p>{repository.folderName || "No folder linked yet."}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Linked At</p>
              <p>{repository.linkedAt ? formatDateTime(repository.linkedAt) : "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openFolderPicker}
                disabled={!connection.connected || openingPicker || bindingFolder}
              >
                {openingPicker || bindingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderClosed className="mr-2 h-4 w-4" />}
                {repository.folderId ? "Change Folder" : "Select Folder"}
              </Button>

              {repository.folderUrl ? (
                <Button type="button" variant="ghost" asChild>
                  <a href={repository.folderUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Drive
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Files</CardTitle>
              <CardDescription>Browse and upload files in the linked Google Drive folder.</CardDescription>
            </div>
            {repository.folderId ? <Badge variant="secondary">Folder linked</Badge> : <Badge variant="outline">No folder linked</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[color:var(--ui-muted-foreground)]" />
              <Input
                value={filesQueryInput}
                onChange={(event) => setFilesQueryInput(event.target.value)}
                placeholder="Search repository files"
                className="pl-9"
                disabled={!repository.folderId}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!repository.folderId || loadingFiles}
              onClick={() =>
                loadFiles({
                  folderId: repository.folderId,
                  append: false,
                  query: filesQueryInput.trim(),
                })
              }
            >
              {loadingFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUploadInputChange}
              aria-hidden="true"
            />
            <Button
              type="button"
              disabled={!repository.folderId || uploadingFile}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload File
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingRepositoryState ? (
            <p className="text-sm text-[color:var(--ui-muted-foreground)]">Loading repository…</p>
          ) : !repository.folderId ? (
            <p className="text-sm text-[color:var(--ui-muted-foreground)]">
              Connect Google Drive and select a folder to start syncing files.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-[color:var(--ui-border)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.length ? (
                      files.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell className="max-w-[320px] truncate font-medium">{file.name || "Untitled"}</TableCell>
                          <TableCell>{file.mimeType || "—"}</TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{formatDateTime(file.modifiedTime) || "—"}</TableCell>
                          <TableCell className="text-right">
                            {file.webViewLink ? (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={file.webViewLink} target="_blank" rel="noreferrer">
                                  Open
                                </a>
                              </Button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-20 text-center text-[color:var(--ui-muted-foreground)]">
                          {loadingFiles ? "Loading files..." : "No files found in this folder."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {canLoadMore ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={loadingMoreFiles}
                  onClick={() =>
                    loadFiles({
                      folderId: repository.folderId,
                      append: true,
                      pageToken: nextPageToken,
                      query: activeFilesQuery,
                    })
                  }
                >
                  {loadingMoreFiles ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loadingMoreFiles ? "Loading..." : "Load More"}
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
