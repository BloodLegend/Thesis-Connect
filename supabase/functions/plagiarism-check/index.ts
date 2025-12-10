import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlagiarismRequest {
  text: string;
}

interface ChunkMatch {
  chunkIndex: number;
  chunkText: string;
  url: string;
  title: string;
  snippet: string;
  similarity: number;
}

interface PlagiarismResponse {
  success: boolean;
  data?: {
    plagiarismScore: number;
    matches: ChunkMatch[];
  };
  error?: string;
}

const MAX_TEXT_LENGTH = 5000;
const CHUNK_SIZE = 250;
const MAX_CHUNKS = 5;
const MAX_RESULTS_PER_CHUNK = 3;

// Tokenize text into lowercase words
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
  );
}

// Calculate Jaccard similarity between two sets of tokens
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Preprocess text: lowercase and remove extra whitespace
function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Split text into chunks by sentences or fixed length
function splitIntoChunks(text: string): string[] {
  const processed = preprocessText(text);
  const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > CHUNK_SIZE) {
      if (currentChunk.length > 50) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
    
    if (chunks.length >= MAX_CHUNKS) break;
  }
  
  if (currentChunk.length > 50 && chunks.length < MAX_CHUNKS) {
    chunks.push(currentChunk.trim());
  }
  
  // If no sentences found, split by fixed length
  if (chunks.length === 0) {
    for (let i = 0; i < processed.length && chunks.length < MAX_CHUNKS; i += CHUNK_SIZE) {
      const chunk = processed.slice(i, i + CHUNK_SIZE).trim();
      if (chunk.length > 50) {
        chunks.push(chunk);
      }
    }
  }
  
  return chunks;
}

// Build search query from chunk text
function buildSearchQuery(chunk: string): string {
  // Take first 100-150 characters and wrap in quotes for phrase search
  const trimmed = chunk.slice(0, 120).trim();
  // Remove any quotes from the text before wrapping
  const cleaned = trimmed.replace(/"/g, '');
  return `"${cleaned}"`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text }: PlagiarismRequest = await req.json();
    
    // Input validation
    if (!text || typeof text !== 'string') {
      console.error('Validation error: text is required');
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required and must be a string' } as PlagiarismResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.trim().length === 0) {
      console.error('Validation error: text cannot be empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Text cannot be empty' } as PlagiarismResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit text length
    const limitedText = text.slice(0, MAX_TEXT_LENGTH);
    console.log(`Processing text of length: ${limitedText.length} characters`);

    const apiKey = Deno.env.get('GOOGLE_CSE_API_KEY');
    const searchEngineId = Deno.env.get('GOOGLE_CSE_SEARCH_ENGINE_ID');
    
    if (!apiKey || !searchEngineId) {
      console.error('Configuration error: Google CSE credentials not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: Google CSE not configured' } as PlagiarismResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Split text into chunks
    const chunks = splitIntoChunks(limitedText);
    console.log(`Split text into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { plagiarismScore: 0, matches: [] } 
        } as PlagiarismResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allMatches: ChunkMatch[] = [];
    const chunkScores: number[] = [];

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const query = buildSearchQuery(chunk);
      const chunkTokens = tokenize(chunk);
      
      console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}: "${chunk.slice(0, 50)}..."`);

      try {
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.set('key', apiKey);
        searchUrl.searchParams.set('cx', searchEngineId);
        searchUrl.searchParams.set('q', query);
        searchUrl.searchParams.set('num', String(MAX_RESULTS_PER_CHUNK));

        const response = await fetch(searchUrl.toString());
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Google CSE error for chunk ${chunkIndex}: ${response.status} - ${errorText}`);
          chunkScores.push(0);
          continue;
        }

        const searchResult = await response.json();
        const items = searchResult.items || [];
        
        let maxSimilarity = 0;
        
        for (const item of items) {
          const snippet = item.snippet || '';
          const snippetTokens = tokenize(snippet);
          const similarity = jaccardSimilarity(chunkTokens, snippetTokens);
          
          if (similarity > 0.1) { // Only include if there's meaningful similarity
            allMatches.push({
              chunkIndex,
              chunkText: chunk.slice(0, 200),
              url: item.link || '',
              title: item.title || '',
              snippet: snippet,
              similarity: Math.round(similarity * 100) / 100,
            });
          }
          
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        
        chunkScores.push(maxSimilarity);
        console.log(`Chunk ${chunkIndex + 1} max similarity: ${maxSimilarity.toFixed(3)}`);

      } catch (error) {
        console.error(`Error processing chunk ${chunkIndex}:`, error);
        chunkScores.push(0);
      }

      // Small delay between API calls to avoid rate limiting
      if (chunkIndex < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Calculate overall plagiarism score (average of chunk scores)
    const overallScore = chunkScores.length > 0 
      ? chunkScores.reduce((a, b) => a + b, 0) / chunkScores.length 
      : 0;

    // Sort matches by similarity (highest first) and limit
    const sortedMatches = allMatches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10);

    console.log(`Overall plagiarism score: ${overallScore.toFixed(3)}, Total matches: ${sortedMatches.length}`);

    const result: PlagiarismResponse = {
      success: true,
      data: {
        plagiarismScore: Math.round(overallScore * 100) / 100,
        matches: sortedMatches,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in plagiarism-check function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      } as PlagiarismResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
