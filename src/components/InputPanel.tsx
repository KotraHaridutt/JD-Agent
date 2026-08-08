import React, { useState } from 'react';
import { Play, FileText, Building2, UserCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface InputPanelProps {
  onAnalyze: (resume: string, companies: string[], role: string, timeline: string) => void;
  isLoading: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({ onAnalyze, isLoading }) => {
  const [resume, setResume] = useState('');
  const [companiesStr, setCompaniesStr] = useState('Google, Razorpay, Swiggy');
  const [role, setRole] = useState('Backend SDE');
  const [timeline, setTimeline] = useState('2 weeks');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume.trim() || !companiesStr.trim() || !role.trim() || !timeline.trim()) return;
    
    const companies = companiesStr.split(',').map(s => s.trim()).filter(Boolean);
    onAnalyze(resume, companies, role, timeline);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <FileText size={20} className="text-primary-500" />
        Configure Analysis
      </h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <UserCircle size={14} /> Resume (Text)
          </label>
          <textarea
            required
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            className="w-full h-40 bg-background/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all resize-none placeholder-zinc-600"
            placeholder="Paste your raw resume text here..."
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
            <Building2 size={14} /> Target Companies
          </label>
          <input
            required
            type="text"
            value={companiesStr}
            onChange={(e) => setCompaniesStr(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all placeholder-zinc-600"
            placeholder="e.g. Google, Stripe, Notion"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role</label>
            <input
              required
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
              placeholder="e.g. Frontend Engineer"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Clock size={14} /> Timeline
            </label>
            <input
              required
              type="text"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
              placeholder="e.g. 1 month"
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !resume}
          className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20 mt-6"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Agents Running...
            </span>
          ) : (
            <>
              <Play size={18} />
              Run Analysis
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};

export default InputPanel;
