"use client";

export function Attribution() {
  return (
    <footer className="mt-auto border-t border-white/[0.04] py-4">
      <div className="container mx-auto max-w-7xl px-4">
        <p className="text-center text-xs text-paddock-on-muted">
          Data provided by{" "}
          <a
            href="https://github.com/jolpica/jolpica-f1"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-paddock-on underline transition-colors hover:text-paddock-cyan"
          >
            Jolpica F1
          </a>
        </p>
      </div>
    </footer>
  );
}
