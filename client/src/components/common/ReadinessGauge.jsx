import React from 'react';

export const ReadinessGauge = ({ score = 87, label = 'MISSION READINESS', size = 160 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getScoreColor = (val) => {
    if (val >= 80) return '#29d6b0'; // aurora
    if (val >= 60) return '#43b8ff'; // ice
    if (val >= 40) return '#f6c85f'; // warning
    return '#ff6678'; // danger
  };

  const strokeColor = getScoreColor(score);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(130, 190, 225, 0.12)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold font-mono tracking-tight text-slate-100">
            {score}%
          </span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">
            {score >= 80 ? 'Optimal' : score >= 60 ? 'Moderate' : 'At Risk'}
          </span>
        </div>
      </div>

      <span className="text-xs uppercase tracking-widest text-slate-400 font-medium mt-3">
        {label}
      </span>
    </div>
  );
};

export default ReadinessGauge;
