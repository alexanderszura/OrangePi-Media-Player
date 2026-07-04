import sys

from PySide6.QtWidgets import QApplication

from mediaGrabber import search
from screens.main_screen import MainScreen


class Gui:
    def __init__(self) -> None:
        self._main_screen = MainScreen(search_provider=search)

    def show(self) -> None:
        self._main_screen.show()


def main() -> int:
    app = QApplication(sys.argv)
    gui = Gui()
    gui.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
