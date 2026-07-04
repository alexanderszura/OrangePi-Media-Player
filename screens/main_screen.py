from collections.abc import Callable
from pathlib import Path

from PySide6.QtCore import QObject, QThread, Signal, Slot
from PySide6.QtUiTools import loadUiType

from Title import Title

UI_PATH = Path(__file__).resolve().parents[1] / "UI" / "MainScreen.ui"
MainScreenUi, MainScreenBase = loadUiType(str(UI_PATH))


class SearchWorker(QObject):
    results_ready = Signal(list)
    search_failed = Signal(str)
    finished = Signal()

    def __init__(self, query: str, search_provider: Callable[[str], list[Title]]) -> None:
        super().__init__()
        self._query = query
        self._search_provider = search_provider

    @Slot()
    def run(self) -> None:
        try:
            self.results_ready.emit(self._search_provider(self._query))
        except Exception as exc:
            self.search_failed.emit(str(exc))
        finally:
            self.finished.emit()


class MainScreen(MainScreenBase, MainScreenUi):
    def __init__(self, search_provider: Callable[[str], list[Title]]) -> None:
        super().__init__()
        self.setupUi(self)

        self._search_provider = search_provider
        self._search_thread: QThread | None = None
        self._search_worker: SearchWorker | None = None

        self.searchButton.clicked.connect(self.search)
        self.searchBox.returnPressed.connect(self.search)

    @Slot()
    def search(self) -> None:
        query = self.searchBox.text().strip()
        if not query:
            self._show_status("Enter a title to search for.")
            self.searchBox.setFocus()
            return

        if self._search_thread and self._search_thread.isRunning():
            return

        self._set_searching(True)
        self.resultsList.clear()
        self._show_status(f'Searching for "{query}"...')

        worker = SearchWorker(query, self._search_provider)
        thread = QThread(self)
        worker.moveToThread(thread)

        thread.started.connect(worker.run)
        worker.results_ready.connect(self._show_results)
        worker.search_failed.connect(self._show_error)
        worker.finished.connect(thread.quit)
        worker.finished.connect(worker.deleteLater)
        thread.finished.connect(thread.deleteLater)
        thread.finished.connect(self._search_finished)

        self._search_thread = thread
        self._search_worker = worker
        thread.start()

    @Slot(list)
    def _show_results(self, titles: list[Title]) -> None:
        self.resultsList.clear()

        if not titles:
            self._show_status("No results found.")
            return

        for title in titles:
            self.resultsList.addItem(title.display_text)

        self._show_status(f"Found {len(titles)} result(s).")

    @Slot(str)
    def _show_error(self, message: str) -> None:
        self.resultsList.clear()
        self._show_status(f"Search failed: {message}")

    @Slot()
    def _search_finished(self) -> None:
        self._set_searching(False)
        self._search_thread = None
        self._search_worker = None

    def _set_searching(self, is_searching: bool) -> None:
        self.searchButton.setEnabled(not is_searching)
        self.searchBox.setEnabled(not is_searching)

    def _show_status(self, message: str) -> None:
        self.statusLabel.setText(message)
        self.statusbar.showMessage(message, 5000)
