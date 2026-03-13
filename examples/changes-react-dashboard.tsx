/**
 * React — Changes management dashboard components and hooks.
 *
 * Client-side React components for reviewing, approving, rejecting,
 * and reverting SEO changes. Uses fetch() against your backend API
 * (which proxies to SEOJuice) so the API key stays server-side.
 *
 * Not a full app — just the core hooks and components you wire into
 * your existing React project. Styles are className placeholders.
 *
 * File structure assumed:
 *   src/hooks/useChanges.ts
 *   src/hooks/useChangeActions.ts
 *   src/components/ChangesDashboard.tsx
 *   src/components/ChangeDetailModal.tsx
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ChangeRecord, ChangeStats } from "seojuice";

// --- API base URL (your backend proxies to SEOJuice) ---

const API_BASE = "/api/seojuice";

// --- Types ---

interface ChangesFilter {
  status: string;
  change_type: string;
}

interface ChangesState {
  changes: ChangeRecord[];
  stats: ChangeStats | null;
  loading: boolean;
  error: string | null;
}

interface ChangeActionResult {
  success: boolean;
  error?: string;
}

type ChangesAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; changes: ChangeRecord[]; stats: ChangeStats }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "UPDATE_CHANGE"; change: ChangeRecord }
  | { type: "REMOVE_CHANGES"; ids: number[] };

// --- Reducer ---

function changesReducer(
  state: ChangesState,
  action: ChangesAction,
): ChangesState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        changes: action.changes,
        stats: action.stats,
        loading: false,
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };
    case "UPDATE_CHANGE":
      return {
        ...state,
        changes: state.changes.map((c) =>
          c.id === action.change.id ? action.change : c,
        ),
      };
    case "REMOVE_CHANGES":
      return {
        ...state,
        changes: state.changes.filter((c) => !action.ids.includes(c.id)),
      };
  }
}

// --- Hook: useChanges ---
// Fetches the changes list and stats for a domain. Exposes filters
// and a refresh function. The reducer keeps state consistent across
// concurrent filter changes.

function useChanges(domain: string) {
  const [state, dispatch] = useReducer(changesReducer, {
    changes: [],
    stats: null,
    loading: true,
    error: null,
  });

  const [filter, setFilter] = useState<ChangesFilter>({
    status: "pending",
    change_type: "",
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchChanges = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: "FETCH_START" });

    const params = new URLSearchParams();
    params.set("domain", domain);
    if (filter.status) params.set("status", filter.status);
    if (filter.change_type) params.set("change_type", filter.change_type);

    try {
      const [changesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/changes?${params}`, {
          signal: controller.signal,
        }),
        fetch(`${API_BASE}/changes/stats?domain=${domain}`, {
          signal: controller.signal,
        }),
      ]);

      if (!changesRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch changes");
      }

      const changesData = await changesRes.json();
      const statsData: ChangeStats = await statsRes.json();

      dispatch({
        type: "FETCH_SUCCESS",
        changes: changesData.results,
        stats: statsData,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      dispatch({
        type: "FETCH_ERROR",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, [domain, filter]);

  useEffect(() => {
    fetchChanges();
    return () => abortRef.current?.abort();
  }, [fetchChanges]);

  return { ...state, filter, setFilter, dispatch, refresh: fetchChanges };
}

// --- Hook: useChangeActions ---
// Provides approve/reject/revert/pull/verify actions and bulk operations.
// Each action calls your backend API and dispatches the result to update
// the changes list optimistically.

function useChangeActions(
  domain: string,
  dispatch: React.Dispatch<ChangesAction>,
  onComplete: () => void,
) {
  const [acting, setActing] = useState(false);

  async function callAction(
    changeId: number,
    action: string,
    body?: Record<string, unknown>,
  ): Promise<ChangeActionResult> {
    setActing(true);
    try {
      const res = await fetch(
        `${API_BASE}/changes/${changeId}/${action}?domain=${domain}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error ?? "Action failed" };
      }

      const updated: ChangeRecord = await res.json();
      dispatch({ type: "UPDATE_CHANGE", change: updated });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    } finally {
      setActing(false);
    }
  }

  const approve = (id: number) => callAction(id, "approve");

  const reject = (id: number, reason?: string) =>
    callAction(id, "reject", reason ? { reason } : undefined);

  const revert = (id: number, reason?: string) =>
    callAction(id, "revert", reason ? { reason } : undefined);

  const pull = (id: number, integration: string) =>
    callAction(id, "pull", { integration });

  const verify = (id: number, integration: string) =>
    callAction(id, "verify", { integration });

  async function bulkAction(
    action: "approve" | "reject",
    ids: number[],
    reason?: string,
  ): Promise<ChangeActionResult> {
    if (ids.length === 0) return { success: true };

    setActing(true);
    try {
      const res = await fetch(
        `${API_BASE}/changes/bulk?domain=${domain}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ids, reason }),
        },
      );

      if (!res.ok) {
        return { success: false, error: "Bulk action failed" };
      }

      dispatch({ type: "REMOVE_CHANGES", ids });
      onComplete();
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    } finally {
      setActing(false);
    }
  }

  return { approve, reject, revert, pull, verify, bulkAction, acting };
}

// --- Component: StatCard ---

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className={`stat-value stat-value--${color}`}>{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// --- Component: FilterBar ---

interface FilterBarProps {
  filter: ChangesFilter;
  onChange: (filter: ChangesFilter) => void;
}

function FilterBar({ filter, onChange }: FilterBarProps) {
  function update(field: keyof ChangesFilter, value: string) {
    onChange({ ...filter, [field]: value });
  }

  return (
    <div className="filter-bar">
      <select
        value={filter.status}
        onChange={(e) => update("status", e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="applied">Applied</option>
        <option value="pulled">Pulled</option>
        <option value="rejected">Rejected</option>
        <option value="reverted">Reverted</option>
      </select>

      <select
        value={filter.change_type}
        onChange={(e) => update("change_type", e.target.value)}
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        <option value="title_tag">Title Tag</option>
        <option value="meta_description">Meta Description</option>
        <option value="og_title">OG Title</option>
        <option value="og_description">OG Description</option>
        <option value="og_image">OG Image</option>
        <option value="structured_data">Structured Data</option>
        <option value="internal_link">Internal Link</option>
        <option value="image_alt">Image Alt</option>
        <option value="accessibility">Accessibility</option>
        <option value="meta_keywords">Meta Keywords</option>
        <option value="local_schema">Local Schema</option>
        <option value="nap_fix">NAP Fix</option>
      </select>
    </div>
  );
}

// --- Component: ChangeRow ---

interface ChangeRowProps {
  change: ChangeRecord;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onViewDetail: (change: ChangeRecord) => void;
  acting: boolean;
}

function ChangeRow({
  change,
  selected,
  onSelect,
  onApprove,
  onReject,
  onViewDetail,
  acting,
}: ChangeRowProps) {
  return (
    <tr className="change-row">
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(change.id, e.target.checked)}
          aria-label={`Select change #${change.id}`}
        />
      </td>
      <td className="change-url">
        <button
          type="button"
          onClick={() => onViewDetail(change)}
          className="change-url-link"
        >
          {change.page_url ?? "(no URL)"}
        </button>
      </td>
      <td className="change-type">{formatChangeType(change.change_type)}</td>
      <td className="change-preview">
        {truncate(change.proposed_value, 60)}
      </td>
      <td className="change-actions">
        {change.status === "pending" && (
          <>
            <button
              type="button"
              onClick={() => onApprove(change.id)}
              disabled={acting}
              className="btn btn--approve"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(change.id)}
              disabled={acting}
              className="btn btn--reject"
            >
              Reject
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onViewDetail(change)}
          className="btn btn--ghost"
        >
          Details
        </button>
      </td>
    </tr>
  );
}

// --- Component: BulkActionBar ---

interface BulkActionBarProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClearSelection: () => void;
  acting: boolean;
}

function BulkActionBar({
  selectedCount,
  onApproveAll,
  onRejectAll,
  onClearSelection,
  acting,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bulk-action-bar">
      <span className="bulk-count">
        {selectedCount} change{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <div className="bulk-actions">
        <button
          type="button"
          onClick={onApproveAll}
          disabled={acting}
          className="btn btn--approve"
        >
          Approve Selected
        </button>
        <button
          type="button"
          onClick={onRejectAll}
          disabled={acting}
          className="btn btn--reject"
        >
          Reject Selected
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="btn btn--ghost"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// --- Component: ChangeDetailModal ---

interface ChangeDetailModalProps {
  change: ChangeRecord;
  onClose: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason?: string) => void;
  onRevert: (id: number, reason?: string) => void;
  acting: boolean;
}

function ChangeDetailModal({
  change,
  onClose,
  onApprove,
  onReject,
  onRevert,
  acting,
}: ChangeDetailModalProps) {
  const [rejectReason, setRejectReason] = useState("");
  const [revertReason, setRevertReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevertForm, setShowRevertForm] = useState(false);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">
            Change #{change.id} — {formatChangeType(change.change_type)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Metadata */}
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Page URL</span>
              <span className="detail-value">
                {change.page_url ?? "(none)"}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Status</span>
              <span className="detail-value">{change.status}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Confidence</span>
              <span className="detail-value">
                {change.confidence_score != null
                  ? `${(change.confidence_score * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Created</span>
              <span className="detail-value">
                {new Date(change.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Reason */}
          {change.reason && (
            <div className="detail-section">
              <h3 className="detail-section-title">Reason</h3>
              <p className="detail-text">{change.reason}</p>
            </div>
          )}

          {/* Diff view */}
          <div className="detail-section">
            <h3 className="detail-section-title">Current Value</h3>
            <pre className="detail-code detail-code--old">
              {change.previous_value ?? "(empty)"}
            </pre>
          </div>
          <div className="detail-section">
            <h3 className="detail-section-title">Proposed Value</h3>
            <pre className="detail-code detail-code--new">
              {change.proposed_value ?? "(empty)"}
            </pre>
          </div>

          {/* Risks */}
          {change.potential_risks.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section-title">Potential Risks</h3>
              <ul className="detail-list">
                {(change.potential_risks as string[]).map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {/* SEO signals improved */}
          {change.seo_signals_improved.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section-title">SEO Signals Improved</h3>
              <ul className="detail-list">
                {(change.seo_signals_improved as string[]).map((signal, i) => (
                  <li key={i}>{signal}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div className="detail-section">
              <label className="detail-label" htmlFor="reject-reason">
                Rejection reason (optional)
              </label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="detail-textarea"
                rows={3}
              />
              <button
                type="button"
                onClick={() => {
                  onReject(change.id, rejectReason || undefined);
                  setShowRejectForm(false);
                }}
                disabled={acting}
                className="btn btn--reject"
              >
                Confirm Reject
              </button>
            </div>
          )}

          {/* Revert form */}
          {showRevertForm && (
            <div className="detail-section">
              <label className="detail-label" htmlFor="revert-reason">
                Revert reason (optional)
              </label>
              <textarea
                id="revert-reason"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                className="detail-textarea"
                rows={3}
              />
              <button
                type="button"
                onClick={() => {
                  onRevert(change.id, revertReason || undefined);
                  setShowRevertForm(false);
                }}
                disabled={acting}
                className="btn btn--reject"
              >
                Confirm Revert
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {change.status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => onApprove(change.id)}
                disabled={acting}
                className="btn btn--approve"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={acting || showRejectForm}
                className="btn btn--reject"
              >
                Reject
              </button>
            </>
          )}
          {(change.status === "applied" || change.status === "pulled") && (
            <button
              type="button"
              onClick={() => setShowRevertForm(true)}
              disabled={acting || showRevertForm}
              className="btn btn--reject"
            >
              Revert
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn--ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Component: ChangesDashboard ---

interface ChangesDashboardProps {
  domain: string;
}

function ChangesDashboard({ domain }: ChangesDashboardProps) {
  const {
    changes,
    stats,
    loading,
    error,
    filter,
    setFilter,
    dispatch,
    refresh,
  } = useChanges(domain);

  const actions = useChangeActions(domain, dispatch, refresh);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [detailChange, setDetailChange] = useState<ChangeRecord | null>(null);

  // --- Selection ---

  function toggleSelection(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(changes.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  const allSelected = useMemo(
    () => changes.length > 0 && selectedIds.size === changes.length,
    [changes, selectedIds],
  );

  // --- Render ---

  if (error) {
    return (
      <div className="error-banner" role="alert">
        Failed to load changes: {error}
        <button type="button" onClick={refresh} className="btn btn--ghost">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="changes-dashboard">
      {/* Stats cards */}
      {stats && (
        <div className="stats-grid">
          <StatCard
            label="Pending"
            value={stats.by_status.pending ?? 0}
            color="yellow"
          />
          <StatCard
            label="Applied"
            value={stats.by_status.applied ?? 0}
            color="green"
          />
          <StatCard
            label="Rejected"
            value={stats.by_status.rejected ?? 0}
            color="red"
          />
          <StatCard
            label="Reverted"
            value={stats.by_status.reverted ?? 0}
            color="gray"
          />
        </div>
      )}

      {/* Filters */}
      <FilterBar filter={filter} onChange={setFilter} />

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onApproveAll={() =>
          actions.bulkAction("approve", [...selectedIds]).then(() =>
            setSelectedIds(new Set()),
          )
        }
        onRejectAll={() =>
          actions.bulkAction("reject", [...selectedIds]).then(() =>
            setSelectedIds(new Set()),
          )
        }
        onClearSelection={() => setSelectedIds(new Set())}
        acting={actions.acting}
      />

      {/* Changes table */}
      {loading ? (
        <div className="loading-skeleton" aria-busy="true">
          Loading changes...
        </div>
      ) : changes.length === 0 ? (
        <div className="empty-state">
          <p>No changes match the current filters.</p>
        </div>
      ) : (
        <table className="changes-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  aria-label="Select all changes"
                />
              </th>
              <th>Page URL</th>
              <th>Type</th>
              <th>Proposed Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => (
              <ChangeRow
                key={change.id}
                change={change}
                selected={selectedIds.has(change.id)}
                onSelect={toggleSelection}
                onApprove={actions.approve}
                onReject={(id) => actions.reject(id)}
                onViewDetail={setDetailChange}
                acting={actions.acting}
              />
            ))}
          </tbody>
        </table>
      )}

      {/* Detail modal */}
      {detailChange && (
        <ChangeDetailModal
          change={detailChange}
          onClose={() => setDetailChange(null)}
          onApprove={actions.approve}
          onReject={actions.reject}
          onRevert={actions.revert}
          acting={actions.acting}
        />
      )}
    </div>
  );
}

// --- Helpers ---

function truncate(value: string | null, max: number): string {
  if (!value) return "(empty)";
  return value.length > max ? value.slice(0, max) + "..." : value;
}

function formatChangeType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// --- Exports ---

export {
  useChanges,
  useChangeActions,
  ChangesDashboard,
  ChangeDetailModal,
  FilterBar,
  BulkActionBar,
  StatCard,
};

// Usage:
//
//   import { ChangesDashboard } from "./changes-react-dashboard";
//
//   function App() {
//     return <ChangesDashboard domain="example.com" />;
//   }
//
// Backend API proxy (Express example):
//
//   import { SEOJuice } from "seojuice";
//   const client = new SEOJuice({ apiKey: process.env.SEOJUICE_API_KEY! });
//
//   app.get("/api/seojuice/changes", async (req, res) => {
//     const { domain, ...params } = req.query;
//     const result = await client.changes.list(domain, params);
//     res.json(result);
//   });
//
//   app.get("/api/seojuice/changes/stats", async (req, res) => {
//     const result = await client.changes.stats(req.query.domain);
//     res.json(result);
//   });
//
//   app.post("/api/seojuice/changes/:id/:action", async (req, res) => {
//     const { domain } = req.query;
//     const { id, action } = req.params;
//     const result = await client.changes[action](domain, Number(id), req.body);
//     res.json(result);
//   });
//
//   app.post("/api/seojuice/changes/bulk", async (req, res) => {
//     const { domain } = req.query;
//     const result = await client.changes.bulk(domain, req.body);
//     res.json(result);
//   });
