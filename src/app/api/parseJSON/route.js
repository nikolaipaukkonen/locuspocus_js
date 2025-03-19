// Import necessary libraries
import OpenAI from "openai";
import { exec } from 'child_process';
import fs from 'fs';
import { NextResponse } from "next/server";

const util = require('util');
// Promisify the exec functiononst util = require('util');
const execAsync = util.promisify(exec);
const instruction_prompt = process.env.PROMPT

// Configure the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This function handles POST requests to the /api/speechToText route
export async function POST(request) {
  // Check if the OpenAI API key is configured
  if (!openai.apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured, please follow instructions in README.md" }, {status:500});
  }

  // Parse the request body
  const req = await request.json()

  // Extract the audio data from the request body
  const transcribedText = req.text_to_parse;

  try {
    // Convert the audio data to text
    const text = await parseToJSON(instruction_prompt,transcribedText);
    // Return the transcribed text in the response
    return NextResponse.json({result: text}, {status:200});
  } catch(error) {
    // Handle any errors that occur during the request
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json({ error: error.response.data }, {status:500});
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json({ error: "An error occurred during your request." }, {status:500});
    }
  }
}

// This function converts input text to JSON using the OpenAI API
async function parseToJSON(instruction_prompt, input_text) {
  const prompt = `
  You are a JSON generator. Follow the schema provided in the instruction strictly.
  
  **IMPORTANT RULES:**
  - Your response **must** be a valid JSON object.
  - **Do NOT omit any fields**; every key must exist in the output.
  - If information is missing, set it to **"None"** (for strings) or **[]** (for arrays).
  - Use the exact key names as provided below, without any changes.
  - Do not explain your answer—return only the JSON.
  
  **Schema Example (Follow This Exactly):**
  {
    "UNIT_NUMBER": 1,
    "UNIT_TYPE": "maayksikkö",
    "UNIT_NAME": "Tumma multakerros",
    "ABOVE_WHAT": ["2", "3"],
    "BELOW_WHAT": ["5"],
    "THICKNESS": 30,
    "SOIL_TYPE": "None",
    "COLOR": "tumma ruskea",
    "FINDS": ["keramiikkaa", "palaneita luita"],
    "DATING": "1500-luvun loppu",
    "INTERPRETATION": "täyttökerros",
    "TOOLS_USED": ["lasta", "lapio"]
  }
  
  **Now, generate a JSON response in this format based on the input below.**
  
  **Input Description:**
  ${input_text}
  `;
  

  const parsedText = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant that generates JSON strictly based on the provided schema." },
      { role: "user", content: prompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" }  // This ensures that the response is always JSON
  });

  return parsedText.choices[0].message.content;
}