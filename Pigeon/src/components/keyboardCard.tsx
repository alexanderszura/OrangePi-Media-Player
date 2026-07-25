import { FaDeleteLeft, FaXmark } from "react-icons/fa6";

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

export default function Keyboard({ keyCallback, delCallback, clearCallback }: KeyboardProps) {
    return (
        <div className="keyboard">
            {keys.map((row, i) => (
                <div className="keyboard-row" key={i}>
                    {row.map((key) => {
                        const isSpace = key === "space";
                        const isAction = key === "del" || key === "clear";

                        return (
                            <button
                                type="button"
                                className={`key${isSpace ? " key--space" : ""}${isAction ? " key--action" : ""}`}
                                key={key}
                                aria-label={
                                    key === "del" ? "Delete" :
                                    key === "clear" ? "Clear" :
                                    key === "space" ? "Space" :
                                    key
                                }
                                onClick={() => {
                                    if (key === "del") return delCallback();
                                    if (key === "clear") return clearCallback();
                                    if (key === "space") return keyCallback(" ");

                                    keyCallback(key);
                                }}
                            >
                                {key === "del" ? (
                                    <FaDeleteLeft />
                                ) : key === "clear" ? (
                                    <FaXmark />
                                ) : key === "space" ? (
                                    "Space"
                                ) : (
                                    key
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
