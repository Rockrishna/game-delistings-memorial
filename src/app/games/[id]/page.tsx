import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";
import { getGameDetailById } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGameDetailById(id);
  if (!game) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0f1320]">
      <section className="py-12 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="w-full aspect-[2/3] bg-[#171d2e] border border-[#2a3248] rounded-lg overflow-hidden">
                {game.coverUrl ? (
                  <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#95a0c3]">
                    Game Cover
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <Badge label={game.status} variant={game.status} />
              </div>
              <div>
                <h1 className="text-5xl font-bold text-[#f4f6ff] mb-2">{game.title}</h1>
                <p className="text-[#c9d0e8]">
                  Released{" "}
                  {game.releaseDate
                    ? new Date(game.releaseDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
              <p className="text-lg text-[#c9d0e8]">{game.summary ?? "No summary available."}</p>

              <div className="grid grid-cols-2 gap-4">
                <Card hover={false}>
                  <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">Delisted</p>
                  <p className="text-xl font-bold text-[#f4f6ff]">
                    {game.delistDate
                      ? new Date(game.delistDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Not scheduled"}
                  </p>
                </Card>
                <Card hover={false}>
                  <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">Platforms</p>
                  <p className="text-lg font-bold text-[#f4f6ff]">{game.platforms.length}</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">Genres</h3>
            <div className="space-y-2">
              {game.genres.map((genre) => (
                <div key={genre} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                  <span className="text-[#c9d0e8]">{genre}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">Reason</h3>
            <p className="text-[#c9d0e8]">{game.reason ?? "No reason has been recorded."}</p>
            {game.sourceUrl ? (
              <a
                href={game.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-[#8b5cf6] hover:text-[#9d74ff] underline text-sm"
              >
                View source
              </a>
            ) : null}
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {game.platforms.map((platform, index) => (
                <Badge
                  key={`${platform}-${index}`}
                  label={platform}
                  variant={game.platformBadges[index] ?? "default"}
                />
              ))}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
