import { useNavigate } from "react-router-dom";
import { GameData, GameImageType } from "../responses";
import { gameImagePath } from "../api";
import "../styles/item-card.css";
import { invoke } from "@tauri-apps/api/core";

interface GameCardProps {
  game: GameData;
}

export function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate();

  const imageUrl = gameImagePath(game.cover, GameImageType.COVER_BIG_2X);

  return (
    <div className="item-card">
      <div
        className="item-card__poster"
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/game/${game.id}`)}
        onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              navigate(`/game/${game.id}`);
            }
          }
        }
      >
        <img src={imageUrl} alt={game.name} />
        <span className="item-card__type">{game.platforms.map(platform => platform.name).join(", ")}</span>
      </div>
      <h3 className="item-card__title">{game.name}</h3>
      <p className="item-card__date">{game.first_release_date}</p>
    </div>
  );
}
