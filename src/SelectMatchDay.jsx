import React, { useEffect, useState } from 'react';
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

function SelectMatchDay({ onSelectMatchDay, onAdmin }) {
  const [matchDays, setMatchDays] = useState([]);

  useEffect(() => {
    const fetchMatchDays = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "matches"));
        const days = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMatchDays(days);
      } catch (error) {
        console.error("Error loading match days:", error);
      }
    };

    fetchMatchDays();
  }, []);

  return (
    <div className="container">
      <h2>Select a Match Day</h2>
      {matchDays.map((day, index) => (
        <button key={index} onClick={() => {
          console.log("Clicked match day:", day.date); // ✅ Debug
          onSelectMatchDay(day.date);
        }}>
          {day.date} - {day.course.course_name}
        </button>
      ))}
      <hr />
      <div><strong><h3>LITCHFIELD BEACH AND GOLF RESORT</h3></strong></div>
      <div className="housing-grid">
          <div><strong><h2>CONDO 1</h2></strong></div>
          <div><strong><h2>CONDO 2</h2></strong></div>
          <div><strong><h2>CONDO 3</h2></strong></div>
          <div><strong>JIM RABON</strong></div>
          <div><strong>JESSE BOUK</strong></div>
          <div><strong>KEVIN JOHNSON</strong></div>
          <div><strong>ADAM HALL</strong></div>
          <div><strong>BRIAN ARMADA</strong></div>
          <div><strong>MATTHEW JORDAN</strong></div>
          <div><strong>MIKE ZELI</strong></div>
          <div><strong>RICHARD ARMADA</strong></div>
          <div><strong>JEREMY BENNETT</strong></div>
          <div><strong>KEN CHARETTE</strong></div>
          <div><strong>LUCA BRADLEY</strong></div>
          <div><strong>JAMES POWERS</strong></div>
        </div>
      <hr />

      <div className="admin-button-container">
      <button
        className="admin-button"
        onClick={() => {
          const password = prompt("Enter Admin Password:");
          if (password === "golf2025") {
            onAdmin();
          } else {
            alert("Incorrect password.");
          }
        }}
      >
        Admin
      </button>

      </div>
      </div>

      
      );

}

export default SelectMatchDay;
