import React, { useState } from 'react';
import MatchPlanner from './MatchPlanner';
import SelectMatchDay from './SelectMatchDay';
import ScoreEntry from './ScoreEntry';
import TeamSetup from './TeamSetup';
import SelectMatchType from './SelectMatchType'
import IndividualLeaderboard from './IndividualLeaderboard'
import TeamLeaderboard from './TeamLeaderboard'
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useEffect } from 'react'; 
import './style.css'

function App() {
  const [teams, setTeams] = useState([
    { name: 'Ball Busterz', players: [{ name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }] },
    { name: 'Golden Tees', players: [{ name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }] },
    { name: 'Black Tee Titans', players: [{ name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }] },
    { name: 'Just the Tips', players: [{ name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }] },
  ]);

  const [selectedPlayers, setSelectedPlayers] = useState([]); 
  const [adminStep, setAdminStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(""); 
  const [selectedMatchType, setSelectedMatchType] = useState('');
  const [view, setView] = useState("home");
  const [currentScores, setCurrentScores] = useState({});
  const [currentTeamPoints, setCurrentTeamPoints] = useState(null);


  const saveScoresToFirebase = async (selectedDate, matchType, scores, teamPoints = null) => {
    try {
      console.log("📝 Saving scores:", scores);
      console.log("📝 Team points:", teamPoints);
      console.log("📅 Date:", selectedDate, "Match:", matchType);
  
      if (!selectedDate || !matchType || !scores || Object.keys(scores).length === 0) {
        console.warn("❌ Missing data, skipping save.");
        return;
      }
  
      const scoresRef = doc(db, "scores", `scores_${selectedDate}_${matchType}`);
      await setDoc(scoresRef, {
        scores,
        ...(teamPoints && { teamPoints })
      }, { merge: true });
  
      console.log("✅ Scores saved!");
    } catch (error) {
      console.error("🔥 Error saving scores:", error);
    }
  };
  

  const handleViewChange = async (newView) => {
    if (
      view === "score" &&
      selectedDate &&
      selectedMatchType &&
      currentScores &&
      Object.keys(currentScores).length > 0
    ) {
      await saveScoresToFirebase(selectedDate, selectedMatchType, currentScores, currentTeamPoints);
    }
  
    setView(newView);
  };
  
  useEffect(() => {
    const saveIfValid = async () => {
      if (
        view === "score" &&
        selectedDate &&
        selectedMatchType &&
        currentScores &&
        Object.keys(currentScores).length > 0
      ) {
        await saveScoresToFirebase(selectedDate, selectedMatchType, currentScores, currentTeamPoints);
      }
    };
  
    saveIfValid();
  }, [currentScores, currentTeamPoints]); // 🔁 triggers on score or teamPoints change
  

  return (
    <div>
      <header style={{ borderBottom: "2px solid #ccc", paddingBottom: "10px", marginBottom: "10px" }}>
      <div className="app-header">
        <img src="/dudezlogo.png" alt="Dudez O' Plenty Logo" className="app-logo" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => handleViewChange("home")}>🏠</button>
        <button onClick={() => handleViewChange("individualLeaderboard")}>🏌️‍♂️</button>
        <button onClick={() => handleViewChange("teamLeaderboard")}>🏆🏌️‍♂️🏌️‍♂️🏌️‍♂️</button>
        </div>
        

        {/* ✅ Return to Match button (only show if match is selected) */}
        {selectedDate && selectedMatchType && (
          <div style={{ textAlign: 'center' }}>
          <button onClick={() => setView("score")}>Return to Match</button>
          </div>
        )}
      </header>
  
      {view === "individualLeaderboard" ? (
        <IndividualLeaderboard />

      ) : view === "teamLeaderboard" ? (
        <TeamLeaderboard />

      ) : view === "admin" ? (
        adminStep === 1 ? (
          <TeamSetup teams={teams} setTeams={setTeams} goNext={() => setAdminStep(2)} />
        ) : (
          <MatchPlanner
            teams={teams}
            setTeams={setTeams}
            setSelectedDate={setSelectedDate}
            goBack={() => setAdminStep(1)}
          />
        )

      ) : view === "score" && selectedDate && selectedMatchType ? (
        <ScoreEntry
          players={selectedPlayers}
          selectedDate={selectedDate}
          matchType={selectedMatchType}
          setScoresInApp={setCurrentScores}
          setTeamPointsInApp={setCurrentTeamPoints}
        />

      ) : view === "matchType" && selectedDate ? (
        <SelectMatchType
          selectedDate={selectedDate}
          onSelectMatchType={(matchType) => {
            setSelectedMatchType(matchType);
            setView("score");
          }}
        />

      ) : (
        <SelectMatchDay
          onSelectMatchDay={(date) => {
            setSelectedDate(date);
            setView("matchType");
          }}
          onAdmin={() => setView("admin")}
        />
      )}


    </div>
  );
}

export default App;