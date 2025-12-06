import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStudentEvaluation } from '../lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, Award, Star, MessageSquare, AlertCircle, Calendar, TrendingUp, BarChart3, CheckCircle, XCircle, Lightbulb, Target, BookOpen, Video, ExternalLink } from 'lucide-react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const MyEvaluationsPage = () => {
  const { user } = useAuth();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (user?.email) {
        try {
          const evalData = await getStudentEvaluation(user.email);
          setEvaluation(evalData);
        } catch (error) {
          console.error("Failed to fetch evaluation:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchEvaluation();
  }, [user]);

  // AI Themed Dark Background
  const aiBackgroundStyle = {
    backgroundColor: '#020617', // slate-950
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#22c55e'; // green-500
    if (score >= 70) return '#3b82f6'; // blue-500
    if (score >= 50) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  // Function to get the display score (totalScore for new format, score for old format)
  const getDisplayScore = (evaluation) => {
    return evaluation?.totalScore !== undefined ? evaluation.totalScore : (evaluation?.score || 0);
  };

  // Component to render text with clickable links
  const TextWithLinks = ({ text, className = "" }) => {
    if (!text) return null;

    // Enhanced URL regex that captures complete URLs
    const urlRegex = /(https?:\/\/[^\s\]]+)/g;
    const parts = text.split(urlRegex);

    return (
      <span className={className}>
        {parts.map((part, index) => {
          if (urlRegex.test(part)) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1 break-all"
              >
                {part}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            );
          }
          return part;
        })}
      </span>
    );
  };

  // Enhanced feedback parser that preserves URLs
  const parseFeedback = (feedback) => {
    if (!feedback) return null;

    const sections = {
      strengths: [],
      weaknesses: [],
      suggestions: [],
      resources: []
    };

    // First, let's split by common delimiters but preserve URLs
    // Split by periods, but be careful with URLs
    const sentences = feedback.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\!|\?)\s+/).filter(s => s.trim().length > 0);
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      // Look for strength indicators
      if (trimmed.toLowerCase().includes('strength') || 
          trimmed.toLowerCase().includes('well-organized') ||
          trimmed.toLowerCase().includes('clear') ||
          trimmed.toLowerCase().includes('readable') ||
          trimmed.toLowerCase().includes('correctly') ||
          trimmed.toLowerCase().includes('good') ||
          trimmed.toLowerCase().includes('excellent') ||
          trimmed.toLowerCase().includes('completed sections') ||
          trimmed.toLowerCase().includes('clean') ||
          trimmed.toLowerCase().includes('understanding')) {
        sections.strengths.push(trimmed);
      }
      // Look for weakness indicators
      else if (trimmed.toLowerCase().includes('weakness') ||
               trimmed.toLowerCase().includes('error') ||
               trimmed.toLowerCase().includes('minor') ||
               trimmed.toLowerCase().includes('issue') ||
               trimmed.toLowerCase().includes('problem') ||
               trimmed.toLowerCase().includes('misunderstood')) {
        sections.weaknesses.push(trimmed);
      }
      // Look for resource/video indicators (prioritize this before suggestions)
      else if (trimmed.toLowerCase().includes('video') ||
               trimmed.toLowerCase().includes('resource') ||
               trimmed.toLowerCase().includes('http') ||
               trimmed.toLowerCase().includes('www') ||
               trimmed.toLowerCase().includes('youtube') ||
               trimmed.toLowerCase().includes('geeksforgeeks')) {
        sections.resources.push(trimmed);
      }
      // Look for suggestion indicators
      else if (trimmed.toLowerCase().includes('suggest') ||
               trimmed.toLowerCase().includes('recommend') ||
               trimmed.toLowerCase().includes('should') ||
               trimmed.toLowerCase().includes('could') ||
               trimmed.toLowerCase().includes('particularly') ||
               trimmed.toLowerCase().includes('did not provide')) {
        sections.suggestions.push(trimmed);
      }
      // Default to suggestions if no clear category
      else {
        sections.suggestions.push(trimmed);
      }
    });

    return sections;
  };

  // Enhanced feedback display component
  const FeedbackDisplay = ({ feedback }) => {
    const parsedFeedback = parseFeedback(feedback);
    
    if (!parsedFeedback) return null;

    return (
      <div className="mt-4 space-y-4">
        {/* Strengths */}
        {parsedFeedback.strengths.length > 0 && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <h4 className="font-semibold text-green-300">Strengths</h4>
            </div>
            <ul className="space-y-2">
              {parsedFeedback.strengths.map((strength, idx) => (
                <li key={idx} className="text-green-100 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                  <TextWithLinks text={strength} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {parsedFeedback.weaknesses.length > 0 && (
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-orange-400" />
              <h4 className="font-semibold text-orange-300">Areas for Improvement</h4>
            </div>
            <ul className="space-y-2">
              {parsedFeedback.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-orange-100 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                  <TextWithLinks text={weakness} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {parsedFeedback.suggestions.length > 0 && (
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-blue-400" />
              <h4 className="font-semibold text-blue-300">Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {parsedFeedback.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-blue-100 text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <TextWithLinks text={suggestion} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resources */}
        {parsedFeedback.resources.length > 0 && (
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold text-purple-300">Resources</h4>
            </div>
            <ul className="space-y-3">
              {parsedFeedback.resources.map((resource, idx) => (
                <li key={idx} className="text-purple-100 text-sm flex items-start gap-2">
                  <Video className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <TextWithLinks text={resource} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={aiBackgroundStyle} className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div style={aiBackgroundStyle} className="min-h-screen text-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
        <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <header className="mb-8">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <Award className="w-8 h-8 text-indigo-400" />
                My Performance Evaluation
            </h1>
            <p className="text-slate-400 mt-2">Here is your performance summary and detailed breakdown of all evaluations.</p>
        </header>

        {evaluation ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Total Score Visualization */}
            <div className="lg:col-span-1 animate-in fade-in slide-in-from-left-8 duration-700">
              <Card className="bg-slate-900/50 border border-slate-700/50 h-full">
                <CardHeader>
                  <CardTitle className="text-center text-xl text-slate-300 flex items-center justify-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Overall Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <div className="w-40 h-40 mb-6">
                    <CircularProgressbar
                      value={getDisplayScore(evaluation)}
                      text={`${getDisplayScore(evaluation)}%`}
                      strokeWidth={8}
                      styles={buildStyles({
                        textColor: '#f8fafc', // text-slate-50
                        pathColor: getScoreColor(getDisplayScore(evaluation)),
                        trailColor: 'rgba(255, 255, 255, 0.1)',
                      })}
                    />
                  </div>
                  
                  {/* Statistics */}
                  <div className="w-full space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Evaluations:</span>
                      <span className="text-slate-200 font-semibold">
                        {evaluation.partialScores ? evaluation.partialScores.length : 1}
                      </span>
                    </div>
                    
                    {evaluation.partialScores && evaluation.partialScores.length > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Highest Score:</span>
                          <span className={`font-semibold ${getScoreColorClass(Math.max(...evaluation.partialScores.map(p => p.score)))}`}>
                            {Math.max(...evaluation.partialScores.map(p => p.score))}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Lowest Score:</span>
                          <span className={`font-semibold ${getScoreColorClass(Math.min(...evaluation.partialScores.map(p => p.score)))}`}>
                            {Math.min(...evaluation.partialScores.map(p => p.score))}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown */}
            <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
              {/* Partial Scores Breakdown */}
              {evaluation.partialScores && evaluation.partialScores.length > 0 ? (
                <Card className="bg-slate-900/50 border border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-300">
                      <BarChart3 className="w-5 h-5" />
                      Evaluation Breakdown
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Detailed scores for each evaluation component
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {evaluation.partialScores
                        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
                        .map((partial, index) => (
                        <div key={index} className="bg-slate-800/30 rounded-lg border border-slate-700/30 overflow-hidden">
                          {/* Header with score and basic info */}
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-200 mb-1">{partial.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {partial.date}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColorClass(partial.score)}`}>
                                {partial.score}%
                              </div>
                              {/* Progress bar for individual score */}
                              <div className="w-24 h-2 bg-slate-700 rounded-full mt-2">
                                <div 
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${partial.score}%`,
                                    backgroundColor: getScoreColor(partial.score)
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Enhanced Feedback Display */}
                          {partial.feedback && (
                            <div className="px-4 pb-4">
                              <div className="border-t border-slate-700/50 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <MessageSquare className="w-4 h-4 text-slate-400" />
                                  <h4 className="font-medium text-slate-300">Detailed Feedback</h4>
                                </div>
                                <FeedbackDisplay feedback={partial.feedback} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Show legacy single evaluation format */
                evaluation.score !== undefined && (
                  <Card className="bg-slate-900/50 border border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl text-slate-300">
                        <BarChart3 className="w-5 h-5" />
                        Evaluation Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-200 mb-1">Overall Evaluation</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {evaluation.evaluationDate || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${getScoreColorClass(evaluation.score)}`}>
                            {evaluation.score}%
                          </div>
                          <div className="w-24 h-2 bg-slate-700 rounded-full mt-2">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${evaluation.score}%`,
                                backgroundColor: getScoreColor(evaluation.score)
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}

              {/* Instructor Feedback */}
              {evaluation.feedback && (
                <Card className="bg-slate-900/50 border border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-300">
                      <MessageSquare className="w-5 h-5" />
                      Instructor Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FeedbackDisplay feedback={evaluation.feedback} />
                  </CardContent>
                </Card>
              )}

              {/* Performance Insights */}
              {evaluation.partialScores && evaluation.partialScores.length > 1 && (
                <Card className="bg-slate-900/50 border border-slate-700/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl text-slate-300">
                      <Star className="w-5 h-5" />
                      Performance Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/30 rounded-lg">
                        <h4 className="font-semibold text-slate-200 mb-2">Trend Analysis</h4>
                        <p className="text-slate-400 text-sm">
                          {(() => {
                            const scores = evaluation.partialScores.map(p => p.score);
                            const recent = scores.slice(-2);
                            if (recent.length < 2) return "Not enough data for trend analysis.";
                            const trend = recent[1] - recent[0];
                            if (trend > 0) return `📈 Improving! Your recent score increased by ${trend.toFixed(1)} points.`;
                            if (trend < 0) return `📉 Your recent score decreased by ${Math.abs(trend).toFixed(1)} points. Keep working!`;
                            return "📊 Your performance is consistent.";
                          })()}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/30 rounded-lg">
                        <h4 className="font-semibold text-slate-200 mb-2">Achievement Status</h4>
                        <p className="text-slate-400 text-sm">
                          {getDisplayScore(evaluation) >= 90 ? "🏆 Excellent performance!" :
                           getDisplayScore(evaluation) >= 80 ? "🎯 Great work!" :
                           getDisplayScore(evaluation) >= 70 ? "👍 Good progress!" :
                           "💪 Keep pushing forward!"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="bg-slate-900/50 border border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-xl font-semibold text-slate-300">Evaluation Not Available</h3>
                <p className="text-slate-500 max-w-sm mt-2">Your evaluation has not been added by the instructor yet. Please check back later for updates on your performance.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MyEvaluationsPage;

