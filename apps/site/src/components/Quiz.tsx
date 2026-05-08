'use client';

import { useId, useMemo, useState } from 'react';
import { Check, X, RotateCw, Award } from 'lucide-react';
import { markCompleted, readProgress, writeProgress } from '@/lib/visitor-progress';

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explanation?: string;
}

interface Props {
  rawId: string;
  questions: QuizQuestion[];
}

type Phase = 'answering' | 'reviewing-pass' | 'reviewing-fail';

export function Quiz({ rawId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<Phase>('answering');
  const headingId = useId();

  const total = questions.length;
  const correctCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < total; i += 1) {
      if (answers[i] === questions[i].correct) n += 1;
    }
    return n;
  }, [answers, questions, total]);

  const allAnswered = Object.keys(answers).length === total;

  function handleSelect(qIdx: number, optIdx: number) {
    if (phase !== 'answering') return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  }

  function handleSubmit() {
    if (!allAnswered) return;
    if (correctCount === total) {
      writeProgress(markCompleted(readProgress(), rawId));
      setPhase('reviewing-pass');
    } else {
      setPhase('reviewing-fail');
    }
  }

  function handleRetry() {
    setAnswers({});
    setPhase('answering');
  }

  if (total === 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-16 pt-12 border-t border-mist/40"
    >
      <p className="font-mono text-caption text-racing-green-lit tracking-luxury uppercase mb-4">
        Threshold de Maestria
      </p>
      <h2
        id={headingId}
        className="font-display text-display-lg text-pearl tracking-tight leading-tight mb-2"
      >
        Quiz de conclusão
      </h2>
      <p className="font-sans text-body text-chrome leading-relaxed mb-10 max-w-3xl">
        Acerte todas as {total} pra marcar o módulo como concluído. Sem pressa, sem timer.
        Tudo fica salvo no teu navegador.
      </p>

      <ol className="space-y-10">
        {questions.map((question, qIdx) => {
          const selected = answers[qIdx];
          const showResult = phase !== 'answering';
          const isCorrect = showResult && selected === question.correct;

          return (
            <li key={qIdx} className="space-y-4">
              <p className="font-sans text-body-lg text-pearl leading-relaxed">
                <span className="font-mono text-caption text-chrome tracking-luxury uppercase mr-3">
                  Q{qIdx + 1}
                </span>
                {question.q}
              </p>
              <div role="radiogroup" aria-label={`Opções da pergunta ${qIdx + 1}`} className="space-y-2">
                {question.options.map((opt, optIdx) => {
                  const checked = selected === optIdx;
                  const isThisCorrect = showResult && optIdx === question.correct;
                  const isThisWrongPick = showResult && checked && !isThisCorrect;

                  let tone = 'border-mist/50 text-chrome hover:border-platinum hover:text-platinum';
                  if (showResult && isThisCorrect) {
                    tone = 'border-racing-green-lit text-racing-green-lit';
                  } else if (isThisWrongPick) {
                    tone = 'border-rose-500/60 text-rose-300';
                  } else if (checked) {
                    tone = 'border-gold-leaf text-gold-leaf';
                  }

                  return (
                    <label
                      key={optIdx}
                      className={`flex items-start gap-3 px-4 py-3 border cursor-pointer transition-colors duration-200 ${tone} ${
                        showResult ? 'cursor-default' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${qIdx}-${rawId}`}
                        value={optIdx}
                        checked={checked}
                        onChange={() => handleSelect(qIdx, optIdx)}
                        disabled={showResult}
                        className="mt-1 accent-gold-leaf"
                      />
                      <span className="font-sans text-body leading-relaxed flex-1">{opt}</span>
                      {showResult && isThisCorrect && (
                        <Check size={16} strokeWidth={1.5} aria-label="Resposta correta" />
                      )}
                      {isThisWrongPick && (
                        <X size={16} strokeWidth={1.5} aria-label="Sua escolha estava errada" />
                      )}
                    </label>
                  );
                })}
              </div>
              {showResult && question.explanation && (
                <p
                  className={`font-sans text-body text-chrome leading-relaxed pl-4 border-l-2 ${
                    isCorrect ? 'border-racing-green-lit/40' : 'border-rose-500/40'
                  }`}
                >
                  {question.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 flex flex-wrap items-center gap-4" aria-live="polite">
        {phase === 'answering' && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="inline-flex items-center gap-2 px-6 py-3 border border-gold-leaf text-gold-leaf
                       font-mono text-caption tracking-luxury uppercase
                       hover:bg-gold-leaf hover:text-obsidian transition-colors duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gold-leaf"
          >
            <Award size={14} strokeWidth={1.5} />
            Enviar respostas
          </button>
        )}
        {phase === 'reviewing-pass' && (
          <p className="inline-flex items-center gap-2 font-mono text-caption text-racing-green-lit tracking-luxury uppercase">
            <Check size={14} strokeWidth={1.5} />
            {correctCount} de {total} — módulo marcado como concluído
          </p>
        )}
        {phase === 'reviewing-fail' && (
          <>
            <p className="font-mono text-caption text-rose-300 tracking-luxury uppercase">
              {correctCount} de {total} — releia as marcadas e tente de novo
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 border border-mist/50 text-chrome
                         font-mono text-caption tracking-luxury uppercase
                         hover:border-platinum hover:text-platinum transition-colors duration-200"
            >
              <RotateCw size={14} strokeWidth={1.5} />
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </section>
  );
}
