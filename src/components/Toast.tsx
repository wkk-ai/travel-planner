export function Toast({ message }: { message: string }) {
  return (
    <div className="toast no-print fixed bottom-24 left-1/2 z-50 max-w-[min(100vw-2rem,24rem)] -translate-x-1/2 rounded-lg bg-[#3c4043] px-4 py-2.5 text-center text-sm text-white shadow-xl sm:bottom-6 sm:max-w-none">
      {message}
    </div>
  )
}
