import { useState } from "react";
import { Shield, Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import type { Role } from "@/types/admin";

export default function RolesAndPermissionsPage() {
  const [roles] = useState(() => adminService.getRoles());
  const [permissions] = useState(() => adminService.getPermissions());
  const [selectedRole, setSelectedRole] = useState<Role | null>(roles[0] ?? null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Roles &amp; Permissions</h1>
        <Button className="rounded-xl bg-gradient-primary gap-1.5">
          <Plus className="h-4 w-4" /> Create Role
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-2">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r)}
              className={`w-full rounded-xl border border-border p-4 text-left transition-colors ${
                selectedRole?.id === r.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.userCount} users</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button aria-label="Edit role" className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button aria-label="Delete role" className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{r.description}</p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="rounded-2xl border border-border bg-card shadow-soft">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-base font-semibold">{selectedRole.name} Permissions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedRole.description}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Resource</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Read</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Write</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Delete</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {permissions.map((p) => (
                      <tr key={p.resource} className="hover:bg-accent/30 transition-colors">
                        <td className="px-5 py-3 font-medium">{p.resource}</td>
                        <td className="px-4 py-3 text-center">{p.read ? <Check className="h-4 w-4 text-green-600 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}</td>
                        <td className="px-4 py-3 text-center">{p.write ? <Check className="h-4 w-4 text-green-600 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}</td>
                        <td className="px-4 py-3 text-center">{p.delete ? <Check className="h-4 w-4 text-green-600 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}</td>
                        <td className="px-4 py-3 text-center">{p.admin ? <Check className="h-4 w-4 text-green-600 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card shadow-soft">
              <p className="text-sm text-muted-foreground">Select a role to view permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
