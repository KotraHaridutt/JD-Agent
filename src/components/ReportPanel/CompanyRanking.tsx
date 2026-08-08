import React from 'react';
import { motion } from 'framer-motion';
import { CompanyRankingInfo } from '../../types';
import { Trophy, ArrowRight } from 'lucide-react';

interface CompanyRankingProps {
  ranking: CompanyRankingInfo[];
}

const CompanyRanking: React.FC<CompanyRankingProps> = ({ ranking }) => {
  const getBadgeColor = (label: string) => {
    switch(label) {
      case 'APPLY_NOW': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'APPLY_AFTER_PREP': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'SKIP': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getLabelText = (label: string) => {
    return label.replace(/_/g, ' ');
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-6"
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-primary-500" />
        Application Strategy
      </h3>
      <div className="space-y-3">
        {ranking.map((rank, i) => (
          <div key={i} className="flex items-start gap-4 bg-background/50 border border-border p-3 rounded-xl">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-sm text-zinc-400">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-zinc-100 truncate">{rank.company}</h4>
                <span className={\`text-[10px] font-bold px-2 py-0.5 rounded border \${getBadgeColor(rank.fit_label)}\`}>
                  {getLabelText(rank.fit_label)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2">{rank.reason}</p>
              {rank.apply_after && rank.fit_label === 'APPLY_AFTER_PREP' && (
                <div className="mt-2 text-xs font-medium text-yellow-500/80 flex items-center gap-1">
                  <ArrowRight size={12} /> Apply after: {rank.apply_after}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CompanyRanking;
