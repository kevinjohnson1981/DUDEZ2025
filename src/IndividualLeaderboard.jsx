import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { onSnapshot } from "firebase/firestore";

function IndividualLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const PAR = 72; // or change if your event uses a different par

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "scores"), (querySnapshot) => {
      const allScores = [];
  
      querySnapshot.forEach(doc => {
        const data = doc.data();
        const matchId = doc.id;
        const [_, date, matchType] = matchId.split("_");
        allScores.push({ date, matchType, ...data });
      });
  
      const playerTotals = {};
  
      allScores.forEach(scoreDoc => {
        const { scores, teamPoints, matchType } = scoreDoc;
        if (!scores) return;
      
        Object.entries(scores).forEach(([playerName, holeScores]) => {
          if (!playerTotals[playerName]) {
            // ✅ Try to find team this player is on
            const teamName = holeScores.teamName || null;

      
            playerTotals[playerName] = {
              name: playerName,
              team: teamName, // ✅ attach team name
              days: {},
              netTotal: 0,
              grossTotal: 0
            };
          }
      
          console.log("✅ Player Totals:", playerTotals);
  
          let gross = 0;
          let net = 0;
  
          Object.entries(holeScores).forEach(([holeIdx, value]) => {
            if (typeof value === "object" && value !== null) {
              const grossScore = parseInt(value.gross);
              const netScore = parseInt(value.net);
          
              if (!isNaN(grossScore)) gross += grossScore;
              if (!isNaN(netScore)) net += netScore;
            } else {
              // fallback for older data
              const score = parseInt(value);
              if (!isNaN(score)) {
                gross += score;
                net += score;
              }
            }
          });
          
  
          const label = `Day ${Object.keys(playerTotals[playerName].days).length + 1}`;
          playerTotals[playerName].days[label] = { gross, net };
          playerTotals[playerName].grossTotal += gross;
          playerTotals[playerName].netTotal += net;
        });
      });
  
      const formatted = Object.values(playerTotals)
        .sort((a, b) => a.netTotal - b.netTotal)
        .map(player => ({
          name: player.name,
          scoresByDay: player.days,
          totalGross: player.grossTotal,
          totalNet: player.netTotal
        }));

      
      setLeaderboardData(formatted);
      setLoading(false);
      
    });

  
    return () => unsubscribe(); // Clean up listener when component unmounts
  }, []);

  if (loading) return <p>Loading leaderboard...</p>;

  const allDates = Array.from(
    new Set(
      leaderboardData.flatMap(p => Object.keys(p.scoresByDay))
    )
  ).sort();

  return (
    <div>
      <h2>Individual Leaderboard</h2>
      <table border="1" className="header-table">
        <thead>
          <tr>
            <th>Player</th>
            {allDates.map(date => (
              <th key={date}>{date}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {leaderboardData.map((player, idx) => (
            <tr key={idx} className={player.team ? `team-${player.team.replace(/\s+/g, '').toLowerCase()}` : ''}>
              <td>{player.name}</td>
              {allDates.map(date => {
                const score = player.scoresByDay[date];
                return (
                  <td key={date}>
                    {score
                      ? `${score.gross}  /  ${score.net} (${score.net - PAR >= 0 ? "+" : ""}${score.net - PAR})`
                      : '-'}
                  </td>
                );
              })}
              <td>
                {player.totalNet - PAR * allDates.length >= 0 ? "+" : ""}
                {player.totalNet - PAR * allDates.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default IndividualLeaderboard;
