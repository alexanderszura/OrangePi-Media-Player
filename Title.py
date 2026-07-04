from dataclasses import dataclass
from enum import Enum


class MediaType(Enum):
    TV = "tv"
    MOVIE = "movie"

class QualityType(Enum):
    LOWEST = "lowest"
    HIGHEST = "HIGHEST"


@dataclass(frozen=True)
class Title:
    name: str
    year: int | None
    img: str | None
    type: MediaType
    id: int

    @property
    def display_text(self) -> str:
        year_text = f" ({self.year})" if self.year else ""
        return f"{self.name}{year_text} - {self.type.value}"