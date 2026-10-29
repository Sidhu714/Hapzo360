import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

function SearchSelect({
    id,
    label,
    options,
    selected,
    onSelect,
    placeholder,
    multiple = false,
    allowCustom = false,
    disabled = false,
    customLabel,
    closeOnSelect = false,
    helperText,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const [menuStyle, setMenuStyle] = useState({});

    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const needle = query.trim().toLowerCase();

    const rows = options
        .filter((option) => option.toLowerCase().includes(needle))
        .map((option) => ({ label: option, custom: false }));

    if (
        allowCustom &&
        needle &&
        !options.some((option) => option.toLowerCase() === needle)
    ) {
        rows.push({ label: query.trim(), custom: true });
    }

    const active = Math.min(highlight, Math.max(rows.length - 1, 0));

    const updateMenuPosition = () => {
        const input = inputRef.current;
        if (!input) return;

        const rect = input.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 280 && rect.top > 280;

        setMenuStyle({
            position: 'fixed',
            left: rect.left,
            width: rect.width,
            top: openUpwards ? undefined : rect.bottom + 8,
            bottom: openUpwards ? window.innerHeight - rect.top + 8 : undefined,
            maxHeight: openUpwards
                ? Math.min(rect.top - 16, 320)
                : Math.min(spaceBelow - 16, 320),
        });
    };

    useLayoutEffect(() => {
        if (!open) return;

        updateMenuPosition();

        const handleResize = () => updateMenuPosition();
        const handleScroll = () => updateMenuPosition();

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (
                !rootRef.current?.contains(event.target) &&
                !listRef.current?.contains(event.target)
            ) {
                setOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const list = listRef.current;
        if (!list) return;

        const activeItem = list.querySelector('[data-active="true"]');
        if (!activeItem) return;

        const itemTop = activeItem.offsetTop;
        const itemBottom = itemTop + activeItem.offsetHeight;

        if (itemTop < list.scrollTop) {
            list.scrollTop = itemTop;
        } else if (itemBottom > list.scrollTop + list.clientHeight) {
            list.scrollTop = itemBottom - list.clientHeight;
        }
    }, [active, open]);

    const openList = () => {
        setOpen(true);
        setHighlight(0);
    };

    const closeList = () => {
        setOpen(false);
        setQuery('');
    };

    const choose = (row) => {
        onSelect(row.label);
        setQuery('');
        setHighlight(0);

        if (!multiple || closeOnSelect) {
            setOpen(false);

            if (
                closeOnSelect &&
                window.matchMedia?.('(pointer: coarse)').matches
            ) {
                inputRef.current?.blur();
            }
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();

            if (!open) {
                openList();
            } else {
                setHighlight(Math.min(active + 1, rows.length - 1));
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight(Math.max(active - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();

            if (!open) {
                openList();
            } else if (rows[active]) {
                choose(rows[active]);
            }
        } else if (event.key === 'Tab') {
            if (
                open &&
                allowCustom &&
                !multiple &&
                rows[active]?.custom
            ) {
                onSelect(rows[active].label);
            }

            closeList();
        } else if (event.key === 'Escape') {
            closeList();
        }
    };

    const listId = `${id}-listbox`;

    const inputValue = open
        ? query
        : !multiple
            ? selected[0] ?? ''
            : '';

    const inputPlaceholder = multiple
        ? selected.length
            ? `${selected.length} selected`
            : placeholder
        : open && selected[0]
            ? selected[0]
            : placeholder;

    return (
        <div ref={rootRef} className="relative">
            <label htmlFor={id} className="label mb-2 block">
                {label}
            </label>

            <div className="relative">
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    autoComplete="off"
                    disabled={disabled}
                    value={inputValue}
                    placeholder={inputPlaceholder}
                    onFocus={openList}
                    onClick={() => {
                        if (!open) openList();
                        inputRef.current?.focus();
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setHighlight(0);

                        if (!open) setOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-xl border border-[#dfe7dd] bg-white py-3 pl-4 pr-10 text-sm outline-none focus:border-[#70a879] focus:ring-4 focus:ring-[#70a879]/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                />

                <ChevronDown
                    size={18}
                    className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 transition-transform ${open ? 'rotate-180' : ''
                        }`}
                />
            </div>

            {helperText && !open && (
                <p className="mt-2 text-xs text-stone-500">{helperText}</p>
            )}

            {open &&
                createPortal(
                    <ul
                        id={listId}
                        ref={listRef}
                        role="listbox"
                        aria-multiselectable={multiple || undefined}
                        style={menuStyle}
                        className="z-[9999] overflow-y-auto rounded-xl border border-[#e1e8dc] bg-white p-2 shadow-xl"
                    >
                        {rows.length === 0 && (
                            <li className="px-3 py-2.5 text-sm text-stone-500">
                                No matches found
                            </li>
                        )}

                        {rows.map((row, index) => {
                            const isSelected = selected.includes(row.label);

                            return (
                                <li
                                    key={`${row.custom ? 'new-' : ''}${row.label}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    data-active={index === active}
                                    onMouseEnter={() => setHighlight(index)}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        choose(row);
                                    }}
                                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${index === active ? 'bg-[#eef3e7]' : ''
                                        } ${row.custom
                                            ? 'mt-1 border-t border-[#edf0e9] font-semibold text-[#315844]'
                                            : isSelected
                                                ? 'font-semibold text-[#315844]'
                                                : 'text-[#20372a]'
                                        }`}
                                >
                                    <span>
                                        {row.custom
                                            ? customLabel
                                                ? customLabel(row.label)
                                                : `+ Add "${row.label}" as a new option`
                                            : row.label}
                                    </span>

                                    {isSelected && (
                                        <Check size={15} className="shrink-0" />
                                    )}
                                </li>
                            );
                        })}
                    </ul>,
                    document.body,
                )}
        </div>
    );
}

export default SearchSelect;