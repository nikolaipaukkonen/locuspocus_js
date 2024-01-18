
// Import necessary libraries
import OpenAI from "openai";
import { exec } from 'child_process';
import fs from 'fs';
import { NextResponse } from "next/server";

// Promisify the exec function from child_process
const util = require('util');
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
  const base64Audio = req.audio;

  // Convert the Base64 audio data back to a Buffer
  const audio = Buffer.from(base64Audio, 'base64');

  try {
    // Convert the audio data to text
    const text = await convertAudioToText(audio);
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
async function parseTextToJSON(instruction_prompt, input_text) {
    const parsedText = await openai.chat.completions.create({
        messages: [{role: "system","content": instruction_prompt}, {role: "user", "content": input_text}],
        model: "gpt-3.gpt-3.5-turbo"
    })
  return parsedText;
}