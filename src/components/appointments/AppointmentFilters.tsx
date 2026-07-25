import { Calendar, Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppointmentFilter, AppointmentStatus } from "@/types/appointment";

type AppointmentFiltersProps = {
  filters: AppointmentFilter;
  onChange: (filters: Partial<AppointmentFilter>) => void;
  doctors: { id: string; name: string; specialty: string }[];
  specialties: string[];
  showDoctorFilter?: boolean;
  showSpecialtyFilter?: boolean;
  showDateFilter?: boolean;
};

const STATUS_OPTIONS: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function AppointmentFilters({
  filters,
  onChange,
  doctors,
  specialties,
  showDoctorFilter = true,
  showSpecialtyFilter = true,
  showDateFilter = true,
}: AppointmentFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search patients, doctors..."
            className="h-10 rounded-xl pl-9"
          />
        </div>

        <Select value={filters.status} onValueChange={(v) => onChange({ status: v as AppointmentStatus | "all" })}>
          <SelectTrigger className="h-10 w-[160px] rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showDoctorFilter && (
          <Select value={filters.doctorId} onValueChange={(v) => onChange({ doctorId: v })}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl">
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Doctors</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showSpecialtyFilter && (
          <Select value={filters.specialty} onValueChange={(v) => onChange({ specialty: v })}>
            <SelectTrigger className="h-10 w-[180px] rounded-xl">
              <SelectValue placeholder="Specialty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showDateFilter && (
          <>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
                className="h-10 w-[160px] rounded-xl pl-9"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ dateTo: e.target.value })}
                className="h-10 w-[160px] rounded-xl pl-9"
              />
            </div>
          </>
        )}

        <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as "newest" | "oldest" })}>
          <SelectTrigger className="h-10 w-[140px] rounded-xl">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
