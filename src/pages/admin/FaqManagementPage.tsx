import { useState, useMemo } from "react";
import { Search, Plus, Edit3, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";

export default function FaqManagementPage() {
  const [faqs] = useState(() => adminService.getFaqs());
  const categories = adminService.getFaqCategories();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return faqs.filter((f) => {
      const matchesSearch = f.question.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [faqs, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">FAQ Library</h1>
        <Button className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search FAQs..." className="h-10 rounded-xl pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{f.question}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{f.category}</span>
                  {!f.active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.answer}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button aria-label="Edit FAQ" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><Edit3 className="h-4 w-4" /></button>
                <button aria-label="Toggle active" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
                  {f.active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
                <button aria-label="Delete FAQ" className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
