import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Compass, Shield } from 'lucide-react';

export const AnalyticsPage = () => {
  const readinessData = [
    { month: 'Oct', score: 68 },
    { month: 'Nov', score: 74 },
    { month: 'Dec', score: 79 },
    { month: 'Jan', score: 82 },
    { month: 'Feb', score: 85 },
    { month: 'Mar', score: 87 },
  ];

  const fuelData = [
    { base: 'Maitri', stock: 18500, min: 12000 },
    { base: 'Bharati', stock: 28000, min: 8000 },
    { base: 'Himadri', stock: 6500, min: 3000 },
  ];

  const cargoStatusData = [
    { name: 'Delivered', value: 38, color: '#31d49a' },
    { name: 'InTransit', value: 14, color: '#28a9f5' },
    { name: 'Loading', value: 6, color: '#7bd0ff' },
    { name: 'Delayed', value: 2, color: '#ff6678' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-sky-400" />
          Mission Telemetry & Predictive Analytics
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          AGGREGATED POLAR EXPEDITION VELOCITIES, FUEL DRAIN RATES & CARGO LEAD TIMES
        </p>
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Readiness Trend */}
        <div className="polar-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider">
                Fleet Readiness Score Progression
              </h3>
              <p className="text-xs text-slate-400 font-mono">Monthly aggregated readiness average (%)</p>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
              +19% GAIN
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readinessData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0e2a47" />
                <XAxis dataKey="month" stroke="#6e8498" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#6e8498" domain={[50, 100]} fontSize={11} fontStyle="mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07192c', borderColor: '#28a9f5', borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#29d6b0"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#28a9f5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel Reserves Comparison */}
        <div className="polar-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider">
                Sub-Zero Diesel Reserves vs Thresholds
              </h3>
              <p className="text-xs text-slate-400 font-mono">Fuel liters by polar station (L)</p>
            </div>
            <span className="text-xs font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
              FUEL AUDIT
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0e2a47" />
                <XAxis dataKey="base" stroke="#6e8498" fontSize={11} fontStyle="mono" />
                <YAxis stroke="#6e8498" fontSize={11} fontStyle="mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07192c', borderColor: '#28a9f5', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                <Bar dataKey="stock" fill="#28a9f5" name="Current Stock (L)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="min" fill="#f6c85f" name="Safety Threshold (L)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cargo Status Distribution */}
        <div className="polar-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider">
                Supply Chain Status Distribution
              </h3>
              <p className="text-xs text-slate-400 font-mono">Total cargo manifests pipeline breakdown</p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cargoStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cargoStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#07192c', borderColor: '#28a9f5', borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Performance Indicators Summary */}
        <div className="polar-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-heading uppercase text-white tracking-wider mb-4 border-b border-slate-800 pb-2">
              Operational Efficiency Summary
            </h3>
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Mean Time to Resupply (MTTR):</span>
                <span className="text-teal-300 font-bold">4.2 Days (Sea Ice Convoy)</span>
              </div>
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Turbine Uptime Average:</span>
                <span className="text-sky-300 font-bold">99.4% Across All Bases</span>
              </div>
              <div className="p-3 rounded bg-slate-900/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Medical Clearance Compliance:</span>
                <span className="text-emerald-300 font-bold">100% Cleared (124/124)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500">
            AUTOMATED LOGISTICS ENGINE v4.0 • MONITORED BY SATELLITE TELEMETRY
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
