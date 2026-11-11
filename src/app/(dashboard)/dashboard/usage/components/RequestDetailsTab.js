"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Select from "@/shared/components/Select";
import Drawer from "@/shared/components/Drawer";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";
import Icon from "@/shared/components/Icon";

let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) {
    return { providerNameCache, providerNodesCache };
  }

  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};

  for (const node of nodes) {
    providerNodesCache[node.id] = node.name;
  }

  providerNameCache = {
    ...AI_PROVIDERS,
    ...providerNodesCache
  };

  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId) return providerId;
  if (!cache) return providerId;

  const cached = cache[providerId];

  if (typeof cached === 'string') {
    return cached;
  }

  if (cached?.name) {
    return cached.name;
  }

  const providerConfig = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return providerConfig?.name || providerId;
}

function CollapsibleSection({ title, children, defaultOpen = false, icon = null }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rounded-lg border border-card-border overflow-hidden">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-3 hover:bg-background-gray-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <Icon name={icon} className="size-4.5 text-text-tertiary" />}
          <span className="text-sm font-semibold text-text-primary">{title}</span>
        </div>
        <Icon name="chevron_right" className={cn(
 " size-5 text-text-tertiary transition-transform duration-200",
 isOpen ? "rotate-90" : ""
 )} />
      </button>
      
      {isOpen && (
        <div className="border-t border-card-border p-4">
          {children}
        </div>
      )}
    </div>
  );
}

function getCachedTokens(tokens) {
  return tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
}

function getCacheCreationTokens(tokens) {
  return tokens?.cache_creation_input_tokens || 0;
}

function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  // Canonical storage keeps prompt cache-inclusive. Legacy Claude rows may have
  // stored prompt cache-exclusive; fall back to cache when it's larger so old
  // rows don't under-report input.
  const cache = getCachedTokens(tokens);
  return prompt < cache ? cache : prompt;
}

export default function RequestDetailsTab() {
  const [details, setDetails] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [providerNameCache, setProviderNameCache] = useState(null);
  const [filters, setFilters] = useState({
    provider: "",
    startDate: "",
    endDate: ""
  });

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/providers");
      const data = await res.json();
      setProviders(data.providers || []);

      const cache = await fetchProviderNames();
      setProviderNameCache(cache.providerNameCache);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      });
      if (filters.provider) params.append("provider", filters.provider);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/usage/request-details?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      const data = await res.json();
      if (cancelled) return;

      setDetails(data.details || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      if (cancelled || controller.signal.aborted) return;
      console.error("Failed to fetch request details:", err);
      setError("Failed to load request details");
      setDetails([]);
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pagination.page, pagination.pageSize, filters]);

  useEffect(() => {
    queueMicrotask(fetchProviders);
  }, [fetchProviders]);

  useEffect(() => {
    let cleanup;
    queueMicrotask(() => { cleanup = fetchDetails(); });
    return () => cleanup?.();
  }, [fetchDetails]);

  const handleViewDetail = (detail) => {
    setSelectedDetail(detail);
    setIsDrawerOpen(true);
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, pageSize: newPageSize, page: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({ provider: "", startDate: "", endDate: "" });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card padding="md">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Select
              id="provider-filter"
              label="Provider"
              value={filters.provider}
              onChange={(v) => setFilters({ ...filters, provider: v })}
              options={[
                { value: "", label: "All Providers" },
                ...providers.map((provider) => ({ value: provider.id, label: provider.name })),
              ]}
              className="w-full"
              buttonClassName="w-full"
            />
          </div>
          
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="start-date-filter" className="text-sm font-medium text-text-primary">Start Date</label>
            <input
              id="start-date-filter"
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className={cn(
                "h-10 w-full min-w-0 rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none focus:border-primary-500"
              )}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="end-date-filter" className="text-sm font-medium text-text-primary">End Date</label>
            <input
              id="end-date-filter"
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className={cn(
                "h-10 w-full min-w-0 rounded-lg border border-input-border bg-card-background px-3 text-sm text-text-primary outline-none focus:border-primary-500"
              )}
            />
          </div>
          
          <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
            <span className="hidden text-sm font-medium text-text-primary opacity-0 lg:block" aria-hidden="true">Clear</span>
            <Button 
              variant="ghost" 
              onClick={handleClearFilters}
              disabled={!filters.provider && !filters.startDate && !filters.endDate}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Provider</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Input Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Cached</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Cache Creation</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-text-tertiary">Output Tokens</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-text-tertiary">Latency</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-text-tertiary">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-sm text-text-tertiary">
                    <div className="flex items-center justify-center gap-2">
                      <Icon name="progress_activity" className="animate-spin size-5" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-sm text-error-500">
                    {error}
                  </td>
                </tr>
              ) : details.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-sm text-text-tertiary">
                    No request details found
                  </td>
                </tr>
              ) : (
                details.map((detail, index) => (
                  <tr
                    key={`${detail.id}-${index}`}
                    className="border-b border-card-border last:border-b-0 hover:bg-background-gray-primary transition-colors"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-text-primary">
                      {new Date(detail.timestamp).toLocaleString()}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 font-mono text-sm text-text-primary">
                      {detail.model}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3 text-sm text-text-primary">
                       <span className="font-medium">
                         {getProviderName(detail.provider, providerNameCache)}
                       </span>
                     </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                      {getInputTokens(detail.tokens).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                      {getCachedTokens(detail.tokens) > 0 ? getCachedTokens(detail.tokens).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                      {getCacheCreationTokens(detail.tokens) > 0 ? getCacheCreationTokens(detail.tokens).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-text-primary">
                      {detail.tokens?.completion_tokens?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-tertiary">
                      <div className="flex flex-col gap-0.5">
                        <div>TTFT: <span className="font-mono">{detail.latency?.ttft || 0}ms</span></div>
                        <div>Total: <span className="font-mono">{detail.latency?.total || 0}ms</span></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(detail)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && details.length > 0 && (
          <div className="border-t border-card-border">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </Card>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Request Details"
        width="lg"
      >
        {selectedDetail && (
          <div className="space-y-6">
            <div className="grid min-w-0 grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-text-tertiary">ID:</span>{" "}
                <span className="break-all font-mono text-text-primary">{selectedDetail.id}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Timestamp:</span>{" "}
                <span className="text-text-primary">{new Date(selectedDetail.timestamp).toLocaleString()}</span>
              </div>
              <div>
                 <span className="text-text-tertiary">Provider:</span>{" "}
                 <span className="font-medium text-text-primary">{getProviderName(selectedDetail.provider, providerNameCache)}</span>
               </div>
              <div>
                <span className="text-text-tertiary">Model:</span>{" "}
                <span className="font-mono text-text-primary">{selectedDetail.model}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Status:</span>{" "}
                <span className={cn(
                  "font-medium",
                  selectedDetail.status === "success" ? "text-success-500" : "text-error-500"
                )}>
                  {selectedDetail.status}
                </span>
              </div>
              <div>
                <span className="text-text-tertiary">Latency:</span>{" "}
                <span className="font-mono text-text-primary">
                  TTFT {selectedDetail.latency?.ttft || 0}ms / Total {selectedDetail.latency?.total || 0}ms
                </span>
              </div>
              <div>
                <span className="text-text-tertiary">Input Tokens:</span>{" "}
                <span className="font-mono text-text-primary">
                  {getInputTokens(selectedDetail.tokens).toLocaleString()}
                </span>
              </div>
              {getCachedTokens(selectedDetail.tokens) > 0 && (
                <div>
                  <span className="text-text-tertiary">Cached Tokens:</span>{" "}
                  <span className="font-mono text-text-primary">
                    {getCachedTokens(selectedDetail.tokens).toLocaleString()}
                  </span>
                </div>
              )}
              {getCacheCreationTokens(selectedDetail.tokens) > 0 && (
                <div>
                  <span className="text-text-tertiary">Cache Creation:</span>{" "}
                  <span className="font-mono text-text-primary">
                    {getCacheCreationTokens(selectedDetail.tokens).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-text-tertiary">Output Tokens:</span>{" "}
                <span className="font-mono text-text-primary">
                  {selectedDetail.tokens?.completion_tokens?.toLocaleString() || 0}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <CollapsibleSection title="1. Client Request (Input)" defaultOpen={true} icon="input">
                <pre className="max-h-[300px] max-w-full overflow-auto rounded-lg border border-card-border bg-background-gray-primary p-3 font-mono text-xs text-text-primary sm:p-4">
                  {JSON.stringify(selectedDetail.request, null, 2)}
                </pre>
              </CollapsibleSection>

              {selectedDetail.providerRequest && (
                <CollapsibleSection title="2. Provider Request (Translated)" icon="translate">
                  <pre className="max-h-[300px] max-w-full overflow-auto rounded-lg border border-card-border bg-background-gray-primary p-3 font-mono text-xs text-text-primary sm:p-4">
                    {JSON.stringify(selectedDetail.providerRequest, null, 2)}
                  </pre>
                </CollapsibleSection>
              )}

              {selectedDetail.providerResponse && (
                <CollapsibleSection title="3. Provider Response (Raw)" icon="data_object">
                  <pre className="max-h-[300px] max-w-full overflow-auto rounded-lg border border-card-border bg-background-gray-primary p-3 font-mono text-xs text-text-primary sm:p-4">
                    {typeof selectedDetail.providerResponse === 'object'
                      ? JSON.stringify(selectedDetail.providerResponse, null, 2)
                      : selectedDetail.providerResponse
                    }
                  </pre>
                </CollapsibleSection>
              )}
              
              <CollapsibleSection title="4. Client Response (Final)" defaultOpen={true} icon="output">
                {selectedDetail.response?.thinking && (
                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      <Icon name="psychology" className="size-4" />
                      Thinking Process
                    </h4>
                    <pre className="max-h-[200px] max-w-full overflow-auto rounded-lg border border-warning-500/20 bg-warning-500/5 p-3 font-mono text-xs text-text-primary sm:p-4">
                      {selectedDetail.response.thinking}
                    </pre>
                  </div>
                )}
                
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Content
                </h4>
                <pre className="max-h-[300px] max-w-full overflow-auto rounded-lg border border-card-border bg-background-gray-primary p-3 font-mono text-xs text-text-primary sm:p-4">
                  {selectedDetail.response?.content || "[No content]"}
                </pre>
              </CollapsibleSection>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
