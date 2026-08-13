import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Search,
  Brain,
  MessageSquare,
  ChevronRight,
  Calendar,
  Filter,
  Loader2,
  UserCheck,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useDebounced } from "@/hooks/useDebounced";
import { useDoctorConversationsQuery } from "@/hooks/queries/useDoctorQueries";
import type { AiConversationStatus } from "@/types/doctor";

const STATUS_CONFIG: Record<AiConversationStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  closed: { label: "Closed", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  transferred: { label: "Transferred", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  waiting: { label: "Waiting", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

/** Who spoke last, so the preview line is not ambiguous. */
const SPEAKER_LABEL: Record<string, string> = {
  patient: "Patient",
  ai: "AI",
  secretary: "Secretary",
};

export default function AiConversationsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  const debouncedSearch = useDebounced(search, 300);


  // Filters are applied by the server. The doctor's browser is never sent
  // conversations outside their own patients, filtered or not. The filters are
  // part of the query key, so each combination is cached separately and going
  // back to a previous filter is instant.
  const {
    data: conversations = [],
    isPending: loading,
    error: queryError,
    refetch,
  } = useDoctorConversationsQuery({ q: debouncedSearch, date: dateFilter, status: statusFilter });

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Could not load AI conversations."
        : null;

  const hasActiveFilters = Boolean(search || statusFilter !== "all" || dateFilter);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : `${conversations.length} ${
                  conversations.length === 1 ? "conversation" : "conversations"
                } from your patients`}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name..."
            className="h-10 rounded-xl pl-9 pr-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              className="h-10 rounded-xl pl-9 w-44"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <select
            className="flex h-10 w-36 rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="transferred">Transferred</option>
            <option value="waiting">Waiting</option>
          </select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-10 rounded-xl" onClick={clearFilters}>
              <Filter className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Conversation list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading conversations…
        </div>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No conversations found"
          message={
            hasActiveFilters
              ? "Try adjusting your search or filters."
              : "None of your patients have used the AI assistant yet."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conv) => {
            const statusCfg = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.closed;
            const speaker = conv.lastMessageBy ? SPEAKER_LABEL[conv.lastMessageBy] : null;

            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/doctor/ai-conversations/${conv.id}`)}
                className="group rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{conv.patientName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{conv.date}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`shrink-0 text-[11px] font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </Badge>
                </div>

                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {speaker && <span className="font-medium">{speaker}: </span>}
                  {conv.lastMessage}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {conv.messageCount} messages
                    </span>
                    {conv.secretaryName && (
                      <span className="flex items-center gap-1.5" title={`Handled by ${conv.secretaryName}`}>
                        <UserCheck className="h-3.5 w-3.5" />
                        {conv.secretaryName}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
