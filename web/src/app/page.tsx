import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">REVENGE PROTOCOL</h1>
      <p className="text-sm text-muted">20.10 vs 18.10 — QSteelCAD v2.0.8.1 Halloween Prank Edition</p>
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="rounded bg-accent px-4 py-2 text-center text-accent-fg">
          Yönetim paneli
        </Link>
        <Link href="/play" className="rounded border border-border px-4 py-2 text-center hover:bg-surface-2">
          Senaryo (/play)
        </Link>
      </div>
    </main>
  );
}
