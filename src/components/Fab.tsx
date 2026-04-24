export default function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="練習を記録する"
      className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-rose-500 rounded-full shadow-lg shadow-rose-300 flex items-center justify-center active:scale-95 transition-transform"
    >
      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
