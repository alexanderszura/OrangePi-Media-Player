import { useState, useRef, useEffect, KeyboardEvent, FocusEvent, MouseEvent } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa6";
import "./TVDropdown.css";

export interface DropdownOption<T> {
    label: string;
    value: T;
}

interface TVDropdownProps<T> {
    value: T;
    options: DropdownOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}

export default function TVDropdown<T>({
    value,
    options,
    onChange,
    disabled = false,
    className = "",
}: TVDropdownProps<T>) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    // Auto-focus the selected item when the menu opens
    useEffect(() => {
        if (open && menuRef.current) {
            const selectedEl = menuRef.current.querySelector<HTMLButtonElement>("button.selected")
                || menuRef.current.querySelector<HTMLButtonElement>("button[role='option']");
            selectedEl?.focus();
        }
    }, [open]);

    // BOUNDARY-ONLY TRAP: We only intercept arrow keys at the very top and bottom of the list
    // to prevent spatial nav from escaping into Dropdown 2. Middle items navigate natively without skipping!
    // FULL TRAP: Intercept all vertical arrow keys to manage navigation internally
    // and prevent spatial nav from calculating geometric jumps to nearby components.
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (!open || !menuRef.current) return;

        const items = Array.from(menuRef.current.querySelectorAll<HTMLButtonElement>("button[role='option']"));
        if (items.length === 0) return;

        const currentIndex = items.findIndex(item => item === document.activeElement);

        if (e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            // Wrap to top if at the bottom, otherwise go to next
            const nextIndex = currentIndex === items.length - 1 ? 0 : currentIndex + 1;
            items[nextIndex]?.focus();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            e.stopPropagation();
            // Wrap to bottom if at the top, otherwise go to previous
            const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[prevIndex]?.focus();
        } else if (e.key === "Escape" || e.key === "Tab") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
            buttonRef.current?.focus();
        }
    };

    // Prevents click/focus fallthrough to underlying elements when an item is chosen
    const handleSelect = (e: MouseEvent | KeyboardEvent, val: T) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(val);
        setOpen(false);
        // Short 50ms delay ensures any trailing D-pad click/keyup events finish before focus shifts
        setTimeout(() => {
            buttonRef.current?.focus();
        }, 50);
    };

    // Auto-close if spatial navigation or a mouse click moves focus outside this dropdown component
    const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
        if (!open) return;
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setOpen(false);
        }
    };

    return (
        <div 
            className={`tv-dropdown ${open ? "open" : ""} ${className}`} 
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
        >
            {/* Transparent backdrop intercepts outside pointer clicks */}
            {open && (
                <div 
                    className="tv-dropdown-backdrop" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                        buttonRef.current?.focus();
                    }} 
                />
            )}

            <button
                ref={buttonRef}
                type="button"
                className={`tv-dropdown-button ${open ? "active" : ""}`}
                disabled={disabled}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selectedOption?.label ?? "Select"}</span>
                <FaChevronDown className={`chevron ${open ? "open" : ""}`} />
            </button>

            {open && (
                <div className="tv-dropdown-menu" ref={menuRef} role="listbox">
                    {options.map(option => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`tv-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={(e) => handleSelect(e, option.value)}
                            >
                                <span>{option.label}</span>
                                {isSelected && <FaCheck className="check-icon" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}