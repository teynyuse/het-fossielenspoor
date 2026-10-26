import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import ScanPage from "./pages/ScanPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ScanPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="*"
          element={<Navigate replace to="/" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
