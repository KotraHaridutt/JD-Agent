import { useState } from 'react';
import { runJobAgent } from './agents/jobAgent';
import { JobAgentResult } from './types';
import InputPanel from './components/InputPanel';
import ProgressTracker from './components/ProgressTracker';
import ReportPanel from './components/ReportPanel/ReportPanel';
import { Briefcase, Sparkles } from 'lucide-react';

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [report, setReport] = useState<JobAgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (resume: string, companies: string[], role: string, timeline: string) => {
    setIsAnalyzing(true);
    setReport(null);
    setError(null);
    try {
      const result = await runJobAgent(resume, companies, role, timeline, setProgressStep);
      setReport(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setProgressStep('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-zinc-100">
      <header className="border-b border-border/50 bg-surface/30 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="p-2 bg-primary-500/20 text-primary-500 rounded-xl">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Job Agent
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
                PRO
              </span>
            </h1>
            <p className="text-xs text-zinc-400">AI-Powered JD Gap Analyzer</p>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
        {!report && !isAnalyzing && (
          <div className="text-center py-12 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-sm mb-6 text-zinc-300">
              <Sparkles size={16} className="text-primary-400" />
              Powered by Multi-Agent Architecture
            </div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight">
              Stop guessing what <span className="text-gradient">recruiters</span> want.
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Paste your resume, tell us where you want to work, and our AI agents will reverse-engineer their job descriptions to give you a personalized action plan.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`${report || isAnalyzing ? 'lg:col-span-4' : 'lg:col-span-8 lg:col-start-3'}`}>
            <div className="sticky top-24">
              <InputPanel onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
              
              {isAnalyzing && (
                <div className="mt-6">
                  <ProgressTracker currentStep={progressStep} />
                </div>
              )}
              
              {error && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <p className="font-semibold mb-1">Analysis Failed</p>
                  <p>{error}</p>
                </div>
              )}
            </div>
          </div>
          
          {(report || isAnalyzing) && (
            <div className="lg:col-span-8">
              {report ? (
                <ReportPanel report={report} />
              ) : (
                <div className="h-full min-h-[500px] flex items-center justify-center border border-dashed border-border/50 rounded-2xl bg-surface/10">
                  <div className="text-center text-zinc-500 animate-pulse-slow">
                    <Sparkles size={32} className="mx-auto mb-4 opacity-50" />
                    <p>Agents are analyzing the market...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
