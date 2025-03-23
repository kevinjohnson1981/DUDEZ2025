import React, { useState, useEffect } from 'react';
import CourseSelector from './GolfCourseSelector';
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";


function MatchPlanner({ goBack }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTeeBox, setSelectedTeeBox] = useState(null);
  const [holes, setHoles] = useState([]); // ✅ Store hole data
  const [teams, setTeams] = useState([]); // ✅ Required for dropdowns
  const [bestBallMatches, setBestBallMatches] = useState([
    { matchTeams: [{ teamName: "", players: [] }, { teamName: "", players: [] }] },
    { matchTeams: [{ teamName: "", players: [] }, { teamName: "", players: [] }] },
  ]);

const [stablefordPlayers, setStablefordPlayers] = useState([
  { teamName: "Ball Busterz", player: "" },
  { teamName: "Golden Tees", player: "" },
  { teamName: "Black Tee Titans", player: "" },
  { teamName: "Just the Tips", player: "" },
]);



  // ✅ Fetch hole data when a tee box is selected
  useEffect(() => {
    if (selectedTeeBox) {
      fetchHoleData(selectedCourse, selectedTeeBox);
    }
  }, [selectedTeeBox]);

  const fetchHoleData = (selectedCourse, selectedTeeBox) => {
    if (!selectedCourse) {
      console.error("No course selected!");
      return;
    }
  
    if (!selectedTeeBox) {
      console.error("No tee box selected!");
      return;
    }
  
    if (!selectedCourse.tees || typeof selectedCourse.tees !== 'object') {
      console.warn("No tee data available for this course.");
      return;
    }
  
    console.log("Fetching hole data for Course ID:", selectedCourse.id, "Tee:", selectedTeeBox.tee_name);
  
    console.log("Checking selectedCourse data:", selectedCourse);
    console.log("Available tees:", selectedCourse.tees);

    const selectedTee = Object.values(selectedCourse.tees)
      .flat()
      .find(tee => tee.tee_name === selectedTeeBox.tee_name);

    console.log("Selected Tee after filtering:", selectedTee);

  
    if (!selectedTee || !selectedTee.holes) {
      console.warn("No hole data found for this tee:", selectedTeeBox.tee_name);
      return;
    }
  
    setHoles(selectedTee.holes); // ✅ Store hole data
    console.log("Holes loaded successfully:", selectedTee.holes);
  };
  

  const addDayToFirebase = async () => {
    if (!selectedDate || !selectedCourse || !selectedTeeBox) {
      alert("Please select a date, course, and tee box before adding a day!");
      return;
    }
  
    // ✅ Generate a readable document name based on date
    const timestamp = new Date().getTime();
    const documentName = `match_${selectedDate}_${timestamp}`;

    // 🛠 Add hole numbers to each hole object
    const holesWithNumbers = holes.map((hole, index) => ({
      ...hole,
      hole: index + 1  // 1 through 18
    }));

  
    // ✅ Structure match data, including full tee box and hole info
    const newDay = {
      date: selectedDate,
      course: {
        id: selectedCourse.id,
        course_name: selectedCourse.course_name,
        location: selectedCourse.location
      },
      teeBox: {
        tee_name: selectedTeeBox.tee_name,
        total_yards: selectedTeeBox.total_yards,
        holes: holesWithNumbers // ✅ updated!
      },
      teams,
      bestBallMatches,
      stablefordPlayers
    };
  
    try {
      await setDoc(doc(db, "matches", documentName), newDay);
      console.log(`Match Day Added! ID: ${documentName}`, newDay);
  
      // ✅ Clear selections after saving
      setSelectedDate("");
      setSelectedCourse(null);
      setSelectedTeeBox(null);
    } catch (error) {
      console.error("Error adding match day:", error);
    }
  };

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teams"));
        const fetchedTeams = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
  
        console.log("Loaded Teams from Firebase:", fetchedTeams);
        setTeams(fetchedTeams); // ✅ Load teams into state
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };
  
    fetchTeams();
  }, []);
  
  


  console.log("MatchPlanner - Teams State:", teams);


  return (
    <div>
      <h1>Match Planner</h1>
      <button onClick={goBack}>Back to Team Setup</button>

      <h2>Select Date:</h2>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <h3>Selected Course: {selectedCourse?.course_name || "No Course Selected"}</h3>
      <CourseSelector 
        setSelectedCourse={(course) => {
          console.log("Course selected:", course);
          setSelectedCourse(course);
          setSelectedTeeBox(null);
        }} 
      />

      {selectedCourse && (
        <div>
          <h3>Select a Tee Box:</h3>
          {selectedCourse?.tees && typeof selectedCourse.tees === 'object' ? (
            Object.values(selectedCourse.tees)
              .flat()
              .map((tee, tIndex) => (
                <button key={tIndex} onClick={() => {
                  console.log("Tee Box Selected:", tee);
                  setSelectedTeeBox(tee);
                }}>            
                  {tee.tee_name} - {tee.total_yards} yards
                </button>
              ))
          ) : (
            <p>No tee boxes available for this course.</p>
          )}
        </div>
      )}

      {selectedTeeBox && (
        <div>
          <h3>Hole Information:</h3>
          {holes.length > 0 ? (
            <ul>
              {holes.map((hole, index) => (
                <li key={index}>
                  Hole {index + 1}: 
                  {hole.yardage ? `${hole.yardage} yards` : " No Yard Data"},
                  Par {hole.par ? hole.par : "Unknown"}, 
                  HCP {hole.handicap ? hole.handicap : "Unknown"}
                </li>              
              ))}
            </ul>
          ) : (
            <p>Loading hole data...</p>
          )}

        </div>
      )}

      <h3>Best Ball Matches</h3>
      {[0, 1].map((matchIndex) => (
        <div key={matchIndex}>
          <h4>Match {matchIndex + 1}</h4>
          {[0, 1].map((teamIndex) => (
            <div key={teamIndex}>
              <label>Team {teamIndex + 1}:</label>
              <select
                value={bestBallMatches[matchIndex]?.matchTeams[teamIndex]?.teamName || ""}
                onChange={(e) => {
                  const updated = [...bestBallMatches];
                  updated[matchIndex].matchTeams[teamIndex] = {
                    teamName: e.target.value,
                    players: []
                  };
                  setBestBallMatches(updated);
                }}
              >
                <option value="">Select Team</option>
                {teams.map((team, tIndex) => (
                  <option key={tIndex} value={team.name}>{team.name}</option>
                ))}
              </select>
              {teams.find(t => t.name === bestBallMatches[matchIndex]?.matchTeams[teamIndex]?.teamName)?.players.map((player, pIndex) => (
  <label key={pIndex} style={{ display: 'block', marginLeft: '20px' }}>
    <input
      type="checkbox"
      checked={bestBallMatches[matchIndex].matchTeams[teamIndex].players.includes(player.name)}
      onChange={(e) => {
        const updated = [...bestBallMatches];
        const teamPlayers = updated[matchIndex].matchTeams[teamIndex].players || [];

        if (e.target.checked) {
          // ✅ Add player if under 2 selected
          if (teamPlayers.length < 2) {
            teamPlayers.push(player.name);
          }
        } else {
          // ✅ Remove unchecked player
          const indexToRemove = teamPlayers.indexOf(player.name);
          if (indexToRemove !== -1) {
            teamPlayers.splice(indexToRemove, 1);
          }
        }

        updated[matchIndex].matchTeams[teamIndex].players = teamPlayers;
        setBestBallMatches(updated);
      }}
    />
    {player.name}
  </label>
))}

            </div>
          ))}
        </div>
      ))}

      <h3>Stableford Players</h3>
      {stablefordPlayers.map((entry, index) => {
        const team = teams.find(t => t.name === entry.teamName);
        return (
          <div key={index}>
            <label>{entry.teamName}:</label>
            <select
              value={entry.player}
              onChange={(e) => {
                const updated = [...stablefordPlayers];
                updated[index].player = e.target.value;
                setStablefordPlayers(updated);
              }}
            >
              <option value="">Select Player</option>
              {team?.players.map((p, i) => (
                <option key={i} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        );
      })}


      <button onClick={addDayToFirebase}>Add Day</button>
    </div>
  );
}

export default MatchPlanner;
