import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Undo, Redo } from 'lucide-react';
import './Game.css';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 10;

const BLOCK_CATEGORIES = {
    vast: {
        name: 'Vast',
        blocks: [
            { id: 'wall', name: 'Muur', className: 'wall', solid: true },
            { id: 'water', name: 'Water', className: 'water', hazard: true },
            { id: 'grass', name: 'Gras', className: 'grass' }
        ]
    },
    interactief: {
        name: 'Interactief',
        blocks: [
            { id: 'door', name: 'Deur', className: 'door', interactive: true },
            { id: 'key', name: 'Sleutel', className: 'key', collectible: true }
        ]
    },
    items: {
        name: 'Items',
        blocks: [
            { id: 'coin', name: 'Munt', className: 'coin', collectible: true, points: 10 },
            { id: 'gem', name: 'Diamant', className: 'gem', collectible: true, points: 50 }
        ]
    }
};

const Game = () => {
    const [grid, setGrid] = useState([]);
    const [mode, setMode] = useState('edit');
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [status, setStatus] = useState('');
    const [history, setHistory] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const placeSound = new Audio(process.env.PUBLIC_URL + '/sounds/place.mp3');
    const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
    const categoryKeys = Object.keys(BLOCK_CATEGORIES);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const lastAnnouncedPosition = useRef({ x: -1, y: -1 });
    const announceTimeoutRef = useRef(null);

    const activeCategory = BLOCK_CATEGORIES[categoryKeys[activeCategoryIndex]];

    // const cellSounds = {
    //     empty: new Audio(process.env.PUBLIC_URL + '/sounds/empty.mp3'),
    //     wall: new Audio(process.env.PUBLIC_URL + '/sounds/wall.mp3'),
    //     water: new Audio(process.env.PUBLIC_URL + '/sounds/water.mp3'),
    //     grass: new Audio(process.env.PUBLIC_URL + '/sounds/grass.mp3'),
    //     // Add more cell types as needed
    // };

    // const playCellSound = (cellType) => {
    //     const sound = cellSounds[cellType];
    //     if (sound) {
    //         sound.currentTime = 0; // Reset audio to the beginning
    //         sound.play().catch(e => console.log('Audio play failed:', e));
    //     }
    // };

    useEffect(() => {
        const newGrid = Array(GRID_HEIGHT).fill().map(() =>
            Array(GRID_WIDTH).fill().map(() => ({
                type: 'empty',
                className: '',
                properties: {},
                items: []
            }))
        );
        setGrid(newGrid);
    }, []);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDrawing(false);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);

    useEffect(() => {
        if (grid.length > 0) {
            saveToHistory(grid);
        }
    }, []);

    const announce = (message) => {
        setStatus(message);
    };

    const playSound = () => {
        placeSound.currentTime = 0; // Reset audio to the beginning
        placeSound.volume = isMuted ? 0 : volume; // Set volume based on mute state
        placeSound.play().catch(e => console.log('Audio play failed:', e));
    };

    const saveToHistory = useCallback((newGrid) => {
        setHistory(prev => {
            // Verwijder alle stappen na de huidige stap als we een nieuwe actie doen
            const newHistory = prev.slice(0, currentStep + 1);
            return [...newHistory, newGrid];
        });
        setCurrentStep(prev => prev + 1);
    }, [currentStep]);

    const placeBlock = useCallback((x, y) => {
        if (!selectedBlock) return;
    
        setGrid(prevGrid => {
            const newGrid = JSON.parse(JSON.stringify(prevGrid));
            newGrid[y][x] = {
                type: selectedBlock.id,
                className: selectedBlock.className,
                properties: { ...selectedBlock }
            };
            saveToHistory(newGrid);
            playSound(); // Speel geluid af bij plaatsing
            return newGrid;
        });
    
        announce(`${selectedBlock.name} geplaatst op rij ${y + 1}, kolom ${x + 1}`);
    }, [selectedBlock, saveToHistory]);

    const startDrawing = (x, y) => {
        if (mode === 'edit' && selectedBlock) {
            setIsDrawing(true);
            placeBlock(x, y);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const handleCellHover = (x, y) => {
        if (isDrawing && mode === 'edit' && selectedBlock) {
            placeBlock(x, y);
        }
    };

    const undo = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            setGrid(JSON.parse(JSON.stringify(history[currentStep - 1])));
        }
    };

    const redo = () => {
        if (currentStep < history.length - 1) {
            setCurrentStep(prev => prev + 1);
            setGrid(JSON.parse(JSON.stringify(history[currentStep + 1])));
        }
    };

    const resetGrid = () => {
        const newGrid = Array(GRID_HEIGHT).fill().map(() =>
            Array(GRID_WIDTH).fill().map(() => ({
                type: 'empty',
                className: '',
                properties: {},
                items: []
            }))
        );
        setGrid(newGrid);
        saveToHistory(newGrid);
    };

    const announcePosition = (x, y) => {
        const message = `Je staat op vakje ${y + 1}, ${x + 1}`; // Announce the position
        const speech = new SpeechSynthesisUtterance(message);
        speech.lang = 'nl-NL'; // Set language to Dutch
        window.speechSynthesis.speak(speech); // Speak the message
    };

    const announceCellType = (cellType) => {
        const messages = {
            wall: "Je bent tegen een muur aangelopen.",
            water: "Je loopt over water.",
            grass: "Je loopt over gras.",
            // Add more cell types as needed
            // empty: "Dit is een leeg vakje."
        };
        const message = messages[cellType];
        const speech = new SpeechSynthesisUtterance(message);
        speech.lang = 'nl-NL'; // Set language to Dutch
        window.speechSynthesis.speak(speech); // Speak the message
    };

    const movePlayer = useCallback((dx, dy) => {
        if (mode !== 'play') return;

        setPlayerPos(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;

            // Check boundaries
            if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
                return prev;
            }

            // Check collision
            const targetCell = grid[newY][newX];
            if (!grid[newY] || !grid[newY][newX]) {
                return prev;
            }

            if (targetCell?.properties?.solid) {
                announceCellType(targetCell.type); // Announce the cell type if it's solid
                return prev; // Prevent movement
            }

            // Announce the cell type when passing over
            announceCellType(targetCell.type);

            // Only announce if the position has changed
            if (newX !== lastAnnouncedPosition.current.x || newY !== lastAnnouncedPosition.current.y) {
                // Clear the previous announce timeout if it exists
                if (announceTimeoutRef.current) {
                    clearTimeout(announceTimeoutRef.current);
                }

                // Set a new timeout to announce the position after a short delay
                announceTimeoutRef.current = setTimeout(() => {
                    announcePosition(newX, newY);
                    lastAnnouncedPosition.current = { x: newX, y: newY };
                }, 1000); // Adjust the delay as needed (1000 ms = 1 second)
            }

            return { x: newX, y: newY };
        });
    }, [mode, grid]);

    const handleKeyDown = useCallback((e) => {
        if (mode === 'play') {
            e.preventDefault();
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                    movePlayer(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                    movePlayer(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                    movePlayer(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                    movePlayer(1, 0);
                    break;
                default:
                    break;
            }
        }
    }, [mode, movePlayer]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const renderGrid = () => {
        return Array(GRID_HEIGHT).fill().map((_, y) => 
            Array(GRID_WIDTH).fill().map((_, x) => {
                const cell = grid[y]?.[x] || { type: 'empty', className: '' };
                return (
                    <div
                        key={`${x}-${y}`}
                        className={`cell ${cell.className}`}
                        onMouseDown={() => startDrawing(x, y)}
                        onMouseEnter={() => handleCellHover(x, y)}
                        onMouseUp={stopDrawing}
                        role="gridcell"
                        aria-row={y}
                        aria-col={x}
                    >
                        {mode === 'play' && playerPos.x === x && playerPos.y === y && (
                            <div className="player" />
                        )}
                    </div>
                );
            })
        ).flat();
    };

    const nextCategory = () => {
        setActiveCategoryIndex((prevIndex) => (prevIndex + 1) % categoryKeys.length);
    };

    const prevCategory = () => {
        setActiveCategoryIndex((prevIndex) => (prevIndex - 1 + categoryKeys.length) % categoryKeys.length);
    };

    const startGame = () => {
        // Toggle tussen edit en play mode
        setMode(prevMode => prevMode === 'play' ? 'edit' : 'play');
        // Alleen reset player position als we naar play mode gaan
        if (mode === 'edit') {
            setPlayerPos({ x: 0, y: 0 });
        }
    };

    const handleVolumeChange = (change) => {
        if (isMuted) {
            setIsMuted(false);
        }
        setVolume(prevVolume => {
            const newVolume = Math.min(Math.max(prevVolume + change, 0), 1);
            placeSound.volume = newVolume;
            return newVolume;
        });
    };

    const toggleMute = () => {
        setIsMuted(prev => {
            const newMuteState = !prev;
            placeSound.volume = newMuteState ? 0 : volume;
            return newMuteState;
        });
    };

    const saveGame = () => {
        // Implement your save logic here
        console.log('Game saved!'); // Placeholder for save functionality
    };

    // Clear the timeout when the component unmounts
    useEffect(() => {
        return () => {
            if (announceTimeoutRef.current) {
                clearTimeout(announceTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="game-container">
            <div className="menu-panel">
                <h1>Game Studio</h1>
                <h2>Bouwstenen</h2>
                <p>Blokken om je level mee te bouwen</p>
                
                <button className="save-button" onClick={saveGame}>
                    Sla de game op
                </button>

                <div className="category-switch">
                    <button className="arrow-button" onClick={prevCategory}>&lt;</button>
                    <div className="category-name">{activeCategory.name}</div>
                    <button className="arrow-button" onClick={nextCategory}>&gt;</button>
                </div>
                
                <div className="blocks">
                    {activeCategory.blocks.map(block => (
                        <div
                            key={block.id}
                            className={`block-option ${block.className} ${selectedBlock?.id === block.id ? 'selected' : ''}`}
                            onClick={() => setSelectedBlock(block)}
                        />
                    ))}
                </div>
                
                <button className="test-game-button" onClick={startGame}>
                    {mode === 'play' ? 'Stop testen' : 'Test de game'}
                </button>

                <div className="volume-controls">
                    <div className="volume-buttons">
                        <button onClick={() => handleVolumeChange(-0.1)} disabled={isMuted}>-</button>
                        <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
                        <button onClick={() => handleVolumeChange(0.1)} disabled={isMuted}>+</button>
                    </div>
                    <div className="volume-display">
                        <span>{isMuted ? 'Muted' : `Volume: ${Math.round(volume * 100)}%`}</span>
                    </div>
                </div>
            </div>

            <div className={`game-area ${mode === 'play' ? 'test-mode' : ''}`}>
                {mode === 'play' && (
                    <div className="game-status test-mode">
                        Test Mode
                    </div>
                )}
                <div className="game-grid">
                    {renderGrid()}
                </div>

                <div className="game-controls">
                    <button className="control-button" onClick={undo}>
                        &larr; Stap terug
                    </button>
                    <button className="control-button" onClick={resetGrid}>
                        Verwijder alles
                    </button>
                    <button className="control-button" onClick={redo}>
                        Stap vooruit &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Game;


