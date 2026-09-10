import React, { useState, useEffect } from 'react';
import { Users, Search, ShieldCheck, Phone, Award } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/common/StatusBadge';

export const PersonnelPage = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        setLoading(true);
        const res = await api.get('/personnel');
        if (res.data?.success) {
          setPersonnel(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch personnel:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPersonnel();
  }, []);

  const filtered = personnel.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.role?.toLowerCase().includes(search.toLowerCase()) ||
      p.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      p.baseName?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'All' || p.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">
            Polar Personnel & Science Roster
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            STATION OVERWINTERING CREWS, FIELD SCIENTISTS & RESCUE SPECIALISTS
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between polar-card p-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search operator name, ID, role, skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['All', 'Science', 'Operations', 'Medical', 'Command', 'Logistics'].map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 ${
                deptFilter === dept
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:bg-slate-800 border border-transparent'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Personnel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <div key={p._id || p.employeeId} className="polar-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center font-bold text-sm text-white shadow">
                    {p.name?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-sans">{p.name}</h3>
                    <span className="text-[11px] font-mono text-sky-400 block">{p.employeeId}</span>
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Role:</span>
                  <span className="text-slate-200 font-semibold">{p.role}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Department:</span>
                  <span className="text-teal-400">{p.department}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Station Deployment:</span>
                  <span className="text-slate-200">{p.baseName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Medical Status:</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {p.medicalClearance}
                  </span>
                </div>
              </div>

              {/* Skills Tags */}
              {p.skills && p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {p.emergencyContact || '+91-XXX'}
              </span>
              <span>CERTIFIED V4</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonnelPage;
