
// Import necessary libraries
import OpenAI from "openai";
import fs from 'fs';
import { NextResponse } from "next/server";
import path from 'path';

// Hardcoded path to the ffmpeg-static binary
const hardcodedFfmpegPath = path.resolve(
  '/workspaces/locuspocus_js/node_modules/ffmpeg-static/ffmpeg'
);

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
  console.log("kutsu onnistui")
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

// This function converts audio data to text using the OpenAI API
async function convertAudioToText(audioData) {
  // Convert the audio data to MP3 format
  const mp3AudioData = await convertAudioToMp3(audioData);

  // Write the MP3 audio data to a file
  const outputPath = '/tmp/output.mp3';
  fs.writeFileSync(outputPath, mp3AudioData);

  // Transcribe the audio
  const response = await openai.audio.transcriptions.create(
      { model: 'whisper-1', file: fs.createReadStream(outputPath) }
  );

  // Delete the temporary file
  fs.unlinkSync(outputPath);

  // The API response contains the transcribed text
  const transcribedText = response.text;
  return transcribedText;
}

const { spawn } = require('child_process');
const { Readable } = require('stream');

// This function converts audio data to MP3 format using ffmpeg and returns a buffer
async function convertAudioToMp3(audioData) {
  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn(hardcodedFfmpegPath, [
      '-y', // Overwrite output files without asking
      '-i', 'pipe:0', // Input from stdin
      '-f', 'mp3', // Output format
      'pipe:1' // Output to stdout
    ]);

    let mp3Buffer = Buffer.alloc(0); // Initialize an empty buffer to collect MP3 data

    ffmpegProcess.stdout.on('data', (chunk) => {
      mp3Buffer = Buffer.concat([mp3Buffer, chunk]); // Collect MP3 data chunks
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve(mp3Buffer); // Resolve the promise with the MP3 buffer
      } else {
        reject(new Error(`ffmpeg process exited with code ${code}`));
      }
    });

    ffmpegProcess.stdin.on('error', (err) => {
      reject(new Error(`Error writing to ffmpeg stdin: ${err.message}`));
    });

    ffmpegProcess.stdin.write(audioData); // Write the original audio data to ffmpeg
    ffmpegProcess.stdin.end(); // Close stdin to signal that we're done sending data
  });
}