export default function LoadingState({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E8E4DC] rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex gap-2">
              <div className="h-3 w-16 bg-gray-100 rounded" />
              <div className="h-3 w-12 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-10 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-full mb-1.5" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ))}
    </div>
  )
}
