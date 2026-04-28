export default function Loading() {
  return (
    <section className="px-8 md:px-16 lg:px-24 pt-32 pb-24 min-h-[60vh]">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6 animate-pulse">
          <div className="h-3 w-32 bg-mist/40" />
          <div className="h-16 w-3/4 bg-mist/30" />
          <div className="h-px w-24 bg-gold-leaf/40" />
          <div className="space-y-3 mt-12">
            <div className="h-4 w-full bg-mist/20" />
            <div className="h-4 w-11/12 bg-mist/20" />
            <div className="h-4 w-5/6 bg-mist/20" />
            <div className="h-4 w-4/6 bg-mist/20" />
          </div>
        </div>
      </div>
    </section>
  );
}
