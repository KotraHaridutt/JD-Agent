import React from 'react';
import { motion } from 'framer-motion';
import { JobAgentResult } from '../../types';
import TodayActionCard from './TodayAction';
import PriorityGapsList from './PriorityGapsList';
import CompanyCards from './CompanyCards';
import CompanyRanking from './CompanyRanking';

interface ReportPanelProps {
  report: JobAgentResult;
}

const ReportPanel: React.FC<ReportPanelProps> = ({ report }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">JDs Reviewed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.jdReports.map((item, index) => (
            <div key={index} className="rounded-xl border border-border/50 bg-background/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-100">{item.company}</div>
                  <div className="text-xs text-zinc-400">{item.role || 'Role not provided'}</div>
                </div>
                {item.jd_url !== 'simulated' ? (
                  <a href={item.jd_url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                    Open JD
                  </a>
                ) : (
                  <span className="text-xs text-zinc-500">Simulated JD</span>
                )}
              </div>
              <div className="mt-3 text-[11px] text-zinc-500 break-all">{item.jd_url}</div>
              <div className="mt-2 text-xs text-zinc-400">{item.proof_note}</div>
              {item.jd_url !== 'simulated' && (
                <a
                  href={item.jd_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-primary-400 hover:text-primary-300 underline underline-offset-2 break-all"
                >
                  {item.jd_url}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      <TodayActionCard action={report.synthesis.today_action} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityGapsList gaps={report.synthesis.priority_gaps} />
        <CompanyRanking ranking={report.synthesis.company_ranking} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Company Breakdown
        </h2>
        <CompanyCards reports={report.jdReports} />
      </div>
    </motion.div>
  );
};

export default ReportPanel;
