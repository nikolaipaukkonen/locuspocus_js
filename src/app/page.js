"use client";

// Import necessary libraries
import styles from './page.module.css'
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';

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
  const [language, setLanguage] = useState('EN'); // Default language is English

  // This array will hold the audio data
  let chunks = [];

  // Define the expected schema for the database
const defaultSchema = {
  UNIT_NUMBER: null,
  UNIT_TYPE: "",
  UNIT_NAME: "",
  ABOVE_WHAT: [],
  BELOW_WHAT: [],
  THICKNESS: null,
  SOIL_TYPE: "",
  COLOR: "",
  FINDS: [],
  DATING: "",
  INTERPRETATION: "",
  TOOLS_USED: []
};

const formatDataToSchema = (data) => {
  return {
    ...defaultSchema,
    ...data // Merge the provided data with the default schema
  };
};

// Function to add all results to the database
const addToDatabase = () => {
  try {
    // Retrieve existing data from localStorage
    const existingData = JSON.parse(localStorage.getItem("database")) || [];

    // Ensure all results are properly formatted
    const formattedResults = allResults.map(result => {
      if (typeof result === "string") {
        try {
          const parsedResult = JSON.parse(result);
          return formatDataToSchema(parsedResult);
        } catch (error) {
          console.error("Error parsing result:", result, error);
          throw new Error("Invalid result format. Ensure all results are valid JSON.");
        }
      }
      return formatDataToSchema(result);
    });

    // Store the updated data back in localStorage
    localStorage.setItem("database", JSON.stringify([...existingData, ...formattedResults]));

    // Clear stored results
    setAllResults([]);
    alert("Data added to the database successfully!");
  } catch (error) {
    console.error("Error adding to database:", error);
    alert("Failed to add data to the database.");
  }
};


// Function to export the database to an Excel file
const exportToExcel = () => {
  try {
    const data = JSON.parse(localStorage.getItem("database")) || [];
    if (data.length === 0) {
      alert("No data available to export.");
      return;
    }

    // Format each entry properly before exporting
    const formattedData = data.map(entry => {
      const formattedEntry = formatDataToSchema(entry);
      return {
        ...formattedEntry,
        ABOVE_WHAT: formattedEntry.ABOVE_WHAT.join(", "),
        BELOW_WHAT: formattedEntry.BELOW_WHAT.join(", "),
        FINDS: formattedEntry.FINDS.join(", "),
        TOOLS_USED: formattedEntry.TOOLS_USED.join(", ")
      };
    });

    // Convert formatted data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Adjust column widths (optional)
    worksheet['!cols'] = Object.keys(defaultSchema).map(key => ({ wch: Math.max(12, key.length) }));

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Database");

    // Save as file
    XLSX.writeFile(workbook, "database.xlsx");
    alert("Data exported successfully!");
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    alert("Failed to export data.");
  }
};


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
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Retrieve apiKey
                  },
                  body: JSON.stringify({ audio: base64Audio }),
                });

                const data = await response.json();
                if (response.status !== 200) {
                  throw data.error || new Error(`Request failed with status ${response.status}`);
                }
                setResult(data.transcription); // Use the transcription field from the API response
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
      console.log("startRecording");
      setRecording(true);
    } else {
      console.error("MediaRecorder is not initialized. Ensure password is valid and microphone access is granted.");
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      console.log("stopRecording");
      setRecording(false);
    } else {
      console.error("MediaRecorder is not initialized.");
    }
  };

  async function convertToJSON() {
    console.log("convertToJSON kutsuttu");
  
    try {
      const response = await fetch("/api/parseJSON", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Retrieve apiKey
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
    const passwordEnv = process.env.NEXT_PUBLIC_PASSWD; // Ensure this is prefixed with NEXT_PUBLIC_
    if (password === passwordEnv) {
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

  const columnNames = {
    EN: [
      "UNIT_NUMBER", "UNIT_TYPE", "UNIT_NAME", "ABOVE_WHAT", "BELOW_WHAT",
      "THICKNESS", "SOIL_TYPE", "COLOR", "FINDS", "DATING", "INTERPRETATION", "TOOLS_USED"
    ],
    FI: [
      "YKSIKKÖNUMERO", "YKSIKÖN_TYYPPI", "YKSIKÖN_NIMI", "YLÄPUOLELLA",
      "ALAPUOLELLA", "PAKSUUS", "MAALAJI", "VÄRI", "LÖYDÖT", "AJOITUS", "TULKINTA", "TYÖKALUT"
    ]
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'EN' ? 'FI' : 'EN'));
  };

  // Render the component
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <button onClick={toggleLanguage}>{language === 'EN' ? 'FI' : 'EN'}</button>
        </div>
        {!passwordValid ? (
          <>
            <h2>{language === 'EN' ? 'Enter your password' : 'Syötä salasanasi'}</h2>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder={language === 'EN' ? 'Enter password' : 'Syötä salasana'} 
            />
            <button onClick={handlePasswordSubmit}>
              {language === 'EN' ? 'Submit' : 'Lähetä'}
            </button>
          </>
        ) : (
          <>
            <h2>{language === 'EN' ? 'Convert audio to text' : 'Muunna ääni tekstiksi'} <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={recording ? stopRecording : startRecording} >
              {recording ? (language === 'EN' ? 'Stop Recording' : 'Lopeta nauhoitus') : (language === 'EN' ? 'Start Recording' : 'Aloita nauhoitus')}
            </button>
            </div>
            <h2>{language === 'EN' ? 'Results' : 'Tulokset'}</h2>
            <textarea value={result} onChange={(e) => setResult(e.target.value)} />
            <h2>{language === 'EN' ? 'Convert audio text to JSON' : 'Muunna ääniteksti JSONiksi'} <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={convertToJSON} >
              {language === 'EN' ? 'Convert to JSON' : 'Muunna JSONiksi'}
            </button>
            </div>
            <>
              <h2>{language === 'EN' ? 'All Results' : 'Kaikki tulokset'}</h2>
              <table className="resultsTable">
                <thead>
                  <tr>
                    {columnNames[language].map((col, index) => (
                      <th key={index}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allResults.map((result, index) => {
                    const formattedResult = typeof result === "string" ? JSON.parse(result) : result;
                    return (
                      <tr key={index}>
                        {columnNames[language].map((col, colIndex) => (
                          <td key={colIndex}>{formattedResult[col] || "None"}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
            <h2>{language === 'EN' ? 'Add to database' : 'Lisää tietokantaan'} <span>-&gt;</span></h2>
            <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={addToDatabase}>
              {language === 'EN' ? 'Add to database' : 'Lisää tietokantaan'}
            </button>
            </div>
            <h2>{language === 'EN' ? 'Export database' : 'Vie tietokanta'} <span>-&gt;</span></h2>
          <div className={styles.centeredButtonContainer}>
            <button className={styles.roundButton} onClick={exportToExcel}>
              {language === 'EN' ? 'Export to Excel' : 'Vie Exceliin'}
            </button>
          </div>
          </>
        )}
      </div>
    </main>
  )
}
