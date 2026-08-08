import React from 'react';
import { motion } from 'framer-motion';
import { CompanyReport, GapInfo } from '../../types';
import { ExternalLink, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface CompanyCardsProps {
  reports: CompanyReport[];
}

const GapItem: React.FC<{ gap: GapInfo }> = ({ gap }) => {
  const isRealGap = gap.gap_type === 'REAL_GAP';
  const isPartial = gap.gap_type === 'PARTIAL_MATCH';
  
  return (
    <div className={\`p-4 rounded-xl border \${
      isRealGap ? 'bg-red-500/5 border-red-500/20' : 
      isPartial ? 'bg-yellow-500/5 border-yellow-500/20' : 
      'bg-green-500/5 border-green-500/20'
    }\`}>
      <div className="flex items-start gap-3">
        <div className={\`mt-0.5 \${
          isRealGap ? 'text-red-400' : 
          isPartial ? 'text-yellow-400' : 
          'text-green-400'
        }\`}>
          {isRealGap ? <XCircle size={16} /> : isPartial ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <h5 className="font-semibold text-sm text-zinc-200">{gap.jd_says}</h5>
            <span className="text-xs text-zinc-500">→ means: {gap.jd_means}</span>
          </div>
          
          <p className="text-xs text-zinc-400 mb-3">You have: <span className="text-zinc-300 font-medium">{gap.candidate_has}</span></p>
          
          {(isPartial || isRealGap) && gap.bridge && (
            <div className="bg-surface/50 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-primary-400" /> 
                Bridge Plan
              </p>
              <p className="text-xs text-zinc-400 mb-2">{gap.bridge}</p>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] font-mono text-zinc-500 bg-background px-2 py-0.5 rounded">{gap.time_estimate}</span>
                <span className="text-[10px] text-primary-400 font-medium truncate max-w-[200px]" title={gap.resource}>
                  {gap.resource}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CompanyCard: React.FC<{ report: CompanyReport }> = ({ report }) => {
  const getFitStyle = (label: string) => {
    switch(label) {
      case 'APPLY_NOW': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'APPLY NOW' };
      case 'APPLY_AFTER_PREP': return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'PREP NEEDED' };
      case 'SKIP': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'SKIP' };
      default: return { color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', text: label };
    }
  };

  const fit = getFitStyle(report.fit_label);

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="p-6 border-b border-border/50 bg-surface/50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {report.company}
              {report.jd_url !== 'simulated' && (
                <a href={report.jd_url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-primary-400 transition-colors">
                  <ExternalLink size={16} />
                </a>
              )}
            </h3>
            <p className="text-sm text-zinc-400">{report.role}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={\`text-xs font-bold px-3 py-1 rounded-full border \${fit.bg} \${fit.color} \${fit.border}\`}>
              {fit.text}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              Match: <span className="text-zinc-200">{report.match_score}/10</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {report.strengths.map((strength, idx) => (
            <span key={idx} className="text-xs bg-green-500/10 text-green-400/90 border border-green-500/20 px-2 py-1 rounded-md flex items-center gap-1">
              <CheckCircle2 size={12} /> {strength}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-sm font-bold text-zinc-300 mb-4 uppercase tracking-wider">Gap Analysis</h4>
          <div className="space-y-3">
            {report.gaps.map((gap, idx) => (
              <GapItem key={idx} gap={gap} />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-zinc-300 mb-3 uppercase tracking-wider">Top 3 Actions</h4>
          <ul className="space-y-2">
            {report.top_3_actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                <span className="text-primary-500 font-bold mt-0.5">{idx + 1}.</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

const CompanyCards: React.FC<CompanyCardsProps> = ({ reports }) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      {reports.map((report, idx) => (
        <CompanyCard key={idx} report={report} />
      ))}
    </div>
  );
};

export default CompanyCards;
