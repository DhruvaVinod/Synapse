import { Link } from "react-router-dom";

const highlights = [
  {
    title: "Community need intake",
    text: "Convert scattered reports into structured needs with multilingual text, voice, and location capture.",
  },
  {
    title: "Volunteer matching",
    text: "Surface the best-fit volunteers using skills, availability, urgency, and proximity-oriented logic.",
  },
  {
    title: "Resource coordination",
    text: "Track food, medicines, vehicles, funds, and support tasks from detection to completion.",
  },
];

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
              Smart Resource Allocation
            </p>

            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
              Synapse
            </h1>

            <h2 className="mt-5 max-w-3xl text-2xl font-semibold leading-tight text-blue-400 md:text-4xl">
              Data-Driven Volunteer Coordination for Social Impact
            </h2>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              Synapse reframes the old grievance workflow into a live community response system.
              Capture needs, score urgency, suggest resource requirements, visualize hotspots,
              and coordinate volunteers and NGOs from a single interface.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-lg bg-[#1f4e79] px-6 py-3 font-semibold text-white transition hover:bg-[#173a5b]"
              >
                Report a Community Need
              </Link>

              <Link
                to="/complaints"
                className="rounded-lg border border-slate-600 bg-slate-900 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Open Live Need Heatmap
              </Link>

              <Link
                to="/volunteers"
                className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-6 py-3 font-semibold text-blue-200 transition hover:bg-blue-500/20"
              >
                Volunteer Hub
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40">
            <div className="grid gap-4 md:grid-cols-2">
              

              

             
<div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 md:col-span-2">
  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
    Services offered
  </p>

  <ul className="mt-4 space-y-1 text-sm text-slate-300">
    <li className="flex items-start gap-2">
      <span className="text-blue-400">•</span> Need detection
    </li>
    <li className="flex items-start gap-2">
      <span className="text-blue-400">•</span> Urgency scoring
    </li>
    <li className="flex items-start gap-2">
      <span className="text-blue-400">•</span> Volunteer matching
    </li>
    <li className="flex items-start gap-2">
      <span className="text-blue-400">•</span> Resource coordination
    </li>
    <li className="flex items-start gap-2">
      <span className="text-blue-400">•</span> Live tracking
    </li>
  </ul>
</div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
