import App from "./App";
import { ProjectStatusRoute } from "./components/ProjectStatusRoute";
import "./styles.css";

const PROJECT_STATUS_PATH = "/sproshchenodlamaksuma";

export default function Root() {
  return window.location.pathname === PROJECT_STATUS_PATH
    ? <ProjectStatusRoute />
    : <App />;
}
