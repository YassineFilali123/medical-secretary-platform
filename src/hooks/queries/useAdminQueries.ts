import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminUserService,
  type AdminUserFilters,
  type AdminUserRole,
  type AdminUserStatus,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/services/admin-users";
import { adminStatisticsService, type StatsQuery } from "@/services/admin-statistics";
import {
  adminAiService,
  type FaqInput,
  type ScenarioInput,
} from "@/services/admin-ai";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query bindings for the admin endpoints.
 *
 * Every one is admin-only server-side; these hooks add caching, not access.
 *
 * Invalidation rule of thumb: a write invalidates its own domain plus anything
 * that counts it. Creating a user changes the role summary AND the statistics
 * head counts, so both go — a dashboard showing a user count one short of the
 * list beside it is exactly the kind of drift this migration is meant to end.
 */

// ── Users ───────────────────────────────────────────────────────────────────

export function useAdminUsersQuery(filters: AdminUserFilters = {}) {
  return useQuery({
    queryKey: queryKeys.adminUsers.list(filters as Record<string, unknown>),
    queryFn: () => adminUserService.list(filters),
  });
}

export function useAdminUserQuery(id: number | null) {
  return useQuery({
    queryKey: queryKeys.adminUsers.detail(id ?? 0),
    queryFn: () => adminUserService.detail(id as number),
    enabled: id !== null && Number.isInteger(id) && id > 0,
    retry: false,
  });
}

export function useRoleSummaryQuery() {
  return useQuery({
    queryKey: queryKeys.adminUsers.roleSummary(),
    queryFn: () => adminUserService.roleSummary(),
  });
}

function useInvalidateAdminUsers() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.adminUsers.all });
    // Head counts on the admin dashboard and statistics screen.
    void qc.invalidateQueries({ queryKey: queryKeys.adminStatistics.all });
  };
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => adminUserService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => adminUserService.update(input),
    onSuccess: invalidate,
  });
}

export function useSetUserStatusMutation() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdminUserStatus }) =>
      adminUserService.setStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useSetUserRoleMutation() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: AdminUserRole }) =>
      adminUserService.setRole(id, role),
    onSuccess: invalidate,
  });
}

export function useDeleteUserMutation() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: (id: number) => adminUserService.remove(id),
    onSuccess: invalidate,
  });
}

// ── Statistics ──────────────────────────────────────────────────────────────

export function useAdminStatisticsQuery(query: StatsQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminStatistics.range(query as unknown as Record<string, unknown>),
    queryFn: () => adminStatisticsService.get(query),
    enabled,
  });
}

// ── AI settings ─────────────────────────────────────────────────────────────

export function useAiSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.adminAi.settings(),
    queryFn: () => adminAiService.getSettings(),
  });
}

export function useUpdateAiSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof adminAiService.updateSettings>[0]) =>
      adminAiService.updateSettings(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.adminAi.settings() });
    },
  });
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

export function useFaqsQuery(filters: { q?: string; category?: string; status?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.adminAi.faqs(filters),
    queryFn: () => adminAiService.listFaqs(filters),
  });
}

/**
 * FAQ writes invalidate every FAQ list (all filter combinations), because a new
 * or renamed entry can move between categories and statuses.
 */
function useInvalidateFaqs() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.adminAi.all });
  };
}

export function useCreateFaqMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (input: FaqInput) => adminAiService.createFaq(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFaqMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<FaqInput> }) =>
      adminAiService.updateFaq(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleFaqMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (id: number) => adminAiService.toggleFaq(id),
    onSuccess: invalidate,
  });
}

export function useDeleteFaqMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (id: number) => adminAiService.deleteFaq(id),
    onSuccess: invalidate,
  });
}

// ── Conversation scenarios ──────────────────────────────────────────────────

export function useScenariosQuery() {
  return useQuery({
    queryKey: queryKeys.adminAi.scenarios(),
    queryFn: () => adminAiService.listScenarios(),
  });
}

export function useCreateScenarioMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (input: ScenarioInput) => adminAiService.createScenario(input),
    onSuccess: invalidate,
  });
}

export function useUpdateScenarioMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ScenarioInput> }) =>
      adminAiService.updateScenario(id, input),
    onSuccess: invalidate,
  });
}

export function useToggleScenarioMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (id: number) => adminAiService.toggleScenario(id),
    onSuccess: invalidate,
  });
}

export function useDeleteScenarioMutation() {
  const invalidate = useInvalidateFaqs();
  return useMutation({
    mutationFn: (id: number) => adminAiService.deleteScenario(id),
    onSuccess: invalidate,
  });
}
