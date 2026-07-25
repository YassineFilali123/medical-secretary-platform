import { WifiOff } from "lucide-react";

export function NetworkError() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Connection Error</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-medium text-white shadow-soft transition-opacity hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
