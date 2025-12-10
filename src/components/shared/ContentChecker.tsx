import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, ExternalLink, Bot, Search, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIDetectResult {
  success: boolean;
  data?: {
    label: 'ai' | 'human';
    score: number;
    raw: unknown;
  };
  error?: string;
}

interface ChunkMatch {
  chunkIndex: number;
  chunkText: string;
  url: string;
  title: string;
  snippet: string;
  similarity: number;
}

interface PlagiarismResult {
  success: boolean;
  data?: {
    plagiarismScore: number;
    matches: ChunkMatch[];
  };
  error?: string;
}

export function ContentChecker() {
  const [text, setText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [plagiarismLoading, setPlagiarismLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIDetectResult | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/plain') {
        toast({
          title: "Invalid File",
          description: "Please upload a .txt file",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setText(content);
        setAiResult(null);
        setPlagiarismResult(null);
        setError(null);
      };
      reader.readAsText(file);
    }
  };

  const handleAIDetect = async () => {
    if (!text.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some text to analyze",
        variant: "destructive",
      });
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-detect', {
        body: { text: text.trim() }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      setAiResult(data as AIDetectResult);
      
      if (!data.success) {
        setError(data.error || 'AI detection failed');
      }
    } catch (err) {
      console.error('AI detection error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePlagiarismCheck = async () => {
    if (!text.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some text to analyze",
        variant: "destructive",
      });
      return;
    }

    setPlagiarismLoading(true);
    setPlagiarismResult(null);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('plagiarism-check', {
        body: { text: text.trim() }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      setPlagiarismResult(data as PlagiarismResult);
      
      if (!data.success) {
        setError(data.error || 'Plagiarism check failed');
      }
    } catch (err) {
      console.error('Plagiarism check error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setPlagiarismLoading(false);
    }
  };

  const getScoreColor = (score: number, isAI: boolean = false) => {
    if (isAI) {
      if (score >= 0.7) return 'text-destructive';
      if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-green-600 dark:text-green-400';
    }
    if (score >= 0.5) return 'text-destructive';
    if (score >= 0.2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getScoreLabel = (score: number, isAI: boolean = false) => {
    if (isAI) {
      if (score >= 0.7) return 'Likely AI-Generated';
      if (score >= 0.4) return 'Possibly AI-Generated';
      return 'Likely Human-Written';
    }
    if (score >= 0.5) return 'High Similarity Found';
    if (score >= 0.2) return 'Some Similarity Found';
    return 'Low Similarity';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          AI & Plagiarism Checker
        </h2>
        <p className="text-muted-foreground mt-1">
          Analyze your text for AI-generated content and potential plagiarism
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Input
            </CardTitle>
            <CardDescription>
              Enter text directly or upload a .txt file (max 10,000 characters for AI, 5,000 for plagiarism)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your text here..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setAiResult(null);
                setPlagiarismResult(null);
                setError(null);
              }}
              className="min-h-[300px] resize-none"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild className="cursor-pointer">
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload .txt
                    </span>
                  </Button>
                </label>
                <span className="text-sm text-muted-foreground">
                  {text.length} characters
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleAIDetect} 
                disabled={aiLoading || !text.trim()}
                className="flex-1"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Bot className="mr-2 h-4 w-4" />
                    Check AI Content
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handlePlagiarismCheck} 
                disabled={plagiarismLoading || !text.trim()}
                variant="secondary"
                className="flex-1"
              >
                {plagiarismLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Plagiarism
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              View detailed analysis of your content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {(aiLoading || plagiarismLoading) && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>{aiLoading ? 'Analyzing for AI content...' : 'Checking for plagiarism...'}</p>
              </div>
            )}

            {!aiLoading && !plagiarismLoading && !aiResult && !plagiarismResult && !error && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter text and run analysis to see results</p>
              </div>
            )}

            {(aiResult || plagiarismResult) && !aiLoading && !plagiarismLoading && (
              <Tabs defaultValue={aiResult ? "ai" : "plagiarism"} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ai" disabled={!aiResult}>
                    <Bot className="mr-2 h-4 w-4" />
                    AI Detection
                  </TabsTrigger>
                  <TabsTrigger value="plagiarism" disabled={!plagiarismResult}>
                    <Search className="mr-2 h-4 w-4" />
                    Plagiarism
                  </TabsTrigger>
                </TabsList>

                {/* AI Detection Results */}
                <TabsContent value="ai" className="space-y-4 mt-4">
                  {aiResult?.success && aiResult.data && (
                    <>
                      <div className="text-center py-4">
                        <div className={`text-4xl font-bold ${getScoreColor(aiResult.data.score, true)}`}>
                          {Math.round(aiResult.data.score * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          AI Probability Score
                        </p>
                        <Badge 
                          variant={aiResult.data.label === 'ai' ? 'destructive' : 'default'}
                          className="mt-2"
                        >
                          {getScoreLabel(aiResult.data.score, true)}
                        </Badge>
                      </div>

                      <Progress 
                        value={aiResult.data.score * 100} 
                        className="h-3"
                      />

                      <Alert>
                        {aiResult.data.label === 'human' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                          {aiResult.data.label === 'human' ? 'Likely Human-Written' : 'Possibly AI-Generated'}
                        </AlertTitle>
                        <AlertDescription>
                          {aiResult.data.label === 'human' 
                            ? 'The content appears to be written by a human based on our analysis.'
                            : 'The content shows patterns commonly associated with AI-generated text.'}
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                  {aiResult && !aiResult.success && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Analysis Failed</AlertTitle>
                      <AlertDescription>{aiResult.error}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Plagiarism Results */}
                <TabsContent value="plagiarism" className="space-y-4 mt-4">
                  {plagiarismResult?.success && plagiarismResult.data && (
                    <>
                      <div className="text-center py-4">
                        <div className={`text-4xl font-bold ${getScoreColor(plagiarismResult.data.plagiarismScore)}`}>
                          {Math.round(plagiarismResult.data.plagiarismScore * 100)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Similarity Score
                        </p>
                        <Badge 
                          variant={plagiarismResult.data.plagiarismScore >= 0.5 ? 'destructive' : 'default'}
                          className="mt-2"
                        >
                          {getScoreLabel(plagiarismResult.data.plagiarismScore)}
                        </Badge>
                      </div>

                      <Progress 
                        value={plagiarismResult.data.plagiarismScore * 100} 
                        className="h-3"
                      />

                      {plagiarismResult.data.matches.length > 0 ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                          <p className="text-sm font-medium">
                            Found {plagiarismResult.data.matches.length} similar sources:
                          </p>
                          {plagiarismResult.data.matches.map((match, index) => (
                            <div 
                              key={index} 
                              className="p-3 rounded-lg border bg-muted/50 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <a 
                                  href={match.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1 line-clamp-1"
                                >
                                  {match.title || 'Source'}
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                <Badge variant="outline" className="flex-shrink-0">
                                  {Math.round(match.similarity * 100)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {match.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle>No Significant Matches</AlertTitle>
                          <AlertDescription>
                            No significant similar content was found in our search.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                  {plagiarismResult && !plagiarismResult.success && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Check Failed</AlertTitle>
                      <AlertDescription>{plagiarismResult.error}</AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Disclaimer</AlertTitle>
        <AlertDescription>
          This tool provides estimates only. AI detection uses Hugging Face models (roberta-base-openai-detector), and plagiarism checking uses Google Custom Search with Jaccard text similarity analysis. Results should be verified manually. For academic submissions, use official institutional tools.
        </AlertDescription>
      </Alert>
    </div>
  );
}
