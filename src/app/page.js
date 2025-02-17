"use client";

// Import necessary libraries
import styles from './page.module.css'
import { useState, useEffect } from "react";

// This is the main component of our application
export default function Home() {
  // Define state variables for the password, result, recording status, and media recorder
  const [password, setPassword] = useState("");
  const [passwordValid, setPasswordValid] = useState(false);
  const [parsedResult, setParsedResult] = useState();
  const [result, setResult] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // This array will hold the audio data
  let chunks = [];

  // This useEffect hook sets up the media recorder when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && passwordValid) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const newMediaRecorder = new MediaRecorder(stream);
          newMediaRecorder.onstart = () => {
            chunks = [];
          };
          newMediaRecorder.ondataavailable = e => {
            chunks.push(e.data);
          };
          newMediaRecorder.onstop = async () => {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onerror = function (err) {
              console.error('Error playing audio:', err);
            };
            //audio.play();
            console.log("kutsutaan speechToText")
            try {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async function () {
                const base64Audio = reader.result.split(',')[1]; // Remove the data URL prefix
                const response = await fetch("/api/speechToText", {
                  method: "POST",
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('apiKey')}` // Retrieve apiKey
                  },
                  body: JSON.stringify({ audio: base64Audio }),
                });

                const data = await response.json();
                if (response.status !== 200) {
                  throw data.error || new Error(`Request failed with status ${response.status}`);
                }
                setResult(data.result);
              }
            } catch (error) {
              console.error(error);
              alert(error.message);
            }
          };
          setMediaRecorder(newMediaRecorder);
        })
        .catch(err => console.error('Error accessing microphone:', err));
    }
  }, [passwordValid]);

  // Function to start recording
  const startRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.start();
      console.log("startRecording")
      setRecording(true);
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      console.log('stopRecording')
      setRecording(false);
    }
  };

  async function convertToJSON() {
    console.log("convertToJSON kutsuttu");
  
    try {
      const response = await fetch("/api/parseJSON", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('apiKey')}` // Retrieve apiKey
        },
        body: JSON.stringify({ text_to_parse: result }),
      });
  
      if (response.status !== 200) {
        throw new Error(`Request failed with status ${response.status}`);
      }
  
      const data_json = await response.json();
      console.log("data_json");
      console.log(data_json);
      setParsedResult(data_json.result);
      console.log("parsedResult");
      console.log(parsedResult);
      setAllResults([...allResults, data_json.result])
      console.log('Rendering with data:', allResults);

    } catch (error) {
      console.error("Error converting to JSON:", error);
    }
  }

  // Function to handle password submission
  const handlePasswordSubmit = () => {
    if (password === process.env.NEXT_PUBLIC_PASSWD) {
      setPasswordValid(true);
    } else {
      alert("Invalid password");
    }
  }

  // Function to handle changes in editable results
  const handleResultChange = (index, newResult) => {
    const updatedResults = [...allResults];
    updatedResults[index] = newResult;
    setAllResults(updatedResults);
  }

  // Render the component
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        {!passwordValid ? (
          <>
            <h2>Enter your password</h2>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter password" 
            />
            <button onClick={handlePasswordSubmit}>Submit</button>
          </>
        ) : (
          <>
            <h2>Convert audio to text <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={recording ? stopRecording : startRecording} >
              {recording ? 'Stop Recording' : 'Start Recording'}
            </button>
            </div>
            <h2>Results</h2>
            <textarea value={result} onChange={(e) => setResult(e.target.value)} />
            <h2>Convert audio text to json <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={convertToJSON} >
              {'Convert to JSON'}
            </button>
            </div>
            <>
              <h2>All Results</h2>
              {allResults.map((result, index) => (
                <textarea
                  key={index}
                  value={result}
                  onChange={(e) => handleResultChange(index, e.target.value)}
                />
              ))}
            </>
            <h2>Add to database <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={convertToJSON}>
              {'Add to database'}
            </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
