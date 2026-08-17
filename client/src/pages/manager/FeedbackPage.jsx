import React, { useEffect, useState } from 'react';
import { reviewApi } from '../../lib/api.js';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { useBranch } from '../../hooks/useBranch.js';
import { Select, Badge, Spinner, Empty, Textarea, Button } from '../../components/ui.jsx';
import { fmtDateTime } from '../../lib/format.js';
import { clsx } from 'clsx';

const SENTIMENT_COLORS = {
  positive: 'bg-emerald-100 text-emerald-700',
  negative: 'bg-rose-100 text-rose-700',
  mixed: 'bg-amber-100 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};

const ASPECT_LABELS = { foodQuality: 'Food', service: 'Service', speed: 'Speed', price: 'Value', menu: 'Menu' };

export default function FeedbackPage() {
  const { branch, branches, setBranch } = useBranch();
  const [reviews, setReviews] = useState(null);
  const [analyzer, setAnalyzer] = useState({ comment: '', result: null, busy: false });

  useEffect(() => {
    if (!branch) return;
    setReviews(null);
    reviewApi.list(branch)
      .then((res) => setReviews(res.data))
      .catch(() => setReviews([]));
  }, [branch]);

  const runAnalyzer = async () => {
    if (!analyzer.comment.trim()) return;
    setAnalyzer((a) => ({ ...a, busy: true }));
    try {
      const res = await reviewApi.analyze(analyzer.comment);
      setAnalyzer((a) => ({ ...a, result: res.data, busy: false }));
    } catch (e) { setAnalyzer((a) => ({ ...a, busy: false })); }
  };

  if (!reviews) return <DashboardLayout title="Customer Feedback"><Spinner /></DashboardLayout>;

  return (
    <DashboardLayout
      title="Customer Feedback"
      actions={
        <Select value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48">
          <option value="">Select branch...</option>
          {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </Select>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {reviews.length === 0 ? (
            <Empty icon="💬" title="No reviews yet" subtitle="Customer reviews with AI sentiment analysis appear here." />
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg">{"★".repeat(r.rating || 0)}<span className="text-slate-200">{"★".repeat(5 - (r.rating || 0))}</span></span>
                    <span className="text-sm font-medium">{r.customerName}</span>
                  </div>
                  <Badge className={SENTIMENT_COLORS[r.sentiment?.overall] || 'bg-slate-100'}>{r.sentiment?.overall}</Badge>
                </div>
                {r.comment && <p className="text-sm text-slate-600 mb-3">“{r.comment}”</p>}
                {r.sentiment?.summary && <p className="text-xs text-slate-400 mb-3">✨ {r.sentiment.summary}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {(r.sentiment?.aspects || []).filter((a) => a.sentiment !== 'neutral').map((a) => (
                    <span key={a.aspect} className={clsx('badge capitalize', a.sentiment === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                      {ASPECT_LABELS[a.aspect] || a.aspect}: {a.sentiment}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-300 mt-3">{fmtDateTime(r.createdAt)}</p>
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="font-bold mb-3">AI Sentiment Analyzer</p>
            <Textarea
              rows={4}
              placeholder="Paste any review text here..."
              value={analyzer.comment}
              onChange={(e) => setAnalyzer({ ...analyzer, comment: e.target.value })}
            />
            <Button className="w-full mt-3" onClick={runAnalyzer} loading={analyzer.busy}>Analyze</Button>
            {analyzer.result && (
              <div className="mt-4 bg-slate-50 rounded-xl p-4">
                <Badge className={SENTIMENT_COLORS[analyzer.result.overall]}>{analyzer.result.overall}</Badge>
                <p className="text-sm text-slate-600 mt-2">{analyzer.result.summary}</p>
                <div className="mt-2 space-y-1">
                  {(analyzer.result.aspects || []).map((a) => (
                    <div key={a.aspect} className="flex justify-between text-xs">
                      <span className="text-slate-500">{ASPECT_LABELS[a.aspect] || a.aspect}</span>
                      <span className={clsx('font-bold capitalize', a.sentiment === 'positive' ? 'text-emerald-600' : a.sentiment === 'negative' ? 'text-rose-600' : 'text-slate-500')}>
                        {a.sentiment} ({a.score}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
