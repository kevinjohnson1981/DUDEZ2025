import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function SelectMatchType({ selectedDate, onSelectMatchType }) {
  const [matchData, setMatchData] = useState(null);

  // ✅ Fetch the match data for the selected date
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const matchQuery = query(collection(db, "matches"), where("date", "==", selectedDate));
        const querySnapshot = await getDocs(matchQuery);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setMatchData(data);
          console.log("Match Data Loaded:", data); // ✅ Debugging
        } else {
          console.warn("No match found for selected date");
        }
      } catch (error) {
        console.error("Error fetching match data:", error);
      }
    };

    fetchMatch();
  }, [selectedDate]);

  // ✅ When a match type is selected, extract players and send back
  const handleMatchTypeSelect = (matchType) => {
    if (!matchData) return;

    let players = [];

    if (matchType === "bestBall1") {
      const match = matchData.bestBallMatches[0];
      players = match.matchTeams.flatMap(team =>
        team.players.map(name => ({ name }))
      );
    } else if (matchType === "bestBall2") {
      const match = matchData.bestBallMatches[1];
      players = match.matchTeams.flatMap(team =>
        team.players.map(name => ({ name }))
      );
    } else if (matchType === "stableford") {
      players = matchData.stablefordPlayers.map(entry => ({ name: entry.player }));
    }

    onSelectMatchType(matchType, players);
  };

  return (
    <div>
      <h2>Select Match Type for {selectedDate}</h2>
    <div className="vertical-button-stack">
      <button onClick={() => handleMatchTypeSelect("bestBall1")}>
        Match 1 - Best Ball
      </button>
      <button onClick={() => handleMatchTypeSelect("bestBall2")}>
        Match 2 - Best Ball
      </button>
      <button onClick={() => handleMatchTypeSelect("stableford")}>
        Stableford
      </button>
      </div>
    </div>
  );
}

export default SelectMatchType;
