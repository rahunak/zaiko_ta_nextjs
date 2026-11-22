export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      style={{ backgroundColor: '#FAF6F2' }}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: '#B8627A', borderTopColor: 'transparent' }}
      />
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
