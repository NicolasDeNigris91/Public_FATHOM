export default function StageLoading() {
  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-12">
            <div className="h-3 w-12 bg-mist/30" />
            <div className="h-3 w-2 bg-mist/20" />
            <div className="h-3 w-16 bg-mist/30" />
            <div className="h-3 w-2 bg-mist/20" />
            <div className="h-3 w-14 bg-mist/40" />
          </div>

          <div className="h-3 w-24 bg-mist/30 mb-3" />
          <div className="h-16 w-1/2 bg-mist/30 mb-2" />
          <div className="h-3 w-1/3 bg-mist/30 mb-6" />
          <div className="h-px w-32 bg-gold-leaf/40 mb-10" />
          <div className="h-5 w-2/3 bg-mist/20 mb-4" />
          <div className="h-5 w-1/2 bg-mist/20 mb-16" />

          <div className="h-3 w-32 bg-mist/30 mb-6" />

          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[80px_1fr_auto] md:grid-cols-[100px_1fr_180px_60px]
                           gap-4 md:gap-8 py-5 border-b border-mist/30"
              >
                <div className="h-3 w-12 bg-mist/30" />
                <div className="h-4 w-3/4 bg-mist/20" />
                <div className="hidden md:block h-3 w-24 bg-mist/30 ml-auto" />
                <div className="h-4 w-4 bg-mist/30 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
