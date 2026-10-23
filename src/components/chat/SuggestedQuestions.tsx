import React from 'react';
import { HelpCircle, Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export const SUGGESTED_QUESTIONS = [
  'What products do you offer?',
  'Which plan is right for my business?',
  'How much does the Professional plan cost?',
  'Can I cancel my subscription?',
  'What is your refund policy?',
  'How do I contact human support?'
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  onSelectQuestion,
  disabled = false
}) => {
  return (
    <div className="w-full">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>Suggested Questions</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onSelectQuestion(q)}
            className="text-left text-xs text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md p-3 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed leading-snug group"
          >
            <span className="group-hover:text-blue-700 transition-colors font-medium">
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
