import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { submitLectureFeedback } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Loader2, Send, Star, CheckCircle } from 'lucide-react';

const FeedbackPage = () => {
  const { user } = useAuth();
  const [lectureName, setLectureName] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lectureName || !feedbackText || rating === 0) {
      setError('Please select a rating and fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const feedbackData = {
      studentEmail: user.email,
      lectureName,
      feedback: feedbackText,
      rating: rating,
    };

    const success = await submitLectureFeedback(feedbackData);

    if (success) {
      setMessage('Thank you for your feedback!');
      setLectureName('');
      setFeedbackText('');
      setRating(0);
    } else {
      setError('Failed to submit feedback. Please try again.');
    }
    setLoading(false);
  };

  const aiBackgroundStyle = {
    backgroundColor: '#020617',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  };

  if (message) {
    return (
      <div style={aiBackgroundStyle} className="min-h-screen text-slate-50 p-4 flex flex-col items-center justify-center">
         <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle className="w-24 h-24 text-green-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">Feedback Submitted!</h2>
            <p className="text-slate-400 mb-8">Thank you for helping us improve.</p>
            <Link to="/dashboard">
              <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
         </div>
      </div>
    )
  }

  return (
    <div style={aiBackgroundStyle} className="min-h-screen text-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 text-white">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg mb-4 shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl text-white">Lecture Feedback</CardTitle>
            <CardDescription className="text-slate-400">Share your thoughts to help us improve.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="lectureName" className="font-medium text-slate-300">Lecture Name / Topic</label>
                <Input id="lectureName" value={lectureName} onChange={(e) => setLectureName(e.target.value)} placeholder="e.g., Introduction to Machine Learning" disabled={loading} className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400" />
              </div>

              <div className="space-y-2">
                <label className="font-medium text-slate-300">Your Rating</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-8 h-8 cursor-pointer transition-colors"
                      color={star <= (hoverRating || rating) ? "#facc15" : "#475569"}
                      fill={star <= (hoverRating || rating) ? "#facc15" : "transparent"}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="feedbackText" className="font-medium text-slate-300">Your Feedback or Suggestion</label>
                <Textarea id="feedbackText" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="What did you like? What could be improved?" rows={5} disabled={loading} className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400" />
              </div>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" size="lg" disabled={loading}>
                {loading ? ( <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> ) : ( <><Send className="mr-2 h-4 w-4" /> Submit Feedback</> )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackPage;