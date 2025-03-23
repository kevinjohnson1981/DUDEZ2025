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

      <div className="admin-button-container">
        <button className="admin-button" onClick={onAdmin}>
          Admin
        </button>
      </div>
      </div>

      
      );

}

export default SelectMatchDay;
