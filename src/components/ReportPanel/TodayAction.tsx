import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, Target, BookOpen } from 'lucide-react';
import { TodayAction as TodayActionType } from '../../types';

interface TodayActionProps {
  action: TodayActionType;
}

const TodayAction: React.FC<TodayActionProps> = ({ action }) => {
  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-900/40 via-surface to-surface p-8 shadow-[0_0_40px_-15px_rgba(34,197,94,0.3)]"
    >
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-primary-500/20 p-2 rounded-xl text-primary-400">
            <Zap size={24} className="fill-primary-500/50" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Today's Single Action</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-xl sm:text-2xl font-medium text-primary-50 mb-3">
              {action.what}
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {action.why}
            </p>
            
            <div className="inline-flex items-center gap-2 bg-background/50 border border-border px-4 py-3 rounded-xl w-full sm:w-auto hover:bg-background/80 transition-colors cursor-pointer group">
              <BookOpen size={18} className="text-primary-400 group-hover:text-primary-300" />
              <span className="font-medium text-zinc-200 group-hover:text-white truncate">
                {action.resource}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-background/40 border border-border/50 rounded-xl p-4">
              <div className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} /> Estimated Time
              </div>
              <div className="font-semibold text-zinc-200">{action.time}</div>
            </div>
            
            <div className="bg-background/40 border border-border/50 rounded-xl p-4">
              <div className="text-xs text-zinc-500 font-medium mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <Target size={12} /> Helps For
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {action.helps_for.map(company => (
                  <span key={company} className="text-xs bg-surface border border-border px-2 py-1 rounded-md text-zinc-300">
                    {company}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TodayAction;
