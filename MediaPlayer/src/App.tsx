import "./App.css";

function App() {
  return (
    <main className="container">
        <video controls width="640">
          <source src="video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
    </main>
  );
}

export default App;
