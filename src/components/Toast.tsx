export function Toast({ message }: { message: string }) {
  return (
    <div className="toast no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-[#3c4043] px-4 py-2.5 text-sm text-white shadow-xl">
      {message}
    </div>
  )
}
