import { NavLink } from "react-router-dom";

const linkBase = "block rounded-lg px-4 py-3 text-sm font-medium transition";
const activeLink = "bg-[#1f4e79] text-white";
const inactiveLink = "text-slate-300 hover:bg-slate-800 hover:text-white";

function Sidebar() {
  return (
    <aside className="w-full border-r border-slate-700 bg-slate-900 md:min-h-screen md:w-72">
      <div className="border-b border-slate-700 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          Smart Resource Allocation
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">Synapse</h2>
        <p className="mt-2 text-sm text-slate-400">
          Data-driven volunteer coordination for social impact.
        </p>
      </div>

      <nav className="space-y-2 p-4">
        <NavLink
          to="/register"
          className={({ isActive }) => `${linkBase} ${isActive ? activeLink : inactiveLink}`}
        >
          Report Community Need
        </NavLink>

        <NavLink
          to="/complaints"
          className={({ isActive }) => `${linkBase} ${isActive ? activeLink : inactiveLink}`}
        >
          Live Need Heatmap
        </NavLink>

        <NavLink
          to="/track"
          className={({ isActive }) => `${linkBase} ${isActive ? activeLink : inactiveLink}`}
        >
          Track Action Status
        </NavLink>

        <NavLink
          to="/volunteers"
          className={({ isActive }) => `${linkBase} ${isActive ? activeLink : inactiveLink}`}
        >
          Volunteer Hub
        </NavLink>

        <NavLink
          to="/coordination"
          className={({ isActive }) => `${linkBase} ${isActive ? activeLink : inactiveLink}`}
        >
          Resource & Alerts Center
        </NavLink>

        <div className="pt-4">
          <div className="border-t border-slate-700 pb-3" />
          <p className="px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            NGO / Admin
          </p>
        </div>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${linkBase} ${isActive || window.location.pathname.startsWith("/admin") ? activeLink : inactiveLink}`
          }
        >
          Coordination Dashboard
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
