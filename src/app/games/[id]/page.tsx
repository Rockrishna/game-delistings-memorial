"use client";

import Card from "@/components/common/Card";
import Badge from "@/components/common/Badge";

interface GameDetail {
  id: string;
  title: string;
  summary: string;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  publishers: string[];
  delistDate: string;
  status: "recent" | "upcoming" | "delisted";
}

// Mock game data - will be fetched from API
const mockGame: GameDetail = {
  id: "1",
  title: "The Last of Us Part II",
  summary:
    "An action-adventure game set in post-apocalyptic America. Play as Ellie and experience a powerful story of survival, revenge, and personal growth.",
  releaseDate: "2020-06-19",
  platforms: ["PlayStation 4"],
  genres: ["Action", "Adventure", "Narrative", "Thriller"],
  publishers: ["Sony Interactive Entertainment"],
  delistDate: "2024-02-01",
  status: "recent",
};

export default function GameDetailPage({ params }: { params: { id: string } }) {
  // In a real app, fetch game by params.id from API
  const game = mockGame;

  return (
    <main className="min-h-screen bg-[#0f1320]">
      {/* Hero Section with Cover */}
      <section className="py-12 px-6 border-b border-[#2a3248]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Cover Image */}
            <div className="md:col-span-1">
              <div className="w-full aspect-[2/3] bg-[#171d2e] border border-[#2a3248] rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-[#95a0c3]">
                  Game Cover
                </div>
              </div>
            </div>

            {/* Game Info */}
            <div className="md:col-span-2 space-y-6">
              <div>
                <Badge label={game.status} variant={game.status} />
              </div>

              <div>
                <h1 className="text-5xl font-bold text-[#f4f6ff] mb-2">
                  {game.title}
                </h1>
                <p className="text-[#c9d0e8]">
                  Released{" "}
                  {new Date(game.releaseDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <p className="text-lg text-[#c9d0e8]">{game.summary}</p>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card hover={false}>
                  <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">
                    Delisted
                  </p>
                  <p className="text-xl font-bold text-[#f4f6ff]">
                    {new Date(game.delistDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Card>
                <Card hover={false}>
                  <p className="text-xs text-[#95a0c3] uppercase tracking-wider mb-2">
                    Platforms
                  </p>
                  <p className="text-lg font-bold text-[#f4f6ff]">
                    {game.platforms.length}
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Info */}
      <section className="py-12 px-6 bg-[#0f1320]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Genres */}
          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">Genres</h3>
            <div className="space-y-2">
              {game.genres.map((genre) => (
                <div key={genre} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span>
                  <span className="text-[#c9d0e8]">{genre}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Publishers */}
          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">
              Publishers
            </h3>
            <div className="space-y-2">
              {game.publishers.map((pub) => (
                <div key={pub} className="text-[#c9d0e8]">
                  {pub}
                </div>
              ))}
            </div>
          </Card>

          {/* Platforms */}
          <Card>
            <h3 className="text-lg font-bold text-[#f4f6ff] mb-4">Platforms</h3>
            <div className="flex flex-wrap gap-2">
              {game.platforms.map((platform) => (
                <Badge key={platform} label={platform} variant={platform as any} />
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Preservation Notice */}
      <section className="py-12 px-6 bg-[#171d2e] border-t border-[#2a3248]">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-[#f4f6ff]">
                About This Delisting
              </h2>
              <p className="text-[#c9d0e8]">
                This game has been permanently delisted from its original platform(s). This information has been archived as part of digital preservation efforts to ensure gaming history is not forgotten.
              </p>
              <p className="text-sm text-[#95a0c3]">
                If you have additional information about this delisting, please consider contributing to preservation efforts.
              </p>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
