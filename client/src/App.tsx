import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landing from "./pages/Landing";
import HostSetup from "./pages/HostSetup";
import HostGame from "./pages/HostGame";
import HowToPlay from "./pages/HowToPlay";
import JoinGame from "./pages/JoinGame";
import PlayerGame from "./pages/PlayerGame";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        <Route path="/host/setup" element={<HostSetup />} />
        <Route path="/host/:roomCode" element={<HostGame />} />
        <Route path="/join" element={<JoinGame />} />
        <Route path="/play/:roomCode" element={<PlayerGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
