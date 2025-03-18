
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
    const parsedText = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "Muodosta json " + instruction_prompt }, 
        { role: "user", content: "json " + input_text }
    ],
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0
    })

  return parsedText.choices[0].message.content;
}