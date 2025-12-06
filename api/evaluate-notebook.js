import { db } from '../src/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileUrl, studentEmail } = req.body;

    if (!fileUrl || !studentEmail) {
      return res.status(400).json({ error: 'Missing required parameters: fileUrl and studentEmail' });
    }

    // Fetch the notebook content from Cloudinary URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const fileContent = await response.text();

    // Prepare the prompt for AI evaluation
    const evaluationPrompt = `
You are an expert programming instructor evaluating a student's Jupyter notebook submission. Please analyze the following notebook content and provide a detailed evaluation in JSON format.

Notebook Content:
${fileContent}

Please evaluate the submission based on:
1. Code quality and structure
2. Problem-solving approach
3. Documentation and comments
4. Correctness of implementation
5. Use of best practices

Return your evaluation as a JSON object with the following structure:
{
  "score": <number between 0-100>,
  "strengths": "<detailed list of what the student did well>",
  "weaknesses": "<detailed list of areas for improvement>",
  "resources": "<suggested learning resources, videos, or documentation links that could help the student improve>"
}

Be constructive and specific in your feedback. Include actual code examples when pointing out issues or strengths.
`;

    // Call Gemini API (using environment variable)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: evaluationPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${geminiResponse.statusText} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    
    if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponseText = geminiData.candidates[0].content.parts[0].text;
    
    // Parse the JSON response from AI
    let evaluationResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback evaluation if JSON parsing fails
      evaluationResult = {
        score: 75,
        strengths: "The submission was received and processed successfully.",
        weaknesses: "The automated evaluation system encountered an issue parsing the detailed feedback. Please review manually.",
        resources: "Please consult your course materials and reach out to your instructor for specific guidance."
      };
    }

    // Validate the evaluation result
    if (typeof evaluationResult.score !== 'number' || evaluationResult.score < 0 || evaluationResult.score > 100) {
      evaluationResult.score = Math.min(100, Math.max(0, parseFloat(evaluationResult.score) || 75));
    }

    // Save the evaluation to Firestore using the existing addPartialScore logic
    const evaluationRef = doc(db, 'evaluations', studentEmail);
    
    await runTransaction(db, async (transaction) => {
      const evaluationDoc = await transaction.get(evaluationRef);
      
      let evaluationData;
      if (!evaluationDoc.exists()) {
        // Create new document if it doesn't exist
        evaluationData = {
          studentEmail: studentEmail,
          totalScore: 0,
          partialScores: []
        };
      } else {
        evaluationData = evaluationDoc.data();
        // Ensure partialScores array exists
        if (!evaluationData.partialScores) {
          evaluationData.partialScores = [];
        }
      }
      
      // Create the feedback object with the new structure
      const feedbackObject = {
        strengths: evaluationResult.strengths,
        weaknesses: evaluationResult.weaknesses,
        resources: evaluationResult.resources
      };
      
      // Add new partial score with AI evaluation
      const newPartialScore = {
        id: Date.now().toString(),
        name: `AI Auto-Evaluation - ${new Date().toLocaleDateString()}`,
        score: parseFloat(evaluationResult.score),
        feedback: feedbackObject, // Store as structured object
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };
      
      evaluationData.partialScores.push(newPartialScore);
      
      // Recalculate total score
      const newTotalScore = evaluationData.partialScores.reduce((sum, partial) => sum + partial.score, 0) / evaluationData.partialScores.length;
      evaluationData.totalScore = Math.min(100, Math.round(newTotalScore * 100) / 100);
      
      // Update the document
      transaction.set(evaluationRef, evaluationData);
    });

    res.status(200).json({ 
      success: true, 
      message: 'Evaluation completed successfully',
      evaluation: evaluationResult
    });

  } catch (error) {
    console.error('Error in evaluate-notebook function:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

