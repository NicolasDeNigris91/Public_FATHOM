export default function ModuleLoading() {
  return (
    <article className="px-8 md:px-16 lg:px-24 pt-32 pb-24">
      <div className="max-w-4xl xl:max-w-6xl mx-auto">
        <div className="space-y-6 animate-pulse">
          {/* Breadcrumb skeleton */}
          <div className="flex items-center gap-2 mb-12">
            <div className="h-3 w-12 bg-mist/30" />
            <div className="h-3 w-2 bg-mist/20" />
            <div className="h-3 w-20 bg-mist/30" />
            <div className="h-3 w-2 bg-mist/20" />
            <div className="h-3 w-10 bg-mist/40" />
          </div>

          {/* Header skeleton */}
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="h-3 w-48 bg-mist/30" />
            <div className="h-7 w-24 bg-mist/30" />
          </div>
          <div className="h-16 w-3/4 bg-mist/30 mb-4" />
          <div className="h-px w-32 bg-gold-leaf/40 mb-8" />

          {/* Metadata skeleton */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-12">
            <div className="h-3 w-24 bg-mist/30" />
            <div className="h-3 w-32 bg-mist/30" />
            <div className="h-3 w-28 bg-mist/30" />
          </div>

          {/* Prereqs skeleton */}
          <div className="flex flex-wrap gap-3 mb-12">
            <div className="h-7 w-16 bg-mist/30" />
            <div className="h-7 w-12 bg-mist/30" />
            <div className="h-7 w-12 bg-mist/30" />
          </div>

          {/* Body skeleton */}
          <div className="space-y-3 mt-12">
            <div className="h-5 w-1/3 bg-mist/40 mb-4" />
            <div className="h-4 w-full bg-mist/20" />
            <div className="h-4 w-11/12 bg-mist/20" />
            <div className="h-4 w-5/6 bg-mist/20" />
            <div className="h-4 w-4/6 bg-mist/20" />
          </div>

          <div className="space-y-3 mt-12">
            <div className="h-5 w-1/4 bg-mist/40 mb-4" />
            <div className="h-4 w-full bg-mist/20" />
            <div className="h-4 w-10/12 bg-mist/20" />
            <div className="h-32 w-full bg-graphite border border-mist/40 mt-6" />
          </div>
        </div>
      </div>
    </article>
  );
}
