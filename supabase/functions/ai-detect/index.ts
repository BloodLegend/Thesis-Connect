import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIDetectRequest {
  text: string;
}

interface AIDetectResponse {
  success: boolean;
  data?: {
    label: 'ai' | 'human';
    score: number;
    raw: unknown;
  };
  error?: string;
}

const DEFAULT_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/openai-community/roberta-base-openai-detector';
const MAX_TEXT_LENGTH = 10000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text }: AIDetectRequest = await req.json();
    
    // Input validation
    if (!text || typeof text !== 'string') {
      console.error('Validation error: text is required and must be a string');
      return new Response(
        JSON.stringify({ success: false, error: 'Text is required and must be a string' } as AIDetectResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.trim().length === 0) {
      console.error('Validation error: text cannot be empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Text cannot be empty' } as AIDetectResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      console.error(`Validation error: text exceeds ${MAX_TEXT_LENGTH} characters`);
      return new Response(
        JSON.stringify({ success: false, error: `Text cannot exceed ${MAX_TEXT_LENGTH} characters` } as AIDetectResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!apiKey) {
      console.error('Configuration error: HUGGINGFACE_API_KEY not set');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: API key not set' } as AIDetectResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelUrl = Deno.env.get('HUGGINGFACE_MODEL_URL') || DEFAULT_MODEL_URL;
    
    console.log(`Calling Hugging Face API at: ${modelUrl}`);
    console.log(`Text length: ${text.length} characters`);

    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Hugging Face API error: ${response.status} - ${errorText}`);
      
      // Handle model loading state
      if (response.status === 503) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'AI model is loading. Please try again in a few seconds.' 
          } as AIDetectResponse),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: `Hugging Face API error: ${response.status}` } as AIDetectResponse),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawResult = await response.json();
    console.log('Hugging Face raw response:', JSON.stringify(rawResult));

    // Parse the model response
    // The roberta-base-openai-detector returns: [[{label: "LABEL_0", score: x}, {label: "LABEL_1", score: y}]]
    // LABEL_0 = Human, LABEL_1 = AI (for this specific model)
    let label: 'ai' | 'human' = 'human';
    let score = 0;

    if (Array.isArray(rawResult) && rawResult.length > 0) {
      const predictions = Array.isArray(rawResult[0]) ? rawResult[0] : rawResult;
      
      // Find the AI-related label
      const aiPrediction = predictions.find((p: { label: string; score: number }) => 
        p.label === 'LABEL_1' || 
        p.label.toLowerCase().includes('ai') || 
        p.label.toLowerCase().includes('fake') ||
        p.label.toLowerCase().includes('generated')
      );
      
      const humanPrediction = predictions.find((p: { label: string; score: number }) => 
        p.label === 'LABEL_0' || 
        p.label.toLowerCase().includes('human') || 
        p.label.toLowerCase().includes('real')
      );

      if (aiPrediction) {
        score = aiPrediction.score;
        label = score > 0.5 ? 'ai' : 'human';
      } else if (humanPrediction) {
        score = 1 - humanPrediction.score;
        label = humanPrediction.score > 0.5 ? 'human' : 'ai';
      } else if (predictions.length > 0) {
        // Fallback: use first prediction
        score = predictions[0].score;
        label = predictions[0].label.includes('1') || predictions[0].label.toLowerCase().includes('ai') ? 'ai' : 'human';
      }
    }

    console.log(`Detection result - Label: ${label}, Score: ${score}`);

    const result: AIDetectResponse = {
      success: true,
      data: {
        label,
        score,
        raw: rawResult,
      },
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-detect function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      } as AIDetectResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
