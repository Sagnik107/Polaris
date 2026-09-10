import React from 'react';

export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'info', // 'success', 'warning', 'danger', 'info'
  accent = 'ice',     // 'ice', 'aurora', 'danger', 'amber'
  footerText,
}) => {
  const accentGlow = {
    ice: 'from-sky-500/20 to-transparent text-sky-400 border-sky-500/30',
    aurora: 'from-teal-500/20 to-transparent text-teal-400 border-teal-500/30',
    danger: 'from-rose-500/20 to-transparent text-rose-400 border-rose-500/30',
    amber: 'from-amber-500/20 to-transparent text-amber-400 border-amber-500/30',
  }[accent] || 'from-sky-500/20 to-transparent text-sky-400 border-sky-500/30';

  const badgeColor = {
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  }[badgeType] || 'bg-sky-500/15 text-sky-300 border-sky-500/30';

  return (
    <div className="polar-card polar-card-hover p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Subtle top-right ambient glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${accentGlow} opacity-30 rounded-full blur-2xl pointer-events-none`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100 tracking-tight">{value}</span>
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          </div>
        </div>

        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border bg-slate-900/60 ${accentGlow}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        {footerText && <span className="text-slate-400">{footerText}</span>}
        {badgeText && (
          <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${badgeColor}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
