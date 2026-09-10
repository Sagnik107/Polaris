import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';

export const ReportsPage = () => {
  const [downloading, setDownloading] = useState(null);

  const reportTypes = [
    {
      id: 'expeditions',
      title: 'Active Expeditions & Traverse Log',
      desc: 'Scientific mission codes, milestone completion rates, budgets, and risk assessment scores.',
    },
    {
      id: 'cargo',
      title: 'Polar Cold-Chain Cargo Manifests',
      desc: 'Tracking numbers, weights, pipeline states, origins, and delayed route logs.',
    },
    {
      id: 'inventory',
      title: 'Station Stock & Fuel Reserves Audit',
      desc: 'All inventory items, current quantities, safety thresholds, and sub-zero storage bays.',
    },
    {
      id: 'personnel',
      title: 'Overwintering Personnel & Medical Clearances',
      desc: 'Active roster, medical clearance certifications, assigned bases, and emergency contacts.',
    },
    {
      id: 'incidents',
      title: 'Emergency Incidents & Mitigation Logs',
      desc: 'Severity levels, response actions, equipment failures, and timeline triage records.',
    },
  ];

  const handleDownload = async (module) => {
    setDownloading(module);
    try {
      const res = await api.get(`/reports?module=${module}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `POLARIS_${module.toUpperCase()}_REPORT_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Report generation failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-sky-400" />
          Mission Reports & Data Export Center
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          GENERATE COMPLIANCE AUDITS, FUEL CERTIFICATES & LOGISTICS DATA EXPORTS
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((rep) => (
          <div key={rep.id} className="polar-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white font-sans">{rep.title}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{rep.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500">FORMAT: CSV SPREADSHEET</span>
              <button
                disabled={downloading === rep.id}
                onClick={() => handleDownload(rep.id)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase font-mono transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading === rep.id ? 'Generating...' : 'Export CSV'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
