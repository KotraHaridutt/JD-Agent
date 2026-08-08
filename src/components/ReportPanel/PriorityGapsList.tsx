import React from 'react';
import { motion } from 'framer-motion';
import { PriorityGap } from '../../types';
import { AlertCircle, Clock } from 'lucide-react';

interface PriorityGapsListProps {
  gaps: PriorityGap[];
}

const PriorityGapsList: React.FC<PriorityGapsListProps> = ({ gaps }) => {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-2xl p-6"
    >
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <AlertCircle size={20} className="text-amber-500" />
        Priority Overlapping Gaps
      </h3>
      <div className="space-y-4">
        {gaps.map((gap, i) => (
          <div key={i} className="bg-background/50 border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-zinc-100">{gap.skill}</h4>
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                Rank #{gap.priority_rank}
              </span>
            </div>
            
            <p className="text-sm text-zinc-400 mb-3">{gap.action}</p>
            
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-500 bg-surface px-2 py-1 rounded-md">
                <Clock size={12} /> {gap.time_estimate}
              </div>
              <div className="flex items-center gap-1 text-zinc-500">
                Needed by: 
                {gap.companies_needing.map(c => (
                  <span key={c} className="text-zinc-300 ml-1">{c}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default PriorityGapsList;
