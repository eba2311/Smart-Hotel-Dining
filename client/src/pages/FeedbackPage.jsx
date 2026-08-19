import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { orderApi, reviewApi } from '../lib/api.js';
import { guestId } from '../lib/format.js';
import { Button, Textarea, Spinner, Badge } from '../components/ui.jsx';
import { clsx } from 'clsx';

const ASPECT_LABELS = {
  foodQuality: 'Food Quality',
  service: 'Service',
  speed: 'Delivery Speed',
  price: 'Price / Value',
  menu: 'Menu',
};

export default function FeedbackPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    setFetching(true);
    orderApi.get(orderId)
      .then((res) => setOrder(res.data))
      .catch((e) => setOrderError(e.message || 'Order not found'))
      .finally(() => setFetching(false));
  }, [orderId]);

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await reviewApi.create({
        orderId,
        customerId: guestId(),
        customerName: order?.customerName || 'Guest',
        rating,
        comment,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-lg w-full text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-xl font-bold mb-1">Thank you!</h1>
          <p className="text-sm text-slate-500 mb-5">Your feedback helps us improve.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-left">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">AI Sentiment Analysis</p>
            <div className="flex items-center gap-2 mb-3">
              <Badge
                className={clsx(
                  result.sentiment?.overall === 'positive' && 'bg-emerald-100 text-emerald-700',
                  result.sentiment?.overall === 'negative' && 'bg-rose-100 text-rose-700',
                  result.sentiment?.overall === 'mixed' && 'bg-amber-100 text-amber-700',
                  (!result.sentiment || result.sentiment?.overall === 'neutral') && 'bg-slate-100 text-slate-600'
                )}
              >
                Overall: {result.sentiment?.overall || 'neutral'}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 mb-2">{result.sentiment?.summary}</p>
            <div className="grid grid-cols-2 gap-2">
              {(result.sentiment?.aspects || []).filter((a) => a.sentiment !== 'neutral').map((a) => (
                <div key={a.aspect} className="text-xs flex justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                  <span className="text-slate-500">{ASPECT_LABELS[a.aspect] || a.aspect}</span>
                  <span className={clsx('font-bold capitalize', a.sentiment === 'positive' ? 'text-emerald-600' : 'text-rose-600')}>
                    {a.sentiment}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Button className="mt-5" onClick={() => navigate('/')}>Back to menu</Button>
        </div>
      </div>
    );
  }

  if (fetching) return <Spinner label="Loading order..." />;

  if (orderError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-3">❌</div>
          <h1 className="text-xl font-bold mb-1">Order Not Found</h1>
          <p className="text-sm text-slate-500 mb-5">{orderError}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!order) return <Spinner />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950">
      <header className="bg-brand-900 text-white sticky top-0 z-30 shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-brand-800">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold">Rate Your Experience</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-500 mb-4">Order {order.orderNumber}</p>
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className={clsx(
                  'text-3xl transition-transform hover:scale-125',
                  n <= (hover || rating) ? 'text-amber-400' : 'text-slate-300'
                )}
              >
                ★
              </button>
            ))}
          </div>
          <p className="font-semibold mb-4">
            {['', 'Terrible', 'Poor', 'Good', 'Great', 'Excellent'][hover || rating] || 'How was your food?'}
          </p>
          <Textarea
            placeholder="How was your experience? e.g. 'The food was excellent but it took too long.'"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-2 text-left">
            ✨ AI will analyse your feedback for food quality, service, speed and value.
          </p>
          {error && <p className="text-sm text-rose-500 bg-rose-50 rounded-lg px-3 py-2 mt-3">{error}</p>}
          <Button className="w-full mt-5" onClick={submit} loading={loading} disabled={rating === 0}>
            Submit Review
          </Button>
        </div>
      </div>
    </div>
  );
}
