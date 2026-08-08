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
