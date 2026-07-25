import { Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center text-lg font-medium">Medical AI Secretary</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
