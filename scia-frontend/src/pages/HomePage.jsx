import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">
          Public Grievance Portal
        </p>

        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          UrbanMind
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          Report civic issues through text, image, and voice. Track complaints
          using a reference number and view registered complaints on a live map.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to="/register"
            className="rounded-lg bg-[#1f4e79] px-6 py-3 font-semibold text-white transition hover:bg-[#173a5b]"
          >
            Start with Complaint
          </Link>

          <Link
            to="/complaints"
            className="rounded-lg border border-slate-600 bg-slate-900 px-6 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            View Map & Complaints
          </Link>
          <Link
            to="/admin"
            className="rounded-lg border border-slate-700 bg-slate-950 px-6 py-3 font-semibold text-slate-500 transition hover:text-slate-300 hover:border-slate-500 text-sm"
          >
            Admin
          </Link>
        </div>
      </div>
    </div>
  );
}

export default HomePage;