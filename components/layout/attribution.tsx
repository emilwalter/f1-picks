"use client";

export function Attribution() {
  return (
    <footer className="mt-auto border-t border-border bg-background py-4">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs text-muted-foreground">
          Data provided by{" "}
          <a
            href="https://f1-connect-api.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline transition-colors hover:text-primary"
          >
            F1 Connect API
          </a>
        </p>
      </div>
    </footer>
  );
}
