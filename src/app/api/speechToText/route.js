// Import necessary libraries
import OpenAI from "openai";
import fs from 'fs';
import { NextResponse } from "next/server";
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import ffmpegPath from 'ffmpeg-static'; // Ensure ffmpeg-static is installed

const execAsync = util.promisify(exec);

// Resolve the ffmpeg binary path dynamically
const resolvedFfmpegPath = '/usr/local/bin/ffmpeg'; // Use the copied binary path

console.log('Resolved ffmpeg path:', resolvedFfmpegPath); // Log the resolved path for debugging

// Configure the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This function handles POST requests to the /api/speechToText route
export async function POST(request) {
  try {
    // Parse the request body
    const { audio } = await request.json();
    console.log('Received audio data:', audio ? 'Yes' : 'No'); // Log if audio data is received

    if (!audio) {
      throw new Error('Audio data is missing in the request.');
    }

    if (!resolvedFfmpegPath) {
      throw new Error('FFmpeg binary not found. Ensure ffmpeg-static is installed or ffmpeg is available in the system.');
    }

    // Save the audio data to a temporary file
    const inputPath = '/tmp/input.webm';
    fs.writeFileSync(inputPath, Buffer.from(audio, 'base64')); // Assuming audio is base64-encoded
    console.log('Audio data saved to:', inputPath);

    // Log the command for debugging
    const outputPath = '/tmp/output.mp3';
    const command = `${resolvedFfmpegPath} -i ${inputPath} -vn -ar 44100 -ac 2 -b:a 192k ${outputPath}`;
    console.log('Executing command:', command);

    await execAsync(command);
    console.log('FFmpeg command executed successfully.');

    // Clean up the temporary input file
    fs.unlinkSync(inputPath);
    console.log('Temporary input file deleted.');

    // Ensure the output file exists before responding
    if (!fs.existsSync(outputPath)) {
      throw new Error('Output file was not created.');
    }

    // Convert the audio to text
    const transcription = await convertAudioToText(fs.readFileSync(outputPath));
    console.log('Transcription:', transcription);

    // Clean up the temporary output file (moved to convertAudioToText)
    // fs.unlinkSync(outputPath); // Removed duplicate deletion
    console.log('Temporary output file deleted.');

    // Send a success response with the transcription
    const response = { message: 'Audio processed successfully', transcription };
    console.log('Response:', response);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in speechToText API:', error);

    // Ensure a valid JSON response is sent even on error
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const ffmpegProcess = spawn(resolvedFfmpegPath, [
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