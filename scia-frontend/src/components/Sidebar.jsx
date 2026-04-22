import { NavLink } from "react-router-dom";

const linkBase =
  "block rounded-lg px-4 py-3 text-sm font-medium transition";
const activeLink =
  "bg-[#1f4e79] text-white";
const inactiveLink =
  "text-slate-300 hover:bg-slate-800 hover:text-white";

function Sidebar() {
  return (
    <aside className="w-full border-r border-slate-700 bg-slate-900 md:min-h-screen md:w-72">
      <div className="border-b border-slate-700 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          Public Grievance Portal
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">
          UrbanMind
        </h2>
      </div>

      <nav className="space-y-2 p-4">
        <NavLink
          to="/register"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeLink : inactiveLink}`
          }
        >
          Register Complaint
        </NavLink>

        <NavLink
          to="/complaints"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeLink : inactiveLink}`
          }
        >
          Map & Registered Complaints
        </NavLink>

        <NavLink
          to="/track"
          className={({ isActive }) =>
            `${linkBase} ${isActive ? activeLink : inactiveLink}`
          }
        >
          Track by Reference
        </NavLink>

        {/* Divider */}
        <div className="pt-4">
          <div className="border-t border-slate-700 pb-3" />
          <p className="px-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Admin
          </p>
        </div>

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `${linkBase} ${isActive || window.location.pathname.startsWith("/admin") ? activeLink : inactiveLink}`
          }
        >
          Admin Dashboard
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;