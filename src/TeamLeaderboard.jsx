// TeamLeaderboard.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

function TeamLeaderboard() {
  const [teamTotals, setTeamTotals] = useState([]);
  const [days, setDays] = useState([]);

  useEffect(() => {
    const fetchScores = async () => {
      const querySnapshot = await getDocs(collection(db, "scores"));

      const scoresByDate = {};

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const matchId = doc.id;
        const [_, date, matchType] = matchId.split("_");
      
        if (!scoresByDate[date]) {
          scoresByDate[date] = [];
        }
      
        if (data.teamPoints) {
          scoresByDate[date].push(data.teamPoints);
        }
      });
      
      const teamScores = {};
      const sortedDates = Object.keys(scoresByDate).sort(); // So Day 1 is earliest
      const dayLabels = sortedDates.map((date, idx) => `Day ${idx + 1}`);
      
      sortedDates.forEach((date, idx) => {
        const matches = scoresByDate[date];
        const dayLabel = `Day ${idx + 1}`;
      
        matches.forEach(teamPoints => {
          Object.entries(teamPoints).forEach(([teamName, scores]) => {
            if (!teamScores[teamName]) {
              teamScores[teamName] = { teamName, total: 0 };
            }
      
            let dayTotal = 0;
      
            if (typeof scores.front9 === 'number' || typeof scores.back9 === 'number') {
              const front = typeof scores.front9 === 'number' ? scores.front9 : 0;
              const back = typeof scores.back9 === 'number' ? scores.back9 : 0;
              dayTotal = front + back;
            } else if (typeof scores.total === 'number') {
              dayTotal = scores.total;
            }
      
            if (!teamScores[teamName][dayLabel]) {
              teamScores[teamName][dayLabel] = 0;
            }
      
            teamScores[teamName][dayLabel] += dayTotal;
            teamScores[teamName].total += dayTotal;
          });
        });
      });
      
      const sorted = Object.values(teamScores).sort((a, b) => b.total - a.total);
      setDays(dayLabels);
      setTeamTotals(sorted);
      
    };
  
    fetchScores();
  }, []);
  

  return (
    <div>
      <h2>Team Leaderboard</h2>
      <table className="header-table">
        <thead>
          <tr>
            <th>Team</th>
            {days.map((day, i) => (
              <th key={i}>{day}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {teamTotals.map((team, index) => (
            <tr
            key={index}
            className={`team-${team.teamName.replace(/\s+/g, '').toLowerCase()}`}
          >    
              <td>{team.teamName}</td>
              {days.map((day, i) => (
                <td key={i}>{team[day] || 0}</td>
              ))}
              <td>{team.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TeamLeaderboard;
