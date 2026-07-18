const keys = [
    ["a", "b", "c", "d", "e", "f", "g"],
    ["h", "i", "j", "k", "l", "m", "n"],
    ["o", "p", "q", "r", "s", "t", "u"],
    ["v", "w", "x", "y", "z", "clear", "space", "del"],
];

interface KeyboardProps {
    keyCallback: (key: string) => void;
    delCallback: () => void;
    clearCallback: () => void;
}

export default function Keyboard({ keyCallback, delCallback, clearCallback}: KeyboardProps) {
    return (
        <div className="keyboard">
            {keys.map((row, i) => (
                <div className="keyboard-row" key={i}>
                    {row.map((key) => (
                        <button
                            className="key"
                            key={key.toUpperCase()}
                            onClick={() => {
                                if (key == "del")
                                    return delCallback()
                                if (key == "clear")
                                    return clearCallback();

                                keyCallback(key)
                            }}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
}