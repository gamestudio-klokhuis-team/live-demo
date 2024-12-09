import React, { useState, useEffect, useCallback } from 'react';
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

    const activeCategory = BLOCK_CATEGORIES[categoryKeys[activeCategoryIndex]];

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
        placeSound.currentTime = 0; // Reset audio naar begin
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

    const movePlayer = useCallback((dx, dy) => {
        if (mode !== 'play') return;
    
        setPlayerPos(prev => {
            const newX = prev.x + dx;
            const newY = prev.y + dy;
    
            console.log('Moving to:', newX, newY);
    
            // Check boundaries
            if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
                return prev;
            }
    
            // Check collision
            if (!grid[newY] || !grid[newY][newX]) {
                return prev;
            }
    
            const targetCell = grid[newY][newX];
            if (targetCell?.properties?.solid) {
                return prev;
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

    return (
        <div className="game-container">
            <div className="menu-panel">
                <h1>Game Studio</h1>
                <h2>Bouwstenen</h2>
                <p>Blokken om je level mee te bouwen</p>
                
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
                        Stap terug
                    </button>
                    <button className="control-button" onClick={redo}>
                        Stap vooruit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Game;


