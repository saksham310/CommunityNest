
// export default Dashboard;
// import React from 'react';
// import Sidebar from '../Sidebar/sidebar'; // Import the Sidebar component

// const Dashboard = () => {
//   return (
//     <div className="flex min-h-screen bg-[#f5f6fa]"> {/* .dashboard-container */}
//       <Sidebar />
//       <div className="ml-[280px] p-[30px] w-[calc(100%-280px)]"> {/* .main-content */}
//         {/* Announcement Section */}
//         <div className="bg-white p-5 rounded-xl shadow-lg mb-8"> {/* .announcement-section */}
//           <h2 className="text-2xl text-[#2c3e50] font-semibold mb-4">Announcements</h2> {/* .announcement-section h2 */}
//           <div className="flex flex-col gap-3"> {/* .announcement-list */}
//             <div className="flex items-center gap-3 p-3 bg-[#f9f9f9] rounded-lg"> {/* .announcement-item */}
//               <span className="text-lg">📢</span> {/* .announcement-icon */}
//               <p className="text-sm text-[#555]">New meeting scheduled for Friday at 3 PM in the conference room.</p> {/* .announcement-item p */}
//             </div>
//             <div className="flex items-center gap-3 p-3 bg-[#f9f9f9] rounded-lg"> {/* .announcement-item */}
//               <span className="text-lg">📢</span> {/* .announcement-icon */}
//               <p className="text-sm text-[#555]">Don't forget to submit your monthly reports!</p> {/* .announcement-item p */}
//             </div>
//           </div>
//         </div>

//         {/* Cards Section */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"> {/* .cards-section */}
//           <div className="bg-white p-5 rounded-xl shadow-lg text-center transition-transform hover:translate-y-[-5px] hover:shadow-xl"> {/* .card */}
//             <h3 className="text-lg text-[#34495e] mb-3">Departments</h3> {/* .card h3 */}
//             <p className="text-4xl font-bold text-[#4CAF50]">5</p> {/* .card-value */}
//           </div>
//           <div className="bg-white p-5 rounded-xl shadow-lg text-center transition-transform hover:translate-y-[-5px] hover:shadow-xl"> {/* .card */}
//             <h3 className="text-lg text-[#34495e] mb-3">Members</h3> {/* .card h3 */}
//             <p className="text-4xl font-bold text-[#4CAF50]">25</p> {/* .card-value */}
//           </div>
//           <div className="bg-white p-5 rounded-xl shadow-lg text-center transition-transform hover:translate-y-[-5px] hover:shadow-xl"> {/* .card */}
//             <h3 className="text-lg text-[#34495e] mb-3">Upcoming Events</h3> {/* .card h3 */}
//             <p className="text-4xl font-bold text-[#4CAF50]">3</p> {/* .card-value */}
//           </div>
//           <div className="bg-white p-5 rounded-xl shadow-lg text-center transition-transform hover:translate-y-[-5px] hover:shadow-xl"> {/* .card */}
//             <h3 className="text-lg text-[#34495e] mb-3">Meetings</h3> {/* .card h3 */}
//             <p className="text-4xl font-bold text-[#4CAF50]">2</p> {/* .card-value */}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;
import React from 'react';
import './dashboard.css';
import Sidebar from '../Sidebar/sidebar'; // Import the Sidebar component

const Dashboard = () => {
  return (
    <div className="Dashboard">
      <Sidebar />
      {/* Announcement Section */}
      <div className="Announcement-section">
        <h2>Announcements</h2>
        <div className="Announcement">
          <p>📢 New meeting scheduled for Friday at 3 PM in the conference room.</p>
          <p>📢 Don't forget to submit your monthly reports!</p>
        </div>
      </div>

      {/* Cards Section */}
      <div className="Cards-section">
        <div className="Card">
          <h3>Departments</h3>
          <p>5</p>
        </div>
        <div className="Card">
          <h3>Members</h3>
          <p>25</p>
        </div>
        <div className="Card">
          <h3>Upcoming Events</h3>
          <p>3</p>
        </div>
        <div className="Card">
          <h3>Meetings</h3>
          <p>2</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
