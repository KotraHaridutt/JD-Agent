import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, BrainCircuit, CheckCircle2 } from 'lucide-react';

interface ProgressTrackerProps {
  currentStep: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
  const steps = [
    { key: '1/3', label: 'Parsing Resume', icon: <BrainCircuit size={16} /> },
    { key: '2/3', label: 'Fetching JDs & Analyzing', icon: <Search size={16} /> },
    { key: '3/3', label: 'Synthesizing Report', icon: <Loader2 size={16} className="animate-spin" /> }
  ];

  let activeIndex = 0;
  if (currentStep.includes('2/3')) activeIndex = 1;
  if (currentStep.includes('3/3')) activeIndex = 2;
  if (currentStep === 'Done') activeIndex = 3;

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="glass rounded-2xl p-5"
    >
      <div className="text-sm font-medium mb-4 flex items-center justify-between">
        <span className="text-zinc-300">Agent Status</span>
        <span className="text-primary-400 text-xs px-2 py-1 bg-primary-500/10 rounded-full border border-primary-500/20">
          Running
        </span>
      </div>
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-1 border \${
                isPast ? 'bg-primary-500/20 border-primary-500/50 text-primary-500' :
                isActive ? 'bg-zinc-700 border-zinc-500 text-zinc-100 animate-pulse' :
                'bg-background border-border text-zinc-600'
              }`}>
                {isPast ? <CheckCircle2 size={16} /> : step.icon}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium \${
                  isActive || isPast ? 'text-zinc-200' : 'text-zinc-600'
                }`}>
                  {step.label}
                </p>
                {isActive && currentStep !== 'Done' && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="text-xs text-primary-400/80 mt-1"
                  >
                    {currentStep}
                  </motion.p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ProgressTracker;
