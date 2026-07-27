import { useEffect, useState } from "react";
import { Camera, ImageOff, Link2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MAX_AVATAR_URL_LENGTH, isSafeImageUrl } from "@/services/profile";

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

type Props = {
  name: string;
  avatarUrl: string | null;
  /** Persists the new value. Return true on success. Pass null to remove. */
  onSave: (url: string | null) => Promise<boolean>;
  disabled?: boolean;
};

/**
 * Profile picture by URL. The user pastes a link to an image on the web;
 * the server validates the scheme and length before storing it.
 */
export function AvatarPicker({ name, avatarUrl, onSave, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(avatarUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  // Reset the draft each time the dialog opens so a cancelled edit is discarded.
  useEffect(() => {
    if (open) {
      setDraft(avatarUrl ?? "");
      setError(null);
      setPreviewFailed(false);
    }
  }, [open, avatarUrl]);

  const trimmed = draft.trim();
  const showImage = Boolean(avatarUrl) && brokenSrc !== avatarUrl;
  const previewValid = trimmed.length > 0 && isSafeImageUrl(trimmed);

  async function commit(value: string | null) {
    setError(null);

    if (value !== null) {
      if (!isSafeImageUrl(value)) {
        setError("Enter a full image address starting with http:// or https://");
        return;
      }
      if (value.length > MAX_AVATAR_URL_LENGTH) {
        setError(`That address is too long (${value.length}/${MAX_AVATAR_URL_LENGTH} characters).`);
        return;
      }
    }

    setBusy(true);
    try {
      const ok = await onSave(value);
      if (ok) {
        setBrokenSrc(null);
        setOpen(false);
      } else {
        setError("Could not save the picture. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-primary text-2xl font-semibold text-white">
          {showImage ? (
            <img
              src={avatarUrl as string}
              alt={`${name} profile picture`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setBrokenSrc(avatarUrl)}
            />
          ) : (
            initialsOf(name)
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-border bg-background shadow-soft transition-colors hover:bg-accent disabled:opacity-50 focus-ring"
          aria-label="Change profile picture"
          title="Change profile picture"
        >
          <Camera className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </button>

        {brokenSrc && brokenSrc === avatarUrl && (
          <p className="absolute left-0 top-full mt-1 flex w-max items-center gap-1 text-[11px] text-destructive">
            <ImageOff className="h-3 w-3" aria-hidden="true" />
            Image failed to load
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Profile picture</DialogTitle>
            <DialogDescription>
              Paste a link to an image on the web.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-center">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-border bg-gradient-primary text-2xl font-semibold text-white">
              {previewValid && !previewFailed ? (
                <img
                  key={trimmed}
                  src={trimmed}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                initialsOf(name)
              )}
            </div>
          </div>

          {previewValid && previewFailed && (
            <p className="text-center text-xs text-destructive">
              That address did not load an image. Check the link and try again.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="avatar-url">Image address</Label>
            <div className="relative">
              <Link2
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="avatar-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com/photo.jpg"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setPreviewFailed(false);
                }}
                maxLength={MAX_AVATAR_URL_LENGTH}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Must start with http:// or https://. Max {MAX_AVATAR_URL_LENGTH} characters.
            </p>
          </div>

          <DialogFooter className="gap-2">
            {avatarUrl && (
              <Button
                variant="ghost"
                className="rounded-xl text-destructive sm:mr-auto"
                disabled={busy}
                onClick={() => commit(null)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Remove
              </Button>
            )}
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-primary"
              disabled={busy || trimmed.length === 0}
              onClick={() => commit(trimmed)}
            >
              {busy ? "Saving..." : "Save picture"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
