import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import { useRef } from "react";


console.log("🔥 ScoreEntry is being rendered");

function ScoreEntry({ selectedDate, matchType, setScoresInApp, setTeamPointsInApp, teamPoints }) {
  const [matchData, setMatchData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teamPlayers, setTeamPlayers] = useState({ team1: [], team2: [] });
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const holes = matchData?.teeBox?.holes || [];

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const matchQuery = query(collection(db, "matches"), where("date", "==", selectedDate));
        const querySnapshot = await getDocs(matchQuery);

        if (!querySnapshot.empty) {
          const match = querySnapshot.docs[0].data();
          setMatchData(match);

          if (matchType === "bestBall1" || matchType === "bestBall2") {
            const matchIndex = matchType === "bestBall1" ? 0 : 1;
            const teams = match.bestBallMatches[matchIndex]?.matchTeams || [];

            const allPlayers = teams.flatMap(team => {
              const teamObj = match.teams.find(t => t.name === team.teamName);
              return team.players.map(playerName => {
                const playerObj = teamObj?.players.find(p => p.name === playerName);
                return {
                  name: playerName,
                  handicap: playerObj?.handicap || 0,
                  teamName: teamObj?.name
                };
              });
            });

            setTeamPlayers({
              team1: teams[0]?.players || [],
              team2: teams[1]?.players || []
            });

            setPlayers(allPlayers);
          }

          if (matchType === "stableford") {
            const stablefordPlayers = match.stablefordPlayers.map(entry => {
              const teamObj = match.teams.find(t => t.name === entry.teamName);
              const playerObj = teamObj?.players.find(p => p.name === entry.player);
              return {
                name: entry.player,
                handicap: playerObj?.handicap || 0,
                teamName: teamObj?.name || ""
              };
            });
            setPlayers(stablefordPlayers);
          }
        } else {
          console.warn("No match data found for selected date:", selectedDate);
        }
      } catch (error) {
        console.error("Error fetching match data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [selectedDate, matchType]);

  useEffect(() => {
    const fetchSavedScores = async () => {
      try {
        const scoreDocRef = doc(db, "scores", `scores_${selectedDate}_${matchType}`);
        const scoreSnap = await getDoc(scoreDocRef);

        if (scoreSnap.exists()) {
          const savedData = scoreSnap.data();
          if (savedData.scores) {
            setScores(savedData.scores);
          }
        }
      } catch (error) {
        console.error("Failed to load saved scores:", error);
      }
    };

    if (selectedDate && matchType) {
      fetchSavedScores();
    }
  }, [selectedDate, matchType]);

  useEffect(() => {
    if (setScoresInApp) {
      setScoresInApp(scores);
    }
  }, [scores]);

  useEffect(() => {
    if (
      setTeamPointsInApp &&
      (matchType === "bestBall1" || matchType === "bestBall2") &&
      matchData &&
      teamPlayers.team1.length > 0 &&
      teamPlayers.team2.length > 0
    ) {
      const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
      const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));

      const teamNames = [
        matchData.bestBallMatches[matchType === "bestBall1" ? 0 : 1]?.matchTeams[0]?.teamName,
        matchData.bestBallMatches[matchType === "bestBall1" ? 0 : 1]?.matchTeams[1]?.teamName
      ];

      const teamPoints = {
        [teamNames[0]]: {
          front9: front9?.team1 ?? "-",
          back9: back9?.team1 ?? "-",
        },
        [teamNames[1]]: {
          front9: front9?.team2 ?? "-",
          back9: back9?.team2 ?? "-",
        }
      };

      setTeamPointsInApp(teamPoints);
    }
  }, [scores, matchType, matchData, teamPlayers]);

  useEffect(() => {
    if (matchType === "stableford" && matchData && players.length > 0) {
      const teamTotals = {};
  
      matchData.stablefordPlayers.forEach(({ teamName, player }) => {
        const playerObj = players.find(p => p.name === player);
        if (!playerObj) return;
  
        const totalPoints = getStablefordPoints(player, parseInt(playerObj.handicap));
  
        // 🔢 Convert individual player points into tiered team points
        let teamPoints = 0;
        if (totalPoints >= 18.5) teamPoints = 3;
        else if (totalPoints >= 12.5) teamPoints = 2;
        else if (totalPoints >= 6.5) teamPoints = 1;
        else if (totalPoints >= 0.5) teamPoints = 0.5;
  
        if (!teamTotals[teamName]) {
          teamTotals[teamName] = { total: 0 };
        }
  
        teamTotals[teamName].total += teamPoints;
      });
  
      console.log("🔥 Stableford teamPoints (tiered):", teamTotals);
      setTeamPointsInApp(teamTotals);
    }
  }, [scores, matchData, players, matchType]);

  const scorecardRef = useRef(null);
  
  const updateScore = (playerName, holeIndex, grossScore) => {
    const gross = parseInt(grossScore);
    if (isNaN(gross)) return;
  
    const player = players.find(p => p.name === playerName);
    const handicap = parseInt(player?.handicap || 0);
    const holeHcp = holes[holeIndex]?.handicap || 0;
  
    let strokes = 0;
    if (handicap >= holeHcp) strokes = 1;
    if (handicap >= holeHcp + 18) strokes = 2;
  
    const net = gross - strokes;
  
    setScores((prev) => ({
      ...prev,
      [playerName]: {
        ...prev[playerName],
        [holeIndex]: {
          gross,
          net
        }
      }
    }));
  };
  

  if (loading) return <p>Loading match...</p>;
  if (!matchData) return <p>No match data found.</p>;
  

  const getGrossTotal = (playerName) => {
    const playerScores = scores[playerName] || {};
    return holes.reduce((total, _, i) => {
      const scoreObj = playerScores[i];
      return total + (parseInt(scoreObj?.gross) || 0);
    }, 0);
  };
  

  const getNetTotal = (playerName) => {
    const playerScores = scores[playerName] || {};
    return holes.reduce((total, _, i) => {
      const scoreObj = playerScores[i];
      return total + (parseInt(scoreObj?.net) || 0);
    }, 0);
  };
  

  const getStablefordPoints = (playerName) => {
    if (matchType !== "stableford") return null;
  
    const playerScores = scores[playerName] || {};
    return holes.reduce((points, hole, i) => {
      const net = playerScores[i]?.net;
      if (net == null || isNaN(net)) return points;
  
      const diff = net - hole.par;
  
      if (diff >= 2) return points - 1;
      if (diff === 1) return points + 0;
      if (diff === 0) return points + 0.5;
      if (diff === -1) return points + 1;
      if (diff === -2) return points + 2;
      if (diff === -3) return points + 3;
      if (diff <= -4) return points + 4;
  
      return points;
    }, 0);
  };
  

  const getNetScore = (playerName, holeIndex) => {
    const net = scores[playerName]?.[holeIndex]?.net;
    return isNaN(net) ? null : net;
  };
  

  const getTeamBestBallScore = (playerNames, holeIndex) => {
    const netScores = playerNames.map(name => getNetScore(name, holeIndex)).filter(score => score !== null);
    return netScores.length ? Math.min(...netScores) : null;
  };

  const getTeamScore = (team1, team2, holesRange) => {
    let team1Total = 0;
    let team2Total = 0;
    let holesPlayed = 0;

    for (let i of holesRange) {
      const team1Best = getTeamBestBallScore(team1, i);
      const team2Best = getTeamBestBallScore(team2, i);

      if (team1Best !== null && team2Best !== null) {
        holesPlayed++;
        if (team1Best < team2Best) team1Total++;
        else if (team2Best < team1Best) team2Total++;
      }
    }

    if (holesPlayed === 0) return null;
    if (team1Total > team2Total) return { team1: 1, team2: 0 };
    if (team2Total > team1Total) return { team1: 0, team2: 1 };
    return { team1: 0.5, team2: 0.5 };
  };

  const saveScoresToFirebase = async () => {
    try {
      const scoresRef = doc(db, "scores", `scores_${selectedDate}_${matchType}`);
      let teamPoints = null;

      if (matchType === "bestBall1" || matchType === "bestBall2") {
        const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
        const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));

        const teamNames = [
          matchData.bestBallMatches[matchType === "bestBall1" ? 0 : 1]?.matchTeams[0]?.teamName,
          matchData.bestBallMatches[matchType === "bestBall1" ? 0 : 1]?.matchTeams[1]?.teamName
        ];

        teamPoints = {
          [teamNames[0]]: {
            front9: front9.team1,
            back9: back9.team1,
          },
          [teamNames[1]]: {
            front9: front9.team2,
            back9: back9.team2,
          }
        };
      }

      console.log("Saving to Firebase:", {
        scores,
        teamPoints
      });

      const scoresWithTeamNames = {};

      players.forEach(player => {
        const name = player.name;
        if (!scores[name]) return;
        scoresWithTeamNames[name] = {
          ...scores[name],
          teamName: player.teamName || null
        };
      });

      await setDoc(scoresRef, {
        scores: scoresWithTeamNames,
        ...(teamPoints && { teamPoints })
      }, { merge: true });


      alert("Scores and team points saved!");
    } catch (error) {
      console.error("Error saving scores:", error);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
  
    const wsData = [
      ["Hole", "Yards", "Par", "HCP", ...players.map(p => p.name)],
    ];
  
    holes.forEach((hole, idx) => {
      const row = [
        idx + 1,
        hole.yardage,
        hole.par,
        hole.handicap,
        ...players.map(p => {
          const gross = scores[p.name]?.[idx]?.gross ?? "";
          const net = scores[p.name]?.[idx]?.net ?? "";
          return `${gross}${net !== "" ? ` (${net})` : ""}`;
        })
      ];
      wsData.push(row);
    });
  
    // Add total scores row
    const totalRow = [
      "Total",
      "", "", "",
      ...players.map(p =>
        `${getGrossTotal(p.name)} / ${getNetTotal(p.name, parseInt(p.handicap))}`
      )
    ];
    wsData.push([]);
    wsData.push(totalRow);
  
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Scorecard");
  
    XLSX.writeFile(wb, `scorecard_${selectedDate}_${matchType}.xlsx`);
  };

  const exportScorecardAsImage = async () => {
    const scorecard = scorecardRef.current;
    if (!scorecard) return;
  
    const scrollableBody = scorecard.querySelector(".scrollable-body");
    if (!scrollableBody) return;
  
    // Save original styles
    const originalScrollOverflow = scrollableBody.style.overflow;
    const originalScrollMaxHeight = scrollableBody.style.maxHeight;
  
    // Expand scrollable content
    scrollableBody.style.overflow = "visible";
    scrollableBody.style.maxHeight = "none";
  
    try {
      const canvas = await html2canvas(scorecard, {
        scale: 2,
        useCORS: true,
        windowWidth: scorecard.scrollWidth
      });
  
      const link = document.createElement("a");
      link.download = `scorecard_${selectedDate}_${matchType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to export image:", error);
    } finally {
      // Restore original scroll
      scrollableBody.style.overflow = originalScrollOverflow;
      scrollableBody.style.maxHeight = originalScrollMaxHeight;
    }
  };
  
  
  
  

  const bestBallStatusBlock = (() => {
    if (!(matchType === "bestBall1" || matchType === "bestBall2") || !matchData?.bestBallMatches) return null;

    const matchIndex = matchType === "bestBall1" ? 0 : 1;
    const matchTeams = matchData.bestBallMatches[matchIndex]?.matchTeams;
    if (!matchTeams || matchTeams.length < 2) return null;

    const teamNames = [matchTeams[0].teamName, matchTeams[1].teamName];
    const front9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()]);
    const back9 = getTeamScore(teamPlayers.team1, teamPlayers.team2, [...Array(9).keys()].map(i => i + 9));

    return (
      <div className="match-status">
        <h4>
          Front 9 – {teamNames[0]}: {front9 ? front9.team1 : "-"} | {teamNames[1]}: {front9 ? front9.team2 : "-"}
        </h4>
        <h4>
          Back 9 – {teamNames[0]}: {back9 ? back9.team1 : "-"} | {teamNames[1]}: {back9 ? back9.team2 : "-"}
        </h4>
      </div>
    );    
  })();

  return (
    <div className="container" ref={scorecardRef}>

      <div className="course-details">
        <h3>{matchData.course.course_name}</h3>
        <p>{matchData.teeBox.tee_name} - {matchData.teeBox.total_yards} yards</p>
      </div>

      {bestBallStatusBlock}

      
      {matchType === "stableford" && teamPoints && (
        <div className="stableford-team-grid">
          {Object.entries(teamPoints).map(([teamName, value]) => (
            <div key={teamName} className={`team-score-box ${
              teamName === "Ball Busterz" ? "team-red" :
              teamName === "Golden Tees" ? "team-gold" :
              teamName === "Black Tee Titans" ? "team-black" :
              teamName === "Just the Tips" ? "team-blue" : ""
            }`}>
              <span className="team-name">{teamName}: </span>
              <span className="team-points">{value.total} pts</span>
            </div>
          ))}
        </div>
      )}

      {matchType === "stableford" && (
        <div className="stableford-breakdown-grid">
          <div><strong>+2 = -1</strong> / +1 = 0</div>
          <div><strong>E = +0.5</strong> / -1 = +1</div>
          <div><strong>-2 = +2</strong> / -3 = +3</div>
          <div><strong>0.5–6 pts:</strong> 0.5 team point</div>
          <div><strong>6.5–9 pts:</strong> 1 team point</div>
          <div><strong>9.5–12 pts:</strong> 1.5 team point</div>
          <div><strong>12.5–15 pts:</strong> 2 team points</div>
          <div><strong>15.5–18 pts:</strong> 2.5 team points</div>
          <div><strong>18.5+ pts:</strong> 3 team points</div>
        </div>
      )}

    <div className="scorecard-wrapper">
      <table border="1" className="header-table">
      <colgroup>
        <col className="narrow-column" />
        <col className="narrow-column" />
        <col className="narrow-column" />
        <col className="narrow-column" />
        {players.map((_, idx) => (
          <col key={idx} className="player-column" />
        ))}
      </colgroup>

        <thead>
          <tr>
            <th colSpan="4" style={{ textAlign: 'right' }}>Total:</th>
            {players.map((p, idx) => (
              <th key={idx} className="player-total">
                {getGrossTotal(p.name)} / {getNetTotal(p.name, parseInt(p.handicap))}
                {matchType === "stableford" && ` / ${getStablefordPoints(p.name)} pts`}
              </th>
            ))}
          </tr>
          <tr>
            <th>Hole</th>
            <th>Yrds</th>
            <th>Par</th>
            <th>HCP</th>
            {players.map((p, idx) => (
              <th
                key={idx}
                className={`player-name-header ${
                  p.teamName === "Ball Busterz" ? "team-red" :
                  p.teamName === "Golden Tees" ? "team-gold" :
                  p.teamName === "Black Tee Titans" ? "team-black" :
                  p.teamName === "Just the Tips" ? "team-blue" : ""
                }`}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        </table>
          {/* Table 2: Scrollable body */}
        <div className="scrollable-body">
          <table className="body-table">
          <colgroup>
            <col className="narrow-column" />
            <col className="narrow-column" />
            <col className="narrow-column" />
            <col className="narrow-column" />
            {players.map((_, idx) => (
              <col key={idx} className="player-column" />
            ))}
          </colgroup>

        <tbody>
          {holes.map((hole, idx) => (
            <tr key={idx}>
              <td className="narrow-column">{idx + 1}</td>
              <td className="narrow-column">{hole.yardage}</td>
              <td className="narrow-column">{hole.par}</td>
              <td className="narrow-column">{hole.handicap}</td>
              {players.map((p) => {
                const gross = scores[p.name]?.[idx]?.gross ?? "";
                const net = scores[p.name]?.[idx]?.net ?? "";
                

                let points = "";
                if (matchType === "stableford" && net !== "") {
                  const diff = net - hole.par;
                  if (diff >= 2) points = -1;
                  else if (diff === 1) points = 0;
                  else if (diff === 0) points = 0.5;
                  else if (diff === -1) points = 1;
                  else if (diff === -2) points = 2;
                  else if (diff === -3) points = 3;
                  else if (diff <= -4) points = 4;
                }

                return (
                  <td key={p.name}>
                    
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="score-input"
                      value={scores[p.name]?.[idx]?.gross || ""}
                      onChange={(e) => updateScore(p.name, idx, e.target.value)}
                    />
                    
                    <div style={{ fontSize: "0.75em", color: "gray" }}>
                      {net !== "" && <>Net: {net}</>}
                      {matchType === "stableford" && net !== "" && (
                        <>
                          <br />
                          Pts: {points}
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>

      {/*<button onClick={saveScoresToFirebase}>Save Scores</button> */}
      <button onClick={exportToExcel}>Download Excel</button>
      <button onClick={exportScorecardAsImage}>Download Image</button>


    
    </div>
  );
}

export default ScoreEntry;
