import React, { useEffect } from 'react';
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

function TeamSetup({ teams, setTeams, goNext }) {

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
  }, [setTeams]); // ✅ Only fetch when `setTeams` changes

  return (
    <div>
      <h1>Team Setup</h1>
      {teams.length > 0 ? (
        teams.map((team, index) => (
          <div key={index} style={{ border: "1px solid black", padding: "10px", margin: "10px 0" }}>
            <h3>Team {index + 1}: {team.name}</h3>
            {team.players.map((player, pIndex) => (
              <div key={pIndex} style={{ marginBottom: "5px" }}>
                <input
                  type="text"
                  placeholder={`Player ${pIndex + 1} Name`}
                  value={player.name}
                  onChange={(e) => {
                    const updatedTeams = [...teams];
                    updatedTeams[index].players[pIndex].name = e.target.value;
                    setTeams(updatedTeams);
                  }}
                />
                <input
                  type="number"
                  placeholder="Handicap"
                  value={player.handicap}
                  onChange={(e) => {
                    const updatedTeams = [...teams];
                    updatedTeams[index].players[pIndex].handicap = e.target.value;
                    setTeams(updatedTeams);
                  }}
                />
              </div>
            ))}
          </div>
        ))
      ) : (
        <p>Loading teams...</p>
      )}

      <button onClick={goNext}>Continue to Match Setup</button>
    </div>
  );
}

export default TeamSetup;
